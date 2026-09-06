---
title: Python 异常处理与文件操作
date: 2026-09-05
tags: [Python, 异常处理, 文件操作]
---

# Python 异常处理与文件操作

## 一、异常处理的标准结构

```python
def safe_divide(a, b):
    try:
        result = a / b
    except ZeroDivisionError:
        print("除数不能为零")
        return None
    except TypeError as e:
        print(f"类型错误：{e}")
        return None
    else:
        print("计算成功")        # 只在没抛异常时执行
        return result
    finally:
        print("收尾工作")        # 无论如何都执行
```

四个块的分工：

| 块 | 什么时候执行 |
|:---|:-------------|
| `try` | 正常尝试 |
| `except` | 对应异常发生时 |
| `else` | try 内没有异常时 |
| `finally` | 无论如何（清理资源专用） |

**精确捕获**，不要裸写 `except:`：

```python
# ❌ 会吞掉 KeyboardInterrupt、SystemExit 等本该放过的异常
try:
    do_something()
except:
    pass

# ✅ 至少写明 Exception，且尽量具体
try:
    do_something()
except (ValueError, KeyError) as e:
    print(f"输入有问题: {e}")
```

## 二、常见异常速查

| 异常 | 触发场景 |
|:-----|:---------|
| `ValueError` | 值类型对但内容不对：`int("abc")` |
| `TypeError` | 类型不对：`"1" + 1` |
| `KeyError` | 字典键不存在：`d["missing"]` |
| `IndexError` | 下标越界：`[1,2][5]` |
| `FileNotFoundError` | 文件不存在 |
| `AttributeError` | 对象没有该属性 |
| `StopIteration` | 迭代器耗尽 |
| `ZeroDivisionError` | 除以零 |

## 三、自定义异常与异常链

业务代码里定义自己的异常层级，调用方可以精确处理：

```python
class AppError(Exception):
    """业务异常基类"""

class DataValidationError(AppError):
    pass

class RecordNotFound(AppError):
    pass

def load_record(record_id):
    records = {1: "甲", 2: "乙"}
    if record_id not in records:
        raise RecordNotFound(f"记录 {record_id} 不存在")
    return records[record_id]

try:
    load_record(99)
except RecordNotFound as e:
    print(e)                    # 记录 99 不存在
except AppError:
    print("其他业务错误")
```

在 `except` 里抛新异常时，用 `raise ... from e` 保留原始堆栈：

```python
try:
    int("abc")
except ValueError as e:
    raise DataValidationError("解析用户输入失败") from e
```

## 四、文件读写

```python
# 基本读
with open("data.txt", encoding="utf-8") as f:
    content = f.read()             # 一次性读全部
    # f.readline()                 # 读一行
    # f.readlines()                # 全部读成列表（大文件慎用）
    # for line in f: ...           # 逐行迭代（大文件首选）

# 写入："w" 覆盖 / "a" 追加，都默认创建不存在的文件
with open("out.txt", "w", encoding="utf-8") as f:
    f.write("第一行\n")
    f.writelines(["第二行\n", "第三行\n"])
```

**模式速查**：

| 模式 | 含义 | 文件不存在 | 存在时 |
|:-----|:-----|:-----------|:-------|
| `r` | 只读（默认） | 报错 | 从头读 |
| `w` | 只写 | 创建 | **清空** |
| `a` | 追加 | 创建 | 从末尾写 |
| `r+` | 读写 | 报错 | 从头读 |
| `b` | 二进制，与其他模式组合：`rb` / `wb` | — | — |

两个铁律：

- **永远用 `with open`**，异常时也能保证文件关闭
- **永远显式写 `encoding="utf-8"`**，Windows 默认 GBK，不加就会乱码或跨机器报错

## 五、pathlib：现代路径操作

别再手拼字符串路径了，`pathlib` 是标准做法：

```python
from pathlib import Path

p = Path("data") / "raw" / "log.txt"     # 用 / 拼路径，跨平台
print(p)                                  # data/raw/log.txt
print(p.name)        # log.txt（文件名）
print(p.stem)        # log（不含扩展名）
print(p.suffix)      # .txt
print(p.parent)      # data/raw

p.exists()           # 是否存在
p.is_file()
p.mkdir(parents=True, exist_ok=True)     # 递归建目录，已存在不报错

# 常用批量操作
Path(".").glob("*.md")                  # 当前目录的 md 文件
Path(".").rglob("*.py")                 # 递归找所有 py 文件
(Path("a.txt")).read_text(encoding="utf-8")   # 小文件一步读完
Path("b.txt").write_text("内容", encoding="utf-8")
```

## 六、JSON 读写（数据方向高频）

```python
import json

data = {"name": "小过", "scores": [92, 88], "tags": ["Python", "SQL"]}

# 写文件
with open("data.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

# 读文件
with open("data.json", encoding="utf-8") as f:
    loaded = json.load(f)

# 字符串互转
s = json.dumps(data, ensure_ascii=False)     # dict → str
obj = json.loads(s)                           # str → dict
```

`ensure_ascii=False` 必须加，否则中文变成 `\u5c0f\u8fc7`。

## 七、踩坑记录

- **`w` 模式误用导致文件被清空**：本想追加日志，结果一打开旧数据全没了，日志一律用 `a`
- **忘记 `encoding="utf-8"`**：本机跑得好好的，换台机器（或部署到 Linux）就读出乱码
- **finally 里的 return 会吞异常**：`finally` 中写 `return`，try 里抛的异常会被无声丢弃，`finally` 只放清理代码
- **捕获异常后静默 pass**：调试期排障会痛不欲生，至少打印一行日志或重新抛出
- **相对路径取决于运行位置**：脚本在 `D:\proj\` 里写 `open("data/x.txt")`，从别的目录运行就报
  `FileNotFoundError`。确定性方案：用 `pathlib` 基于 `Path(__file__).parent` 拼绝对路径
