---
title: Python 基础：变量、数据类型与四大容器
date: 2026-09-05
tags: [Python, 基础]
---

# Python 基础：变量、数据类型与四大容器

## 一、变量与动态类型

Python 变量是**贴在对象上的名字**，不是盒子。同一个名字可以随时指向不同类型的对象。

```python
x = 10          # int
x = "hello"     # 现在是 str，合法
x = [1, 2, 3]   # 现在是 list

print(type(x))  # <class 'list'>
print(id(x))    # 对象在内存中的地址
```

两个变量指向同一个对象时，改一个可变对象，另一个也"变"了：

```python
a = [1, 2, 3]
b = a           # b 和 a 指向同一个列表
b.append(4)

print(a)        # [1, 2, 3, 4] —— a 也变了
print(a is b)   # True，同一个对象
```

想要独立副本，用 `copy` 或切片：

```python
b = a.copy()    # 或 a[:]、list(a)
b.append(5)
print(a)        # [1, 2, 3, 4]，不受影响
```

## 二、字符串常用操作

```python
s = "Python 数据分析"

# f-string 格式化（首选）
name, score = "小过", 92.567
print(f"{name} 的成绩是 {score:.2f}")   # 小过 的成绩是 92.57
print(f"{1234567:,}")                    # 1,234,567（千分位）

# 常用方法
s.split()                # 按空白切分成列表
"-".join(["a", "b"])     # 'a-b'
s.strip()                # 去两端空白
s.replace("P", "J")      # 替换
s.startswith("Py")       # True
"123".isdigit()          # True
```

> 字符串是**不可变**的，所有"修改"方法都返回新字符串，原串不变。

## 三、四大容器对比

| 容器 | 语法 | 有序 | 可变 | 去重 | 典型用途 |
|:-----|:-----|:-----|:-----|:-----|:---------|
| 列表 list | `[1, 2]` | ✅ | ✅ | ❌ | 按顺序存放、增删改 |
| 元组 tuple | `(1, 2)` | ✅ | ❌ | ❌ | 不可变数据、函数多返回值 |
| 字典 dict | `{"a": 1}` | ✅（3.7+） | ✅ | 键唯一 | 键值映射、JSON 数据 |
| 集合 set | `{1, 2}` | ❌ | ✅ | ✅ | 去重、交并差运算 |

```python
# 列表：栈、队列、动态数组
lst = [3, 1, 2]
lst.append(4)          # 尾部追加
lst.insert(0, 0)       # 指定位置插入
lst.sort()             # 原地排序
lst.pop()              # 弹出末尾

# 元组：解包是高频用法
x, y = (10, 20)
a, *rest = [1, 2, 3, 4]   # a=1, rest=[2, 3, 4]

# 字典：get 带默认值，避免 KeyError
d = {"python": 95, "sql": 88}
d.get("java", 0)          # 0，键不存在也不报错
d["spark"] = 90           # 新增
list(d.keys())            # 所有键
d.items()                 # [(键, 值), ...]

# 集合：去重与集合运算
ids = [1, 2, 2, 3, 3, 3]
unique = set(ids)                 # {1, 2, 3}
a, b = {1, 2, 3}, {2, 3, 4}
a & b      # 交集 {2, 3}
a | b      # 并集 {1, 2, 3, 4}
a - b      # 差集 {1}
```

## 四、切片

切片是 Python 处理序列的核心技能，格式 `[start:stop:step]`，**含头不含尾**：

```python
nums = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]

nums[2:5]     # [2, 3, 4]
nums[:3]      # [0, 1, 2]
nums[-3:]     # [7, 8, 9]（最后三个）
nums[::2]     # [0, 2, 4, 6, 8]（隔一个取一个）
nums[::-1]    # 反转
nums[:]       # 完整拷贝
```

字符串同样适用：`"abcdef"[::-1]` 得到 `"fedcba"`。

## 五、推导式

推导式比 for 循环更简洁，也更快：

```python
# 列表推导式
squares = [x ** 2 for x in range(10)]
evens = [x for x in range(20) if x % 2 == 0]

# 带条件表达式的写法（if...else 放前面）
labels = ["偶" if x % 2 == 0 else "奇" for x in range(5)]

# 字典推导式
word = "statistics"
counter = {ch: word.count(ch) for ch in set(word)}

# 集合推导式
matrix = [[1, 2], [3, 4], [5, 6]]
flat = {n for row in matrix for n in row}   # {1, 2, 3, 4, 5, 6}
```

> 嵌套超过两层的推导式可读性会崩，宁可写回 for 循环。

## 六、踩坑记录

**坑 1：默认参数用可变对象**

```python
def add_item(item, items=[]):     # ❌ 默认列表在函数定义时创建一次
    items.append(item)
    return items

print(add_item(1))    # [1]
print(add_item(2))    # [1, 2] —— 上次的结果还在！
```

正确写法用 `None` 作哨兵：

```python
def add_item(item, items=None):
    if items is None:
        items = []
    items.append(item)
    return items
```

**坑 2：`is` 和 `==` 混用**

`==` 比较值，`is` 比较身份（是否同一个对象）。判断相等永远用 `==`，只有判断 `None` 时才用 `is`：

```python
if x is None:      # ✅ 惯例写法
    ...
if x == [1, 2]:    # ✅ 比较值
    ...
```

**坑 3：小整数缓存**

```python
a, b = 256, 256
print(a is b)    # True（解释器缓存了 -5~256）
a, b = 257, 257
print(a is b)    # 交互模式下 False
```

再次说明 `is` 不能用来比较数值。
