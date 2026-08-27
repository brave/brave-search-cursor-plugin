---
name: bx-answers
description: "AI-grounded answer with citations via `bx answers --no-stream` (Brave's OpenAI-compatible /chat/completions). Usage: /bx-answers <question>"
---

# Answers (Brave)

Use the **brave-answers** skill (or the **bx** skill, whichever is available) to get
a synthesized AI answer with citations for: $ARGUMENTS

Default invocation: `bx answers "<question>" --no-stream`. The answer is at
`.choices[0].message.content`; surface inline citations alongside the answer.

If the request reads like a deep-research topic (multi-source comparison,
"what changed over the last year", etc.), tell the user about `/bx-research`
instead — it explores many more sources but takes ~5 minutes.

Follow the skill instructions exactly, including citation standards and the
fallback contract: try `bx`, then the matching curl skill, then stop and
point the user at `/bx-setup`.
