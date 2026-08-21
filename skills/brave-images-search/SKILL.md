---
name: brave-images-search
description: "Returns image results with source page URL, thumbnail, and dimensions from Brave Search. Use only when the user explicitly wants visual references — diagrams, screenshots, logos, or design inspiration. Prefer `bx images` when the CLI is on PATH."
allowed-tools: Bash(curl:*), Bash(bx:*)
compatibility: Requires `curl`, a Brave Search API key (`BRAVE_API_KEY`), and network access to api.search.brave.com.
---

# Image Search (Brave)

Find images for: $ARGUMENTS

If `$ARGUMENTS` is empty, use the user's query.

## When to pick this skill

Image search is niche for a coding agent. Reach for it only when the user explicitly wants visual references — diagrams, screenshots, logos, design inspiration. For questions where a description suffices, use `brave-llm-context`.

## Canonical call

```bash
curl -fsSL "https://api.search.brave.com/res/v1/images/search" \
  -H "X-Subscription-Token: ${BRAVE_API_KEY}" \
  -G --data-urlencode "q=$ARGUMENTS" \
  --data-urlencode "count=20"
```

## Knobs that matter

| Param         | Default  | Notes                                                     |
| ------------- | -------- | --------------------------------------------------------- |
| `count`       | 50       | Up to 200 — much larger than other Brave search endpoints |
| `safesearch`  | `strict` | Only `off` or `strict` for images (no `moderate` mode)    |
| `country`     | `US`     | 2-letter country code                                     |
| `search_lang` | `en`     | Language hint                                             |

## Response shape

```json
{
  "results": [
    {
      "title": "...",
      "url": "<source page URL>",
      "thumbnail": { "src": "<Brave-proxied ~500px thumbnail>" },
      "properties": {
        "url": "<original full-resolution image URL>",
        "width": 1920,
        "height": 1080
      },
      "confidence": "high"
    }
  ]
}
```

Pull `results[].url` (the page that hosts the image — this is what you cite) and `results[].properties.url` (the image itself). Filter by `results[].confidence === "high"` for precision. Full schema: <https://api-dashboard.search.brave.com/api-reference/images/image_search/index.html.md>.

## Citing results

Always cite the source page (`results[].url`) as `[Title](URL)`, not just the image URL. Only cite URLs from the search output; end with a Sources section.

## If `bx`, `curl`, or the API key is unavailable

1. Prefer `bx` when it is on PATH (`bx images "$ARGUMENTS"`).
2. If `bx` is missing, use this skill's `curl` call with `BRAVE_API_KEY`.
3. If neither can authenticate, **stop**. Tell the user to run
   `/bx-setup` (then `/bx-set-key` if the CLI is installed). See
   [`docs/api-key-setup.md`](../../docs/api-key-setup.md).
