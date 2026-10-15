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

function parseFrontmatter(content) {
  const m = /^---\n([\s\S]*?)\n---(?:\n|$)/.exec(content.replace(/\r\n/g, "\n"));
  return m ? parseBlock(m[1]) : null;
}

function parseBlock(block) {
  const fields = {};
  for (const line of block.split("\n")) {
    if (/^\s/.test(line)) continue; // nested key — must not shadow a top-level one
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
  if (path.isAbsolute(value)) return false;
  const normalized = path.posix.normalize(value.replace(/\\/g, "/"));
  return !normalized.startsWith("../") && normalized !== "..";
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
  const parsed = parseFrontmatter(content);
  if (!parsed) {
    addError(`${componentName} file missing YAML frontmatter: ${rel}`);
    return null;
  }
  for (const key of requiredKeys) {
    if (!parsed[key]) {
      addError(`${componentName} file missing "${key}" in frontmatter: ${rel}`);
    }
  }
  return parsed;
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

  // Cursor discovers skills only as skills/<name>/SKILL.md.
  const skillsDir = path.join(repoRoot, "skills");
  if (await pathExists(skillsDir)) {
    for (const entry of await fs.readdir(skillsDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const f = path.join(skillsDir, entry.name, "SKILL.md");
      if (!(await pathExists(f))) {
        addError(
          `skills/${entry.name}/ does not contain a SKILL.md file (required for Cursor skill discovery).`
        );
        continue;
      }
      const parsed = await validateFrontmatterFile(repoRoot, f, "skill", ["name", "description"]);
      if (parsed?.name && parsed.name !== entry.name) {
        addError(
          `skill name "${parsed.name}" does not match directory "${entry.name}" (${path.relative(repoRoot, f)}).`
        );
      }
      if (parsed?.description && parsed.description.length > 1024) {
        addError(`skill description exceeds 1024 characters in ${path.relative(repoRoot, f)}.`);
      }
    }
  }

  const commandsDir = path.join(repoRoot, "commands");
  if (await pathExists(commandsDir)) {
    for (const f of await walkFiles(commandsDir)) {
      const ext = path.extname(f).toLowerCase();
      if ([".md", ".mdc", ".markdown", ".txt"].includes(ext)) {
        const parsed = await validateFrontmatterFile(repoRoot, f, "command", [
          "name",
          "description",
        ]);
        const expected = path.basename(f, path.extname(f));
        if (parsed?.name && parsed.name !== expected) {
          addError(
            `command name "${parsed.name}" does not match filename "${expected}" (${path.relative(repoRoot, f)}).`
          );
        }
      }
    }
  }
}

// Every bx call carries user or web text on a shell line, and the agent copies
// the documented shape. Inside double quotes `$(...)` and backticks run (bash
// and PowerShell), so the query must be single-quoted, last, and after `--`
// (which also stops `-bash: ...` or `web` parsing as a flag or subcommand).
// Checks inline code spans and fenced lines; a fenced call whose single quotes
// are unbalanced (a multi-line --goggles value) continues onto the next lines.
// A call with no quote at all (`bx context --threshold strict`) names flags, not a query.
// Outside the quotes, `;`, `&`, `|`, backticks or `$(` would chain a second
// command whose own `-- '...'` then passes as the query.
const queryCall = /^bx\s+(?:context\s|web\s|["'])[^]*["']/;
const queryLast = /\s--\s+'[^']*'$/;
const chained = /[;&|`]|\$\(/;

// Drops a trailing `# comment` and reports whether a `"` sits outside single
// quotes, in one left-to-right pass over the shell text.
function scanShell(cmd) {
  let inSingle = false;
  let doubleQuoted = false;
  for (let i = 0; i < cmd.length; i++) {
    const c = cmd[i];
    if (c === "'") inSingle = !inSingle;
    else if (!inSingle && c === '"') doubleQuoted = true;
    else if (!inSingle && c === "#" && (i === 0 || /\s/.test(cmd[i - 1]))) {
      return { code: cmd.slice(0, i).trimEnd(), doubleQuoted, inSingle };
    }
  }
  return { code: cmd.trimEnd(), doubleQuoted, inSingle };
}

function bxCalls(lines) {
  const calls = [];
  let inFence = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (!inFence) {
      for (const m of line.matchAll(/`(bx\s[^`]*)`/g)) calls.push({ line: i + 1, cmd: m[1] });
      continue;
    }
    const m = line.match(/(?:^|[|;&]\s*)(bx\s.*)$/);
    if (!m) continue;
    let cmd = m[1].trim();
    const first = i;
    while (scanShell(cmd).inSingle && i + 1 < lines.length && !/^\s*```/.test(lines[i + 1])) {
      cmd += "\n" + lines[++i];
    }
    calls.push({ line: first + 1, cmd });
  }
  return calls;
}

async function validateBxQuoting(repoRoot) {
  const roots = ["skills", "commands", "docs", "rules", "README.md"];
  for (const entry of roots) {
    const target = path.join(repoRoot, entry);
    if (!(await pathExists(target))) continue;
    const stat = await fs.stat(target);
    const files = stat.isDirectory() ? await walkFiles(target) : [target];
    for (const f of files) {
      if (![".md", ".mdc", ".markdown", ".txt"].includes(path.extname(f).toLowerCase())) continue;
      const lines = (await fs.readFile(f, "utf8")).replace(/\r\n/g, "\n").split("\n");
      for (const { line, cmd } of bxCalls(lines)) {
        const { code, doubleQuoted } = scanShell(cmd);
        // `</dev/null`, `2>/dev/null` and `2>&1` may follow the query.
        const call = code.replace(/(\s+\d?(?:<|>>?)(?:\/dev\/null|&\d))+$/, "");
        const unquoted = call.replace(/'[^']*'/g, "''");
        if (
          doubleQuoted ||
          (queryCall.test(call) && (!queryLast.test(call) || chained.test(unquoted)))
        ) {
          addError(
            `${path.relative(repoRoot, f)}:${line} — bx query must be last, after --, in ` +
              `single quotes, with no double quotes on the line: bx context [flags] -- '<query>'`
          );
        }
      }
    }
  }
}

function summarize() {
  if (warnings.length) {
    console.log("Warnings:");
    for (const w of warnings) console.log(`- ${w}`);
    console.log("");
  }
  if (errors.length) {
    console.error("Validation failed:");
    for (const e of errors) console.error(`- ${e}`);
    process.exitCode = 1;
    return;
  }
  console.log("Validation passed.");
}

async function main() {
  // The repo this script lives in, wherever it is invoked from. Searching
  // upward or falling back to the cwd validated some other repo instead.
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

  const manifestPath = path.join(repoRoot, ".cursor-plugin", "plugin.json");
  const manifest = await readJsonFile(manifestPath, "Plugin manifest");
  // `JSON.parse("null")` succeeds, so a valid-JSON-but-not-an-object manifest
  // would otherwise reach the end with no errors recorded.
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    if (errors.length === 0) {
      addError(`Plugin manifest must be a JSON object (${manifestPath}).`);
    }
    summarize();
    return;
  }

  if (typeof manifest.name !== "string" || !pluginNamePattern.test(manifest.name)) {
    addError(
      'Plugin "name" must be lowercase and use only alphanumerics, hyphens, and periods, starting and ending with an alphanumeric.'
    );
  }

  if (typeof manifest.description !== "string" || manifest.description.trim().length === 0) {
    addError('Plugin "description" is required for marketplace listing.');
  }
  if (typeof manifest.version !== "string" || !/^\d+\.\d+\.\d+/.test(manifest.version)) {
    addError('Plugin "version" must be a semver string (e.g. "1.0.0").');
  }
  if (!manifest.author || typeof manifest.author.name !== "string" || manifest.author.name.length === 0) {
    addError('Plugin "author.name" is required.');
  }
  if (typeof manifest.license !== "string" || manifest.license.length === 0) {
    addError('Plugin "license" is required (marketplace plugins must be open source).');
  }
  if (!(await pathExists(path.join(repoRoot, "README.md")))) {
    addError("README.md is missing (required by the marketplace submission checklist).");
  }
  if (!(await pathExists(path.join(repoRoot, "LICENSE")))) {
    addWarning("LICENSE file is missing; marketplace plugins must be open source.");
  }
  if (!(await pathExists(path.join(repoRoot, "CHANGELOG.md")))) {
    addWarning("CHANGELOG.md is missing (recommended for marketplace updates).");
  }

  const fields = ["logo", "rules", "skills", "agents", "commands", "hooks", "mcpServers"];
  for (const f of fields) {
    // A string or array of strings is a path; inline hooks/mcpServers objects aren't.
    for (const v of [manifest[f]].flat()) {
      if (typeof v === "string") await validateReferencedPath(repoRoot, f, v);
    }
  }

  await validateComponentDirs(repoRoot);
  await validateBxQuoting(repoRoot);

  summarize();
}

await main().catch((err) => {
  console.error(`Validator crashed: ${err?.stack ?? err}`);
  process.exitCode = 2;
});
