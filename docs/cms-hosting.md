# 在线 CMS 后台

本项目已按“静态博客 + CMS 后台 + Git 自动部署”的方式接入 Decap CMS。Decap CMS 是 Netlify CMS 的延续版本，用法和参考文章里的 Netlify CMS 基本一致。

## 已完成的项目配置

后台源文件位于：

```text
static/admin/index.html
static/admin/config.yml
```

构建后会复制到：

```text
public/admin/index.html
public/admin/config.yml
```

项目已包含 Netlify 构建配置：

```text
netlify.toml
```

配置内容：

```toml
[build]
  command = "npm run build"
  publish = "public"
```

CMS 当前使用 Netlify Identity + Git Gateway：

```yaml
backend:
  name: git-gateway
  branch: main
```

文章目录：

```text
content/posts
```

保存文章后，Git Gateway 会把 Markdown 提交到 GitHub 仓库 `Belfast-byte/blog` 的 `main` 分支，随后 Netlify 和 GitHub Pages 都会被 Git 推送触发并重新构建。

## Netlify 控制台设置

需要在 Netlify 控制台完成一次站点连接和身份验证设置：

1. 打开 Netlify，选择 `Add new site`。
2. 选择 `Import an existing project`。
3. 连接 GitHub 仓库 `Belfast-byte/blog`。
4. 构建命令填 `npm run build`。
5. 发布目录填 `public`。
6. 部署完成后，进入站点的 `Identity`。
7. 点击 `Enable Identity`。
8. 在 `Identity -> Registration preferences` 中选择 `Invite only`。
9. 在 `Identity -> Services` 中启用 `Git Gateway`。
10. 在 `Identity -> Invite users` 邀请自己的邮箱。

完成后，访问 Netlify 域名下的后台：

```text
https://你的站点名.netlify.app/admin/
```

使用被邀请的邮箱登录后，就可以在网页里新建、编辑和发布文章。

## GitHub Pages 注意事项

GitHub Pages 上也会有后台静态页面：

```text
https://belfast-byte.github.io/blog/admin/
```

但 GitHub Pages 不能提供 Netlify Identity 的 `/.netlify/identity` 和 Git Gateway 接口，所以这个地址不能用于登录写文章。真正写文章请使用 Netlify 域名下的 `/admin/`。

## 本地脚本仍然可用

如果暂时还没配置完 Netlify Identity，仍然可以继续使用：

```bash
npm run new -- "文章标题"
npm run publish -- "Update blog"
```
