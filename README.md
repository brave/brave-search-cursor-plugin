# Brave Search — Cursor plugin

Brave Search skills, `bx` CLI commands, and the official
[Brave Search MCP server](https://github.com/brave/brave-search-mcp-server)
for the [Cursor](https://cursor.com) AI agent: token-budgeted web grounding,
AI-synthesized answers, deep research, news, images, and videos — all through
Brave's [independent web index](https://brave.com/search/api/).

## Features

| Capability                       | Skill           | Command                                                              |
| -------------------------------- | --------------- | -------------------------------------------------------------------- |
| **All-in-one CLI (recommended)** | `bx`            | `/bx-search`, `/bx-answers`, `/bx-research`, `/bx-news`, `/bx-debug` |
| **RAG / LLM grounding**          | `llm-context`   | (covered by `/bx-search`)                                            |
| **AI answers (single-shot)**     | `answers`       | `/bx-answers`                                                        |
| **Deep research**                | `answers`       | `/bx-research`                                                       |
| **News**                         | `news-search`   | `/bx-news`                                                           |
| **Images**                       | `images-search` | —                                                                    |
| **Videos**                       | `videos-search` | —                                                                    |
| **Setup**                        | —               | `/bx-setup` (then `/bx-install`, `/bx-set-key`)                      |
| **MCP tools**                    | —               | Cursor starts `@brave/brave-search-mcp-server` (stdio via `npx`)     |

Plus a short always-on rule (`rules/prefer-bx-for-web-search.mdc`) that
nudges the agent toward `bx` / Brave Search MCP when a lookup needs live
web data, without blocking other search tools.

## Prerequisites

1. Get a Brave Search API key at <https://api.search.brave.com>. All plans
   include $5/month of free credits.
2. Run `/bx-setup` from chat. One env name, `BRAVE_API_KEY`:
   - **Configure** → `BRAVE_API_KEY` for MCP (Node.js required; Cursor starts
     `npx @brave/brave-search-mcp-server`).
   - The same `BRAVE_API_KEY` in the environment (or `bx config set-key`) for
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
> teach the agent to call the Brave Search API directly with `curl`. The CLI
> is only required for the `/bx-*` slash commands. Ranked SERP hits use
> `bx web` or MCP `brave_web_search` (no dedicated skill).

## Install

### From the Cursor Marketplace

Open Cursor → Customize → Plugins (or the marketplace panel) → search
"Brave Search API" → install.

- Skills appear under **Customize → Skills** (Agent Decides) and can be
  invoked with `/bx`, `/llm-context`, etc.
- Slash commands (`/bx-setup`, `/bx-search`, `/bx-answers`, …) appear in the
  chat `/` menu.
- The prefer-bx awareness rule is on by default; toggle it under
  **Customize → Rules**.
- First-run: `/bx-setup`. Configure starts MCP; `BRAVE_API_KEY` in the
  environment (or `/bx-set-key`) starts the CLI. Answers and deep research
  stay on `/bx-answers` and `/bx-research`.

### Local development

```bash
bash install.sh                 # symlink into ~/.cursor/plugins/local
bash install.sh --with-claude   # also register in Claude Code
# ...edit code, then in Cursor: Cmd/Ctrl+Shift+P → Developer: Reload Window
bash install.sh --uninstall     # tear down
```

Default is Cursor-only: the script symlinks this checkout into
`~/.cursor/plugins/local/brave-search-api` for live iteration. Pass
`--with-claude` to also register `brave-search-api@local` in
`~/.claude/plugins/installed_plugins.json` and enable it in
`~/.claude/settings.json`. If your Cursor build doesn't pick the plugin up
after a reload, check the [Cursor plugins reference](https://cursor.com/docs/reference/plugins)
for the current local-dev path.

After install, reload Cursor and verify in chat that the `bx` skill and
`/bx-search` command are visible. Validate the manifest before submission:

```bash
node scripts/validate-template.mjs
```

## Quick start

```text
/bx-setup
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
├── CHANGELOG.md
├── LICENSE                      # MIT
├── assets/logo.svg              # marketplace logo
├── rules/                       # 1 short awareness rule (prefer bx / MCP)
├── skills/                      # 6 SKILL.md files: bx, answers, llm-context,
│                                #   news-search, images-search, videos-search
├── commands/                    # 8 /bx-* slash commands
├── mcp.json                     # stdio MCP: npx @brave/brave-search-mcp-server
├── docs/api-key-setup.md
├── install.sh                   # local-dev install/uninstall helper
└── scripts/validate-template.mjs
```

## Credits

- Skills are derived from [`brave/brave-search-skills`](https://github.com/brave/brave-search-skills) (MIT, © Brave Software).
- The `bx` CLI lives at [`brave/brave-search-cli`](https://github.com/brave/brave-search-cli) (MIT, © Brave Software).
- The MCP server is [`brave/brave-search-mcp-server`](https://github.com/brave/brave-search-mcp-server) (MIT, © Brave Software).

## License

MIT — see [`LICENSE`](LICENSE).
