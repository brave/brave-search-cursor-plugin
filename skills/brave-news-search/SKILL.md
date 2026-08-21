---
name: brave-news-search
description: "Returns recent news articles (title, URL, description, publication age) from Brave Search, with freshness windows and Goggles. Use when the user asks for latest news, breaking stories, security advisories, or current events. Prefer `bx news` when the CLI is on PATH."
allowed-tools: Bash(curl:*), Bash(bx:*)
compatibility: Requires `curl`, a Brave Search API key (`BRAVE_API_KEY`), and network access to api.search.brave.com.
---

# News Search (Brave)

Find recent news for: $ARGUMENTS

If `$ARGUMENTS` is empty, use the user's query.

## Canonical call

```bash
curl -fsSL "https://api.search.brave.com/res/v1/news/search" \
  -H "X-Subscription-Token: ${BRAVE_API_KEY}" \
  -G --data-urlencode "q=$ARGUMENTS" \
  --data-urlencode "freshness=pw" \
  --data-urlencode "count=20"
```

Default `safesearch` is `strict` for news (stricter than web search) — pass `safesearch=moderate` if the topic warrants it.

## Knobs that matter

| Param                              | Use when                                                         |
| ---------------------------------- | ---------------------------------------------------------------- |
| `freshness=pd`                     | Past day — breaking news, security advisories                    |
| `freshness=pw`                     | Past week (sensible default for most queries)                    |
| `freshness=pm`                     | Past month — slow-moving stories, trend pieces                   |
| `freshness=py`                     | Past year                                                        |
| `freshness=YYYY-MM-DDtoYYYY-MM-DD` | Custom date range                                                |
| `count` (1–50)                     | Result count                                                     |
| `goggles`                          | Curate sources — boost authoritative outlets, suppress SEO blogs |

Common goggle pattern (suppress SEO noise, boost wires):

```bash
--data-urlencode 'goggles=$discard,site=medium.com
$boost=5,site=reuters.com
$boost=5,site=apnews.com'
```

## Response shape

```json
{
  "results": [
    {
      "title": "...",
      "url": "...",
      "description": "...",
      "age": "2 hours ago",
      "page_age": "2026-04-26T14:30:00",
      "thumbnail": { "src": "..." }
    }
  ]
}
```

Pull `results[]`. `age` (human-readable) and `page_age` (ISO datetime) both matter for "is this current?" judgments — surface the date alongside the citation. Full schema: <https://api-dashboard.search.brave.com/api-reference/news/news_search/get/index.html.md>.

## Citing results

News answers should include the publication date in the citation: `[Headline](URL) (Apr 2026)`. Only cite URLs from the search output; end with a Sources section.

## If `bx`, `curl`, or the API key is unavailable

1. Prefer `bx` when it is on PATH (`bx news "$ARGUMENTS"`).
2. If `bx` is missing, use this skill's `curl` call with `BRAVE_API_KEY`.
3. If neither can authenticate, **stop**. Tell the user to run
   `/bx-setup` (then `/bx-set-key` if the CLI is installed). See
   [`docs/api-key-setup.md`](../../docs/api-key-setup.md).
