import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const title = process.argv.slice(2).join(" ").trim();

if (!title) {
  console.error('Usage: npm run new -- "文章标题"');
  process.exit(1);
}

const root = process.cwd();
const postsDir = path.join(root, "content", "posts");
const today = new Date().toISOString().slice(0, 10);

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const slug = slugify(title) || `post-${today}`;
const filePath = path.join(postsDir, `${today}-${slug}.md`);
const content = `---
title: ${title}
date: ${today}
description: 这里写文章摘要
---

这里开始写正文。
`;

await mkdir(postsDir, { recursive: true });
await writeFile(filePath, content, { flag: "wx" });

console.log(`Created ${path.relative(root, filePath)}`);
