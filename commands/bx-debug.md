---
name: bx-debug
description: "Search for an error message, stack trace, or build failure via `bx context --threshold strict`. Tuned for finding root-cause docs and fixes. Usage: /bx-debug <error message>"
---

# Debug Search (Brave)

Use the **bx** skill to ground a fix for:
$ARGUMENTS

## Pre-process the query

Before searching, clean up the user's input:

- Strip user-specific paths and IDs (`/Users/alice/...` → just the filename;
  drop request IDs, trace IDs).
- Add the language / runtime / framework as a keyword if known
  (e.g. `"Python ..."`, `"Rust ..."`, `"Node.js ..."`).
- Cut the query to 600 characters and 75 words — the API's caps. A pasted
  stack trace goes over them easily and comes back as exit 1 /
  `validation (422)`. Keep the error line and the frames that name the user's
  own code.

## Search

```bash
bx context --threshold strict --max-tokens 4096 -- '<error>'
```

If results are thin, broaden in this order:

1. Drop the framework keyword.
2. Drop `--threshold strict` (back to the default).
3. Try `bx web --result-filter discussions -- '<error>'` to surface forum threads
   (Stack Overflow, GitHub discussions often have the fix). That response has
   no `.grounding` — read `.discussions.results[]`.

If instead the results are off-topic, narrow by allowlisting canonical sources,
e.g. `--include-site docs.python.org --include-site github.com`.

## Synthesize

Pull the snippets — `.grounding.generic[]` from `bx context`, or
`.discussions.results[]` if you fell back to `bx web` — identify the common
root cause across sources, propose a concrete code change, and cite the URLs
you used.
