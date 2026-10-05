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
bx web --count 1 -- 'test' </dev/null   # no stdin: with no key, bx fails fast instead of prompting
```

Don't probe for a key by name first. `bx` accepts a key from an env var or its
config file, and this call exercises the whole chain — so it passes however
the user configured the key.

Exit 0 means it works. Otherwise **read stderr** — `bx` and the API say what
went wrong (invalid key, query too long, plan, rate limit, network) — and
relay that. The exit code alone is ambiguous: most failures exit 1.

For `No API key found` or `subscription token invalid`, point the user to
`/bx-set-key` rather than the commands `bx` suggests: `set-key <KEY>` and
`--api-key` put the key in shell history and `ps`. An exported
`BRAVE_SEARCH_API_KEY` or `BRAVE_API_KEY` overrides the config file, so an
invalid key has to be fixed where it is set.

## 3. Report

Give a short pass/fail for the CLI install and the search itself. Point at [`docs/api-key-setup.md`](../docs/api-key-setup.md) for anything that failed.
