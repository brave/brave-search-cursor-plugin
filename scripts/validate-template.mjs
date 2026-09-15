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
  if (value.startsWith("http://") || value.startsWith("https://")) return true;
  if (path.isAbsolute(value)) return false;
  const normalized = path.posix.normalize(value.replace(/\\/g, "/"));
  return !normalized.startsWith("../") && normalized !== "..";
}

function collectPlaceholderNames(value, out = new Set()) {
  if (typeof value === "string") {
    for (const match of value.matchAll(/\$\{([A-Z][A-Z0-9_]*)\}/g)) {
      out.add(match[1]);
    }
    return out;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectPlaceholderNames(item, out);
    return out;
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value)) collectPlaceholderNames(item, out);
  }
  return out;
}

const builtInPlaceholders = new Set(["PLUGIN_ROOT"]);

async function validateMcpVariables(repoRoot, manifest) {
  let mcpConfig = null;
  if (typeof manifest.mcpServers === "string") {
    const mcpPath = path.resolve(repoRoot, manifest.mcpServers);
    mcpConfig = await readJsonFile(mcpPath, "MCP config");
  } else if (manifest.mcpServers && typeof manifest.mcpServers === "object") {
    mcpConfig = manifest.mcpServers;
  } else {
    const defaultPath = path.join(repoRoot, "mcp.json");
    if (await pathExists(defaultPath)) {
      mcpConfig = await readJsonFile(defaultPath, "MCP config");
    }
  }
  if (!mcpConfig) return;

  const used = [...collectPlaceholderNames(mcpConfig)].filter(
    (name) => !builtInPlaceholders.has(name)
  );
  const declared = new Set(
    Object.keys(manifest.variables?.properties ?? {})
  );
  for (const name of used) {
    if (!declared.has(name)) {
      addError(
        `mcp.json uses \${${name}} but .cursor-plugin/plugin.json variables.properties does not declare it.`
      );
    }
  }
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
    return null;
  }
  for (const key of requiredKeys) {
    if (!parsed[key] || parsed[key].length === 0) {
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

  const skillsDir = path.join(repoRoot, "skills");
  if (await pathExists(skillsDir)) {
    for (const f of await walkFiles(skillsDir)) {
      if (path.basename(f) === "SKILL.md") {
        const parsed = await validateFrontmatterFile(repoRoot, f, "skill", [
          "name",
          "description",
        ]);
        const dirName = path.basename(path.dirname(f));
        if (parsed?.name && parsed.name !== dirName) {
          addError(
            `skill name "${parsed.name}" does not match directory "${dirName}" (${path.relative(repoRoot, f)}).`
          );
        }
        if (parsed?.description && parsed.description.length > 1024) {
          addError(
            `skill description exceeds 1024 characters in ${path.relative(repoRoot, f)}.`
          );
        }
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

// A `-H "X-Subscription-Token: $KEY"` header is expanded by the shell before
// execve, so the plaintext key ends up in curl's argv — and /proc/<pid>/cmdline
// is world-readable. Documented calls must pipe the header into `curl -H @-`
// (stdin) instead. The flag group also matches `--header`, `-H"..."` and
// bundled short options like `-sH`, all of which are the same mistake.
const argvSecretPattern = /(^|\s)(-[A-Za-z]*H|--header)[=\s'"$\\]*X-Subscription-Token/i;

async function validateNoSecretsInArgv(repoRoot) {
  const roots = ["skills", "commands", "docs", "rules", "README.md"];
  for (const entry of roots) {
    const target = path.join(repoRoot, entry);
    if (!(await pathExists(target))) continue;
    const stat = await fs.stat(target);
    const files = stat.isDirectory() ? await walkFiles(target) : [target];
    for (const f of files) {
      if (![".md", ".mdc", ".markdown", ".txt"].includes(path.extname(f).toLowerCase())) continue;
      const lines = normalizeNewlines(await fs.readFile(f, "utf8")).split("\n");
      // Every line is scanned, prose included: the pattern is specific enough
      // that a warning can be phrased without writing the bad flag out.
      lines.forEach((line, i) => {
        if (argvSecretPattern.test(line)) {
          addError(
            `${path.relative(repoRoot, f)}:${i + 1} passes the API key in curl's argv ` +
              `(-H "X-Subscription-Token: ..."), which is world-readable via ps / ` +
              `/proc/<pid>/cmdline. Pipe the header in on stdin instead: ` +
              `echo "X-Subscription-Token: $BRAVE_API_KEY" | curl -H @- ...`
          );
        }
      });
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
    if (manifest[f] === undefined) continue;
    for (const v of extractPathValues(manifest[f])) {
      await validateReferencedPath(repoRoot, f, v);
    }
  }

  await validateComponentDirs(repoRoot);
  await validateMcpVariables(repoRoot, manifest);
  await validateNoSecretsInArgv(repoRoot);

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

  summarize();
}

await main().catch((err) => {
  console.error(`Validator crashed: ${err?.stack ?? err}`);
  process.exitCode = 2;
});
