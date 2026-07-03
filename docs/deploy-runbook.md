# 博客部署手册

本文记录当前服务器上这个静态博客的部署方式。

## 当前环境

- 系统：Ubuntu 22.04.5 LTS
- 项目目录：`/home/dev/blog`
- Node：`v22.23.0`
- npm：`10.9.8`
- 当前用户：`dev`
- 当前限制：`dev` 用户需要 sudo 密码，因此自动化过程不能直接安装 Nginx 或写入 `/etc/nginx`

## 写文章

在 `content/posts` 目录新增 Markdown 文件：

```markdown
---
title: 文章标题
date: 2026-07-03
description: 文章摘要
---

正文内容。
```

## 构建

```bash
cd /home/dev/blog
npm run build
```

构建产物会生成到：

```text
/home/dev/blog/public
```

## 日常更新 Workflow

代码、样式或文章改完后，推荐使用统一发布流程：

```bash
cd /home/dev/blog
npm run build
npm run publish -- "Update blog"
```

`npm run publish` 会重新构建、提交 Git commit、推送到 GitHub，并触发 Netlify 和 GitHub Pages 自动部署。

给 agent 看的完整仓库结构和更新流程见：

```text
docs/update-workflow.md
```

## 临时预览

```bash
cd /home/dev/blog
npm run build
PORT=3000 npm run serve
```

如果服务器安全组或防火墙放行了 3000 端口，可以通过：

```text
http://服务器IP:3000
```

访问。

## 正式部署到 Nginx

需要有 sudo 权限的终端执行：

```bash
sudo apt-get update
sudo apt-get install -y nginx
```

新增 Nginx 配置：

```bash
sudo tee /etc/nginx/sites-available/blog >/dev/null <<'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name _;

    root /home/dev/blog/public;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }
}
EOF
```

启用站点并重载：

```bash
sudo ln -sf /etc/nginx/sites-available/blog /etc/nginx/sites-enabled/blog
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

访问：

```text
http://服务器IP
```

## 绑定域名

把域名 A 记录解析到服务器公网 IP，然后把 Nginx 配置里的：

```nginx
server_name _;
```

改成：

```nginx
server_name example.com www.example.com;
```

再执行：

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## 配置 HTTPS

域名解析生效后执行：

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d example.com -d www.example.com
```

按提示输入邮箱并确认，Certbot 会自动修改 Nginx 配置并开启续期。
