#!/usr/bin/env node

import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = process.cwd();
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

function parseFrontmatter(content) {
  const normalized = normalizeNewlines(content);
  if (!normalized.startsWith("---\n")) return null;
  const closingIndex = normalized.indexOf("\n---\n", 4);
  if (closingIndex === -1) return null;
  const block = normalized.slice(4, closingIndex);
  const fields = {};
  for (const line of block.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const sep = line.indexOf(":");
    if (sep === -1) continue;
    const key = line.slice(0, sep).trim();
    const value = line.slice(sep + 1).trim();
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

async function validateReferencedPath(fieldName, value) {
  if (value.startsWith("http://") || value.startsWith("https://")) return;
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

async function validateFrontmatterFile(filePath, componentName, requiredKeys) {
  const content = await fs.readFile(filePath, "utf8");
  const parsed = parseFrontmatter(content);
  const rel = path.relative(repoRoot, filePath);
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

async function validateComponentDirs() {
  const rulesDir = path.join(repoRoot, "rules");
  if (await pathExists(rulesDir)) {
    for (const f of await walkFiles(rulesDir)) {
      const ext = path.extname(f).toLowerCase();
      if ([".md", ".mdc", ".markdown"].includes(ext)) {
        await validateFrontmatterFile(f, "rule", ["description"]);
      }
    }
  }

  const skillsDir = path.join(repoRoot, "skills");
  if (await pathExists(skillsDir)) {
    for (const f of await walkFiles(skillsDir)) {
      if (path.basename(f) === "SKILL.md") {
        await validateFrontmatterFile(f, "skill", ["name", "description"]);
      }
    }
  }

  const agentsDir = path.join(repoRoot, "agents");
  if (await pathExists(agentsDir)) {
    for (const f of await walkFiles(agentsDir)) {
      const ext = path.extname(f).toLowerCase();
      if ([".md", ".mdc", ".markdown"].includes(ext)) {
        await validateFrontmatterFile(f, "agent", ["name", "description"]);
      }
    }
  }

  const commandsDir = path.join(repoRoot, "commands");
  if (await pathExists(commandsDir)) {
    for (const f of await walkFiles(commandsDir)) {
      const ext = path.extname(f).toLowerCase();
      if ([".md", ".mdc", ".markdown", ".txt"].includes(ext)) {
        await validateFrontmatterFile(f, "command", ["name", "description"]);
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
      await validateReferencedPath(f, v);
    }
  }

  await validateComponentDirs();

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

  const hooksPath = path.join(repoRoot, "hooks", "hooks.json");
  if (!(await pathExists(hooksPath))) {
    addWarning("no hooks/hooks.json file found (only needed when using hooks).");
  }
  const mcpPath = path.join(repoRoot, "mcp.json");
  if (!(await pathExists(mcpPath))) {
    addWarning("no mcp.json file found (only needed when using MCP servers).");
  }

  summarizeAndExit();
}

await main();
