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
  "title": "小过的技术笔记",
  "desc": "一句话简介，显示在首页标题下方",
  "author": "比比顺",
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

整个目录是纯静态资源，无需任何构建，传到哪里都能跑。

本项目所有资源都用**相对路径**引用（`assets/...`、`posts/...`、`post.html?p=`），
因此部署到根域名或子目录（如 `/blog/`）都能正常访问，不需要改任何配置。

## 部署到 GitHub Pages（免费，公网可访问）

### 1. 在 GitHub 上建仓库

仓库名决定访问地址，二选一：

| 仓库名 | 访问地址 |
|:-------|:---------|
| `<用户名>.github.io` | `https://<用户名>.github.io` |
| 任意名字，如 `blog` | `https://<用户名>.github.io/blog` |

建仓库时：选 **Public**，**不要**勾选 Add README / .gitignore（本地已经有了，勾了会导致首次推送冲突）。

### 2. 配置 SSH 免密（一次性）

在 Git Bash 里复制公钥：

```bash
cat ~/.ssh/id_rsa.pub
```

粘贴到 GitHub → 右上角头像 → **Settings** → **SSH and GPG keys** → **New SSH key**。

验证是否配通：

```bash
ssh -T git@github.com
# 看到 "Hi xxx! You've successfully authenticated" 即为成功
```

### 3. 推送代码

把 `<用户名>` 和 `<仓库名>` 换成你自己的：

```bash
git remote add origin git@github.com:<用户名>/<仓库名>.git
git branch -M main
git push -u origin main
```

### 4. 开启 Pages

仓库页面 → **Settings** → **Pages** → Build and deployment：

- Source 选 **Deploy from a branch**
- Branch 选 **main**，目录选 **/ (root)**
- 点 Save

等 1~3 分钟，页面顶部会显示访问地址。之后每次推送会自动重新部署。

### 5. 以后更新文章

写完文章后双击 `deploy.bat`，一条龙完成 add → commit → push，约 1 分钟后线上生效。

## 托管平台对比

| 平台 | 国内访问 | 费用 | 说明 |
|:-----|:---------|:-----|:-----|
| GitHub Pages | 一般，部分地区不稳 | 免费 | 生态最好，自定义域名方便 |
| Gitee Pages | 快 | 免费 | 需实名认证，仓库须公开，改完要手动点「更新」 |
| Cloudflare Pages | 较快 | 免费 | 国内访问优于 GitHub，支持自动构建 |
| Vercel | 一般 | 免费 | 部署体验好，国内速度波动大 |
| 腾讯云 COS / 阿里云 OSS | 快 | 几元/月 | 需已备案域名，适合正式站点 |

> GitHub Pages 在国内部分地区可能加载缓慢或间歇性无法访问。
> 如果博客主要给国内的人看，建议 GitHub Pages 与 Gitee Pages **同时部署**，
> 内容完全相同，国内用户走 Gitee、国外走 GitHub。

博客文章用 Markdown 存储，换任何静态站点生成器（Hexo / Hugo / VitePress）都能平滑迁移。
