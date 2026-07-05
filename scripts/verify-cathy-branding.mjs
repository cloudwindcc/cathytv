import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";

const root = process.cwd();
const ignoredDirectories = new Set([".git", "node_modules", ".wrangler"]);
const ignoredFiles = new Set(["scripts/verify-cathy-branding.mjs"]);
const textExtensions = new Set([
  "",
  ".css",
  ".html",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".toml",
  ".txt",
  ".yml",
  ".yaml",
]);

const blockedPatterns = [
  { label: "old Kang branding", pattern: /kang/i },
  { label: "old KKTV branding", pattern: /KKTV/ },
];
const visibleBrandingFiles = new Set([
  "README.md",
  "about.html",
  "index.html",
  "js/app.js",
  "js/config.js",
  "js/douban.js",
  "js/index-page.js",
  "js/player.js",
  "js/version-check.js",
  "manifest.json",
  "player.html",
  "privacy.html",
  "watch.html",
]);
const visibleBlockedPatterns = [
  { label: "old LibreTV visible branding", pattern: /LibreTV/ },
];

const requiredContent = [
  { file: "index.html", pattern: /CathyTV/ },
  { file: "index.html", pattern: /https:\/\/tv\.cathy\.wang\// },
  { file: "player.html", pattern: /CathyTV/ },
  { file: "manifest.json", pattern: /CathyTV/ },
  { file: "README.md", pattern: /tv\.cathy\.wang/ },
];

function collectFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      return ignoredDirectories.has(entry.name) ? [] : collectFiles(path);
    }

    if (!entry.isFile()) {
      return [];
    }

    return textExtensions.has(extname(entry.name).toLowerCase()) ? [path] : [];
  });
}

const failures = [];

for (const filePath of collectFiles(root)) {
  const rel = relative(root, filePath).replaceAll("\\", "/");
  if (ignoredFiles.has(rel)) {
    continue;
  }

  const content = readFileSync(filePath, "utf8");

  for (const { label, pattern } of blockedPatterns) {
    if (pattern.test(content)) {
      failures.push(`${rel} still contains ${label}`);
    }
  }

  if (visibleBrandingFiles.has(rel)) {
    for (const { label, pattern } of visibleBlockedPatterns) {
      if (pattern.test(content)) {
        failures.push(`${rel} still contains ${label}`);
      }
    }
  }
}

for (const { file, pattern } of requiredContent) {
  const filePath = join(root, file);
  if (!statSync(filePath, { throwIfNoEntry: false })?.isFile()) {
    failures.push(`${file} is missing`);
    continue;
  }

  const content = readFileSync(filePath, "utf8");
  if (!pattern.test(content)) {
    failures.push(`${file} is missing required pattern ${pattern}`);
  }
}

if (failures.length > 0) {
  console.error("Cathy branding verification failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Cathy branding verification passed.");
