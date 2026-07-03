import { copyFile, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const postsDir = path.join(root, "content", "posts");
const publicDir = path.join(root, "public");
const staticDir = path.join(root, "static");
const basePath = normalizeBasePath(process.env.BASE_PATH || "/");

function normalizeBasePath(value) {
  if (!value || value === "/") return "/";
  const withLeadingSlash = value.startsWith("/") ? value : `/${value}`;
  return withLeadingSlash.endsWith("/") ? withLeadingSlash : `${withLeadingSlash}/`;
}

function assetPath(value) {
  return `${basePath}${value.replace(/^\//, "")}`;
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function slugify(fileName) {
  return fileName.replace(/\.md$/i, "");
}

async function copyStaticFiles(sourceDir, targetDir) {
  try {
    const entries = await readdir(sourceDir, { withFileTypes: true });
    await mkdir(targetDir, { recursive: true });

    for (const entry of entries) {
      const sourcePath = path.join(sourceDir, entry.name);
      const targetPath = path.join(targetDir, entry.name);

      if (entry.isDirectory()) {
        await copyStaticFiles(sourcePath, targetPath);
      } else if (entry.isFile()) {
        await copyFile(sourcePath, targetPath);
      }
    }
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
}

function parseFrontMatter(source, fileName) {
  const match = source.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) {
    throw new Error(`${fileName} is missing front matter`);
  }

  const data = {};
  for (const line of match[1].split("\n")) {
    const separator = line.indexOf(":");
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    data[key] = value.replace(/^["']|["']$/g, "");
  }

  if (!data.title || !data.date || !data.description) {
    throw new Error(`${fileName} must include title, date, and description`);
  }

  return { data, body: match[2].trim() };
}

function inlineMarkdown(text) {
  return escapeHtml(text)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}

function markdownToHtml(markdown) {
  const blocks = markdown.split(/\n{2,}/);
  return blocks
    .map((block) => {
      if (block.startsWith("# ")) {
        return `<h1>${inlineMarkdown(block.slice(2))}</h1>`;
      }
      if (block.startsWith("## ")) {
        return `<h2>${inlineMarkdown(block.slice(3))}</h2>`;
      }
      if (/^\d+\. /m.test(block)) {
        const items = block
          .split("\n")
          .filter(Boolean)
          .map((line) => line.replace(/^\d+\. /, ""))
          .map((line) => `<li>${inlineMarkdown(line)}</li>`)
          .join("");
        return `<ol>${items}</ol>`;
      }
      if (/^- /m.test(block)) {
        const items = block
          .split("\n")
          .filter(Boolean)
          .map((line) => line.replace(/^- /, ""))
          .map((line) => `<li>${inlineMarkdown(line)}</li>`)
          .join("");
        return `<ul>${items}</ul>`;
      }
      return `<p>${inlineMarkdown(block).replaceAll("\n", "<br>")}</p>`;
    })
    .join("\n");
}

function layout({ title, description, body }) {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${escapeHtml(description)}">
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="${assetPath("/assets/styles.css")}">
  <script src="https://identity.netlify.com/v1/netlify-identity-widget.js"></script>
</head>
<body>
  <header class="site-header">
    <a class="brand" href="${basePath}">我的博客</a>
    <nav>
      <a href="${basePath}">首页</a>
      <a href="${assetPath("/archive.html")}">归档</a>
    </nav>
  </header>
  <main class="container">
    ${body}
  </main>
  <footer class="site-footer">Built as a static blog.</footer>
  <script>
    if (window.netlifyIdentity) {
      window.netlifyIdentity.on("init", (user) => {
        const hasIdentityToken = /(?:invite_token|confirmation_token|recovery_token|email_change_token)=/.test(window.location.hash);
        if (!user && hasIdentityToken) {
          window.netlifyIdentity.open();
        }
        window.netlifyIdentity.on("login", () => {
          document.location.href = "${assetPath("/admin/")}";
        });
      });
    }
  </script>
</body>
</html>`;
}

async function main() {
  await rm(publicDir, { recursive: true, force: true });
  await mkdir(path.join(publicDir, "posts"), { recursive: true });
  await mkdir(path.join(publicDir, "assets"), { recursive: true });

  const files = (await readdir(postsDir)).filter((file) => file.endsWith(".md"));
  const posts = [];

  for (const file of files) {
    const source = await readFile(path.join(postsDir, file), "utf8");
    const { data, body } = parseFrontMatter(source, file);
    const slug = slugify(file);
    const post = { ...data, slug };
    posts.push(post);

    await writeFile(
      path.join(publicDir, "posts", `${slug}.html`),
      layout({
        title: `${data.title} - 我的博客`,
        description: data.description,
        body: `<article class="post">
  <p class="eyebrow">${escapeHtml(data.date)}</p>
  <h1>${escapeHtml(data.title)}</h1>
  <p class="lede">${escapeHtml(data.description)}</p>
  ${markdownToHtml(body)}
</article>`
      })
    );
  }

  posts.sort((a, b) => b.date.localeCompare(a.date));

  const postList = posts
    .map(
      (post) => `<article class="post-card">
  <time datetime="${escapeHtml(post.date)}">${escapeHtml(post.date)}</time>
  <h2><a href="${assetPath(`/posts/${post.slug}.html`)}">${escapeHtml(post.title)}</a></h2>
  <p>${escapeHtml(post.description)}</p>
</article>`
    )
    .join("\n");

  await writeFile(
    path.join(publicDir, "index.html"),
    layout({
      title: "我的博客",
      description: "个人博客首页",
      body: `<section class="hero">
  <p class="eyebrow">Personal Blog</p>
  <h1>我的博客</h1>
  <p>记录技术、生活和持续迭代的想法。</p>
</section>
<section class="post-list">
  ${postList}
</section>`
    })
  );

  await writeFile(
    path.join(publicDir, "archive.html"),
    layout({
      title: "归档 - 我的博客",
      description: "博客文章归档",
      body: `<h1>归档</h1>
<section class="archive">
  ${postList}
</section>`
    })
  );

  await writeFile(
    path.join(publicDir, ".nojekyll"),
    ""
  );

  await copyStaticFiles(staticDir, publicDir);

  await writeFile(
    path.join(publicDir, "assets", "styles.css"),
    `:root {
  color-scheme: light;
  --bg: #f7f5f0;
  --panel: #ffffff;
  --text: #24211d;
  --muted: #686058;
  --line: #ded8ce;
  --accent: #0b6b61;
  --accent-strong: #064d46;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  line-height: 1.65;
}

a {
  color: var(--accent);
  text-decoration-thickness: 1px;
  text-underline-offset: 3px;
}

.site-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  max-width: 960px;
  margin: 0 auto;
  padding: 24px;
}

.brand {
  color: var(--text);
  font-weight: 750;
  text-decoration: none;
}

nav {
  display: flex;
  gap: 18px;
}

nav a {
  color: var(--muted);
  text-decoration: none;
}

.container {
  max-width: 880px;
  margin: 0 auto;
  padding: 32px 24px 72px;
}

.hero {
  padding: 72px 0 56px;
  border-bottom: 1px solid var(--line);
}

.eyebrow,
time {
  color: var(--muted);
  font-size: 0.92rem;
}

h1,
h2 {
  line-height: 1.2;
}

h1 {
  margin: 10px 0 18px;
  font-size: clamp(2.2rem, 6vw, 4.5rem);
}

h2 {
  margin: 8px 0 8px;
  font-size: 1.45rem;
}

.hero p:last-child,
.lede {
  max-width: 680px;
  color: var(--muted);
  font-size: 1.15rem;
}

.post-list,
.archive {
  display: grid;
  gap: 18px;
  padding-top: 28px;
}

.post-card {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 22px;
}

.post-card p {
  margin-bottom: 0;
  color: var(--muted);
}

.post {
  max-width: 720px;
}

.post code {
  background: #ece7df;
  border-radius: 4px;
  padding: 0.1em 0.35em;
}

.site-footer {
  max-width: 960px;
  margin: 0 auto;
  padding: 24px;
  border-top: 1px solid var(--line);
  color: var(--muted);
  font-size: 0.92rem;
}

@media (max-width: 640px) {
  .site-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .container {
    padding-top: 12px;
  }

  .hero {
    padding-top: 42px;
  }
}
`
  );

  console.log(`Built ${posts.length} post(s) into ${publicDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
