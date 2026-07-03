# 在线 CMS 后台

本项目已按“静态博客 + CMS 后台 + Git 自动部署”的方式接入 Decap CMS。Decap CMS 是 Netlify CMS 的延续版本，用法和文章里的 Netlify CMS 基本一致。

## 已完成的项目配置

后台文件位于：

```text
static/admin/index.html
static/admin/config.yml
```

构建后会复制到：

```text
public/admin/index.html
public/admin/config.yml
```

线上后台地址：

```text
https://belfast-byte.github.io/blog/admin/
```

CMS 会读写 GitHub 仓库：

```text
Belfast-byte/blog
```

文章目录：

```text
content/posts
```

保存文章后，CMS 会提交到 `main` 分支，GitHub Actions 会自动重新构建并发布 GitHub Pages。

## 还需要完成的登录步骤

GitHub Pages 只能托管静态文件，不能自己处理 GitHub OAuth 回调。因此 `/admin/` 页面虽然可以部署出来，但登录还需要一个 OAuth 服务。

参考文章里的方案，有两种路线：

## 方案一：使用 Netlify Identity + Git Gateway

这是 Netlify CMS 最省心的方式。

需要把站点也接入 Netlify：

1. 在 Netlify 新建站点并连接 `Belfast-byte/blog` 仓库。
2. 构建命令填 `npm run build`。
3. 发布目录填 `public`。
4. 在 Netlify 站点里启用 `Identity`。
5. 启用 `Git Gateway` 并绑定这个 GitHub 仓库。
6. 把 `static/admin/config.yml` 的 `backend` 改成：

```yaml
backend:
  name: git-gateway
  branch: main
```

之后访问 Netlify 域名下的 `/admin/` 登录写文章。

## 方案二：使用 GitHub OAuth 代理

这更接近参考文章后半段的 Vercel 方案。

需要部署一个 OAuth 回调服务，例如 `netlify-cms-oauth-provider`，再把 `static/admin/config.yml` 的 `base_url` 改成这个服务的域名。

当前配置已经预留：

```yaml
backend:
  name: github
  repo: Belfast-byte/blog
  branch: main
  base_url: https://belfast-byte.github.io/blog
```

但 GitHub Pages 本身不能作为 OAuth 回调服务，所以这个 `base_url` 后续需要替换为 Vercel、Netlify Functions、Cloudflare Workers 或其他 serverless 服务地址。

## 本地脚本仍然可用

如果 CMS 登录还没配置完，仍然可以继续使用：

```bash
npm run new -- "文章标题"
npm run publish -- "Update blog"
```
