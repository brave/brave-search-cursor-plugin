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

> **Security tip:** prefer the `bx` config file or a directory-scoped env var
> over a global shell profile. Coding agents can read every env var your
> shell exports — scoped configs limit blast radius.

## Configure for Cursor

After installing the plugin, run `/bx-setup` from chat. If you prefer to do
it by hand:

### Option 1 — `bx config set-key` (recommended)

The key goes into a per-OS config file (not an env var) and never enters shell
history:

```bash
bx config set-key                       # interactive — prompts, no shell history
bx web --count 1 -- 'test'              # smoke test: exercises every key source
bx config path                          # see where the config lives
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
bx web --count 1 -- 'test'
```

Exit 0 with a JSON result means you're good. Otherwise see Troubleshooting
below.

## Troubleshooting

Read the error message rather than the exit code — `bx` says what went wrong
(no key, invalid key, query too long, plan, rate limit). Two cases it can't
explain:

- **A new key has no effect.** An exported `BRAVE_SEARCH_API_KEY` or
  `BRAVE_API_KEY` wins over the config file, so `bx config set-key` doesn't
  replace it. Change or unset the variable where you export it.
- **`bx` works in a terminal but not in Cursor chat.** Cursor was launched
  before the env var was set. Fully quit Cursor and relaunch it from a fresh
  shell.

## Related docs

- Brave Search API console: <https://api-dashboard.search.brave.com/app/dashboard>
- `bx` CLI: <https://github.com/brave/brave-search-cli>
- Upstream Brave Search skills: <https://github.com/brave/brave-search-skills>
- Cursor plugins reference: <https://cursor.com/docs/reference/plugins>
