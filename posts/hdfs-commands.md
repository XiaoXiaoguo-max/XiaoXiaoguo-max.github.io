---
title: HDFS 常用命令速查手册
date: 2026-09-05
tags: [HDFS, 大数据, 运维]
---

# HDFS 常用命令速查手册

本文整理 HDFS 日常使用与实操考核中的高频命令，环境为三节点集群（`linux100` / `linux102` / `linux103`，用户 `atguigu`）。

## 一、集群启停

> 注意：启停脚本必须在 **NameNode 所在节点** 执行，且只能在集群的一台机器上执行一次，重复执行会导致进程冲突。

```bash
# 整体启停（推荐）
start-dfs.sh
stop-dfs.sh

# YARN 单独启停
start-yarn.sh
stop-yarn.sh

# 单进程启停（某个节点进程掉了时补救）
hdfs --daemon start namenode
hdfs --daemon start datanode
hdfs --daemon start secondarynamenode
yarn --daemon start resourcemanager
yarn --daemon start nodemanager
```

启动后用 `jps` 核对进程，三个节点的预期结果：

| 节点 | 应有进程 |
|:-----|:---------|
| linux100 | NameNode、DataNode、ResourceManager、NodeManager |
| linux102 | DataNode、NodeManager、SecondaryNameNode |
| linux103 | DataNode、NodeManager |

```bash
jps
```

## 二、目录操作

HDFS 路径一律以 `/` 开头，省略时默认操作 `/user/当前用户`。

```bash
# 列出根目录
hdfs dfs -ls /

# 递归列出（常用于查看多层分区）
hdfs dfs -ls -R /user/atguigu

# 创建目录，-p 自动创建父目录
hdfs dfs -mkdir -p /user/atguigu/input

# 删除空目录
hdfs dfs -rmdir /user/atguigu/empty_dir

# 查看目录占用空间
hdfs dfs -du -h /user/atguigu
```

## 三、文件上传与下载

```bash
# 本地 → HDFS（最常用）
hdfs dfs -put ./local.txt /user/atguigu/input/

# 等价于 put，但只接受本地文件作为源
hdfs dfs -copyFromLocal ./local.txt /user/atguigu/

# 上传并删除本地源文件（等于「剪切」）
hdfs dfs -moveFromLocal ./local.txt /user/atguigu/

# HDFS → 本地
hdfs dfs -get /user/atguigu/input/local.txt ./download/

# 把多个文件合并下载到本地一个文件里（小文件治理常用）
hdfs dfs -getmerge /user/atguigu/logs/* ./merged.log

# 追加内容到已存在文件末尾
hdfs dfs -appendToFile ./new_line.txt /user/atguigu/input/local.txt
```

## 四、查看与删除

```bash
# 查看文件内容
hdfs dfs -cat /user/atguigu/input/local.txt

# 查看文件末尾 1KB（等价于 tail -f 之外的最常用姿势）
hdfs dfs -tail /user/atguigu/input/local.txt

# 递归删除目录（危险操作，务必确认路径）
hdfs dfs -rm -r /user/atguigu/output

# 跳过回收站直接删除（-skipTrash）
hdfs dfs -rm -r -skipTrash /user/atguigu/tmp

# 统计目录文件数与总大小
hdfs dfs -count /user/atguigu
```

## 五、权限与副本

```bash
# 修改权限
hdfs dfs -chmod 755 /user/atguigu/input

# 修改属主与属组
hdfs dfs -chown atguigu:atguigu /user/atguigu/input

# 修改文件副本数（副本数不能超过 DataNode 数量）
hdfs dfs -setrep 3 /user/atguigu/input/local.txt
```

## 六、实操考核易错点

- **路径写成相对路径**：`hdfs dfs -ls input` 会去找 `/user/atguigu/input`，写错就报 `No such file or directory`，建议一律写全路径
- **重复执行 `start-dfs.sh`**：导致 `datanode` 进程启动后立即退出，需先 `stop-dfs.sh` 再启动
- **`-rm -r` 删错目录**：先 `-ls` 确认，再删除；生产环境务必保留回收站
- **副本数大于 DataNode 数**：`setrep` 会一直处于副本不足状态，集群只有 3 个 DN 时最大副本数为 3
- **小文件问题**：HDFS 不适合存海量小文件，每个文件元数据约占 150 字节，会压垮 NameNode 内存

## 七、Web 界面

| 服务 | 地址 |
|:-----|:-----|
| NameNode | `http://linux100:9870` |
| ResourceManager | `http://linux100:8088` |
| SecondaryNameNode | `http://linux102:9868` |

> Hadoop 2.x 的 NameNode Web 端口是 `50070`，3.x 改成了 `9870`，面试常问。
