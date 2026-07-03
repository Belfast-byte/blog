export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function slugify(fileName) {
  return fileName.replace(/\.md$/i, "");
}

export function parseTags(value = "") {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function estimateReadingTime(markdown) {
  const textOnly = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[>#*`[\]()_-]/g, " ");
  const words = textOnly.trim().split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.ceil(words / 220))} min read`;
}

export function parseFrontMatter(source, fileName) {
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

function sanitizeClassName(value) {
  return String(value || "text")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "text";
}

function headingId(value, usedIds) {
  const base = value
    .toLowerCase()
    .replace(/`([^`]+)`/g, "$1")
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "") || "section";
  const count = usedIds.get(base) || 0;
  usedIds.set(base, count + 1);
  return count ? `${base}-${count + 1}` : base;
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
    ],
    javascript: [
      { name: "comment", pattern: "\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/" },
      { name: "string", pattern: "\"(?:\\\\.|[^\"\\\\])*\"|'(?:\\\\.|[^'\\\\])*'|`(?:\\\\.|[^`\\\\])*`" },
      { name: "keyword", pattern: "\\b(?:const|let|var|return|if|else|new|class|function|async|await|import|export|from|try|catch|throw)\\b" },
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
    <button class="copy-button" type="button" aria-label="Copy code">Copy</button>
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

function renderMarkdownBlock(block, toc, usedIds) {
  if (block.type === "code") {
    return renderCodeBlock(block.language, block.content);
  }

  const content = block.content;

  if (content.startsWith("### ")) {
    const title = content.slice(4);
    const id = headingId(title, usedIds);
    toc.push({ level: 3, title: title.replace(/`/g, ""), id });
    return `<h3 id="${escapeHtml(id)}">${inlineMarkdown(title)}</h3>`;
  }
  if (content.startsWith("## ")) {
    const title = content.slice(3);
    const id = headingId(title, usedIds);
    toc.push({ level: 2, title: title.replace(/`/g, ""), id });
    return `<h2 id="${escapeHtml(id)}">${inlineMarkdown(title)}</h2>`;
  }
  if (content.startsWith("# ")) {
    const title = content.slice(2);
    const id = headingId(title, usedIds);
    toc.push({ level: 2, title: title.replace(/`/g, ""), id });
    return `<h2 id="${escapeHtml(id)}">${inlineMarkdown(title)}</h2>`;
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

export function markdownToHtml(markdown) {
  const toc = [];
  const usedIds = new Map();
  const html = markdownToBlocks(markdown)
    .map((block) => renderMarkdownBlock(block, toc, usedIds))
    .join("\n");

  return { html, toc };
}
