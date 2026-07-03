import { copyFile, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  estimateReadingTime,
  markdownToHtml,
  parseFrontMatter,
  parseTags,
  slugify
} from "../src/markdown.js";
import { site } from "../src/site.js";
import { renderArchive, renderArticle, renderHome, renderLayout } from "../src/templates.js";

const root = process.cwd();
const postsDir = path.join(root, "content", "posts");
const publicDir = path.join(root, "public");
const staticDir = path.join(root, "static");
const stylesPath = path.join(root, "src", "styles.css");
const basePath = normalizeBasePath(process.env.BASE_PATH || "/");

function normalizeBasePath(value) {
  if (!value || value === "/") return "/";
  const withLeadingSlash = value.startsWith("/") ? value : `/${value}`;
  return withLeadingSlash.endsWith("/") ? withLeadingSlash : `${withLeadingSlash}/`;
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

async function readPosts() {
  const files = (await readdir(postsDir)).filter((file) => file.endsWith(".md"));
  const posts = [];

  for (const file of files) {
    const source = await readFile(path.join(postsDir, file), "utf8");
    const { data, body } = parseFrontMatter(source, file);
    const rendered = markdownToHtml(body);

    posts.push({
      ...data,
      slug: slugify(file),
      tags: parseTags(data.tags),
      readingTime: data.readingTime || estimateReadingTime(body),
      html: rendered.html,
      toc: rendered.toc
    });
  }

  return posts.sort((a, b) => b.date.localeCompare(a.date));
}

async function writePostPages(posts) {
  for (const post of posts) {
    await writeFile(
      path.join(publicDir, "posts", `${post.slug}.html`),
      renderLayout({
        basePath,
        title: `${post.title} - ${site.name}`,
        description: post.description,
        pageClass: "article-page",
        body: renderArticle(post, basePath)
      })
    );
  }
}

async function main() {
  await rm(publicDir, { recursive: true, force: true });
  await mkdir(path.join(publicDir, "posts"), { recursive: true });
  await mkdir(path.join(publicDir, "assets"), { recursive: true });

  const posts = await readPosts();
  await writePostPages(posts);

  await writeFile(
    path.join(publicDir, "index.html"),
    renderLayout({
      basePath,
      title: site.name,
      description: site.description,
      pageClass: "home-page",
      body: renderHome(posts, basePath)
    })
  );

  await writeFile(
    path.join(publicDir, "archive.html"),
    renderLayout({
      basePath,
      title: `Articles - ${site.name}`,
      description: `All ${site.name} articles and backend engineering field notes.`,
      pageClass: "archive-page",
      body: renderArchive(posts, basePath)
    })
  );

  await writeFile(path.join(publicDir, ".nojekyll"), "");
  await copyStaticFiles(staticDir, publicDir);
  await copyFile(stylesPath, path.join(publicDir, "assets", "styles.css"));

  console.log(`Built ${posts.length} post(s) into ${publicDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
