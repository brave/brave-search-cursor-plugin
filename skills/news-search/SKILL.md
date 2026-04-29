---
name: news-search
description: USE FOR news search. Returns news articles with title, URL, description, age, thumbnail. Supports freshness and date range filtering, SafeSearch filter and Goggles for custom ranking.
allowed-tools: Bash(curl:*), Bash(bx:*)
compatibility: Requires `curl`, a Brave Search API key (`BRAVE_SEARCH_API_KEY`), and network access to api.search.brave.com.
---

# News Search (Brave)

Find recent news for: $ARGUMENTS

## Canonical call

```bash
curl -fsSL "https://api.search.brave.com/res/v1/news/search" \
  -H "X-Subscription-Token: ${BRAVE_SEARCH_API_KEY}" \
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

See [`rules/prefer-bx-for-web-search.mdc`](../../rules/prefer-bx-for-web-search.mdc). News answers should include the publication date in the citation: `[Headline](URL) (Apr 2026)`.

## If `curl` or the API key is unavailable

Stop. Do not search the web yourself, do not use a built-in search tool, do not answer from training data. Tell the user one of:

- Set `BRAVE_SEARCH_API_KEY` (see [`docs/api-key-setup.md`](../../docs/api-key-setup.md)) and retry.
- Install `bx` via `/bx-install`, run `/bx-set-key`, and use `bx news` (or `/bx-news`) instead.
