---
title: Python 元编程：__new__ 与元类的类级别属性生成
date: 2026-08-28
tags: [Python, 元编程]
---

# Python 元编程：`__new__` 与元类的类级别属性生成

元编程的核心只有一句话：**把类当成普通对象来操作**。既然类能被动态创建、动态修改，那"在类定义阶段自动生成属性"就成了一件很自然的事。

## 一、`__new__` 与 `__init__` 的分工

很多人以为 `__init__` 是构造函数，其实不是。

```python
class Demo:
    def __new__(cls, *args, **kwargs):
        print("1. __new__ 被调用，负责创建实例")
        return super().__new__(cls)

    def __init__(self, value):
        print("2. __init__ 被调用，负责初始化实例")
        self.value = value

d = Demo(10)
```

输出：

```text
1. __new__ 被调用，负责创建实例
2. __init__ 被调用，负责初始化实例
```

关键区别：

| 方法 | 时机 | 返回值 | 作用 |
|:-----|:-----|:-------|:-----|
| `__new__` | 实例创建前 | 必须返回实例对象 | 决定"造不造、怎么造" |
| `__init__` | 实例创建后 | 返回 `None` | 决定"造完之后填什么" |

`__new__` 返回的是 `cls` 的实例时，Python 才会自动调用 `__init__`；返回别的类型，`__init__` 直接被跳过。

```python
class AlwaysNone:
    def __new__(cls):
        return "我返回了字符串，不是实例"

    def __init__(self):
        print("这行永远不会执行")

obj = AlwaysNone()
print(type(obj))   # <class 'str'>
print(obj)         # 我返回了字符串，不是实例
```

## 二、类也是对象：`type` 动态建类

平时用 `class` 关键字定义类，本质是调用 `type` 这个"元类"来生产类对象。

```python
# 常规写法
class Person:
    species = "human"

    def greet(self):
        return "hi"
```

```python
# 等价的动态写法
def greet(self):
    return "hi"

Person = type("Person", (object,), {"species": "human", "greet": greet})

print(Person.species)      # human
print(Person().greet())    # hi
```

`type(类名, 父类元组, 属性字典)` —— 第三个参数就是"类级别属性"的载体，这也是元编程的入口。

## 三、元类：拦截类的创建过程

元类是"类的类"。自定义元类继承 `type`，重写 `__new__` 就能在**类定义的那一刻**动手脚。

```python
class AutoLogMeta(type):
    def __new__(mcls, name, bases, namespace):
        print(f"正在创建类：{name}")
        print(f"类属性有：{list(namespace.keys())}")
        return super().__new__(mcls, name, bases, namespace)

class User(metaclass=AutoLogMeta):
    table = "t_user"
    id = 1

class Order(metaclass=AutoLogMeta):
    table = "t_order"
```

执行到 `class User` 时就会打印，因为类体本身是一条**可执行语句**。四个参数含义：

- `mcls`：元类自身（约定写作 `mcls`，区别于类的 `cls`）
- `name`：类名字符串
- `bases`：父类元组
- `namespace`：类体里定义的属性字典

## 四、类级别属性生成（重点）

所谓"类级别属性生成"，就是**扫描 `namespace`，把符合规则的属性挑出来，再自动往类上挂新属性**。

来一个实用场景：自动收集所有大写常量，生成汇总字典。

```python
class ConstMeta(type):
    def __new__(mcls, name, bases, namespace):
        # 从父类继承已有常量，避免子类覆盖父类常量
        inherited = {}
        for base in bases:
            inherited.update(getattr(base, "_constants", {}))

        own = {k: v for k, v in namespace.items() if k.isupper()}
        inherited.update(own)
        namespace["_constants"] = inherited
        namespace["constant_names"] = classmethod(lambda cls: list(cls._constants.keys()))

        return super().__new__(mcls, name, bases, namespace)

class Config(metaclass=ConstMeta):
    HOST = "localhost"
    PORT = 9000
    DEBUG = True

class ProdConfig(Config):
    HOST = "10.0.0.1"     # 只覆盖 HOST，PORT 与 DEBUG 从父类继承

print(Config.constant_names())      # ['HOST', 'PORT', 'DEBUG']
print(ProdConfig._constants)        # {'HOST': '10.0.0.1', 'PORT': 9000, 'DEBUG': True}
```

注意 `namespace` 是**类体执行完、类对象生成前**的那个字典，此时修改它，等价于直接在类体里多写一行。

## 五、实战：迷你 ORM 字段系统

Django / SQLAlchemy 的 Model 之所以能写出 `name = CharField(max_length=32)` 这种声明式语法，用的就是这套机制。下面手写一个 60 行的迷你版。

```python
class Field:
    """字段描述符：负责把类属性转换成列定义"""
    def __init__(self, column_type, max_length=None, primary_key=False):
        self.column_type = column_type
        self.max_length = max_length
        self.primary_key = primary_key

    def ddl(self, name):
        base = f"{name} {self.column_type}"
        if self.max_length:
            base += f"({self.max_length})"
        if self.primary_key:
            base += " PRIMARY KEY"
        return base

class CharField(Field):
    def __init__(self, max_length=255, **kw):
        super().__init__("VARCHAR", max_length=max_length, **kw)

class IntegerField(Field):
    def __init__(self, **kw):
        super().__init__("INTEGER", **kw)

class ModelMeta(type):
    def __new__(mcls, name, bases, namespace):
        if name == "Model":
            return super().__new__(mcls, name, bases, namespace)

        # 1. 扫描出所有 Field 实例
        fields = {
            k: v for k, v in namespace.items() if isinstance(v, Field)
        }

        # 2. 生成类级别属性：表名 + 字段映射 + 建表语句
        namespace["_fields"] = fields
        namespace["_table"] = namespace.pop("__tablename__", None) or name.lower()
        namespace["create_sql"] = classmethod(lambda cls: cls._build_ddl())

        return super().__new__(mcls, name, bases, namespace)

    def _build_ddl(cls):
        cols = ", ".join(f.ddl(n) for n, f in cls._fields.items())
        return f"CREATE TABLE {cls._table} ({cols});"

class Model(metaclass=ModelMeta):
    pass

class User(Model):
    __tablename__ = "t_user"
    id = IntegerField(primary_key=True)
    name = CharField(max_length=32)
    email = CharField(max_length=64)

print(User._table)
print(User._fields)
print(User.create_sql())
```

运行输出：

```text
t_user
{'id': <__main__.IntegerField object>, 'name': <__main__.CharField object>, 'email': <__main__.CharField object>}
CREATE TABLE t_user (id INTEGER PRIMARY KEY, name VARCHAR(32), email VARCHAR(64));
```

整个链路串起来是这样的：

```text
class User(Model) 执行
    → Python 收集类体属性到 namespace 字典
    → 发现 metaclass=ModelMeta，调用 ModelMeta.__new__
    → 扫描 namespace，挑出 Field 实例
    → 自动生成 _fields / _table / create_sql 三个类属性
    → 调用 type.__new__ 真正创建 User 类
```

也就是说，`User.create_sql()` 这个方法**从来没有被手写过**，它是类定义时自动长出来的。

## 六、三个容易踩的坑

- **忘记 `return super().__new__(...)`**：类会变成 `None`，实例化时报 `TypeError: 'NoneType' object is not callable`
- **元类不兼容**：一个类同时指定两个元类会报 `metaclass conflict`，需要用其中一个继承另一个
- **滥用元类**：90% 的场景用装饰器或 `__init_subclass__` 就够了，元类只在"必须拦截类创建过程"时才用

`__init_subclass__` 是 Python 3.6 引入的轻量替代方案，只想在子类创建时做点事、不需要改类属性字典时，优先用它：

```python
class PluginBase:
    registry = {}

    def __init_subclass__(cls, **kwargs):
        super().__init_subclass__(**kwargs)
        PluginBase.registry[cls.__name__] = cls

class JsonPlugin(PluginBase): pass
class XmlPlugin(PluginBase): pass

print(PluginBase.registry)   # {'JsonPlugin': ..., 'XmlPlugin': ...}
```
