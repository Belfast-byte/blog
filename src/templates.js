import { escapeHtml } from "./markdown.js";
import { projects, site, updates } from "./site.js";

function formatDate(value) {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  }).format(date);
}

function assetPath(basePath, value) {
  return `${basePath}${value.replace(/^\//, "")}`;
}

function sectionHref(basePath, href) {
  if (href === "/") return basePath;
  if (href.startsWith("/#")) return `${basePath}${href.slice(1)}`;
  return assetPath(basePath, href);
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

function renderNav(basePath) {
  return `<header class="site-header">
  <div class="nav-shell">
    <a class="brand" href="${basePath}" aria-label="${escapeHtml(site.name)} home">
      <span class="brand-mark" aria-hidden="true">CA</span>
      <span>${escapeHtml(site.name)}</span>
    </a>
    <nav class="site-nav" aria-label="Primary navigation">
      ${site.nav.map((item) => `<a href="${sectionHref(basePath, item.href)}">${escapeHtml(item.label)}</a>`).join("\n      ")}
    </nav>
  </div>
</header>`;
}

export function renderLayout({ basePath, title, description, body, pageClass = "" }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${escapeHtml(description)}">
  <title>${escapeHtml(title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&family=Lora:wght@500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="${assetPath(basePath, "/assets/styles.css")}">
</head>
<body class="${escapeHtml(pageClass)}">
  <a class="skip-link" href="#main-content">Skip to content</a>
  ${renderNav(basePath)}
  <main id="main-content">
    ${body}
  </main>
  <footer class="site-footer">
    <p>${escapeHtml(site.name)} is a personal notebook for backend systems, technical writing, and useful software projects.</p>
  </footer>
  <script>
    (() => {
      const hasIdentityToken = /(?:invite_token|confirmation_token|recovery_token|email_change_token)=/.test(window.location.hash);
      if (!hasIdentityToken) return;

      const script = document.createElement("script");
      script.src = "https://identity.netlify.com/v1/netlify-identity-widget.js";
      script.onload = () => {
        if (!window.netlifyIdentity) return;
        window.netlifyIdentity.on("login", () => {
          document.location.href = "${assetPath(basePath, "/admin/")}";
        });
        window.netlifyIdentity.open();
      };
      document.head.appendChild(script);
    })();

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

function renderPostCard(post, basePath, featured = false) {
  const cardClass = featured ? "post-card post-card-featured" : "post-card";

  return `<article class="${cardClass}">
  <div class="card-kicker">
    <time datetime="${escapeHtml(post.date)}">${escapeHtml(formatDate(post.date))}</time>
    <span>${escapeHtml(post.readingTime)}</span>
  </div>
  <h3><a href="${assetPath(basePath, `/posts/${post.slug}.html`)}">${escapeHtml(post.title)}</a></h3>
  <p>${escapeHtml(post.description)}</p>
  ${renderTagList(post.tags)}
</article>`;
}

function renderProjectCard(project) {
  return `<article class="project-card">
  <div class="project-visual ${escapeHtml(project.visualClass)}" role="img" aria-label="${escapeHtml(project.visualLabel)}">
    <span class="visual-line"></span>
    <span class="visual-line"></span>
    <span class="visual-chip">${escapeHtml(project.status)}</span>
  </div>
  <div class="project-content">
    <p class="project-status">${escapeHtml(project.status)}</p>
    <h3>${escapeHtml(project.title)}</h3>
    <p>${escapeHtml(project.description)}</p>
    ${renderTagList(project.tags, "tag-list project-tags")}
  </div>
</article>`;
}

function renderUpdateItem(update) {
  return `<li>
  <span>${escapeHtml(update.label)}</span>
  <strong>${escapeHtml(update.title)}</strong>
  <p>${escapeHtml(update.detail)}</p>
</li>`;
}

function renderFocusPanel() {
  return `<aside class="focus-panel" aria-label="Current technical focus">
  <div class="focus-panel-header">
    <span>Current focus</span>
    <strong>Build notes</strong>
  </div>
  <ul>
    ${site.focus.map((item) => `<li>${escapeHtml(item)}</li>`).join("\n    ")}
  </ul>
  <div class="focus-terminal" aria-hidden="true">
    <span>$ npm run build</span>
    <strong>static pages ready</strong>
  </div>
</aside>`;
}

export function renderHome(posts, basePath) {
  const featuredPost = posts[0];
  const otherPosts = posts.slice(1, 3);

  return `<section class="hero" aria-labelledby="hero-title">
  <div class="hero-copy">
    <p class="eyebrow">${escapeHtml(site.role)}</p>
    <h1 id="hero-title">Clean notes on code, systems, and the path to better software.</h1>
    <p>${escapeHtml(site.intro)}</p>
    <div class="hero-actions" aria-label="Primary actions">
      <a class="button button-primary" href="${assetPath(basePath, "/archive.html")}">Read articles</a>
      <a class="button button-secondary" href="${basePath}#projects">View projects</a>
    </div>
  </div>
  ${renderFocusPanel()}
</section>

<section class="intro-band" id="about" aria-labelledby="about-title">
  <p class="eyebrow">About</p>
  <h2 id="about-title">${escapeHtml(site.author)}</h2>
  <p>${escapeHtml(site.description)}</p>
</section>

<section class="section article-section" id="articles" aria-labelledby="articles-title">
  <div class="section-header">
    <p class="eyebrow">Articles</p>
    <h2 id="articles-title">Recent technical writing.</h2>
    <a class="section-link" href="${assetPath(basePath, "/archive.html")}">All articles</a>
  </div>
  <div class="post-grid">
    ${featuredPost ? renderPostCard(featuredPost, basePath, true) : ""}
    ${otherPosts.map((post) => renderPostCard(post, basePath)).join("\n    ")}
  </div>
</section>

<section class="section" id="projects" aria-labelledby="projects-title">
  <div class="section-header">
    <p class="eyebrow">Projects</p>
    <h2 id="projects-title">Small systems with clear boundaries.</h2>
  </div>
  <div class="project-grid">
    ${projects.map(renderProjectCard).join("\n    ")}
  </div>
</section>

<section class="section updates-section" id="updates" aria-labelledby="updates-title">
  <div class="section-header">
    <p class="eyebrow">Updates</p>
    <h2 id="updates-title">Recently changed.</h2>
  </div>
  <ol class="updates-list">
    ${updates.map(renderUpdateItem).join("\n    ")}
  </ol>
</section>`;
}

function renderToc(toc) {
  if (!toc.length) return "";
  return `<aside class="toc" aria-label="Table of contents">
  <p>On this page</p>
  <ol>
    ${toc.map((item) => `<li class="toc-level-${item.level}"><a href="#${escapeHtml(item.id)}">${escapeHtml(item.title)}</a></li>`).join("\n    ")}
  </ol>
</aside>`;
}

export function renderArticle(post) {
  return `<article class="article-shell">
  <header class="article-hero">
    <p class="eyebrow">Technical article</p>
    <h1>${escapeHtml(post.title)}</h1>
    ${renderMeta(post)}
    <p class="article-deck">${escapeHtml(post.description)}</p>
  </header>
  <div class="article-layout">
    ${renderToc(post.toc)}
    <div class="post-body">
      ${post.html}
    </div>
  </div>
</article>`;
}

export function renderArchive(posts, basePath) {
  return `<section class="archive-hero" aria-labelledby="archive-title">
  <p class="eyebrow">Articles</p>
  <h1 id="archive-title">All field notes.</h1>
  <p>Readable notes on backend architecture, caching, implementation details, and practical software engineering.</p>
</section>
<section class="archive-grid" aria-label="Article archive">
  ${posts.map((post) => renderPostCard(post, basePath)).join("\n  ")}
</section>`;
}
