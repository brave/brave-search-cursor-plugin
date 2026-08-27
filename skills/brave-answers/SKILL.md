---
name: brave-answers
description: "Synthesizes a cited answer from Brave's OpenAI-compatible chat completions. Single-search is fast; enable_research runs multi-search deep research. Use when the user wants a finished explanation, comparison, or researched report rather than raw sources. Prefer `bx answers` when the CLI is on PATH."
allowed-tools: Bash(curl:*), Bash(bx:*), Bash(jq:*)
compatibility: Requires `curl`, a Brave Search API key (`BRAVE_API_KEY`) on the Answers plan, and network access to api.search.brave.com.
---

# Answers (Brave)

Synthesize an answer with citations for: $ARGUMENTS

If `$ARGUMENTS` is empty, use the user's query.

## When to pick this skill

Use when the user wants a finished answer, not raw context for the agent to reason over. For RAG/grounding prefer `brave-llm-context`. For raw ranked hits use `bx web`. If `bx` is on PATH, `bx answers "query"` calls this same endpoint with simpler flags.

## Two modes

| Mode                                  | Latency      | Best for                                                      |
| ------------------------------------- | ------------ | ------------------------------------------------------------- |
| **Single-search** (default)           | ~5–30s       | Most factual / explanatory questions                          |
| **Research** (`enable_research=true`) | up to ~5 min | Comparative, "what changed over time", multi-source synthesis |

Constraints to remember:

- `enable_research=true` requires `stream=true`.
- `enable_research=true` is incompatible with `enable_citations=true` (research bakes citations into the `<answer>` tag).
- `enable_citations=true` requires `stream=true`.

## Canonical calls

### Single-search, blocking

```bash
curl -fsSL -X POST "https://api.search.brave.com/res/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "X-Subscription-Token: ${BRAVE_API_KEY}" \
  -d "$(jq -n --arg q "your question" '{
    model: "brave",
    stream: false,
    messages: [{role: "user", content: $q}]
  }')"
```

Pull the answer from `.choices[0].message.content`.

### Research mode (streaming, write to file)

```bash
curl -fsSL -X POST "https://api.search.brave.com/res/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "X-Subscription-Token: ${BRAVE_API_KEY}" \
  -N --max-time 360 \
  -d "$(jq -n --arg q "your question" '{
    model: "brave",
    stream: true,
    enable_research: true,
    messages: [{role: "user", content: $q}]
  }')" > "${TMPDIR:-/tmp}/research-output.txt"
```

Streaming is required — write to a temp file (don't flood the chat). Pull the final synthesized text from the `<answer>...</answer>` tag in the file.

### OpenAI SDK drop-in

The endpoint is OpenAI-compatible — point any chat-completions client at `base_url=https://api.search.brave.com/res/v1` with the Brave token as `api_key` and use `model="brave"`. Useful for integrating into existing chat code.

## Knobs that matter

| Param                                   | Default            | Use when                                                     |
| --------------------------------------- | ------------------ | ------------------------------------------------------------ |
| `enable_citations`                      | `false`            | Streaming single-search only — adds `<citation>` inline tags |
| `enable_research`                       | `false`            | Multi-iteration deep research (takes minutes)                |
| `research_maximum_number_of_iterations` | 4                  | Cap research depth (1–5)                                     |
| `research_maximum_number_of_seconds`    | 180                | Time budget (1–300)                                          |
| `country` / `language` / `safesearch`   | US / en / moderate | Standard locale knobs                                        |

## Streaming tags (research mode)

| Tag                                                    | Keep?                                               |
| ------------------------------------------------------ | --------------------------------------------------- |
| `<answer>`                                             | **Yes** — the final synthesized answer              |
| `<blindspots>`                                         | **Yes** — knowledge gaps the model couldn't resolve |
| `<usage>`                                              | **Yes** — JSON token / cost data                    |
| `<progress>`, `<thinking>`, `<analyzing>`, `<queries>` | Debug only — ignore for the user-facing reply       |

## Citing results

Single-search: surface inline citations from the response. Research: the `<answer>` tag already contains citations — preserve them and end with a Sources section.

## If `bx`, `curl`, or the API key is unavailable

Prefer `bx` when it is on PATH (`bx answers "query"`). If `bx` is
missing, use this skill's `curl` call with `BRAVE_API_KEY` on the Answers
plan.

If there is no working API key either, **stop**. Tell the user to run
`/bx-setup` (see [`docs/api-key-setup.md`](../../docs/api-key-setup.md)).
