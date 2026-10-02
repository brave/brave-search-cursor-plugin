# API Key Setup

This plugin needs a [Brave Search API key](https://api-dashboard.search.brave.com).
Everything goes through the `bx` CLI, which reads the key from the
`BRAVE_API_KEY` environment variable or from its own config file
(`bx config set-key`).

> `bx` resolves a key in this order, highest first: the `--api-key` flag,
> `BRAVE_SEARCH_API_KEY` (its native name), `BRAVE_API_KEY`, then its config
> file. The config file is **last**, so writing one does not override an env
> var you already export.

## Get a key

1. Sign up at <https://api-dashboard.search.brave.com/register>.
2. Subscribe to the **Search** plan — it covers everything this plugin does
   and includes **$5/month of free credits** (~1,000 queries).
3. Open **API Keys** in the dashboard and generate a key.

> **Security tip:** prefer agent-native config or directory-scoped env vars
> over a global shell profile. Coding agents can read every env var your
> shell exports — scoped configs limit blast radius.

## Configure for Cursor

After installing the plugin, run `/bx-setup` from chat. If you prefer to do
it by hand:

### Option 1 — `bx config set-key` (recommended)

The cleanest option if you mostly use the `/bx-*` slash commands. The key goes
into a per-OS config file (not an env var) and never enters shell history:

```bash
bx config set-key                    # interactive — prompts, no shell history
bx web "test" --count 1 >/dev/null   # smoke test: exercises every key source
bx config path                       # see where the config lives
```

Check your setup with the smoke test, not `bx config show-key`: `show-key`
only looks at the config file, so it reports "no API key configured" even when
an env var is authenticating you perfectly well.

> **The interactive prompt echoes the key as you type it** — the CLI prints
> "(input will be visible)" before prompting. That keeps the key out of shell
> history and `ps`, but not out of terminal scrollback, terminal logs, or a
> screen share. If the key must never be displayed, use Option 2 or 3 below.
> Never pass it as an argument (`bx config set-key <KEY>`) — that does land in
> shell history.

The config file is written `0600` inside a `0700` directory. Run
`bx config path` for its exact location — `brave-search/config.json` under the
platform config dir (`~/.config` on Linux, `~/Library/Application Support` on
macOS, `%APPDATA%` on Windows).

### Option 2 — `direnv` (directory-scoped, auto-loads/unloads)

Best for per-project use. Install [direnv](https://direnv.net), then add this
line to `.envrc` **in your editor** — writing it with a shell redirect would
put the key in your shell history:

```bash
export BRAVE_API_KEY="your-key"
```

Run `direnv allow` once, and the key is loaded only when you `cd` into the
project directory.

### Option 3 — Shell profile (global)

Quickest, but the key is exported to every process spawned from your shell.

`~/.zshrc` or `~/.bashrc`:

```bash
export BRAVE_API_KEY="your-key"
```

> **Important:** after editing your shell profile, **fully relaunch Cursor**
> from a fresh terminal. "Developer: Reload Window" is not enough — Cursor
> only re-reads env vars at process start.

## Verify

After configuring, smoke-test from a Cursor terminal:

```bash
bx web "test" --count 1
```

Exit 0 with a JSON result means you're good. Otherwise see Troubleshooting
below.

## Troubleshooting

Match the message on stderr rather than the exit code — `/bx-status` has the
full exit-code table.

| Symptom                                                | Likely cause                                        | Fix                                                                    |
| ------------------------------------------------------ | --------------------------------------------------- | ---------------------------------------------------------------------- |
| `No API key found`                                      | No key set anywhere                                 | Run `bx config set-key` or `export BRAVE_API_KEY=...`                  |
| `subscription token invalid (422)`                      | Bad / expired key                                   | Rotate at <https://api-dashboard.search.brave.com/app/keys> and re-set |
| `validation (422)`                                      | The request was rejected, usually a query over 600 characters               | Shorten the query; the key is fine                   |
| HTTP 401 / 403                                          | Key recognized but not permitted                    | Check the key has an active Search plan in the dashboard               |
| HTTP 429                                                | Rate limited                                        | Back off and retry, or upgrade plan                                    |
| `bx` works in terminal, not in Cursor chat             | Cursor was launched before the env var was set      | Fully quit Cursor and relaunch from a fresh shell                      |

## Related docs

- Brave Search API console: <https://api-dashboard.search.brave.com/app/dashboard>
- `bx` CLI: <https://github.com/brave/brave-search-cli>
- Upstream Brave Search skills: <https://github.com/brave/brave-search-skills>
- Cursor plugins reference: <https://cursor.com/docs/reference/plugins>
