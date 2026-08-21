---
name: bx-setup
description: First-run setup for the Brave Search plugin. Install bx and set BRAVE_API_KEY if it is not already in the environment.
---

# /bx-setup

Walk the user through first-run. **One key, one env name:** `BRAVE_API_KEY`.

| Path | How it gets the key |
| ---- | ------------------- |
| `bx` / curl skills | Shell `BRAVE_API_KEY`, or `bx config set-key` |

Get a key at <https://api.search.brave.com> if they do not have one.

## Step 1 — Install `bx`

Follow [`/bx-install`](bx-install.md). Skip if `bx --version` already works.

## Step 2 — CLI key

If `BRAVE_API_KEY` is already set in the environment (`[ -n "$BRAVE_API_KEY" ]`),
skip this step — `bx` will use it.

Otherwise follow [`/bx-set-key`](bx-set-key.md) to write the `bx` config file.

## Step 3 — Confirm

Run `/bx-status` (or follow it inline):

- CLI: `bx web "test" --count 1` exits 0.

If that fails, see [`docs/api-key-setup.md`](../docs/api-key-setup.md).

If `/bx-install` failed with a sandbox / permission / network error, tell
the user to re-run it with sandbox mode disabled, or to install `bx` in
their own terminal.
