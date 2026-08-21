---
name: bx-setup
description: First-run setup for the Brave Search plugin. Configure BRAVE_API_KEY for MCP, install bx, and set the CLI key if it is not already in the environment.
---

# /bx-setup

Walk the user through first-run. **One key, one env name:** `BRAVE_API_KEY`.

| Path | How it gets the key |
| ---- | ------------------- |
| MCP server | **Configure** → `BRAVE_API_KEY` (this step 1) |
| `bx` / curl skills | Shell `BRAVE_API_KEY`, or `bx config set-key` (step 3) |

Get a key at <https://api.search.brave.com> if they do not have one.

## Step 1 — MCP (Configure)

Tell the user to open **Customize → Plugins → Brave Search API → Configure**
and paste the key if they have not already. Node.js is required; Cursor
starts the server itself.

MCP tools (`brave_llm_context`, `brave_web_search`, …) do **not** include
Answers or deep research. Those stay on `/bx-answers` and `/bx-research`.

## Step 2 — Install `bx`

Follow [`/bx-install`](bx-install.md). Skip if `bx --version` already works.

## Step 3 — CLI key

If `BRAVE_API_KEY` is already set in the environment (`[ -n "$BRAVE_API_KEY" ]`),
skip this step — `bx` will use it.

Otherwise follow [`/bx-set-key`](bx-set-key.md) to write the `bx` config file.
That does **not** update the Configure field from step 1.

## Step 4 — Confirm

- MCP: tools visible under Customize → MCP / Plugins (not red).
- CLI: `bx web "test" --count 1` exits 0.

If either side fails, see [`docs/api-key-setup.md`](../docs/api-key-setup.md).
