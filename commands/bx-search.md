---
name: bx-search
description: "Quick web grounding via the bx CLI (`bx context`) — token-budgeted, RAG-ready snippets. Usage: /bx-search <query>"
---

# Web Search (Brave)

Use the **bx** skill to run a grounded web search for: $ARGUMENTS

Run the default `bx context` flow (`bx "$ARGUMENTS" --max-tokens 4096`) and pull
results from `.grounding.generic[]`. Add `--include-site <domain>` if the
user's request implies domain scoping (e.g. "search MDN for ...",
"on docs.rs"). Add `--threshold strict` if results look too broad.

Follow the bx skill's instructions exactly, including its citation standards
and "stop if `bx` is unavailable" guardrail.
