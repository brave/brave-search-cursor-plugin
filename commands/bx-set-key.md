---
name: bx-set-key
description: Configure the Brave Search API key for the `bx` CLI, keeping it out of shell history and process listings. Uses `bx config set-key` interactively, with direnv / shell-profile fallbacks documented.
---

# /bx-set-key

Configure the Brave Search API key the `bx` CLI uses for authentication. Keeps
the key out of shell history and process listings.

Skip this command if `bx web "test" --count 1` already exits 0 — a key is
configured somewhere and nothing needs changing. This writes the `bx` config
file.

## Steps

1. **Verify install.** Run `bx --version`. If it fails, run `/bx-install`
   first and stop.
2. **Check whether a key is already set:**

   ```bash
   bx config show-key >/dev/null 2>&1 && echo "key already set" || echo "no key set"
   ```

   `show-key` prints a masked key (`BSAH...TppZ`), not the full secret, but
   redirect it anyway so even the masked prefix stays out of this chat. If the
   check reports "key already set", ask the user whether to overwrite before
   proceeding.

3. **Run interactive set-key:**

   ```bash
   bx config set-key
   ```

   No argument — the CLI prompts for the key. **The key is echoed to the
   terminal as it is typed** (the CLI says so itself: "input will be visible").
   That keeps it out of shell history and `ps`, but not out of terminal
   scrollback, terminal logs, or a screen share. If the user needs the key
   never displayed, have them export `BRAVE_API_KEY` instead (step 3 of
   "Alternatives" below) and skip this command.

   Do not pass the key as an argument (`bx config set-key <KEY>`) — that form
   lands in shell history.

   The key is written to the config file; run `bx config path` for the exact
   location (`brave-search/config.json` under the platform config dir). It is
   written `0600` in a `0700` directory.

4. **Verify** with the same `bx config show-key >/dev/null 2>&1` presence
   check. Then sanity-check connectivity:

   ```bash
   bx web "test" --count 1
   ```

   - Exit 0 → working.
   - Exit 1 → most bad-key cases land here. The API returns **422** for an
     invalid subscription token, which maps to exit 1, and stderr reads
     `subscription token invalid (422)`. Read the message rather than assuming
     from the code: `No API key found` means nothing is configured, while
     `subscription token invalid` means the user should re-issue at
     <https://api-dashboard.search.brave.com/app/keys> and retry.
   - Exit 3 → 401/403. The key is recognized but not permitted — usually the
     endpoint needs a different plan.
   - Exit 4 → rate-limited (key works, plan is over its quota).

## Alternatives the user may prefer

If they don't want a config file (e.g. ephemeral environments, CI), env-var
based config also works — `bx` resolves `BRAVE_API_KEY` automatically:

- **direnv** (directory-scoped, recommended for project use):

  ```bash
  echo 'export BRAVE_API_KEY="..."' >> .envrc
  direnv allow
  ```

- **Shell profile** (`~/.zshrc` / `~/.bashrc`):

  ```bash
  export BRAVE_API_KEY="..."
  ```

  After editing, restart Cursor (relaunch from a fresh terminal — reloading
  the window is not enough, since Cursor inherits env vars from the shell that
  spawned it).

See [`docs/api-key-setup.md`](../docs/api-key-setup.md) for the full setup
matrix (Cursor, Codex, Claude Code, Docker / CI, etc.).

## Notes

- Get a key at <https://api-dashboard.search.brave.com/app/keys>. All plans include $5/month of
  free credits.
- Resolution priority in `bx`: env var > config file > interactive prompt.
  Prefer either of the first two over the `--api-key` flag — flag values show
  up in `ps`.
