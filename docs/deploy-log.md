# 部署过程记录和踩坑

## 2026-07-03

### 1. 检查项目目录

结果：

- `/home/dev/blog` 是空目录
- 当前目录不是 git 仓库

处理：

- 从零创建了一个轻量静态博客项目
- 不引入外部框架，降低服务器部署依赖

### 2. 检查服务器环境

结果：

- 系统是 Ubuntu 22.04.5 LTS
- Node 已安装：`v22.23.0`
- npm 已安装：`10.9.8`
- Nginx 未安装
- 当前用户是 `dev`，属于 sudo 组

### 3. 踩坑：无法无交互执行 sudo

执行：

```bash
sudo -n true
```

结果：

```text
sudo: a password is required
```

影响：

- 不能直接安装 Nginx
- 不能直接写 `/etc/nginx/sites-available`
- 不能直接重载 Nginx
- 不能直接监听 80/443 端口

处理：

- 先完成博客代码、构建脚本和本地预览服务
- 把需要 sudo 的正式部署命令写入 `docs/deploy-runbook.md`

### 4. 当前方案

采用静态站点部署：

- Markdown 文章放在 `content/posts`
- `npm run build` 生成 `public`
- Nginx 直接托管 `/home/dev/blog/public`

优点：

- 不需要常驻 Node 进程
- 故障面小
- 后续备份和迁移简单

### 5. 构建验证

执行：

```bash
npm run build
```

结果：

```text
Built 1 post(s) into /home/dev/blog/public
```

生成文件：

```text
public/archive.html
public/assets/styles.css
public/index.html
public/posts/hello.html
```

### 6. 临时预览验证

执行：

```bash
PORT=3000 npm run serve
```

本机请求结果：

- `http://127.0.0.1:3000/` 返回 `200 OK`
- `http://127.0.0.1:3000/posts/hello.html` 返回 `200 OK`

说明：

- 博客生成逻辑可用
- 静态资源路径可用
- 下一步是用 sudo 完成 Nginx 正式托管

### 7. GitHub Pages 适配

GitHub Pages 的项目站点通常不是挂在域名根路径，而是：

```text
https://用户名.github.io/仓库名/
```

如果页面里写死 `/assets/styles.css`，浏览器会请求：

```text
https://用户名.github.io/assets/styles.css
```

这会导致样式丢失。

处理：

- 构建脚本支持 `BASE_PATH`
- GitHub Actions 里默认设置 `BASE_PATH: /${{ github.event.repository.name }}/`
- 如果使用自定义域名或 `用户名.github.io` 仓库，可以把 `BASE_PATH` 改为 `/`

### 8. 踩坑：不能并行写同一个构建目录

验证 GitHub Pages 路径时，同时跑了两个构建命令：

- 默认根路径构建
- `BASE_PATH=/blog/` 构建

两个进程都会删除并重建 `public`，导致其中一个进程刚构建完，另一个进程又删除了目录。

处理：

- 同一个项目的构建验证要串行执行
- CI 里也应避免多个 job 同时写同一个工作目录

### 9. 2026-07-03 复查部署进度

执行：

```bash
npm run build
```

结果：

```text
Built 1 post(s) into /home/dev/blog/public
```

生成文件：

```text
public/.nojekyll
public/archive.html
public/assets/styles.css
public/index.html
public/posts/hello.html
```

当前状态：

- 静态网页已生成，可以直接发布 `public` 目录
- Git 仓库还没有首个提交
- 未配置远程仓库 `origin`
- 本机没有安装 `gh`
- 本机没有安装 `wrangler`
- 已补充 Cloudflare Pages 配置和说明

下一步：

- 如果选 GitHub Pages：创建 GitHub 仓库，推送代码，开启 Pages 的 GitHub Actions 发布源
- 如果选 Cloudflare Pages：连接 GitHub 仓库，或执行 `npx wrangler login` 后运行 `npm run deploy:cloudflare`
