# 我的博客

这是一个部署在 `/home/dev/blog` 的静态博客项目。

## 常用命令

构建：

```bash
npm run build
```

本地预览：

```bash
PORT=3000 npm run serve
```

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

## 部署文档

- 部署步骤：`docs/deploy-runbook.md`
- 过程和踩坑：`docs/deploy-log.md`
- GitHub 托管：`docs/github-hosting.md`
- Cloudflare 托管：`docs/cloudflare-hosting.md`
