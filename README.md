# Cache Atlas

这是一个部署在 `/home/dev/blog` 的静态博客项目，前端采用高质感浅色主题，面向后端架构、缓存策略和生产系统设计文章。

## 常用命令

新建文章：

```bash
npm run new -- "文章标题"
```

构建：

```bash
npm run build
```

一键发布：

```bash
npm run publish -- "Update blog"
```

本地预览：

```bash
PORT=3000 npm run serve
```

在线后台：

```text
https://noshiro.netlify.app/admin/
```

后台使用 Netlify Identity + Git Gateway 登录写文章。GitHub Pages 上的 `/admin/` 只能加载静态后台，不能处理 Netlify 登录。

## 写文章

在 `content/posts` 新增 Markdown 文件，格式如下：

```markdown
---
title: 文章标题
date: 2026-07-03
description: 文章摘要
tags: Spring Boot, Redis, SQL
---

正文内容。
```

## 前端结构

这个博客不使用 React/Vue/Next/Astro/Vite，前端由轻量 Node 静态生成器生成：

- `src/site.js`：站点信息、导航、项目和最近更新数据
- `src/templates.js`：首页、文章列表页、文章详情页等 HTML 模板
- `src/markdown.js`：front matter、Markdown 渲染、代码高亮和目录锚点
- `src/styles.css`：前端样式源文件
- `scripts/build.mjs`：读取内容并生成 `public` 目录

不要直接手改 `public/*.html` 或 `public/assets/styles.css`，这些文件会在 `npm run build` 时重新生成。

## 一键发布流程

日常写博客可以这样做：

```bash
cd /home/dev/blog
npm run new -- "我的新文章"
nano content/posts/2026-07-03-我的新文章.md
npm run publish -- "Add new post"
```

`npm run publish` 会自动执行：

1. 生成 `public` 静态网页
2. 提交博客源码和静态产物
3. 推送到 GitHub
4. 触发 GitHub Pages 自动更新

给 agent 看的仓库结构、修改规则和“改代码 -> 推送 GitHub -> 更新 Netlify/GitHub Pages 页面”流程见：

```text
docs/update-workflow.md
```

## 部署文档

- 部署步骤：`docs/deploy-runbook.md`
- 更新流程：`docs/update-workflow.md`
- 过程和踩坑：`docs/deploy-log.md`
- GitHub 托管：`docs/github-hosting.md`
- Cloudflare 托管：`docs/cloudflare-hosting.md`
- 在线 CMS 后台：`docs/cms-hosting.md`
