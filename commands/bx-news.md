---
name: bx-news
description: "Recent news with freshness filtering via `bx news`. Usage: /bx-news <query> (defaults to past week; pass `pd|pw|pm|py` or a date range)"
---

# News Search (Brave)

Use the **news-search** skill (or the **bx** skill) to fetch recent news for:
$ARGUMENTS

Default invocation: `bx news "$ARGUMENTS" --freshness pw`. Tune freshness
based on what the user asked for:

- `pd` — past day (breaking news, security advisories)
- `pw` — past week (default)
- `pm` — past month
- `py` — past year
- `YYYY-MM-DDtoYYYY-MM-DD` — custom range

Add `--exclude-site medium.com` if SEO-blog noise crowds out primary sources;
add `--include-site reuters.com` (etc.) to allowlist authoritative outlets.

Follow the skill instructions exactly, including citation standards and the
fallback contract: try `bx`, then Brave Search MCP tools if connected, then
the matching curl skill, then stop and point the user at `/bx-setup`.
