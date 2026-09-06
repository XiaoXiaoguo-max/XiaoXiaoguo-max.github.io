---
title: Python 函数进阶：参数、作用域、闭包与装饰器
date: 2026-09-05
tags: [Python, 函数, 装饰器]
---

# Python 函数进阶：参数、作用域、闭包与装饰器

## 一、参数的四种形态

```python
def demo(a, b=2, *args, **kwargs):
    print(f"a={a}, b={b}")
    print(f"args={args}")
    print(f"kwargs={kwargs}")

demo(1, 2, 3, 4, x=10, y=20)
# a=1, b=2
# args=(3, 4)
# kwargs={'x': 10, 'y': 20}
```

| 形态 | 写法 | 说明 |
|:-----|:-----|:-----|
| 位置参数 | `a` | 按顺序传 |
| 默认参数 | `b=2` | 不传就用默认值 |
| 可变位置参数 | `*args` | 多余的位置参数打包成元组 |
| 可变关键字参数 | `**kwargs` | 多余的关键字参数打包成字典 |

**仅限关键字参数**（`*` 之后必须用名字传）能让调用更明确：

```python
def create_user(name, *, is_admin=False, level=1):
    ...

create_user("小过", is_admin=True)    # ✅ 清晰
create_user("小过", True)             # ❌ TypeError
```

**函数也是对象**，可以作为参数、返回值、存进字典：

```python
def square(x): return x ** 2
def cube(x): return x ** 3

ops = {"square": square, "cube": cube}
print(ops["cube"](3))    # 27
```

## 二、LEGB 作用域

Python 按 **L → E → G → B** 的顺序查找变量名：

| 层级 | 全称 | 例子 |
|:-----|:-----|:-----|
| L | Local | 函数内部 |
| E | Enclosing | 外层嵌套函数 |
| G | Global | 模块级 |
| B | Built-in | 内置（print、len…） |

```python
x = "global"

def outer():
    x = "enclosing"
    def inner():
        x = "local"
        print(x)        # local
    inner()

outer()
```

想在内部函数里**修改**外层变量，必须声明：

```python
count = 0

def increment():
    global count        # 修改全局变量
    count += 1

def make_counter():
    n = 0
    def step():
        nonlocal n      # 修改外层函数的变量
        n += 1
        return n
    return step
```

> `global` / `nonlocal` 能少用就少用，状态藏在函数里不好测试。

## 三、闭包

内层函数"记住"外层函数的变量，即使外层已经返回：

```python
def make_multiplier(factor):
    def multiply(x):
        return x * factor     # 捕获了外层的 factor
    return multiply

double = make_multiplier(2)
triple = make_multiplier(3)

print(double(10))    # 20
print(triple(10))    # 30
print(double.__closure__[0].cell_contents)   # 2（能查到捕获的值）
```

每个闭包**各自持有一份**捕获的变量，互不干扰。

## 四、装饰器

装饰器本质上就是：**接收函数、返回新函数**的闭包应用。

```python
import time
import functools

def timer(func):
    @functools.wraps(func)          # 保留原函数的名字和文档
    def wrapper(*args, **kwargs):
        start = time.perf_counter()
        result = func(*args, **kwargs)
        cost = time.perf_counter() - start
        print(f"{func.__name__} 耗时 {cost:.4f}s")
        return result
    return wrapper

@timer
def slow_sum(n):
    return sum(range(n))

slow_sum(10_000_000)
# slow_sum 耗时 0.2143s
```

`@timer` 等价于 `slow_sum = timer(slow_sum)`。

**带参数的装饰器**要多包一层：

```python
def retry(times):
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            for i in range(times):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    if i == times - 1:
                        raise
                    print(f"第 {i + 1} 次失败：{e}，重试中...")
        return wrapper
    return decorator

@retry(times=3)
def fetch_data():
    import random
    if random.random() < 0.7:
        raise ConnectionError("网络抖动")
    return "data"
```

> `functools.wraps` 不是可有可无的：不加的话，被装饰后的函数名会变成 `wrapper`，
> 日志、调试、序列化都会受影响。

## 五、lambda 与高阶函数

```python
students = [
    {"name": "张三", "score": 88},
    {"name": "李四", "score": 95},
    {"name": "王五", "score": 82},
]

# sorted 的 key 参数是最常见的 lambda 使用场景
top = sorted(students, key=lambda s: s["score"], reverse=True)

nums = [1, 2, 3, 4, 5]
list(map(lambda x: x * 2, nums))          # [2, 4, 6, 8, 10]
list(filter(lambda x: x % 2, nums))       # [1, 3, 5]
```

> 团队代码风格上，能用推导式就少用 map/filter + lambda，可读性更好。

## 六、踩坑记录

- **默认参数在定义时求值一次**：见《Python 基础》坑 1，装饰器工厂里同样要小心
- **装饰器忘了返回 `wrapper`**：写成了 `return func()`，装饰器立即执行而不是包装
- **闭包循环变量陷阱**：

```python
funcs = [lambda: i for i in range(3)]
print([f() for f in funcs])    # [2, 2, 2]，三个 lambda 共享同一个 i

funcs = [lambda i=i: i for i in range(3)]   # 用默认参数固定当前值
print([f() for f in funcs])    # [0, 1, 2]
```
