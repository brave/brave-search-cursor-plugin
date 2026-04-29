---
name: web-search
description: USE FOR web search. Returns ranked results with snippets, URLs, thumbnails. Supports freshness filters, SafeSearch, Goggles for custom ranking, pagination. Primary search endpoint.
allowed-tools: Bash(curl:*), Bash(bx:*)
compatibility: Requires `curl`, a Brave Search API key (`BRAVE_SEARCH_API_KEY`), and network access to api.search.brave.com.
---

# Web Search (Brave)

Search the web for: $ARGUMENTS

## When to pick this skill

| Need                                                                    | Skill                   |
| ----------------------------------------------------------------------- | ----------------------- |
| Raw search hits (titles + URLs + descriptions)                          | **`web-search`** (this) |
| Pre-extracted, query-relevant text chunks for the agent's own reasoning | `llm-context`           |
| Synthesized answer with citations baked in                              | `answers`               |
| Any of the above through one CLI                                        | `bx`                    |

If the `bx` binary is on PATH, prefer it — it wraps this same endpoint and manages the API key.

## Canonical call

```bash
curl -fsSL "https://api.search.brave.com/res/v1/web/search" \
  -H "X-Subscription-Token: ${BRAVE_SEARCH_API_KEY}" \
  -G --data-urlencode "q=$ARGUMENTS" \
  --data-urlencode "count=10"
```

POST is also supported with the same fields as a JSON body — useful for long queries or multi-line `goggles`.

## Knobs that matter

| Param                                                              | Use when                                                                                 |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| `count` (1–20)                                                     | Default 20; lower for cheap lookups                                                      |
| `freshness` (`pd` / `pw` / `pm` / `py` / `YYYY-MM-DDtoYYYY-MM-DD`) | Time-bounded queries                                                                     |
| `result_filter` (`web,news,discussions,faq,videos,locations`)      | Restrict result types — e.g. `discussions` to surface forum threads                      |
| `goggles`                                                          | Re-rank to favor / suppress domains. Use this instead of long `site:X OR site:Y` chains. |
| `safesearch` (`off` / `moderate` / `strict`)                       | Default moderate                                                                         |

Inline goggle for an allowlist:

```bash
--data-urlencode 'goggles=$discard
$site=docs.python.org
$site=developer.mozilla.org'
```

Goggle DSL: `$boost=N` / `$downrank=N` (1–10), `$discard`, `$site=DOMAIN`. Full reference: <https://github.com/brave/goggles-quickstart>.

## Response shape (the fields the agent actually uses)

```json
{
  "web": {
    "results": [
      { "title": "...", "url": "...", "description": "...", "age": "2 days ago", "page_age": "2026-04-12T..." }
    ]
  },
  "discussions": { "results": [...] },
  "news": { "results": [...] },
  "videos": { "results": [...] }
}
```

Pull `web.results[]` for general queries. Fall back to `discussions.results[]` (Stack Overflow, GitHub discussions) when looking for a workaround or community-found fix. The full schema (rich types, search operators, pagination) lives at <https://api-dashboard.search.brave.com/api-reference/web/search/get/index.html.md>.

## Citing results

See [`rules/prefer-bx-for-web-search.mdc`](../../rules/prefer-bx-for-web-search.mdc). Every fact gets `[Title](URL)` from the JSON output (never invented); end with a Sources section.

## If `curl` or the API key is unavailable

Stop. Do not search the web yourself, do not use a built-in search tool, do not answer from training data. Tell the user one of:

- Set `BRAVE_SEARCH_API_KEY` (see [`docs/api-key-setup.md`](../../docs/api-key-setup.md)) and retry.
- Install `bx` via `/bx-install`, run `/bx-set-key`, and use the `bx` skill (or `/bx-search`) instead.
