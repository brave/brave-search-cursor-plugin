# Brave Search — Cursor plugin

Brave Search skills and `bx` CLI commands for the [Cursor](https://cursor.com)
AI agent: token-budgeted web grounding, AI-synthesized answers, deep research,
news, images, videos, and places — all through Brave's
[independent web index](https://brave.com/search/api/).

## Features

| Capability | Skill | Command |
|--|--|--|
| **All-in-one CLI (recommended)** | `bx` | `/bx-search`, `/bx-answers`, `/bx-research`, `/bx-news`, `/bx-debug` |
| **RAG / LLM grounding** | `llm-context` | (covered by `/bx-search`) |
| **AI answers (single-shot)** | `answers` | `/bx-answers` |
| **Deep research** | `answers` | `/bx-research` |
| **Web search** | `web-search` | (covered by `/bx-search`) |
| **News** | `news-search` | `/bx-news` |
| **Images** | `images-search` | — |
| **Videos** | `videos-search` | — |
| **Setup** | — | `/bx-install`, `/bx-set-key` |

Plus a single rule (`rules/prefer-bx-for-web-search.mdc`) that nudges the agent
to use `bx`/Brave Search for web lookups and enforces citation standards.

## Prerequisites

1. Get a Brave Search API key at <https://api.search.brave.com>. All plans
   include $5/month of free credits.
2. Make the key available to Cursor — see
   [`docs/api-key-setup.md`](docs/api-key-setup.md) for the recommended
   `direnv` flow and shell-profile fallback.
3. (Recommended) Install the `bx` CLI so the slash commands work — easiest
   way is to invoke `/bx-install` from chat, or run:

   ```bash
   curl -fsSL https://raw.githubusercontent.com/brave/brave-search-cli/main/scripts/install.sh | sh
   ```

   On Windows (PowerShell):

   ```powershell
   powershell -ExecutionPolicy Bypass -c "irm https://raw.githubusercontent.com/brave/brave-search-cli/main/scripts/install.ps1 | iex"
   ```

   Then `/bx-set-key` (or `bx config set-key` interactively).

> The 10 raw-API skills (everything except `bx`) work without the CLI — they
> teach the agent to call the Brave Search API directly with `curl`. The CLI
> is only required for the `/bx-*` slash commands.

## Install

### From the Cursor Marketplace

Open Cursor → marketplace panel → search "Brave Search" → install. Skills
appear under Settings → Rules; commands appear in the chat slash menu.

### Local development

```bash
bash install.sh        # symlink the repo + register the plugin
# ...edit code, then in Cursor: Cmd/Ctrl+Shift+P → Developer: Reload Window
bash install.sh --uninstall  # tear down
```

The script (a) symlinks this checkout into `~/.cursor/plugins/local/brave-search`
for live iteration, (b) registers the plugin in
`~/.claude/plugins/installed_plugins.json`, and (c) enables it in
`~/.claude/settings.json`'s `enabledPlugins`. Cursor shares its plugin registry
with Claude Code, so all three steps are required — symlinking alone is not
enough for the plugin to be discovered.

After install, reload Cursor and verify in chat that the `bx` skill and
`/bx-search` command are visible. Validate the manifest before submission:

```bash
node scripts/validate-template.mjs
```

## Quick start

```text
/bx-search how do Rust lifetimes work
/bx-answers compare SQLx and Diesel
/bx-news Next.js 15 release
/bx-debug TypeError cannot unpack non-iterable NoneType
/bx-research how is Mojo evolving versus Python in 2026
```

## Submitting to the Cursor Marketplace

Per the [Cursor plugins reference](https://cursor.com/docs/reference/plugins):

1. Push this repo to a public Git host (GitHub).
2. Update `repository` and `homepage` in `.cursor-plugin/plugin.json` to
   point at it.
3. Submit at <https://cursor.com/marketplace/publish>. Plugins are manually
   reviewed before listing.

## Layout

```text
.
├── .cursor-plugin/plugin.json   # plugin manifest
├── README.md
├── LICENSE                      # MIT
├── assets/logo.svg              # marketplace logo
├── rules/                       # 1 rule (prefer-bx + citation standards)
├── skills/                      # 11 SKILL.md files (one per endpoint + bx)
├── commands/                    # 7 /bx-* slash commands
├── docs/api-key-setup.md
├── install.sh                   # local-dev install/uninstall helper
└── scripts/validate-template.mjs
```

## Credits

- Skills are derived from [`brave/brave-search-skills`](https://github.com/brave/brave-search-skills) (MIT, © Brave Software).
- The `bx` CLI lives at [`brave/brave-search-cli`](https://github.com/brave/brave-search-cli) (MIT, © Brave Software).
- Plugin scaffolding follows [`cursor/plugin-template`](https://github.com/cursor/plugin-template) and the [Cursor plugins reference](https://cursor.com/docs/reference/plugins).

## License

MIT — see [`LICENSE`](LICENSE).
