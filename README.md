# 个人博客（纯静态 + Markdown）

零框架、零构建、零 CDN 依赖。文章用 `.md` 写，浏览器实时渲染，完全离线可用。

## 快速开始

**方式一（推荐）**：双击项目根目录的 `start.bat`，会自动启动服务并打开浏览器。

**方式二**：手动执行

```bash
python -m http.server 8000
# 浏览器访问 http://localhost:8000
```

> ⚠️ 不能直接双击 `index.html`。浏览器禁止 `file://` 协议下读取文章文件，
> 必须走 HTTP 服务。直接打开时页面会给出提示。

## 目录结构

```
blog/
├── index.html          首页：文章列表 + 标签筛选
├── post.html           文章详情页 + 目录导航
├── start.bat           一键启动本地服务
├── assets/
│   ├── style.css       深色主题样式
│   ├── highlight.js    代码高亮（Python/SQL/Java/Shell/JS/HTML/JSON/YAML）
│   ├── markdown.js     Markdown 解析器
│   └── app.js          页面逻辑
└── posts/
    ├── index.json      文章索引（新增文章必须登记）
    └── *.md            文章正文
```

## 新增一篇文章（两步）

**第一步**：在 `posts/` 下新建 `.md` 文件，文件名用英文或拼音，例如 `flume-taildir.md`。

**第二步**：把文章登记进 `posts/index.json` 的 `posts` 数组：

```json
{
  "file": "flume-taildir",
  "title": "Flume Taildir Source 断点续传原理",
  "date": "2026-09-06",
  "tags": ["Flume", "大数据"],
  "summary": "一句话摘要，显示在首页卡片上"
}
```

- `file` 填**不含 `.md` 后缀**的文件名
- `date` 用 `YYYY-MM-DD`，首页按日期倒序排列
- `tags` 可填多个，首页会自动生成筛选按钮

文章开头也可以写 Front Matter，优先级高于 `index.json`：

```markdown
---
title: 文章标题
date: 2026-09-06
tags: [Flume, 大数据]
---
```

## 站点信息

改 `posts/index.json` 的 `site` 字段：

```json
"site": {
  "title": "震佳的技术笔记",
  "desc": "一句话简介，显示在首页标题下方",
  "author": "杜震佳",
  "links": [
    { "text": "Gitee", "url": "https://gitee.com/your-id" }
  ]
}
```

`links` 会渲染成右上角导航，留空数组则不显示。

## 支持的 Markdown 语法

| 语法 | 写法 |
|:-----|:-----|
| 标题 | `#` ~ `######`（自动生成目录锚点） |
| 强调 | `**粗体**` `*斜体*` `~~删除线~~` |
| 行内代码 | `` `code` `` |
| 代码块 | ` ```python ` 开头，支持语言标注 |
| 列表 | `- 项` / `1. 项`，支持嵌套 |
| 任务列表 | `- [x] 已完成` / `- [ ] 未完成` |
| 表格 | `\| a \| b \|`，支持 `:---` `:---:` `---:` 对齐 |
| 引用 | `> 引用内容` |
| 链接 | `[文字](url)`，外链自动新窗口打开 |
| 图片 | `![说明](路径)` |
| 分割线 | `---` |

代码高亮覆盖：`python` `sql` `java` `bash` `javascript` `html` `json` `yaml`，
并支持别名（`py` `sh` `shell` `js` `ts` `yml` `hql` `hiveql` 等），未匹配时自动降级为通用规则。

## 常见问题

**端口 8000 被占用**

```bash
python -m http.server 8080
```

**页面显示「文章索引加载失败」**
检查 `posts/index.json` 是否为合法 JSON（常见错误是最后一项多了逗号）。

**文章详情页 404**
确认 `posts/xxx.md` 文件存在，且 `index.json` 里的 `file` 字段与文件名完全一致。

**中文乱码**
Markdown 文件必须保存为 **UTF-8 编码**，且文件开头不要带 BOM。

## 部署

整个目录是纯静态资源，直接上传到任意静态托管即可，无需任何构建：

- GitHub Pages：推到仓库后开启 Pages
- Gitee Pages：注意 Gitee 需要手动点击「更新」
- 服务器：Nginx 直接指向该目录

博客文章用 Markdown 存储，换任何静态站点生成器（Hexo / Hugo / VitePress）都能平滑迁移。
