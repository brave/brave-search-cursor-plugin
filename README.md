# Brave Search — Cursor plugin

A Brave Search skill and `bx` CLI commands for the [Cursor](https://cursor.com)
AI agent: token-budgeted grounding for docs and errors, forum threads, and
recent releases and security advisories — all through Brave's
[independent web index](https://brave.com/search/api/).

## Features

| Capability                          | Skill | Command                                                       |
| ----------------------------------- | ----- | ------------------------------------------------------------- |
| **Web grounding, forums, releases** | `bx`  | `/bx-search`, `/bx-debug`                                     |
| **Setup / status**                  | —     | `/bx-setup`, `/bx-status` (then `/bx-install`, `/bx-set-key`) |

Plus a short always-on rule (`rules/prefer-bx-for-web-search.mdc`) that
nudges the agent toward `bx` when a lookup needs live web data, without
blocking other search tools.

## Prerequisites

1. Get a Brave Search API key at <https://api-dashboard.search.brave.com/app/keys>. The
   Search plan covers everything here and includes $5/month of free credits.
2. Run `/bx-setup` from chat. It installs `bx` and gives it the key — either
   `BRAVE_API_KEY` in the environment or `bx config set-key`. See
   [`docs/api-key-setup.md`](docs/api-key-setup.md).
3. Or install `bx` yourself, then `/bx-set-key`:

   ```bash
   curl -fsSL https://raw.githubusercontent.com/brave/brave-search-cli/main/scripts/install.sh | sh
   ```

   On Windows (PowerShell):

   ```powershell
   powershell -ExecutionPolicy Bypass -c "irm https://raw.githubusercontent.com/brave/brave-search-cli/main/scripts/install.ps1 | iex"
   ```

   Then `/bx-set-key` (or `bx config set-key` interactively).

## Install

### From the Cursor Marketplace

Open Cursor → Customize → Plugins (or the marketplace panel) → search
"Brave Search" → install.

- The `bx` skill appears under **Customize → Skills** (Agent Decides) and
  can be invoked with `/bx`.
- Slash commands (`/bx-setup`, `/bx-search`, `/bx-debug`, `/bx-status`, …)
  appear in the chat `/` menu.
- The prefer-bx awareness rule is on by default; toggle it under
  **Customize → Rules**.
- First run: `/bx-setup`, then `/bx-status` to verify.

### Local development

```bash
bash install.sh                 # copy into ~/.cursor/plugins/local
bash install.sh --symlink       # symlink instead (often ignored by Cursor)
# ...edit code, re-run install.sh, then: Cmd/Ctrl+Shift+P → Developer: Reload Window
bash install.sh --uninstall     # tear down
```

The script **copies** this checkout into
`~/.cursor/plugins/local/brave-search`. Cursor currently rejects
local-plugin symlinks whose target is outside that directory, so a copy is
what actually loads. Re-run `install.sh` after you edit the plugin, then
reload. `--symlink` is opt-in for builds that allow live iteration. If the
plugin still does not appear after a reload, confirm the copy exists at that
path and see the
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
/bx-debug TypeError cannot unpack non-iterable NoneType
```

## Layout

```text
.
├── .cursor-plugin/plugin.json   # plugin manifest
├── README.md
├── CHANGELOG.md
├── LICENSE                      # MIT
├── assets/logo.svg              # marketplace logo
├── rules/                       # 1 short awareness rule (prefer bx)
├── skills/bx/SKILL.md           # the bx skill
├── commands/                    # /bx-* slash commands (setup, search, status, …)
├── docs/api-key-setup.md
├── install.sh                   # local-dev install/uninstall helper
└── scripts/validate-template.mjs
```

## Credits

- The `bx` skill is derived from [`brave/brave-search-skills`](https://github.com/brave/brave-search-skills) (MIT, © Brave Software).
- The `bx` CLI lives at [`brave/brave-search-cli`](https://github.com/brave/brave-search-cli) (MPL-2.0, © Brave Software).

## License

MIT — see [`LICENSE`](LICENSE).
