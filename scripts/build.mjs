import { copyFile, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const postsDir = path.join(root, "content", "posts");
const publicDir = path.join(root, "public");
const staticDir = path.join(root, "static");
const basePath = normalizeBasePath(process.env.BASE_PATH || "/");

const site = {
  name: "Cache Atlas",
  description: "A premium technical journal for backend architecture, caching strategy, and production systems design."
};

const projects = [
  {
    title: "Library Management System",
    description: "A role-aware catalog and circulation platform with reservation queues, audit trails, and resilient search.",
    tags: ["Spring Boot", "Redis", "PostgreSQL"],
    visualClass: "project-visual-library",
    visualLabel: "Catalog dashboard preview for the library management system"
  },
  {
    title: "AI Text Analysis Agent",
    description: "A lightweight agent that classifies documents, extracts entities, and produces review-ready summaries.",
    tags: ["LLM Agent", "Vector Search", "Python"],
    visualClass: "project-visual-agent",
    visualLabel: "Analysis pipeline preview for the AI text analysis agent"
  }
];

function normalizeBasePath(value) {
  if (!value || value === "/") return "/";
  const withLeadingSlash = value.startsWith("/") ? value : `/${value}`;
  return withLeadingSlash.endsWith("/") ? withLeadingSlash : `${withLeadingSlash}/`;
}

function assetPath(value) {
  return `${basePath}${value.replace(/^\//, "")}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function slugify(fileName) {
  return fileName.replace(/\.md$/i, "");
}

function sanitizeClassName(value) {
  return String(value || "text")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "text";
}

function parseTags(value = "") {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function estimateReadingTime(markdown) {
  const textOnly = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[>#*`[\]()_-]/g, " ");
  const words = textOnly.trim().split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.ceil(words / 220))} min read`;
}

function formatDate(value) {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  }).format(date);
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
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}

function highlightCode(code, language) {
  const normalized = sanitizeClassName(language);
  const rulesByLanguage = {
    java: [
      { name: "comment", pattern: "\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/" },
      { name: "string", pattern: "\"(?:\\\\.|[^\"\\\\])*\"|'(?:\\\\.|[^'\\\\])*'" },
      { name: "annotation", pattern: "@[A-Za-z_][\\w.]*" },
      { name: "keyword", pattern: "\\b(?:public|private|protected|class|record|interface|enum|return|if|else|new|final|var|void|int|long|boolean|String|List|Map|Optional|static|try|catch|throw|throws|extends|implements)\\b" },
      { name: "number", pattern: "\\b\\d+(?:\\.\\d+)?\\b" }
    ],
    sql: [
      { name: "comment", pattern: "--[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/" },
      { name: "string", pattern: "'(?:''|[^'])*'" },
      { name: "keyword", pattern: "\\b(?:SELECT|FROM|WHERE|JOIN|LEFT|RIGHT|INNER|OUTER|ON|AND|OR|WITH|AS|GROUP|BY|ORDER|LIMIT|INSERT|UPDATE|DELETE|CREATE|INDEX|EXPLAIN|ANALYZE|INTERVAL|NOW|DESC|ASC)\\b" },
      { name: "function", pattern: "\\b[A-Z_]+(?=\\()" },
      { name: "number", pattern: "\\b\\d+(?:\\.\\d+)?\\b" }
    ]
  };
  const rules = rulesByLanguage[normalized];

  if (!rules) {
    return escapeHtml(code);
  }

  const pattern = new RegExp(rules.map((rule) => `(?<${rule.name}>${rule.pattern})`).join("|"), "g");
  let highlighted = "";
  let cursor = 0;

  for (const match of code.matchAll(pattern)) {
    const tokenType = Object.keys(match.groups).find((name) => match.groups[name] !== undefined);
    highlighted += escapeHtml(code.slice(cursor, match.index));
    highlighted += `<span class="token token-${tokenType}">${escapeHtml(match[0])}</span>`;
    cursor = match.index + match[0].length;
  }

  return highlighted + escapeHtml(code.slice(cursor));
}

function renderCodeBlock(language, code) {
  const safeLanguage = sanitizeClassName(language);

  return `<div class="code-window">
  <div class="code-toolbar">
    <div class="window-controls" aria-hidden="true">
      <span></span>
      <span></span>
      <span></span>
    </div>
    <span class="code-label">${escapeHtml(safeLanguage)}</span>
    <button class="copy-button" type="button">Copy</button>
  </div>
  <pre><code class="language-${safeLanguage}">${highlightCode(code, safeLanguage)}</code></pre>
</div>`;
}

function markdownToBlocks(markdown) {
  const lines = markdown.split(/\r?\n/);
  const blocks = [];
  let index = 0;

  while (index < lines.length) {
    if (!lines[index].trim()) {
      index += 1;
      continue;
    }

    if (lines[index].startsWith("```")) {
      const language = lines[index].slice(3).trim() || "text";
      const codeLines = [];
      index += 1;

      while (index < lines.length && !lines[index].startsWith("```")) {
        codeLines.push(lines[index]);
        index += 1;
      }

      blocks.push({ type: "code", language, content: codeLines.join("\n") });
      index += 1;
      continue;
    }

    const blockLines = [];
    while (index < lines.length && lines[index].trim() && !lines[index].startsWith("```")) {
      blockLines.push(lines[index]);
      index += 1;
    }
    blocks.push({ type: "markdown", content: blockLines.join("\n") });
  }

  return blocks;
}

function renderMarkdownBlock(block) {
  if (block.type === "code") {
    return renderCodeBlock(block.language, block.content);
  }

  const content = block.content;

  if (content.startsWith("### ")) {
    return `<h3>${inlineMarkdown(content.slice(4))}</h3>`;
  }
  if (content.startsWith("## ")) {
    return `<h2>${inlineMarkdown(content.slice(3))}</h2>`;
  }
  if (content.startsWith("# ")) {
    return `<h2>${inlineMarkdown(content.slice(2))}</h2>`;
  }
  if (content.split("\n").every((line) => line.startsWith(">"))) {
    const quote = content
      .split("\n")
      .map((line) => line.replace(/^>\s?/, ""))
      .join("\n");
    return `<blockquote><p>${inlineMarkdown(quote).replaceAll("\n", "<br>")}</p></blockquote>`;
  }
  if (/^\d+\. /m.test(content)) {
    const items = content
      .split("\n")
      .filter(Boolean)
      .map((line) => line.replace(/^\d+\. /, ""))
      .map((line) => `<li>${inlineMarkdown(line)}</li>`)
      .join("");
    return `<ol>${items}</ol>`;
  }
  if (/^- /m.test(content)) {
    const items = content
      .split("\n")
      .filter(Boolean)
      .map((line) => line.replace(/^- /, ""))
      .map((line) => `<li>${inlineMarkdown(line)}</li>`)
      .join("");
    return `<ul>${items}</ul>`;
  }

  return `<p>${inlineMarkdown(content).replaceAll("\n", "<br>")}</p>`;
}

function markdownToHtml(markdown) {
  return markdownToBlocks(markdown)
    .map(renderMarkdownBlock)
    .join("\n");
}

function renderTagList(tags, className = "tag-list") {
  if (!tags.length) return "";
  return `<ul class="${className}" aria-label="Tags">
  ${tags.map((tag) => `<li>${escapeHtml(tag)}</li>`).join("\n  ")}
</ul>`;
}

function renderMeta(post) {
  return `<div class="article-meta" aria-label="Article metadata">
  <span><time datetime="${escapeHtml(post.date)}">${escapeHtml(formatDate(post.date))}</time></span>
  <span>${escapeHtml(post.readingTime)}</span>
  ${post.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("\n  ")}
</div>`;
}

function renderNav() {
  return `<header class="site-header">
  <!-- Sticky frosted navigation keeps the editorial frame visible while reading. -->
  <div class="nav-shell">
    <a class="brand" href="${basePath}" aria-label="${escapeHtml(site.name)} home">
      <span class="brand-mark" aria-hidden="true">CA</span>
      <span>${escapeHtml(site.name)}</span>
    </a>
    <nav class="site-nav" aria-label="Primary navigation">
      <a href="${basePath}">Home</a>
      <a href="${basePath}#projects">Projects</a>
      <a href="${basePath}#articles">Articles</a>
      <a href="${basePath}#about">About</a>
    </nav>
  </div>
</header>`;
}

function layout({ title, description, body, pageClass = "" }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${escapeHtml(description)}">
  <title>${escapeHtml(title)}</title>
  <!-- Editorial type stack: Lora for headings, Inter for body, JetBrains Mono for code. -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Lora:wght@500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="${assetPath("/assets/styles.css")}">
</head>
<body class="${escapeHtml(pageClass)}">
  <a class="skip-link" href="#main-content">Skip to content</a>
  ${renderNav()}
  <main id="main-content">
    ${body}
  </main>
  <footer class="site-footer">
    <p>${escapeHtml(site.name)} publishes field notes on backend systems, cache behavior, and durable product engineering.</p>
  </footer>
  <script>
    // Load Netlify Identity on public pages only for invite/confirmation links.
    // Normal readers should never be redirected into the CMS login flow.
    (() => {
      const hasIdentityToken = /(?:invite_token|confirmation_token|recovery_token|email_change_token)=/.test(window.location.hash);
      if (!hasIdentityToken) return;

      const script = document.createElement("script");
      script.src = "https://identity.netlify.com/v1/netlify-identity-widget.js";
      script.onload = () => {
        if (!window.netlifyIdentity) return;
        window.netlifyIdentity.on("login", () => {
          document.location.href = "${assetPath("/admin/")}";
        });
        window.netlifyIdentity.open();
      };
      document.head.appendChild(script);
    })();

    // Copy buttons are intentionally tiny: useful for code-heavy posts without turning the blog into an app.
    document.querySelectorAll(".copy-button").forEach((button) => {
      button.addEventListener("click", async () => {
        const code = button.closest(".code-window")?.querySelector("code")?.textContent || "";
        try {
          await navigator.clipboard.writeText(code);
          button.textContent = "Copied";
          window.setTimeout(() => {
            button.textContent = "Copy";
          }, 1600);
        } catch {
          button.textContent = "Select";
        }
      });
    });
  </script>
</body>
</html>`;
}

function renderPostCard(post, featured = false) {
  const cardClass = featured ? "post-card post-card-featured" : "post-card";

  return `<article class="${cardClass}">
  <div class="card-kicker">
    <time datetime="${escapeHtml(post.date)}">${escapeHtml(formatDate(post.date))}</time>
    <span>${escapeHtml(post.readingTime)}</span>
  </div>
  <h3><a href="${assetPath(`/posts/${post.slug}.html`)}">${escapeHtml(post.title)}</a></h3>
  <p>${escapeHtml(post.description)}</p>
  ${renderTagList(post.tags)}
</article>`;
}

function renderProjectCard(project) {
  return `<article class="project-card">
  <div class="project-visual ${escapeHtml(project.visualClass)}" role="img" aria-label="${escapeHtml(project.visualLabel)}">
    <span class="visual-line"></span>
    <span class="visual-line"></span>
    <span class="visual-chip">${escapeHtml(project.tags[0])}</span>
  </div>
  <div class="project-content">
    <h3>${escapeHtml(project.title)}</h3>
    <p>${escapeHtml(project.description)}</p>
    ${renderTagList(project.tags, "tag-list project-tags")}
  </div>
</article>`;
}

function renderHome(posts) {
  const featuredPost = posts[0];
  const otherPosts = posts.slice(1);

  return `<section class="hero" aria-labelledby="hero-title">
  <div class="hero-copy">
    <p class="eyebrow">Backend Architecture Journal</p>
    <h1 id="hero-title">Elegant notes for systems that must stay fast.</h1>
    <p>Cache Atlas is a light-theme technical blog for engineers who care about latency, readable code, and operational clarity.</p>
    <div class="hero-actions" aria-label="Primary actions">
      <a class="button button-primary" href="${assetPath(`/posts/${featuredPost.slug}.html`)}">Read the latest essay</a>
      <a class="button button-secondary" href="#projects">View projects</a>
    </div>
  </div>
  <!-- Signature element: a quiet cache-flow map that turns backend architecture into an editorial motif. -->
  <aside class="system-map" aria-label="Cache strategy map">
    <div class="map-header">
      <span>request path</span>
      <strong>Cache-aside flow</strong>
    </div>
    <ol>
      <li>
        <span>01</span>
        <div>
          <strong>Edge lookup</strong>
          <small>short TTL, stale-while-revalidate</small>
        </div>
      </li>
      <li>
        <span>02</span>
        <div>
          <strong>Service cache</strong>
          <small>Redis hash by bounded aggregate</small>
        </div>
      </li>
      <li>
        <span>03</span>
        <div>
          <strong>Source of truth</strong>
          <small>indexed read model with explicit invalidation</small>
        </div>
      </li>
    </ol>
  </aside>
</section>

<section class="section article-section" id="articles" aria-labelledby="articles-title">
  <div class="section-header">
    <p class="eyebrow">Articles</p>
    <h2 id="articles-title">Architecture essays with production bias.</h2>
  </div>
  <div class="post-grid">
    ${renderPostCard(featuredPost, true)}
    ${otherPosts.map((post) => renderPostCard(post)).join("\n    ")}
  </div>
</section>

<section class="section" id="projects" aria-labelledby="projects-title">
  <div class="section-header">
    <p class="eyebrow">Projects</p>
    <h2 id="projects-title">Selected systems and experiments.</h2>
  </div>
  <div class="project-grid">
    ${projects.map(renderProjectCard).join("\n    ")}
  </div>
</section>

<section class="about-band" id="about" aria-labelledby="about-title">
  <p class="eyebrow">About</p>
  <h2 id="about-title">Written for builders who debug from first principles.</h2>
  <p>The blog keeps a narrow editorial lane: backend architecture, caching decisions, code that reads cleanly under pressure, and the operational tradeoffs that shape real systems.</p>
</section>`;
}

function renderArticle(post, html) {
  return `<article class="article-shell">
  <header class="article-hero">
    <p class="eyebrow">Architecture Essay</p>
    <h1>${escapeHtml(post.title)}</h1>
    ${renderMeta(post)}
    <p class="article-deck">${escapeHtml(post.description)}</p>
  </header>
  <!-- The body wrapper scopes readable measure, drop caps, code windows, and blockquotes. -->
  <div class="post-body">
    ${html}
  </div>
</article>`;
}

function renderArchive(posts) {
  return `<section class="archive-hero" aria-labelledby="archive-title">
  <p class="eyebrow">Articles</p>
  <h1 id="archive-title">All field notes.</h1>
  <p>Essays, implementation notes, and production architecture references in reverse chronological order.</p>
</section>
<section class="archive-grid" aria-label="Article archive">
  ${posts.map((post) => renderPostCard(post)).join("\n  ")}
</section>`;
}

const styles = `/* ==========================================================================
   Cache Atlas premium blog system
   --------------------------------------------------------------------------
   Design tokens mirror the brief: warm off-white canvas, white cards, dark
   editorial text, muted sage accents, and diffuse elevation.
   ========================================================================== */

:root {
  color-scheme: light;
  --bg: #FAFAFA;
  --panel: #FFFFFF;
  --text: #111827;
  --body: #374151;
  --muted: #6B7280;
  --line: rgba(17, 24, 39, 0.09);
  --accent: #526B5D;
  --accent-strong: #3F5448;
  --slate: #475569;
  --code-bg: #1E293B;
  --code-line: rgba(255, 255, 255, 0.08);
  --tag-bg: #EEF3EF;
  --shadow-soft: 0 4px 20px -2px rgba(0, 0, 0, 0.05);
  --shadow-lift: 0 22px 60px -34px rgba(17, 24, 39, 0.28);
  --radius: 8px;
  --serif: "Lora", Georgia, "Times New Roman", serif;
  --sans: "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --mono: "JetBrains Mono", "Fira Code", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

* {
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
}

body {
  margin: 0;
  background:
    linear-gradient(180deg, rgba(238, 243, 239, 0.55), rgba(250, 250, 250, 0) 360px),
    var(--bg);
  color: var(--body);
  font-family: var(--sans);
  font-size: 16px;
  line-height: 1.75;
  text-rendering: optimizeLegibility;
}

body::before {
  /* A nearly invisible paper grain keeps the light theme from feeling flat. */
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  content: "";
  opacity: 0.38;
  background-image:
    radial-gradient(circle at 1px 1px, rgba(17, 24, 39, 0.06) 1px, transparent 0);
  background-size: 28px 28px;
}

a {
  color: var(--accent);
  text-decoration-thickness: 1px;
  text-underline-offset: 0.22em;
  transition: all 0.3s ease;
}

a:hover {
  color: var(--accent-strong);
}

a:focus-visible,
button:focus-visible {
  border-radius: 6px;
  outline: 2px solid var(--accent);
  outline-offset: 4px;
}

img,
svg {
  display: block;
  max-width: 100%;
}

/* Header ------------------------------------------------------------------ */

.skip-link {
  position: fixed;
  top: 16px;
  left: 16px;
  z-index: 20;
  transform: translateY(-160%);
  border-radius: 999px;
  background: var(--text);
  color: var(--panel);
  padding: 10px 14px;
  font-weight: 700;
  text-decoration: none;
}

.skip-link:focus {
  transform: translateY(0);
}

.site-header {
  position: sticky;
  top: 0;
  z-index: 10;
  border-bottom: 1px solid rgba(17, 24, 39, 0.06);
  background: rgba(250, 250, 250, 0.78);
  backdrop-filter: blur(8px);
}

.nav-shell {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 28px;
  width: min(1120px, calc(100% - 40px));
  margin: 0 auto;
  padding: 16px 0;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: var(--text);
  font-family: var(--serif);
  font-weight: 700;
  letter-spacing: 0;
  text-decoration: none;
}

.brand-mark {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  border: 1px solid rgba(82, 107, 93, 0.22);
  border-radius: 50%;
  background: var(--panel);
  box-shadow: var(--shadow-soft);
  color: var(--accent-strong);
  font-family: var(--sans);
  font-size: 0.72rem;
  font-weight: 800;
}

.site-nav {
  display: flex;
  align-items: center;
  gap: clamp(14px, 3vw, 30px);
}

.site-nav a {
  color: var(--muted);
  font-size: 0.9rem;
  font-weight: 600;
  text-decoration: none;
}

.site-nav a:hover {
  color: var(--text);
}

/* Shared layout ----------------------------------------------------------- */

#main-content {
  width: min(1120px, calc(100% - 40px));
  margin: 0 auto;
}

.eyebrow,
.card-kicker,
.article-meta,
.code-label {
  color: var(--muted);
  font-family: var(--sans);
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  line-height: 1.3;
  text-transform: uppercase;
}

h1,
h2,
h3 {
  margin: 0;
  color: var(--text);
  font-family: var(--serif);
  font-weight: 700;
  letter-spacing: 0;
  line-height: 1.08;
}

h1 {
  font-size: clamp(3rem, 8vw, 6.8rem);
}

h2 {
  font-size: clamp(2rem, 4.8vw, 4.15rem);
}

h3 {
  font-size: clamp(1.35rem, 2.2vw, 1.85rem);
}

.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  border-radius: 999px;
  padding: 0 18px;
  font-weight: 700;
  text-decoration: none;
  transition: all 0.3s ease;
}

.button-primary {
  background: var(--accent);
  color: var(--panel);
  box-shadow: 0 14px 28px -18px rgba(82, 107, 93, 0.72);
}

.button-primary:hover {
  background: var(--accent-strong);
  color: var(--panel);
  transform: translateY(-2px);
}

.button-secondary {
  border: 1px solid rgba(82, 107, 93, 0.22);
  background: rgba(255, 255, 255, 0.72);
  color: var(--accent-strong);
}

.button-secondary:hover {
  border-color: rgba(82, 107, 93, 0.34);
  background: var(--panel);
  transform: translateY(-2px);
}

/* Hero -------------------------------------------------------------------- */

.hero {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(310px, 0.64fr);
  gap: clamp(36px, 6vw, 78px);
  align-items: center;
  min-height: calc(100svh - 72px);
  padding: clamp(56px, 9vw, 104px) 0 clamp(42px, 7vw, 84px);
}

.hero-copy {
  max-width: 760px;
}

.hero-copy h1 {
  margin-top: 18px;
  max-width: 11ch;
}

.hero-copy p:not(.eyebrow) {
  max-width: 60ch;
  margin: 24px 0 0;
  color: var(--body);
  font-size: clamp(1.05rem, 2vw, 1.24rem);
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 32px;
}

.system-map {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(17, 24, 39, 0.07);
  border-radius: var(--radius);
  background: rgba(255, 255, 255, 0.82);
  box-shadow: var(--shadow-lift);
  padding: 22px;
}

.system-map::before {
  position: absolute;
  inset: -40% auto auto -16%;
  width: 220px;
  height: 220px;
  border: 1px solid rgba(82, 107, 93, 0.18);
  border-radius: 50%;
  content: "";
}

.map-header {
  position: relative;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  border-bottom: 1px solid var(--line);
  padding-bottom: 16px;
}

.map-header span {
  color: var(--muted);
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.map-header strong {
  max-width: 12ch;
  color: var(--text);
  font-family: var(--serif);
  font-size: 1.35rem;
  line-height: 1.15;
  text-align: right;
}

.system-map ol {
  position: relative;
  display: grid;
  gap: 16px;
  margin: 20px 0 0;
  padding: 0;
  list-style: none;
}

.system-map li {
  display: grid;
  grid-template-columns: 42px 1fr;
  gap: 14px;
  align-items: start;
  border-radius: var(--radius);
  background: rgba(250, 250, 250, 0.74);
  padding: 14px;
  transition: all 0.3s ease;
}

.system-map li:hover {
  background: var(--panel);
  box-shadow: var(--shadow-soft);
  transform: translateY(-2px);
}

.system-map li > span {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border-radius: 50%;
  background: var(--tag-bg);
  color: var(--accent-strong);
  font-family: var(--mono);
  font-size: 0.72rem;
  font-weight: 700;
}

.system-map strong {
  display: block;
  color: var(--text);
  font-weight: 700;
}

.system-map small {
  display: block;
  margin-top: 2px;
  color: var(--muted);
  font-size: 0.84rem;
  line-height: 1.5;
}

/* Article and project cards ---------------------------------------------- */

.section {
  padding: clamp(58px, 9vw, 112px) 0;
  border-top: 1px solid var(--line);
}

.section-header {
  display: grid;
  grid-template-columns: minmax(140px, 0.28fr) minmax(0, 0.72fr);
  gap: clamp(20px, 5vw, 64px);
  align-items: end;
  margin-bottom: clamp(28px, 5vw, 44px);
}

.section-header h2 {
  max-width: 13ch;
}

.post-grid,
.archive-grid,
.project-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 22px;
}

.post-card,
.project-card {
  border: 1px solid rgba(17, 24, 39, 0.06);
  border-radius: var(--radius);
  background: var(--panel);
  box-shadow: var(--shadow-soft);
  transition: all 0.3s ease;
}

.post-card:hover,
.project-card:hover {
  box-shadow: var(--shadow-lift);
  transform: translateY(-4px);
}

.post-card {
  display: flex;
  min-height: 268px;
  flex-direction: column;
  padding: clamp(22px, 4vw, 34px);
}

.post-card-featured {
  grid-column: span 2;
  min-height: 310px;
}

.card-kicker,
.article-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.card-kicker span::before,
.article-meta span + span::before {
  padding-right: 10px;
  color: rgba(107, 114, 128, 0.48);
  content: "/";
}

.post-card h3 {
  margin-top: 18px;
  max-width: 19ch;
}

.post-card h3 a {
  color: inherit;
  text-decoration: none;
}

.post-card h3 a:hover {
  color: var(--accent-strong);
}

.post-card p {
  display: -webkit-box;
  overflow: hidden;
  max-width: 62ch;
  margin: 16px 0 0;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  color: var(--body);
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: auto 0 0;
  padding: 24px 0 0;
  list-style: none;
}

.tag-list li {
  border-radius: 999px;
  background: var(--tag-bg);
  color: var(--accent-strong);
  padding: 5px 10px;
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1.3;
}

.project-card {
  overflow: hidden;
}

.project-visual {
  position: relative;
  min-height: 210px;
  overflow: hidden;
  background:
    linear-gradient(135deg, rgba(82, 107, 93, 0.16), rgba(71, 85, 105, 0.10)),
    #F4F6F5;
}

.project-visual::before,
.project-visual::after {
  position: absolute;
  content: "";
}

.project-visual::before {
  inset: 28px 26px auto;
  height: 84px;
  border-radius: var(--radius);
  background: rgba(255, 255, 255, 0.76);
  box-shadow: var(--shadow-soft);
}

.project-visual::after {
  right: 30px;
  bottom: 28px;
  width: 42%;
  height: 78px;
  border-radius: var(--radius);
  background: rgba(30, 41, 59, 0.82);
  box-shadow: 0 18px 30px -22px rgba(17, 24, 39, 0.45);
}

.project-visual-agent {
  background:
    radial-gradient(circle at 76% 26%, rgba(82, 107, 93, 0.22), transparent 28%),
    linear-gradient(135deg, rgba(71, 85, 105, 0.10), rgba(82, 107, 93, 0.14)),
    #F7F8F7;
}

.visual-line {
  position: absolute;
  left: 46px;
  z-index: 1;
  width: min(48%, 220px);
  height: 8px;
  border-radius: 999px;
  background: rgba(82, 107, 93, 0.28);
}

.visual-line:first-child {
  top: 55px;
}

.visual-line:nth-child(2) {
  top: 78px;
  width: min(34%, 170px);
  background: rgba(71, 85, 105, 0.18);
}

.visual-chip {
  position: absolute;
  right: 28px;
  bottom: 34px;
  z-index: 1;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.92);
  color: var(--accent-strong);
  padding: 7px 11px;
  font-size: 0.76rem;
  font-weight: 800;
}

.project-content {
  padding: 24px;
}

.project-content p {
  display: -webkit-box;
  overflow: hidden;
  margin: 12px 0 0;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.project-tags {
  padding-top: 20px;
}

.about-band {
  margin: clamp(58px, 8vw, 96px) 0 clamp(72px, 10vw, 124px);
  border-left: 6px solid var(--accent);
  background: var(--panel);
  box-shadow: var(--shadow-soft);
  padding: clamp(24px, 6vw, 54px);
}

.about-band h2 {
  max-width: 15ch;
  margin-top: 12px;
}

.about-band p:last-child {
  max-width: 65ch;
  margin: 20px 0 0;
}

/* Article page ------------------------------------------------------------ */

.article-shell {
  padding: clamp(58px, 9vw, 102px) 0 clamp(72px, 10vw, 128px);
}

.article-hero {
  max-width: 960px;
  margin: 0 auto;
  text-align: center;
}

.article-hero h1 {
  max-width: 12ch;
  margin: 16px auto 22px;
}

.article-meta {
  justify-content: center;
}

.article-deck {
  max-width: 65ch;
  margin: 26px auto 0;
  color: var(--body);
  font-size: clamp(1.06rem, 2vw, 1.24rem);
}

.post-body {
  max-width: 65ch;
  margin: clamp(44px, 7vw, 74px) auto 0;
}

.post-body > p:first-of-type::first-letter {
  float: left;
  margin: 0.08em 0.12em 0 0;
  color: var(--accent-strong);
  font-family: var(--serif);
  font-size: 4.7rem;
  font-weight: 700;
  line-height: 0.82;
}

.post-body p,
.post-body li {
  color: var(--body);
  font-size: 1.05rem;
  line-height: 1.75;
}

.post-body h2,
.post-body h3 {
  margin-top: 2.2em;
  margin-bottom: 0.62em;
}

.post-body h2 {
  font-size: clamp(1.8rem, 3vw, 2.55rem);
}

.post-body h3 {
  font-size: clamp(1.28rem, 2vw, 1.68rem);
}

.post-body p,
.post-body ul,
.post-body ol,
.post-body blockquote,
.code-window {
  margin-top: 1.35em;
  margin-bottom: 0;
}

.post-body ul,
.post-body ol {
  padding-left: 1.3em;
}

.post-body code:not(pre code) {
  border-radius: 5px;
  background: rgba(82, 107, 93, 0.10);
  color: var(--accent-strong);
  padding: 0.13em 0.34em;
  font-family: var(--mono);
  font-size: 0.92em;
}

blockquote {
  border-left: 6px solid var(--accent);
  margin-left: 0;
  padding: 0.3em 0 0.3em 1.35em;
}

blockquote p {
  color: var(--text);
  font-family: var(--serif);
  font-size: clamp(1.22rem, 2.4vw, 1.7rem);
  font-style: italic;
  line-height: 1.62;
}

/* Premium code windows ---------------------------------------------------- */

.code-window {
  overflow: hidden;
  border: 1px solid rgba(30, 41, 59, 0.16);
  border-radius: var(--radius);
  background: var(--code-bg);
  box-shadow: 0 28px 60px -38px rgba(15, 23, 42, 0.76);
}

.code-toolbar {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 14px;
  align-items: center;
  border-bottom: 1px solid var(--code-line);
  padding: 12px 14px;
}

.window-controls {
  display: flex;
  gap: 7px;
}

.window-controls span {
  width: 11px;
  height: 11px;
  border-radius: 50%;
}

.window-controls span:nth-child(1) {
  background: #F87171;
}

.window-controls span:nth-child(2) {
  background: #FBBF24;
}

.window-controls span:nth-child(3) {
  background: #34D399;
}

.code-label {
  color: rgba(226, 232, 240, 0.62);
}

.copy-button {
  border: 1px solid rgba(226, 232, 240, 0.14);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  color: #E5E7EB;
  padding: 6px 10px;
  font-family: var(--sans);
  font-size: 0.76rem;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.3s ease;
}

.copy-button:hover {
  background: rgba(255, 255, 255, 0.12);
}

pre {
  overflow-x: auto;
  margin: 0;
  padding: 22px;
}

pre code {
  color: #E2E8F0;
  font-family: var(--mono);
  font-size: 0.92rem;
  line-height: 1.75;
  tab-size: 2;
}

.token-keyword {
  color: #93C5FD;
}

.token-string {
  color: #A7F3D0;
}

.token-comment {
  color: #94A3B8;
  font-style: italic;
}

.token-annotation,
.token-function {
  color: #FCD34D;
}

.token-number {
  color: #FCA5A5;
}

/* Archive and footer ------------------------------------------------------ */

.archive-hero {
  max-width: 760px;
  padding: clamp(58px, 9vw, 106px) 0 40px;
}

.archive-hero h1 {
  margin-top: 14px;
}

.archive-hero p:last-child {
  max-width: 60ch;
  margin-top: 20px;
  font-size: 1.12rem;
}

.archive-grid {
  padding-bottom: clamp(72px, 10vw, 128px);
}

.site-footer {
  width: min(1120px, calc(100% - 40px));
  margin: 0 auto;
  border-top: 1px solid var(--line);
  padding: 26px 0 34px;
  color: var(--muted);
  font-size: 0.92rem;
}

.site-footer p {
  margin: 0;
}

/* Responsive rules -------------------------------------------------------- */

@media (max-width: 820px) {
  .nav-shell {
    align-items: flex-start;
    flex-direction: column;
    gap: 14px;
  }

  .site-nav {
    width: 100%;
    justify-content: space-between;
    gap: 10px;
  }

  .hero,
  .section-header,
  .post-grid,
  .archive-grid,
  .project-grid {
    grid-template-columns: 1fr;
  }

  .hero {
    min-height: auto;
  }

  .hero-copy h1,
  .section-header h2,
  .about-band h2 {
    max-width: none;
  }

  .post-card-featured {
    grid-column: auto;
  }
}

@media (max-width: 560px) {
  #main-content,
  .nav-shell,
  .site-footer {
    width: min(100% - 28px, 1120px);
  }

  .site-nav a {
    font-size: 0.82rem;
  }

  .hero-actions {
    flex-direction: column;
  }

  .button {
    width: 100%;
  }

  .system-map,
  .post-card,
  .project-content,
  .about-band {
    padding: 18px;
  }

  .post-body > p:first-of-type::first-letter {
    font-size: 3.5rem;
  }

  .code-toolbar {
    grid-template-columns: 1fr auto;
  }

  .code-label {
    display: none;
  }

  pre {
    padding: 18px;
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
}
`;

async function main() {
  await rm(publicDir, { recursive: true, force: true });
  await mkdir(path.join(publicDir, "posts"), { recursive: true });
  await mkdir(path.join(publicDir, "assets"), { recursive: true });

  const files = (await readdir(postsDir)).filter((file) => file.endsWith(".md"));
  const posts = [];

  for (const file of files) {
    const source = await readFile(path.join(postsDir, file), "utf8");
    const { data, body } = parseFrontMatter(source, file);
    const post = {
      ...data,
      slug: slugify(file),
      tags: parseTags(data.tags),
      readingTime: data.readingTime || estimateReadingTime(body)
    };
    posts.push(post);

    await writeFile(
      path.join(publicDir, "posts", `${post.slug}.html`),
      layout({
        title: `${post.title} - ${site.name}`,
        description: post.description,
        pageClass: "article-page",
        body: renderArticle(post, markdownToHtml(body))
      })
    );
  }

  posts.sort((a, b) => b.date.localeCompare(a.date));

  await writeFile(
    path.join(publicDir, "index.html"),
    layout({
      title: site.name,
      description: site.description,
      pageClass: "home-page",
      body: renderHome(posts)
    })
  );

  await writeFile(
    path.join(publicDir, "archive.html"),
    layout({
      title: `Articles - ${site.name}`,
      description: "All Cache Atlas articles and backend engineering field notes.",
      pageClass: "archive-page",
      body: renderArchive(posts)
    })
  );

  await writeFile(path.join(publicDir, ".nojekyll"), "");

  await copyStaticFiles(staticDir, publicDir);

  await writeFile(path.join(publicDir, "assets", "styles.css"), styles);

  console.log(`Built ${posts.length} post(s) into ${publicDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
