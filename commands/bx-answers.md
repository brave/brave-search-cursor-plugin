---
name: bx-answers
description: "AI-grounded answer with citations via `bx answers --enable-citations` (Brave's OpenAI-compatible /chat/completions). Usage: /bx-answers <question>"
---

# Answers (Brave)

Use the **brave-answers** skill (or the **bx** skill, whichever is available) to get
a synthesized AI answer with citations for: $ARGUMENTS

Citations require streaming — a `--no-stream` answer contains no URLs at all,
so it cannot be cited. Default invocation:

```bash
bx answers "<question>" --enable-citations | jq -rj '.choices[0].delta.content // empty'
```

That emits the answer text with inline
`<citation>{"number":1,"url":"https://…"}</citation>` tags. Cite from those
URLs and end with a Sources section; strip the `<usage>` tag from the
user-facing reply.

If the request reads like a deep-research topic (multi-source comparison,
"what changed over the last year", etc.), tell the user about `/bx-research`
instead — it explores many more sources but takes ~5 minutes.
