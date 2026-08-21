---
name: bx-videos
description: "Video search via `bx videos`. Use for conference talks, tutorials, or demos. Usage: /bx-videos <query>"
---

# Video Search (Brave)

Use the **brave-videos-search** skill (or the **bx** skill) to find videos for:
$ARGUMENTS

Default invocation: `bx videos "$ARGUMENTS"`. Pull `results[].url`,
`results[].video.duration`, `results[].video.creator`, and
`results[].video.views`. Add `--freshness pw` (or `pd`/`pm`/`py`) when the
user wants recent talks or release videos.

Follow the skill instructions exactly, including citation standards and the
fallback contract: try `bx`, then the matching curl skill, then stop and
point the user at `/bx-setup`.
