import { spawnSync } from "node:child_process";

const message = process.argv.slice(2).join(" ").trim() || "Update blog";

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: options.capture ? "pipe" : "inherit"
  });

  if (result.status !== 0) {
    if (options.capture && result.stderr) {
      process.stderr.write(result.stderr);
    }
    process.exit(result.status ?? 1);
  }

  return result.stdout?.trim() || "";
}

function hasChanges() {
  return run("git", ["status", "--porcelain"], { capture: true }).length > 0;
}

run("npm", ["run", "build"]);

if (!hasChanges()) {
  console.log("No changes to publish.");
  process.exit(0);
}

run("git", ["add", "content", "public", "static", "src", "docs", "scripts", "package.json", "README.md", "wrangler.toml", "netlify.toml", ".github"]);

if (!hasChanges()) {
  console.log("No staged changes to publish.");
  process.exit(0);
}

run("git", ["commit", "-m", message]);
run("git", ["push"]);

console.log("Published to GitHub Pages:");
console.log("https://belfast-byte.github.io/blog/");
