---
name: bx-news
description: "Recent news with freshness filtering via `bx news`. Usage: /bx-news <query> (defaults to past week; pass `pd|pw|pm|py` or a date range)"
---

# News Search (Brave)

Use the **brave-news-search** skill (or the **bx** skill) to fetch recent news for:
$ARGUMENTS

Default invocation: `bx news "<query>" --freshness pw`. Tune freshness
based on what the user asked for:

- `pd` — past day (breaking news, security advisories)
- `pw` — past week (default)
- `pm` — past month
- `py` — past year
- `YYYY-MM-DDtoYYYY-MM-DD` — custom range

Add `--exclude-site medium.com` if SEO-blog noise crowds out primary sources,
**or** `--include-site reuters.com` (etc.) to allowlist authoritative outlets —
`--include-site`, `--exclude-site`, and `--goggles` are mutually exclusive, and
combining any two exits 2. Pass `--goggles` if you need both directions at once.
