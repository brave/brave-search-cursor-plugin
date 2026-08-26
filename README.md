# Brave Search — Cursor plugin

Brave Search skills and `bx` CLI commands for the [Cursor](https://cursor.com)
AI agent: token-budgeted web grounding, AI-synthesized answers, deep research,
news, images, and videos — all through Brave's
[independent web index](https://brave.com/search/api/).

## Features

| Capability                       | Skill                 | Command                                                              |
| -------------------------------- | --------------------- | -------------------------------------------------------------------- |
| **All-in-one CLI (recommended)** | `bx`                  | `/bx-search`, `/bx-answers`, `/bx-research`, `/bx-news`, `/bx-debug` |
| **RAG / LLM grounding**          | `brave-llm-context`   | (covered by `/bx-search`)                                            |
| **AI answers (single-shot)**     | `brave-answers`       | `/bx-answers`                                                        |
| **Deep research**                | `brave-answers`       | `/bx-research`                                                       |
| **News**                         | `brave-news-search`   | `/bx-news`                                                           |
| **Images**                       | `brave-images-search` | `/bx-images`                                                         |
| **Videos**                       | `brave-videos-search` | `/bx-videos`                                                         |
| **Setup / status**               | —                     | `/bx-setup`, `/bx-status` (then `/bx-install`, `/bx-set-key`)        |

Plus a short always-on rule (`rules/prefer-bx-for-web-search.mdc`) that
nudges the agent toward `bx` when a lookup needs live web data, without
blocking other search tools.

## Prerequisites

1. Get a Brave Search API key at <https://api-dashboard.search.brave.com/app/keys>. All plans
   include $5/month of free credits.
2. Run `/bx-setup` from chat. One env name, `BRAVE_API_KEY`:
   - Set `BRAVE_API_KEY` in the environment, or run `bx config set-key`, for
     `/bx-*` and curl. See [`docs/api-key-setup.md`](docs/api-key-setup.md).
3. Or install `bx` yourself, then `/bx-set-key`:

   ```bash
   curl -fsSL https://raw.githubusercontent.com/brave/brave-search-cli/main/scripts/install.sh | sh
   ```

   On Windows (PowerShell):

   ```powershell
   powershell -ExecutionPolicy Bypass -c "irm https://raw.githubusercontent.com/brave/brave-search-cli/main/scripts/install.ps1 | iex"
   ```

   Then `/bx-set-key` (or `bx config set-key` interactively).

> The 5 raw-API skills (everything except `bx`) work without the CLI — they
> teach the agent to call the Brave Search API directly with `curl`. Slash
> commands prefer `bx`, then curl. Ranked SERP hits use `bx web` (no
> dedicated curl skill).

## Install

### From the Cursor Marketplace

Open Cursor → Customize → Plugins (or the marketplace panel) → search
"Brave Search" → install.

- Skills appear under **Customize → Skills** (Agent Decides) and can be
  invoked with `/bx`, `/brave-llm-context`, `/brave-answers`, etc.
- Slash commands (`/bx-setup`, `/bx-search`, `/bx-answers`, `/bx-status`, …)
  appear in the chat `/` menu.
- The prefer-bx awareness rule is on by default; toggle it under
  **Customize → Rules**.
- First-run: `/bx-setup`. `BRAVE_API_KEY` in the environment (or
  `/bx-set-key`) starts the CLI. Run `/bx-status` to verify.

### Local development

```bash
bash install.sh                 # copy into ~/.cursor/plugins/local
bash install.sh --with-claude   # also register in Claude Code
bash install.sh --symlink       # symlink instead (often ignored by Cursor)
# ...edit code, re-run install.sh, then: Cmd/Ctrl+Shift+P → Developer: Reload Window
bash install.sh --uninstall     # tear down
```

Default is Cursor-only: the script **copies** this checkout into
`~/.cursor/plugins/local/brave-search`. Cursor currently rejects
local-plugin symlinks whose target is outside that directory, so a copy is
what actually loads. Re-run `install.sh` after you edit the plugin, then
reload. `--symlink` is opt-in for builds that allow live iteration. Pass
`--with-claude` to also register `brave-search@local` in
`~/.claude/plugins/installed_plugins.json` and enable it in
`~/.claude/settings.json`. If the plugin still does not appear after a
reload, confirm the copy exists at that path and see the
[Cursor plugins reference](https://cursor.com/docs/reference/plugins).

After install, reload Cursor and verify in chat that the `bx` skill and
`/bx-search` command are visible. Validate the manifest before submission:

```bash
node scripts/validate-template.mjs
```

## Quick start

```text
/bx-setup
/bx-status
/bx-search how do Rust lifetimes work
/bx-answers compare SQLx and Diesel
/bx-news Next.js 15 release
/bx-debug TypeError cannot unpack non-iterable NoneType
/bx-research how is Mojo evolving versus Python in 2026
/bx-images rust ownership diagram
/bx-videos rustconf 2026 keynote
```

## Submitting to the Cursor Marketplace

Per the [Cursor plugins reference](https://cursor.com/docs/reference/plugins):

1. Push this repo to a public Git host (GitHub).
2. Update `repository` and `homepage` in `.cursor-plugin/plugin.json` to
   point at the **public** GitHub repo you submit (logo paths resolve from
   that URL). The current `repository` field assumes
   `github.com/brave/brave-search-cursor-plugin`.
3. Submit at <https://cursor.com/marketplace/publish>. Plugins are manually
   reviewed before listing.

## Layout

```text
.
├── .cursor-plugin/plugin.json   # plugin manifest
├── README.md
├── CHANGELOG.md
├── LICENSE                      # MIT
├── assets/logo.svg              # marketplace logo
├── rules/                       # 1 short awareness rule (prefer bx)
├── skills/                      # 6 SKILL.md files: bx, brave-llm-context,
│                                #   brave-answers, brave-news-search,
│                                #   brave-images-search, brave-videos-search
├── commands/                    # /bx-* slash commands (setup, search, status, …)
├── docs/api-key-setup.md
├── install.sh                   # local-dev install/uninstall helper
└── scripts/validate-template.mjs
```

## Credits

- Skills are derived from [`brave/brave-search-skills`](https://github.com/brave/brave-search-skills) (MIT, © Brave Software).
- The `bx` CLI lives at [`brave/brave-search-cli`](https://github.com/brave/brave-search-cli) (MIT, © Brave Software).

## License

MIT — see [`LICENSE`](LICENSE).
