---
name: bx-status
description: "Check Brave Search plugin health — bx CLI install and API key presence (without printing it). Usage: /bx-status"
---

# /bx-status

Diagnose whether this plugin can search. **Never print the API key.**

## 1. CLI

```bash
command -v bx && bx --version
```

- Missing → tell the user to run `/bx-install` (then `/bx-setup`). Stop.
- Present → continue.

## 2. Key + smoke test

Skip if `bx` is missing. One command answers both "is a key configured?" and
"does it work?":

```bash
bx web "test" --count 1
```

Don't probe for a key by name first. `bx` accepts a key from an env var or its
config file, and this call exercises the whole chain — so it passes however
the user configured the key.

**Read stderr, not just the exit code.** An invalid key exits **1**, not 3,
because the API reports it as HTTP 422 — and a query over the length cap
reports 422 as well, so the message is what separates them.

| Exit | Meaning                           | Next step                                                                                                                                                                                                                                                                                 |
| ---- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0    | Working                           | CLI path is good                                                                                                                                                                                                                                                                          |
| 1    | Request made, result unusable     | Match stderr: `subscription token invalid (422)` → bad/expired key, rotate at https://api-dashboard.search.brave.com/app/keys and `/bx-set-key`. `validation (422)` → the request was rejected, usually a query over 600 characters; shorten it and leave the key alone. |
| 2    | Usage, config, or no API key      | Read stderr: `No API key found` → run `/bx-set-key` or export `BRAVE_API_KEY`; otherwise fix the flags                                                                                                                                                                                    |
| 3    | Auth/permission (401/403)         | Key is recognized but not permitted — check it has an active Search plan in the dashboard                                                                                                                                                                                                |
| 4    | Rate limited (429)                | Key works; wait or upgrade plan                                                                                                                                                                                                                                                           |
| 5    | Network/server (5xx)              | Retry; check connectivity to api.search.brave.com                                                                                                                                                                                                                                         |
| 127  | npm launcher could not start `bx` | Reinstall via `/bx-install`; check platform support                                                                                                                                                                                                                                       |

## 3. Report

Give a short pass/fail for the CLI install and the search itself. Point at [`docs/api-key-setup.md`](../docs/api-key-setup.md) for anything that failed.
