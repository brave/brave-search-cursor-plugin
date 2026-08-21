---
name: bx-images
description: "Image search via `bx images`. Use for diagrams, screenshots, logos, or design references. Usage: /bx-images <query>"
---

# Image Search (Brave)

Use the **brave-images-search** skill (or the **bx** skill) to find images for:
$ARGUMENTS

Default invocation: `bx images "$ARGUMENTS" --count 20`. Pull
`results[].url` (source page — cite this) and `results[].properties.url`
(the image). Prefer `confidence === "high"` when the list is noisy.

Follow the skill instructions exactly, including citation standards and the
fallback contract: try `bx`, then the matching curl skill, then stop and
point the user at `/bx-setup`.
