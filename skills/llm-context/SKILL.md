---
name: llm-context
description: USE FOR RAG/LLM grounding. Returns pre-extracted web content (text, tables, code) optimized for LLMs. GET + POST. Adjust max_tokens/count based on complexity. Supports Goggles, local/POI. For AI answers use answers. Recommended for anyone building AI/agentic applications.
allowed-tools: Bash(curl:*), Bash(bx:*)
compatibility: Requires `curl`, a Brave Search API key (`BRAVE_SEARCH_API_KEY`), and network access to api.search.brave.com.
---

# LLM Context (Brave)

Ground a query in real web content for: $ARGUMENTS

## When to pick this skill

This is the right skill when _the agent_ will reason over the web content — RAG, agent tool calls, fact-checking, doc lookup. Use `web-search` for raw hits, `answers` for an end-to-end synthesized answer. If `bx` is on PATH, `bx "$ARGUMENTS"` calls this same endpoint with sensible defaults.

## Canonical call

```bash
curl -fsSL "https://api.search.brave.com/res/v1/llm/context" \
  -H "X-Subscription-Token: ${BRAVE_SEARCH_API_KEY}" \
  -G --data-urlencode "q=$ARGUMENTS"
```

POST is also supported (same fields as JSON body) — useful for long queries or multi-line goggles.

## Knobs that matter

| Param                              | Default    | Use when                                                                                 |
| ---------------------------------- | ---------- | ---------------------------------------------------------------------------------------- |
| `maximum_number_of_tokens`         | 8192       | Total context budget (1024–32768). Lower for cheap lookups, higher for complex research. |
| `maximum_number_of_tokens_per_url` | 4096       | Cap per-URL bloat (512–8192).                                                            |
| `maximum_number_of_urls`           | 20         | Cap source count (1–50). 5 is plenty for grounding a focused answer.                     |
| `count`                            | 20         | Search results to consider before extraction (1–50).                                     |
| `context_threshold_mode`           | `balanced` | `strict` for precision (cleaner snippets), `lenient` for recall.                         |
| `goggles`                          | —          | Re-rank to favor trusted sources (e.g. official docs only).                              |

Quick recipe:

| Task                                     | count | max_tokens | threshold  |
| ---------------------------------------- | ----- | ---------- | ---------- |
| Simple fact ("what year was X created?") | 5     | 2048       | `strict`   |
| Standard ("best practices for Y")        | 20    | 8192       | `balanced` |
| Complex research ("compare X vs Y")      | 50    | 16384      | `balanced` |

## Goggles (custom re-ranking)

Most common pattern — restrict to official docs:

```bash
--data-urlencode 'goggles=$discard
$site=docs.python.org
$site=peps.python.org'
```

`$boost=N` / `$downrank=N` (1–10) for softer biases. Full DSL: <https://github.com/brave/goggles-quickstart>.

## Response shape

```json
{
  "grounding": {
    "generic": [
      { "url": "...", "title": "...", "snippets": ["extracted text...", "..."] }
    ]
  },
  "sources": {
    "https://example.com": {
      "title": "...",
      "hostname": "...",
      "age": ["...", "2025-01-15", "392 days ago"]
    }
  }
}
```

Pull `grounding.generic[]` — `snippets` are pre-extracted, query-relevant chunks (text, tables, or JSON-serialized structured data — LLMs handle the mix fine). `sources[url].age` gives the page date for citation. Full schema: <https://api-dashboard.search.brave.com/api-reference/summarizer/llm_context/get/index.html.md>.

## Citing results

See [`rules/prefer-bx-for-web-search.mdc`](../../rules/prefer-bx-for-web-search.mdc). Every fact pulled from a snippet gets `[Title](URL)` — only cite URLs present in `grounding.generic[].url`. End with a Sources section.

## If `curl` or the API key is unavailable

Stop. Do not search the web yourself, do not use a built-in search tool, do not answer from training data. Tell the user one of:

- Set `BRAVE_SEARCH_API_KEY` (see [`docs/api-key-setup.md`](../../docs/api-key-setup.md)) and retry.
- Install `bx` via `/bx-install`, run `/bx-set-key`, and use `bx` (or `/bx-search`) instead — same endpoint, no key juggling.
