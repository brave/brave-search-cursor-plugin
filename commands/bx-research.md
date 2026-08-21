---
name: bx-research
description: "Deep multi-search research via `bx answers --enable-research`. Iterates across many sources to produce a thorough cited report. Can take ~5 minutes. Usage: /bx-research <topic>"
---

# Deep Research (Brave)

Use the **brave-answers** skill (or the **bx** skill) to run deep research on:
$ARGUMENTS

## Step 1: Pick a filename

Choose a short, descriptive filename based on the topic (lowercase + hyphens),
e.g. `react-19-vs-18`, `axum-jwt-auth-2026`. Use it as `$FILENAME` below.

## Step 2: Warn and run

Tell the user this can take up to ~5 minutes, then run (with a long timeout).

Research **requires streaming** (`enable_research` is rejected with
`--no-stream`). Redirect the NDJSON stream to a file so it does not flood
chat.

**macOS / Linux / WSL:**

```bash
bx --timeout 600 answers "$ARGUMENTS" --enable-research > "${TMPDIR:-/tmp}/$FILENAME.ndjson"
jq -rj '.choices[0].delta.content // empty' "${TMPDIR:-/tmp}/$FILENAME.ndjson" \
  > "${TMPDIR:-/tmp}/$FILENAME.txt"
```

**Windows (PowerShell):**

```powershell
bx --timeout 600 answers "$ARGUMENTS" --enable-research > "$env:TEMP\$FILENAME.ndjson"
jq -rj '.choices[0].delta.content // empty' "$env:TEMP\$FILENAME.ndjson" > "$env:TEMP\$FILENAME.txt"
```

The reconstructed file contains tagged sections. For the user-facing reply:

- Keep `<answer>` — the synthesized report (citations are already inline)
- Keep `<blindspots>` — unresolved gaps
- Ignore `<progress>`, `<thinking>`, `<analyzing>`, `<queries>`

Do **not** pass `--no-stream` here. Blocking mode returns
`Blocking response doesn't support 'enable_research' option`.

## Step 3: Report

Share an executive summary plus the full file path so the user can re-read
it. Do NOT paste the entire NDJSON back into chat.

Follow the brave-answers/bx skill instructions exactly, including citation
standards and the fallback contract: try `bx`, then the matching curl skill,
then stop and point the user at `/bx-setup`.
