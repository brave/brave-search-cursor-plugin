# API Key Setup

This plugin needs a [Brave Search API key](https://api-dashboard.search.brave.com).
One environment variable, `BRAVE_API_KEY`, authenticates every path:

| Path                    | How it picks up `BRAVE_API_KEY`   |
| ----------------------- | --------------------------------- |
| `bx` slash commands     | Shell env, or `bx config set-key` |
| Raw-API skills (`curl`) | Shell env (`${BRAVE_API_KEY}`)    |

> `bx` also reads its own native `BRAVE_SEARCH_API_KEY`, which wins if both
> are set. If you already export that one, everything below works unchanged —
> this plugin documents `BRAVE_API_KEY` because a single name covers the CLI
> and the `curl` skills alike.

## Get a key

1. Sign up at <https://api-dashboard.search.brave.com/register>.
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

### Option 1 — `bx config set-key` (recommended)

The cleanest option if you mostly use the `/bx-*` slash commands. The key goes
into a per-OS config file (not an env var) and never enters shell history:

```bash
bx config set-key                                      # interactive — prompts, no shell history
bx config show-key >/dev/null 2>&1 && echo "key set"   # presence check
bx config path                                         # see where the config lives
```

> **The interactive prompt echoes the key as you type it** — the CLI prints
> "(input will be visible)" before prompting. That keeps the key out of shell
> history and `ps`, but not out of terminal scrollback, terminal logs, or a
> screen share. If the key must never be displayed, use Option 2 or 3 below.
> Never pass it as an argument (`bx config set-key <KEY>`) — that does land in
> shell history.

`bx config show-key` prints a **masked** key (e.g. `BSAH...TppZ`), not the full
secret. Still redirect it to `/dev/null` when an AI agent runs the check, so
even the masked prefix stays out of the agent's context.

The config file is written `0600` inside a `0700` directory. Run
`bx config path` for its exact location — `brave-search/config.json` under the
platform config dir (`~/.config` on Linux, `~/Library/Application Support` on
macOS, `%APPDATA%` on Windows).

### Option 2 — `direnv` (directory-scoped, auto-loads/unloads)

Best for per-project use. Install [direnv](https://direnv.net), then:

```bash
echo 'export BRAVE_API_KEY="your-key"' >> .envrc
direnv allow
```

The key is loaded only when you `cd` into the project directory.

### Option 3 — Shell profile (global)

Quickest, but the key is exported to every process spawned from your shell.

`~/.zshrc` or `~/.bashrc`:

```bash
export BRAVE_API_KEY="your-key"
```

> **Important:** after editing your shell profile, **fully relaunch Cursor**
> from a fresh terminal. "Developer: Reload Window" is not enough — Cursor
> only re-reads env vars at process start.

### Option 4 — Add as a Cursor remote rule (optional)

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

| Symptom                                                | Likely cause                                        | Fix                                                                    |
| ------------------------------------------------------ | --------------------------------------------------- | ---------------------------------------------------------------------- |
| `No API key found` from `bx`, exit 1                   | No key set anywhere                                 | Run `bx config set-key` or `export BRAVE_API_KEY=...`                  |
| `subscription token invalid (422)`, **exit 1**          | Bad / expired key — note this is exit 1, not 3      | Rotate at <https://api-dashboard.search.brave.com/app/keys> and re-set |
| HTTP 401 / 403, exit code 3                            | Key recognized but not permitted for this endpoint  | Check the plan covers the endpoint (e.g. Answers)                      |
| HTTP 429, exit code 4                                  | Rate limited                                        | Back off and retry, or upgrade plan                                    |
| `bx` works in terminal, not in Cursor chat             | Cursor was launched before the env var was set      | Fully quit Cursor and relaunch from a fresh shell                      |

## Related docs

- Brave Search API console: <https://api-dashboard.search.brave.com/app/dashboard>
- `bx` CLI: <https://github.com/brave/brave-search-cli>
- Upstream Brave Search skills: <https://github.com/brave/brave-search-skills>
- Cursor plugins reference: <https://cursor.com/docs/reference/plugins>
