# API Key Setup

This plugin needs a [Brave Search API key](https://api.search.brave.com).
One environment variable, `BRAVE_API_KEY`, authenticates every path:

| Path | How it picks up `BRAVE_API_KEY` |
| ---- | ------------------------------- |
| MCP server (`npx @brave/brave-search-mcp-server`) | Plugin **Configure** (Cursor substitutes `${BRAVE_API_KEY}` into `mcp.json`) |
| `bx` slash commands | Shell env, or `bx config set-key` |
| Raw-API skills (`curl`) | Shell env (`${BRAVE_API_KEY}`) |

`bx` also accepts the older name `BRAVE_SEARCH_API_KEY`; this plugin uses `BRAVE_API_KEY` only.

## Get a key

1. Sign up at <https://api.search.brave.com>.
2. Choose a plan — all plans include **$5/month of free credits** (~1,000
   queries on the entry tier).
3. Open **API Keys** in the dashboard and generate a key. Different endpoints
   may require different plans (e.g. Search vs Answers vs Suggest).

> **Security tip:** prefer agent-native config or directory-scoped env vars
> over a global shell profile. Coding agents can read every env var your
> shell exports — scoped configs limit blast radius.

## Configure for Cursor

After installing the plugin, run `/bx-setup` from chat. If you prefer to do
it by hand:

### Option 1 — Plugins → Configure (MCP)

After installing the plugin, open **Customize → Plugins → Brave Search API →
Configure** and set **Brave Search API key**. Cursor substitutes that value
into `mcp.json` as `${BRAVE_API_KEY}` and starts the official server with
`npx -y @brave/brave-search-mcp-server` (stdio). You need Node.js on `PATH`.

Configure does not export the key into the agent shell. For `bx` and `curl`,
also export `BRAVE_API_KEY` (options 3–4) or run `bx config set-key`
(option 2).

MCP tools cover web, news, images, videos, places, local, llm-context, and
summarizer. Answers and deep research are **not** on MCP — use `/bx-answers`
and `/bx-research`.

### Option 2 — `bx config set-key` (recommended for the CLI)

The cleanest option if you mostly use the `/bx-*` slash commands. The key
goes into a per-OS config file (not an env var) and never enters shell
history:

```bash
bx config set-key                                      # interactive — hidden prompt, no shell history
bx config show-key >/dev/null 2>&1 && echo "key set"   # presence check (doesn't print the key)
bx config path                                         # see where the config lives
```

> Avoid running `bx config show-key` directly — its stdout is the plaintext
> key. Safe in your own terminal, but if an AI agent runs it the key lands
> in the agent's chat context and, from there, in the model provider's logs.

Config locations:

- Linux: `~/.config/brave-search/config.json`
- macOS: `~/Library/Application Support/brave-search/config.json`
- Windows: `%APPDATA%\brave-search\config.json`

### Option 3 — `direnv` (directory-scoped, auto-loads/unloads)

Best for per-project use. Install [direnv](https://direnv.net), then:

```bash
echo 'export BRAVE_API_KEY="your-key"' >> .envrc
direnv allow
```

The key is loaded only when you `cd` into the project directory.

### Option 4 — Shell profile (global)

Quickest, but the key is exported to every process spawned from your shell.

`~/.zshrc` or `~/.bashrc`:

```bash
export BRAVE_API_KEY="your-key"
```

> **Important:** after editing your shell profile, **fully relaunch Cursor**
> from a fresh terminal. "Developer: Reload Window" is not enough — Cursor
> only re-reads env vars at process start.

### Option 5 — Add as a Cursor remote rule (optional)

You can also pull the upstream skill set into **Customize → Rules → Add
Rule** using the GitHub URL of
[`brave/brave-search-skills`](https://github.com/brave/brave-search-skills).
This is a complement to (not a replacement for) installing this plugin — the
skills still need a key.

## Verify

After configuring, smoke-test from a Cursor terminal:

```bash
# Via the CLI
bx web "test" --count 1 | jq '.web.results[0].title'

# Or directly against the API
curl -s "https://api.search.brave.com/res/v1/web/search?q=test" \
  -H "Accept: application/json" \
  -H "X-Subscription-Token: ${BRAVE_API_KEY}" \
  | jq '.web.results[0].title'
```

A non-empty title means you're good.

## Troubleshooting

| Symptom | Likely cause | Fix |
|--|--|--|
| `error: missing API key` from `bx` | No key set anywhere | Run `bx config set-key` or `export BRAVE_API_KEY=...` |
| HTTP 401 / 403, exit code 3 | Bad / expired key | Rotate at <https://api.search.brave.com> and re-set |
| HTTP 403 "Option not in plan" | Endpoint requires a higher tier (e.g. Answers) | Upgrade your plan |
| HTTP 429, exit code 4 | Rate limited | Back off and retry, or upgrade plan |
| `bx` works in terminal, not in Cursor chat | Cursor was launched before the env var was set | Fully quit Cursor and relaunch from a fresh shell |
| MCP server missing / red in Customize | Key not set, or Node/`npx` not on `PATH` | Set **Configure → Brave Search API key**; install Node.js 22+ |
| MCP works, `/bx-*` asks for a key | `BRAVE_API_KEY` is not in the agent shell | `export BRAVE_API_KEY=...` and relaunch Cursor, or run `/bx-set-key` |

## Related docs

- Brave Search API console: <https://api.search.brave.com>
- `bx` CLI: <https://github.com/brave/brave-search-cli>
- MCP server: <https://github.com/brave/brave-search-mcp-server>
- Upstream Brave Search skills: <https://github.com/brave/brave-search-skills>
- Cursor plugins reference: <https://cursor.com/docs/reference/plugins>
