---
name: bx-status
description: Check Brave Search plugin health — bx CLI install and API key presence (without printing it). Usage: /bx-status
---

# /bx-status

Diagnose whether this plugin can search. **Never print the API key.**

## 1. CLI

```bash
command -v bx && bx --version
```

- Missing → tell the user to run `/bx-install` (then `/bx-setup`). Stop.
- Present → continue.

## 2. CLI key (presence only)

Skip if `bx` is missing.

```bash
if [ -n "$BRAVE_API_KEY" ]; then
  echo "BRAVE_API_KEY is set in the environment"
elif bx config show-key >/dev/null 2>&1; then
  echo "bx config has a key (not printed)"
else
  echo "no CLI key"
fi
```

Never run `bx config show-key` without redirecting stdout.

If there is no CLI key, tell the user to run `/bx-set-key` or export `BRAVE_API_KEY`.

## 3. CLI smoke test

Only if `bx` is on PATH and a key is present:

```bash
bx web "test" --count 1
```

| Exit | Meaning | Next step |
| ---- | ------- | --------- |
| 0 | Working | CLI path is good |
| 3 | Auth (401/403) | Rotate the key at https://api.search.brave.com and `/bx-set-key` |
| 4 | Rate limited | Key works; wait or upgrade plan |
| 5 | Network/server | Retry; check connectivity to api.search.brave.com |

## 4. Report

Give a short pass/fail for CLI, CLI key, and CLI smoke test. Point at [`docs/api-key-setup.md`](../docs/api-key-setup.md) for anything that failed.
