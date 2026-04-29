#!/usr/bin/env node

import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const errors = [];
const warnings = [];

const pluginNamePattern = /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/;

function addError(msg) {
  errors.push(msg);
}
function addWarning(msg) {
  warnings.push(msg);
}

async function pathExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

// Walk up from `start` until we find a directory containing
// `.cursor-plugin/plugin.json`. Lets the validator be invoked from anywhere,
// not just the repo root.
async function findRepoRoot(start) {
  let dir = start;
  while (true) {
    if (await pathExists(path.join(dir, ".cursor-plugin", "plugin.json"))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

async function readJsonFile(filePath, context) {
  let raw;
  try {
    raw = await fs.readFile(filePath, "utf8");
  } catch {
    addError(`${context} is missing: ${filePath}`);
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch (e) {
    addError(`${context} is not valid JSON (${filePath}): ${e.message}`);
    return null;
  }
}

function normalizeNewlines(content) {
  return content.replace(/\r\n/g, "\n");
}

// Strip surrounding "..." or '...' quotes from a frontmatter value.
function stripQuotes(value) {
  if (value.length >= 2) {
    const first = value[0];
    const last = value[value.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return value.slice(1, -1);
    }
  }
  return value;
}

function parseFrontmatter(content, rel) {
  const normalized = normalizeNewlines(content);
  if (!normalized.startsWith("---\n")) return null;
  const closingIndex = normalized.indexOf("\n---\n", 4);
  if (closingIndex === -1) {
    // Allow `---` at very end of file (no trailing newline).
    if (normalized.endsWith("\n---")) {
      addWarning(`frontmatter in ${rel} is missing the trailing newline after "---"`);
      return parseBlock(normalized.slice(4, normalized.length - 4));
    }
    return null;
  }
  return parseBlock(normalized.slice(4, closingIndex));
}

function parseBlock(block) {
  const fields = {};
  for (const line of block.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const sep = line.indexOf(":");
    if (sep === -1) continue;
    const key = line.slice(0, sep).trim();
    const value = stripQuotes(line.slice(sep + 1).trim());
    fields[key] = value;
  }
  return fields;
}

async function walkFiles(dir) {
  const out = [];
  const stack = [dir];
  while (stack.length) {
    const cur = stack.pop();
    const entries = await fs.readdir(cur, { withFileTypes: true });
    for (const e of entries) {
      const p = path.join(cur, e.name);
      if (e.isDirectory()) stack.push(p);
      else if (e.isFile()) out.push(p);
    }
  }
  return out;
}

function isSafeRelativePath(value) {
  if (typeof value !== "string" || value.length === 0) return false;
  if (value.startsWith("http://") || value.startsWith("https://")) return true;
  if (path.isAbsolute(value)) return false;
  const normalized = path.posix.normalize(value.replace(/\\/g, "/"));
  return !normalized.startsWith("../") && normalized !== "..";
}

function extractPathValues(value) {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(extractPathValues);
  if (value && typeof value === "object") {
    const out = [];
    if (typeof value.path === "string") out.push(value.path);
    if (typeof value.file === "string") out.push(value.file);
    return out;
  }
  return [];
}

async function validateReferencedPath(repoRoot, fieldName, value) {
  if (value.startsWith("http://")) {
    addError(
      `manifest field "${fieldName}" uses http:// URL "${value}". Use https://.`
    );
    return;
  }
  if (value.startsWith("https://")) return;
  if (!isSafeRelativePath(value)) {
    addError(
      `manifest field "${fieldName}" has invalid path "${value}". Use a relative path without ".." or absolute prefixes.`
    );
    return;
  }
  const resolved = path.resolve(repoRoot, value);
  if (!(await pathExists(resolved))) {
    addError(`manifest field "${fieldName}" references missing path "${value}".`);
  }
}

async function validateFrontmatterFile(repoRoot, filePath, componentName, requiredKeys) {
  const content = await fs.readFile(filePath, "utf8");
  const rel = path.relative(repoRoot, filePath);
  const parsed = parseFrontmatter(content, rel);
  if (!parsed) {
    addError(`${componentName} file missing YAML frontmatter: ${rel}`);
    return;
  }
  for (const key of requiredKeys) {
    if (!parsed[key] || parsed[key].length === 0) {
      addError(`${componentName} file missing "${key}" in frontmatter: ${rel}`);
    }
  }
}

async function validateComponentDirs(repoRoot) {
  const rulesDir = path.join(repoRoot, "rules");
  if (await pathExists(rulesDir)) {
    for (const f of await walkFiles(rulesDir)) {
      const ext = path.extname(f).toLowerCase();
      if ([".md", ".mdc", ".markdown"].includes(ext)) {
        await validateFrontmatterFile(repoRoot, f, "rule", ["description"]);
      }
    }
  }

  const skillsDir = path.join(repoRoot, "skills");
  if (await pathExists(skillsDir)) {
    for (const f of await walkFiles(skillsDir)) {
      if (path.basename(f) === "SKILL.md") {
        await validateFrontmatterFile(repoRoot, f, "skill", ["name", "description"]);
      }
    }
  }

  const agentsDir = path.join(repoRoot, "agents");
  if (await pathExists(agentsDir)) {
    for (const f of await walkFiles(agentsDir)) {
      const ext = path.extname(f).toLowerCase();
      if ([".md", ".mdc", ".markdown"].includes(ext)) {
        await validateFrontmatterFile(repoRoot, f, "agent", ["name", "description"]);
      }
    }
  }

  const commandsDir = path.join(repoRoot, "commands");
  if (await pathExists(commandsDir)) {
    for (const f of await walkFiles(commandsDir)) {
      const ext = path.extname(f).toLowerCase();
      if ([".md", ".mdc", ".markdown", ".txt"].includes(ext)) {
        await validateFrontmatterFile(repoRoot, f, "command", ["name", "description"]);
      }
    }
  }
}

function summarizeAndExit() {
  if (warnings.length) {
    console.log("Warnings:");
    for (const w of warnings) console.log(`- ${w}`);
    console.log("");
  }
  if (errors.length) {
    console.error("Validation failed:");
    for (const e of errors) console.error(`- ${e}`);
    process.exit(1);
  }
  console.log("Validation passed.");
}

async function main() {
  // Locate the repo root from the script's own location, then fall back to
  // process.cwd() so the validator works whether invoked as
  // `node scripts/validate-template.mjs` (from repo root) or by absolute path.
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot =
    (await findRepoRoot(scriptDir)) ||
    (await findRepoRoot(process.cwd())) ||
    process.cwd();

  const manifestPath = path.join(repoRoot, ".cursor-plugin", "plugin.json");
  const manifest = await readJsonFile(manifestPath, "Plugin manifest");
  if (!manifest) {
    summarizeAndExit();
    return;
  }

  if (typeof manifest.name !== "string" || !pluginNamePattern.test(manifest.name)) {
    addError(
      'Plugin "name" must be lowercase and use only alphanumerics, hyphens, and periods, starting and ending with an alphanumeric.'
    );
  }

  const fields = ["logo", "rules", "skills", "agents", "commands", "hooks", "mcpServers"];
  for (const f of fields) {
    if (manifest[f] === undefined) continue;
    for (const v of extractPathValues(manifest[f])) {
      await validateReferencedPath(repoRoot, f, v);
    }
  }

  await validateComponentDirs(repoRoot);

  const skillsDir = path.join(repoRoot, "skills");
  if (await pathExists(skillsDir)) {
    const entries = await fs.readdir(skillsDir, { withFileTypes: true });
    let foundAny = false;
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const skillFile = path.join(skillsDir, entry.name, "SKILL.md");
      if (!(await pathExists(skillFile))) {
        addError(
          `skills/${entry.name}/ does not contain a SKILL.md file (required for Cursor skill discovery).`
        );
      } else {
        foundAny = true;
      }
    }
    if (!foundAny) {
      addWarning("skills/ exists but contains no skills with a SKILL.md file.");
    }
  }

  // Only warn about hooks/MCP files when the manifest actually references
  // those subsystems. Otherwise the warnings are noise on every run.
  if (manifest.hooks !== undefined) {
    const hooksPath = path.join(repoRoot, "hooks", "hooks.json");
    if (!(await pathExists(hooksPath))) {
      addWarning("manifest references hooks but hooks/hooks.json is missing.");
    }
  }
  if (manifest.mcpServers !== undefined) {
    const mcpPath = path.join(repoRoot, "mcp.json");
    if (!(await pathExists(mcpPath))) {
      addWarning("manifest references mcpServers but mcp.json is missing.");
    }
  }

  summarizeAndExit();
}

await main();
