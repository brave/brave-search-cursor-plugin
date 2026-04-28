---
name: bx-research
description: "Deep multi-search research via `bx answers --enable-research`. Iterates across many sources to produce a thorough cited report. Can take ~5 minutes. Usage: /bx-research <topic>"
---

# Deep Research (Brave)

Use the **answers** skill (or the **bx** skill) to run deep research on:
$ARGUMENTS

## Step 1: Pick a filename

Choose a short, descriptive filename based on the topic (lowercase + hyphens),
e.g. `react-19-vs-18`, `axum-jwt-auth-2026`. Use it as `$FILENAME` below.

## Step 2: Warn and run

Tell the user this can take up to ~5 minutes, then run (with a long timeout):

```bash
bx --timeout 600 answers "$ARGUMENTS" --enable-research --no-stream > "/tmp/$FILENAME.json"
```

Streaming would flood your context — `--no-stream` plus the file redirect
keeps the full transcript on disk. Pull the final answer with
`jq -r '.choices[0].message.content' "/tmp/$FILENAME.json"` and surface it
along with inline citations.

## Step 3: Report

Share an executive summary plus the full file path
(`/tmp/$FILENAME.json`) so the user can re-read it. Do NOT paste the entire
JSON back into chat.

Follow the answers/bx skill instructions exactly, including the citation
standards and "stop if `bx` / API key is unavailable" guardrail.
