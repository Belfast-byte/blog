# 使用 Cloudflare Pages 托管博客

Cloudflare Pages 可以直接托管 `public` 目录里的静态文件。

## 当前项目配置

- 构建命令：`npm run build`
- 构建输出目录：`public`
- Cloudflare Pages 项目名：`personal-blog`
- 路径前缀：`/`

项目包含：

```text
wrangler.toml
```

其中 `pages_build_output_dir = "public"` 告诉 Cloudflare Pages 发布构建后的静态目录。

## 方式一：连接 GitHub 仓库

适合长期使用。每次推送 `main` 分支后，Cloudflare 自动构建并发布。

操作步骤：

1. 先把本地项目推送到 GitHub。
2. 打开 Cloudflare Dashboard。
3. 进入 `Workers & Pages`。
4. 选择 `Create application`。
5. 选择 `Pages`，再选择 `Connect to Git`。
6. 选择这个博客仓库。
7. 填写构建设置：

```text
Build command: npm run build
Build output directory: public
Root directory: /
```

环境变量通常不需要设置。Cloudflare Pages 默认托管在域名根路径，因此 `BASE_PATH` 使用 `/`。

## 方式二：Wrangler 命令发布

适合临时发布或不想先连接 Git 仓库。

第一次使用需要登录 Cloudflare：

```bash
npx wrangler login
```

发布：

```bash
npm run deploy:cloudflare
```

这个命令会先执行 `npm run build`，再把 `public` 上传到 Cloudflare Pages。

如果想换项目名，请同时修改：

- `package.json` 里的 `--project-name personal-blog`
- `wrangler.toml` 里的 `name = "personal-blog"`

## 自定义域名

发布成功后，在 Cloudflare Pages 项目里打开：

```text
Custom domains
```

添加你的域名。若域名 DNS 也托管在 Cloudflare，通常会自动配置 CNAME。
