---
name: brave-videos-search
description: "Returns videos with title, URL, duration, views, and creator from Brave Search. Use only when the user explicitly wants video content such as conference talks, tutorials, or demos. Prefer `bx videos` when the CLI is on PATH."
allowed-tools: Bash(curl:*), Bash(bx:*)
compatibility: Requires `curl`, a Brave Search API key (`BRAVE_API_KEY`), and network access to api.search.brave.com.
---

# Video Search (Brave)

Find videos for: $ARGUMENTS

If `$ARGUMENTS` is empty, use the user's query.

## When to pick this skill

Reach for this when the user explicitly wants video content — conference talks, tutorials, demos. For "explain X" prefer `brave-llm-context` (text grounding) or `brave-answers` (synthesized answer).

## Canonical call

```bash
curl -fsSL "https://api.search.brave.com/res/v1/videos/search" \
  -H "X-Subscription-Token: ${BRAVE_API_KEY}" \
  -G --data-urlencode "q=your query" \
  --data-urlencode "count=20"
```

## Knobs that matter

| Param                                                              | Use when                              |
| ------------------------------------------------------------------ | ------------------------------------- |
| `count` (1–50)                                                     | Result count                          |
| `freshness` (`pd` / `pw` / `pm` / `py` / `YYYY-MM-DDtoYYYY-MM-DD`) | Time-bound to recent talks / releases |
| `safesearch` (`off` / `moderate` / `strict`)                       | Default moderate                      |
| `offset` (0–9)                                                     | Pagination                            |

## Response shape

```json
{
  "results": [
    {
      "title": "...",
      "url": "<watch URL>",
      "description": "...",
      "age": "3 weeks ago",
      "video": {
        "duration": "PT15M30S",
        "views": 12345,
        "creator": "...",
        "publisher": "YouTube"
      },
      "thumbnail": { "src": "..." }
    }
  ]
}
```

Pull `results[].url`, `results[].video.duration`, `results[].video.creator`, `results[].video.views` — duration / creator / views are the high-signal fields when picking which video to surface. Full schema: <https://api-dashboard.search.brave.com/api-reference/videos/video_search/get/index.html.md>.

## Citing results

Cite as `[Title — Creator (duration)](URL)` from the search output only. End with a Sources section.

## If `bx`, `curl`, or the API key is unavailable

1. Prefer `bx` when it is on PATH (`bx videos "query"`).
2. If `bx` is missing, use this skill's `curl` call with `BRAVE_API_KEY`.
3. If neither can authenticate, **stop**. Tell the user to run
   `/bx-setup` (then `/bx-set-key` if the CLI is installed). See
   [`docs/api-key-setup.md`](../../docs/api-key-setup.md).
