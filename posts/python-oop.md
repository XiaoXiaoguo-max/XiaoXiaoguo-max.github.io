---
title: Python 面向对象：类、继承与魔法方法
date: 2026-09-05
tags: [Python, 面向对象]
---

# Python 面向对象：类、继承与魔法方法

## 一、类与实例

```python
class Student:
    school = "郑州商学院"          # 类属性：所有实例共享

    def __init__(self, name, score):
        self.name = name           # 实例属性：每个对象独有
        self.score = score

    def introduce(self):
        return f"我是 {self.name}，来自 {self.school}，考了 {self.score} 分"

s1 = Student("小过", 92)
s2 = Student("同学甲", 85)

print(s1.introduce())
print(Student.school)      # 通过类访问
print(s1.school)           # 也能通过实例访问（先找实例，再找类）
```

`__init__` 的第一个参数 `self` 就是刚创建的实例本身。`s1.introduce()` 实际是
`Student.introduce(s1)`。

## 二、实例属性 vs 类属性

修改时一定要分清改的是哪一层：

```python
s1.score = 100          # 修改 s1 自己的实例属性
Student.school = "ZZU"  # 修改类属性，所有实例跟着变

# ❌ 危险写法：s1.school = "XX"
# 这会给 s1 新增一个同名实例属性，"遮住"类属性，而不是修改类属性
```

## 三、继承与 super()

```python
class Animal:
    def __init__(self, name):
        self.name = name

    def speak(self):
        return "..."

class Dog(Animal):
    def __init__(self, name, breed):
        super().__init__(name)      # 调用父类的初始化
        self.breed = breed

    def speak(self):                # 方法重写
        return "汪汪"

class Cat(Animal):
    def speak(self):
        return "喵"

for a in [Dog("旺财", "柴犬"), Cat("咪咪")]:
    print(f"{a.name}: {a.speak()}")
```

多继承的查找顺序叫 **MRO**（Method Resolution Order）：

```python
class A:
    def hello(self): return "A"

class B(A):
    def hello(self): return "B"

class C(A):
    def hello(self): return "C"

class D(B, C):
    pass

print(D.mro())
# [D, B, C, A, object] —— 先 D，再 B，再 C，最后 A
```

## 四、常用魔法方法

| 方法 | 触发时机 | 典型用途 |
|:-----|:---------|:---------|
| `__init__` | 实例化时 | 初始化属性 |
| `__str__` | `print(obj)` / `str(obj)` | 给用户看的描述 |
| `__repr__` | 交互式回显 / 调试 | 给开发者看的描述 |
| `__len__` | `len(obj)` | 支持 len() |
| `__eq__` | `obj1 == obj2` | 自定义相等 |
| `__lt__` | `obj1 < obj2` | 支持排序 |
| `__getitem__` | `obj[key]` | 支持下标访问 |
| `__call__` | `obj()` | 实例可以像函数一样调用 |

实战一个支持比较和打印的分数类：

```python
class Score:
    def __init__(self, name, value):
        self.name = name
        self.value = value

    def __repr__(self):
        return f"Score({self.name!r}, {self.value})"

    def __eq__(self, other):
        return self.value == other.value

    def __lt__(self, other):
        return self.value < other.value

scores = [Score("语文", 92), Score("数学", 98), Score("英语", 88)]
scores.sort()
print(scores)       # [Score('英语', 88), Score('语文', 92), Score('数学', 98)]
```

只实现了 `__lt__` 和 `__eq__`，`sort()` 就能正常工作。

## 五、@property：把方法伪装成属性

```python
class Circle:
    def __init__(self, radius):
        self._radius = radius

    @property
    def area(self):
        return 3.14159 * self._radius ** 2

    @property
    def radius(self):
        return self._radius

    @radius.setter
    def radius(self, value):
        if value <= 0:
            raise ValueError("半径必须为正数")
        self._radius = value

c = Circle(2)
print(c.area)          # 12.56636，像访问属性一样，不用加括号
c.radius = 5           # 触发 setter，带校验
c.radius = -1          # ValueError: 半径必须为正数
```

好处：外部用起来是属性，内部随时可以加逻辑，**不用改调用方代码**。

## 六、类方法与静态方法

```python
class Date:
    def __init__(self, y, m, d):
        self.y, self.m, self.d = y, m, d

    @classmethod
    def from_string(cls, s):          # cls 是类本身，常用来做替代构造器
        y, m, d = map(int, s.split("-"))
        return cls(y, m, d)

    @staticmethod
    def is_leap(year):                # 与类相关但不依赖实例和类的工具函数
        return year % 4 == 0 and (year % 100 != 0 or year % 400 == 0)

d = Date.from_string("2026-09-05")
print(Date.is_leap(2024))    # True
```

## 七、`__slots__` 与 `__dict__`

默认情况下实例属性存在 `__dict__` 字典里，灵活但费内存。属性固定的类可以加 `__slots__`：

```python
class Point:
    __slots__ = ("x", "y")

    def __init__(self, x, y):
        self.x, self.y = x, y

p = Point(1, 2)
print(p.__dict__ if hasattr(p, "__dict__") else "没有 __dict__，更省内存")
p.z = 3     # AttributeError —— slots 外的属性不让加
```

百万级小对象的场景下能省一半以上内存，数据分析里批量建模时很好用。

## 八、踩坑记录

- **可变类属性被所有实例共享**：`class C: items = []` 之后各实例 append 会互相污染，可变状态请放 `__init__`
- **`__str__` 和 `__repr__` 只写一个**：只写 `__repr__` 时，`print` 会自动用它兜底；反之不然
- **在 `__init__` 里返回值**：`__init__` 必须返回 `None`，要控制创建过程请用 `__new__`（见《Python 元编程》一篇）
