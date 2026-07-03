# Agent Workflow: 代码仓库与发布流程

这份文档主要给 agent 使用，用来快速理解当前博客项目的代码结构、可修改范围、构建流程和发布链路。

## 1. 项目定位

这是一个轻量静态博客项目，不使用 React、Vue、Next、Astro、Vite 或 Tailwind。

核心技术栈：

- Node.js ESM 脚本
- 纯 HTML 模板字符串
- 单文件 CSS
- Markdown 文章内容
- Decap CMS + Netlify Identity + Git Gateway
- Netlify / GitHub Pages 双部署

核心原则：

- `content/`、`src/`、`static/`、`scripts/` 是源码。
- `public/` 是构建产物，但当前也会被提交到 Git，供静态托管直接发布。
- 不要把 UI 改动只写进 `public/`，否则下一次 `npm run build` 会覆盖。

## 2. 目录职责

```text
content/posts/
```

文章 Markdown 源文件。每篇文章必须包含 front matter：

```markdown
---
title: 文章标题
date: 2026-07-03
description: 文章摘要
tags: Spring Boot, Redis, SQL
---
```

```text
src/site.js
```

站点信息、导航、项目展示、最近更新等结构化数据。

```text
src/templates.js
```

HTML 模板组件，包括 layout、首页、文章列表页、文章详情页、文章卡片、项目卡片、目录等。

```text
src/markdown.js
```

front matter 解析、Markdown 渲染、阅读时间、代码高亮、heading anchor 和文章目录生成。

```text
src/styles.css
```

前端样式源文件。最终会复制成：

```text
public/assets/styles.css
```

```text
scripts/build.mjs
```

构建入口。读取 `content/posts/`，调用 `src/` 模块，生成 `public/`。

```text
static/admin/
```

Decap CMS 后台源文件。构建时复制到：

```text
public/admin/
```

## 3. 页面和路由

构建后公开页面位于：

- 首页：`public/index.html`，线上路由 `/`
- 文章列表：`public/archive.html`，线上路由 `/archive.html`
- 文章详情：`public/posts/*.html`，线上路由 `/posts/*.html`
- CMS 后台：`public/admin/index.html`，线上路由 `/admin/`

首页上的 `About` 和 `Projects` 目前是锚点区块，不是独立页面：

- `/#about`
- `/#projects`

## 4. Agent 修改规则

优先修改：

- 文章内容：`content/posts/*.md`
- 站点数据：`src/site.js`
- HTML 结构：`src/templates.js`
- Markdown 能力：`src/markdown.js`
- 样式：`src/styles.css`
- 构建流程：`scripts/build.mjs`
- CMS 配置：`static/admin/config.yml`
- 文档：`README.md`、`docs/*.md`

不要直接作为源码修改：

- `public/index.html`
- `public/archive.html`
- `public/posts/*.html`
- `public/assets/styles.css`
- `public/admin/config.yml`

如果这些 `public` 文件变化，应该来自 `npm run build`。

保留的关键行为：

- `npm run build` 必须成功。
- 现有路由不能破坏。
- 文章 front matter 不能破坏。
- Netlify 首页不能自动跳 CMS 登录页。
- `/admin/` 必须继续加载 Decap CMS。
- GitHub Pages 需要支持 `/blog/` 子路径。

## 5. 本地开发流程

修改代码或文章后，执行：

```bash
npm run build
```

本地预览：

```bash
PORT=3000 npm run serve
```

本地检查页面：

```text
http://127.0.0.1:3000/
http://127.0.0.1:3000/archive.html
http://127.0.0.1:3000/posts/backend-architecture-caching.html
http://127.0.0.1:3000/admin/
```

如果需要验证 GitHub Pages 子路径：

```bash
BASE_PATH=/blog/ npm run build
```

检查生成 HTML 中资源链接是否带 `/blog/` 前缀。验证后再执行一次默认构建：

```bash
npm run build
```

## 6. 发布流程

推荐使用项目脚本：

```bash
npm run publish -- "Update blog"
```

这个脚本会：

1. 执行 `npm run build`
2. 暂存源码和 `public` 构建产物
3. 创建 Git commit
4. 推送到 GitHub `main`

远端仓库：

```text
https://github.com/Belfast-byte/blog
```

手动发布等价流程：

```bash
npm run build
git status
git add content public static src scripts docs README.md package.json netlify.toml wrangler.toml .github
git commit -m "Update blog"
git push
```

## 7. 线上部署链路

推送到 GitHub 后会触发两个部署目标。

### Netlify

配置文件：

```text
netlify.toml
```

配置含义：

```toml
[build]
  command = "npm run build"
  publish = "public"
```

线上地址：

```text
https://noshiro.netlify.app/
```

CMS 后台：

```text
https://noshiro.netlify.app/admin/
```

### GitHub Pages

工作流：

```text
.github/workflows/pages.yml
```

GitHub Pages 是项目站点，线上路径带仓库名前缀：

```text
https://belfast-byte.github.io/blog/
```

因此 GitHub Actions 构建时设置：

```yaml
BASE_PATH: /${{ github.event.repository.name }}/
```

不要移除这个变量，否则 GitHub Pages 上 CSS 和文章链接可能失效。

## 8. 发布后验证

推送后等待 Netlify 和 GitHub Actions 构建完成，再检查：

- Netlify 首页：`https://noshiro.netlify.app/`
- Netlify CMS：`https://noshiro.netlify.app/admin/`
- GitHub Pages 首页：`https://belfast-byte.github.io/blog/`
- GitHub Pages 文章：`https://belfast-byte.github.io/blog/posts/backend-architecture-caching.html`

如果看到旧页面，可能是 CDN 缓存。可以加 query 参数：

```text
https://noshiro.netlify.app/?v=commit-sha
https://belfast-byte.github.io/blog/?v=commit-sha
```

## 9. 常见陷阱

### 只改了 public

错误。`public` 会被构建覆盖。应该修改 `src/`、`content/` 或 `static/`，然后运行 `npm run build`。

### Netlify 首页跳 CMS 登录

公开页面不应该主动加载 Netlify Identity。当前模板只在 URL hash 包含以下 token 时加载 Identity widget：

- `invite_token`
- `confirmation_token`
- `recovery_token`
- `email_change_token`

### GitHub Pages 样式丢失

优先检查：

- `.github/workflows/pages.yml` 是否仍设置 `BASE_PATH`
- 生成后的 HTML 链接是否带 `/blog/`

### CMS 登录只能在 Netlify 使用

GitHub Pages 上也会有 `/blog/admin/` 静态页面，但不能提供 Netlify Identity 和 Git Gateway API。真正写文章请使用：

```text
https://noshiro.netlify.app/admin/
```
