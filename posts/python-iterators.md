---
title: Python 迭代器、生成器与上下文管理器
date: 2026-09-05
tags: [Python, 迭代器, 生成器]
---

# Python 迭代器、生成器与上下文管理器

## 一、可迭代对象 vs 迭代器

这两个概念经常被混着叫，其实是两回事：

| 概念 | 定义 | 判断方法 |
|:-----|:-----|:---------|
| 可迭代对象 Iterable | 实现了 `__iter__`，能被 for 遍历 | `isinstance(x, Iterable)` |
| 迭代器 Iterator | 实现了 `__iter__` **和** `__next__`，是"一次性游标" | `isinstance(x, Iterator)` |

```python
from collections.abc import Iterable, Iterator

nums = [1, 2, 3]
it = iter(nums)          # 从可迭代对象拿到迭代器

print(isinstance(nums, Iterable))   # True
print(isinstance(nums, Iterator))   # False —— 列表不是迭代器
print(isinstance(it, Iterator))     # True

print(next(it))    # 1
print(next(it))    # 2
print(next(it))    # 3
next(it)           # StopIteration 异常
```

for 循环的本质就是这套流程：

```python
# for x in nums: 等价于
it = iter(nums)
while True:
    try:
        x = next(it)
    except StopIteration:
        break
    # 处理 x
```

迭代器是**一次性的**：耗尽后再 next 就抛异常，想重头遍历要重新 `iter()`。这也是为什么
"迭代过的生成器再遍历是空的"。

## 二、生成器：写出迭代器的捷径

函数体里带 `yield`，它就变成了生成器函数：

```python
def countdown(n):
    while n > 0:
        yield n
        n -= 1

gen = countdown(3)
print(next(gen))    # 3
print(next(gen))    # 2

for x in countdown(3):
    print(x)        # 3, 2, 1
```

和普通函数的关键区别：调用它**不执行代码**，返回生成器对象；每次 `next` 执行到
`yield` 暂停并交出值，下次从暂停处继续。这个特性叫**惰性求值**。

生成器表达式：把列表推导式的 `[]` 换成 `()`：

```python
squares_list = [x ** 2 for x in range(10)]    # 立即算完，占内存
squares_gen = (x ** 2 for x in range(10))     # 不算，用的时候才算

print(sum(squares_gen))    # 285，边生成边消费
```

## 三、惰性求值的价值：处理大文件

读一个 10GB 的日志文件，下面两种写法天差地别：

```python
# ❌ 全部读进内存
with open("big.log", encoding="utf-8") as f:
    lines = f.readlines()          # 10GB 全在内存里

# ✅ 逐行惰性处理，内存占用恒定
def error_lines(path):
    with open(path, encoding="utf-8") as f:
        for line in f:             # 文件对象本身就是生成器，逐行读
            if "ERROR" in line:
                yield line.strip()

for line in error_lines("big.log"):
    print(line)
```

用 `sys.getsizeof` 直观对比：

```python
import sys
print(sys.getsizeof([x for x in range(1_000_000)]))   # ~8MB
print(sys.getsizeof((x for x in range(1_000_000))))   # ~200 字节
```

## 四、yield 的进阶：双向通信

`yield` 不只能交出值，还能接收 `send` 传进来的值：

```python
def averager():
    total, count = 0.0, 0
    avg = None
    while True:
        value = yield avg        # 暂停在这里，send 的值赋给 value
        total += value
        count += 1
        avg = total / count

gen = averager()
next(gen)                # 预激：推进到第一个 yield
print(gen.send(10))      # 10.0
print(gen.send(20))      # 15.0
print(gen.send(30))      # 20.0
```

## 五、上下文管理器与 with

`with` 语句保证资源**无论是否异常都会释放**，本质是两个魔法方法：

```python
class Timer:
    def __enter__(self):
        import time
        self.start = time.perf_counter()
        return self               # as 后面拿到的就是它

    def __exit__(self, exc_type, exc_val, exc_tb):
        import time
        print(f"耗时 {time.perf_counter() - self.start:.4f}s")
        return False              # False = 异常继续往外抛；True = 吞掉异常

with Timer() as t:
    sum(range(10_000_000))
```

更简洁的写法用 `contextlib`：

```python
from contextlib import contextmanager

@contextmanager
def tag(name):
    print(f"<{name}>")
    yield                          # yield 前是 __enter__，之后是 __exit__
    print(f"</{name}>")

with tag("h1"):
    print("hello")
# <h1>
# hello
# </h1>
```

## 六、常用 itertools

标准库 `itertools` 是生成器思想的集大成者，数据分析常用：

```python
from itertools import chain, groupby, islice, product, permutations, combinations

chain([1, 2], [3, 4])            # 1 2 3 4，串联多个可迭代对象
list(islice(range(100), 5, 10))  # [5, 6, 7, 8, 9]，迭代器版的切片

# groupby：相邻分组（用前必须先排序！）
data = sorted([("a", 1), ("b", 2), ("a", 3)], key=lambda x: x[0])
for key, group in groupby(data, key=lambda x: x[0]):
    print(key, [v for _, v in group])

list(product([0, 1], repeat=2))          # 笛卡尔积 (0,0) (0,1) (1,0) (1,1)
list(combinations([1, 2, 3], 2))         # 组合 (1,2) (1,3) (2,3)
list(permutations([1, 2, 3], 2))         # 排列
```

## 七、踩坑记录

- **生成器只能消费一次**：

```python
gen = (x for x in [1, 2, 3])
print(sum(gen))     # 6
print(sum(gen))     # 0 —— 已经耗尽
```
需要多次消费就先 `list(gen)`，但要权衡内存。

- **groupby 忘了先排序**：它只对**相邻**元素分组，无序数据分组结果支离破碎

- **在生成器里修改正在迭代的容器**：

```python
lst = [1, 2, 3]
for x in lst:
    lst.remove(x)      # 边遍历边删，跳元素
print(lst)             # [2]
```
正确做法是遍历副本 `for x in lst[:]` 或用列表推导式重建。
