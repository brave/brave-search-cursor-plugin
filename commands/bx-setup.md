---
name: bx-setup
description: First-run setup for the Brave Search plugin. Install bx and set BRAVE_API_KEY if it is not already in the environment.
---

# /bx-setup

Walk the user through first-run: install `bx`, then give it a key — either
`BRAVE_API_KEY` in the shell, or `bx config set-key`.

Get a key at <https://api-dashboard.search.brave.com/app/keys> if they do not have one.

## Step 1 — Install `bx`

Follow [`/bx-install`](bx-install.md). Skip if `bx --version` already works.

## Step 2 — CLI key

Check whether a key is already configured by using one:

```bash
bx web "test" --count 1 </dev/null   # no stdin: with no key, bx fails fast instead of prompting
```

Exit 0 → a key is set (env var, config file, wherever) and this step is done.
Otherwise follow [`/bx-set-key`](bx-set-key.md) to write the `bx` config file.

## Step 3 — Confirm

Run `/bx-status` (or re-run the smoke test above).

If it fails, read stderr rather than the exit code. [`/bx-status`](bx-status.md)
has the exit-code table; [`docs/api-key-setup.md`](../docs/api-key-setup.md)
covers key setup.

If `/bx-install` failed with a sandbox / permission / network error, tell
the user to re-run it with sandbox mode disabled, or to install `bx` in
their own terminal.
