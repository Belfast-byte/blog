# 使用 GitHub 托管博客

这个项目支持两种 GitHub 用法：

1. GitHub 托管源码，服务器执行 `git pull && npm run build` 后由 Nginx 发布。
2. GitHub Pages 直接托管静态网站，不需要自己的服务器。

## 方案一：GitHub 托管源码，服务器发布

适合已经有云服务器，并希望域名、Nginx、HTTPS 都由自己控制。

### 1. 创建 GitHub 仓库

在 GitHub 创建一个空仓库，例如：

```text
blog
```

不要勾选自动创建 README、`.gitignore` 或 license，因为本地项目已经有文件。

### 2. 推送本地代码

在服务器上执行：

```bash
cd /home/dev/blog
git init
git branch -M main
git add .
git commit -m "Initial blog site"
git remote add origin git@github.com:你的用户名/blog.git
git push -u origin main
```

如果没有配置 SSH key，也可以使用 HTTPS remote：

```bash
git remote add origin https://github.com/你的用户名/blog.git
```

### 3. 之后更新文章

```bash
cd /home/dev/blog
git pull
npm run build
```

如果 Nginx 指向 `/home/dev/blog/public`，构建完成后网站内容就更新了。

## 方案二：GitHub Pages 直接托管

适合不想维护服务器，只想让 GitHub 发布静态网站。

项目已经包含 GitHub Actions 工作流：

```text
.github/workflows/pages.yml
```

工作流会在推送到 `main` 分支时执行：

```bash
npm run build
```

然后把 `public` 目录发布到 GitHub Pages。

### 1. 推送代码

同方案一，先把代码推送到 GitHub。

### 2. 开启 Pages

在 GitHub 仓库页面操作：

1. 打开 `Settings`
2. 打开 `Pages`
3. `Build and deployment` 的 `Source` 选择 `GitHub Actions`
4. 回到 `Actions` 页面等待部署完成

部署完成后，默认访问地址通常是：

```text
https://你的用户名.github.io/blog/
```

GitHub 官方文档说明：GitHub Pages 可以使用分支作为发布源，也可以使用 GitHub Actions 自定义构建发布；对于自定义构建流程，推荐用 GitHub Actions 发布构建产物。

## 路径前缀说明

GitHub Pages 的项目站点通常挂在 `/仓库名/` 路径下，例如：

```text
https://你的用户名.github.io/blog/
```

所以工作流里设置了：

```yaml
BASE_PATH: /${{ github.event.repository.name }}/
```

这样 CSS、文章链接和归档页链接都能在 GitHub Pages 项目站点下正常工作。

如果你的仓库名是：

```text
你的用户名.github.io
```

或者你给 GitHub Pages 绑定了自定义域名，并希望网站挂在根路径 `/`，把 `.github/workflows/pages.yml` 里的：

```yaml
BASE_PATH: /${{ github.event.repository.name }}/
```

改成：

```yaml
BASE_PATH: /
```

## 当前服务器注意事项

本机没有安装 GitHub CLI `gh`，所以目前不能直接用命令创建 GitHub 仓库。

可以选择：

- 在 GitHub 网页创建仓库，然后用 `git remote add origin ...` 推送
- 安装 GitHub CLI 后执行 `gh auth login` 和 `gh repo create`

安装 `gh` 也需要 sudo 权限，当前自动化过程无法无交互执行 sudo。
