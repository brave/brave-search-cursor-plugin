---
name: bx-debug
description: "Search for an error message, stack trace, or build failure via `bx context --threshold strict`. Tuned for finding root-cause docs and fixes. Usage: /bx-debug <error message>"
---

# Debug Search (Brave)

Use the **bx** skill (or the **llm-context** skill) to ground a fix for:
$ARGUMENTS

## Pre-process the query

Before searching, clean up the user's input:

- Strip user-specific paths and IDs (`/Users/alice/...` → just the filename;
  drop request IDs, trace IDs).
- Add the language / runtime / framework as a keyword if known
  (e.g. `"Python ..."`, `"Rust ..."`, `"Node.js ..."`).

## Search

```bash
bx "$ARGUMENTS" --threshold strict --max-tokens 4096
```

If results are thin, broaden in this order:

1. Drop the framework keyword.
2. Drop `--threshold strict` (back to balanced).
3. Try `bx web "$ARGUMENTS" --result-filter discussions` to surface
   forum threads (Stack Overflow, GitHub discussions often have the fix).
4. Allowlist canonical sources, e.g. `--include-site docs.python.org
   --include-site github.com`.

## Synthesize

Pull `.grounding.generic[]` snippets, identify the common root cause across
sources, propose a concrete code change, and cite the URLs you used.

Follow the skill instructions exactly, including citation standards and the
fallback contract: try `bx`, then Brave Search MCP tools if connected, then
the matching curl skill, then stop and point the user at `/bx-setup`.
