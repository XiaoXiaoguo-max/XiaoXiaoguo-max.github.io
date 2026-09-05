---
title: Hive 数仓分层设计：ODS / DWD / DWS / ADS
date: 2026-09-02
tags: [Hive, 数据仓库, SQL]
---

# Hive 数仓分层设计：ODS / DWD / DWS / ADS

分层的本质是 **用空间换时间，用规范换效率**。原始日志直接进入应用层，会导致一次逻辑变更要改 N 张报表；分层后只需改对应那一层。

## 一、四层的职责边界

| 层级 | 全称 | 职责 | 数据形态 |
|:-----|:-----|:-----|:---------|
| ODS | Operational Data Store | 原样接入，不做任何清洗 | 与源系统一致的贴源表 |
| DWD | Data Warehouse Detail | 清洗、脱敏、维度退化 | 最细粒度的明细事实表 |
| DWS | Data Warehouse Service | 按主题轻度汇总 | 宽表，面向分析的多维汇总 |
| ADS | Application Data Service | 面向具体报表/接口 | 结果表，直接被 BI 读取 |

一句话记忆：**ODS 照搬，DWD 洗干净，DWS 先算好，ADS 直接给**。

## 二、命名规范

约定俗成的命名方式，能让接手的人一眼看懂表属于哪一层：

```sql
-- 层级_业务域_主题_粒度_刷新周期
ods_log_user_action_inc      -- 增量接入的用户行为日志
dwd_log_user_action_di       -- 日增量明细
dws_user_active_1d           -- 用户 1 日活跃汇总
ads_user_active_report       -- 最终报表
```

后缀含义：`di` 日增量、`df` 日全量、`1d` 最近 1 日、`nd` 最近 N 日、`td` 历史至今。

## 三、ODS 层：外部表 + 分区

ODS 必须用**外部表**，删表时不会误删 HDFS 原始数据。

```sql
CREATE EXTERNAL TABLE IF NOT EXISTS ods_log_user_action (
    user_id     STRING COMMENT '用户ID',
    action      STRING COMMENT '行为类型',
    page_url    STRING COMMENT '页面地址',
    ts          BIGINT  COMMENT '事件时间戳'
)
PARTITIONED BY (dt STRING)
ROW FORMAT DELIMITED FIELDS TERMINATED BY '\t'
STORED AS TEXTFILE
LOCATION '/warehouse/ods/log_user_action/';
```

数据由 Flume 落到 HDFS 后，需要挂载分区：

```sql
-- 单个分区挂载
ALTER TABLE ods_log_user_action ADD PARTITION (dt='2026-09-02')
LOCATION '/warehouse/ods/log_user_action/2026-09-02';

-- 分区已存在但 HDFS 新增了目录时，修复元数据
MSCK REPAIR TABLE ods_log_user_action;
```

## 四、DWD 层：清洗与维度退化

DWD 做三件事：过滤脏数据、统一字段格式、把常用维度字段冗余进事实表（避免后续频繁 JOIN）。

```sql
INSERT OVERWRITE TABLE dwd_log_user_action_di PARTITION (dt='2026-09-02')
SELECT
    user_id,
    action,
    page_url,
    ts,
    FROM_UNIXTIME(ts, 'yyyy-MM-dd HH:mm:ss') AS action_time
FROM ods_log_user_action
WHERE dt = '2026-09-02'
  AND user_id IS NOT NULL
  AND user_id <> ''
  AND action IN ('click', 'view', 'search');
```

## 五、DWS 层：按主题汇总

```sql
INSERT OVERWRITE TABLE dws_user_active_1d PARTITION (dt='2026-09-02')
SELECT
    user_id,
    COUNT(*)                        AS action_cnt,
    COUNT(DISTINCT action)          AS action_type_cnt,
    MAX(action_time)                AS last_action_time
FROM dwd_log_user_action_di
WHERE dt = '2026-09-02'
GROUP BY user_id;
```

## 六、ADS 层：直接产出结果

```sql
INSERT OVERWRITE TABLE ads_user_active_report
SELECT
    '2026-09-02'                    AS stat_date,
    COUNT(DISTINCT user_id)         AS active_users,
    SUM(action_cnt)                 AS total_actions,
    ROUND(SUM(action_cnt) / COUNT(DISTINCT user_id), 2) AS avg_actions_per_user
FROM dws_user_active_1d
WHERE dt = '2026-09-02';
```

## 七、分层实践中的几个坑

- **ODS 用内部表**：`DROP TABLE` 会连带删掉 HDFS 数据，原始日志直接丢失，无法回溯重跑
- **分区字段用 `dt` 却在 WHERE 里漏写**：导致全表扫描，Hive 跑几个小时不出结果
- **DWD 不做过滤直接透传**：脏数据层层放大，到 ADS 才发现指标对不上，排查成本翻倍
- **`INSERT INTO` 误用为 `INSERT OVERWRITE`**：重复跑数时数据翻倍，历史分区被静默覆盖

## 八、调度依赖

分层表的调度顺序必须严格是串行的：

```bash
# 上游未跑完就跑下游，会读到空分区
ods → dwd → dws → ads
```

实际项目中用 DolphinScheduler / Azkaban 配置依赖关系，前置任务失败则下游全部阻塞，避免产出脏结果。
