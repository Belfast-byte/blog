# 我的博客

这是一个部署在 `/home/dev/blog` 的静态博客项目。

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
---

正文内容。
```

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

## 部署文档

- 部署步骤：`docs/deploy-runbook.md`
- 过程和踩坑：`docs/deploy-log.md`
- GitHub 托管：`docs/github-hosting.md`
- Cloudflare 托管：`docs/cloudflare-hosting.md`
- 在线 CMS 后台：`docs/cms-hosting.md`
