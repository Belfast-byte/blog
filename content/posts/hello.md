---
title: 第一篇博客
date: 2026-07-03
description: 这个博客已经可以在服务器上构建和部署。
---

这是我的第一篇博客。

当前站点使用一个轻量的静态生成脚本：文章写在 `content/posts` 目录，执行 `npm run build` 后会生成 `public` 目录。部署时只需要让 Nginx 指向 `public`。

后续写作流程：

1. 在 `content/posts` 新增 Markdown 文件。
2. 文件顶部写 `title`、`date`、`description`。
3. 执行 `npm run build`。
4. 刷新网站。
