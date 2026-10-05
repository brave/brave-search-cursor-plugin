---
name: bx-set-key
description: Configure the Brave Search API key for the `bx` CLI, keeping it out of shell history and process listings. Uses `bx config set-key` interactively, with direnv / shell-profile fallbacks documented.
---

# /bx-set-key

Configure the Brave Search API key the `bx` CLI uses for authentication. Keeps
the key out of shell history and process listings.

## Steps

1. **Verify install.** Run `bx --version`. If it fails, run `/bx-install`
   first and stop.
2. **Check whether a key is already set** with the smoke test, not by probing
   the config:

   ```bash
   bx web "test" --count 1 </dev/null   # no stdin: with no key, bx fails fast instead of prompting
   ```

   Exit 0 means a key is already working — ask the user whether to overwrite
   before proceeding. Don't use `bx config show-key` for this: it only knows
   about the config file, so it reports "no API key configured" for a user
   whose key comes from the environment.

3. **Ask the user to run interactive set-key in their own terminal** — it
   prompts for input the agent can't type:

   ```bash
   bx config set-key
   ```

   No argument — the CLI prompts for the key. **The key is echoed to the
   terminal as it is typed** (the CLI says so itself: "input will be visible").
   That keeps it out of shell history and `ps`, but not out of terminal
   scrollback, terminal logs, or a screen share. If the user needs the key
   never displayed, have them export `BRAVE_API_KEY` instead (see
   "Alternatives" below) and skip this command.

   Do not pass the key as an argument (`bx config set-key <KEY>`) — that form
   lands in shell history.

   The key is written to the config file; run `bx config path` for the exact
   location (`brave-search/config.json` under the platform config dir). It is
   written `0600` in a `0700` directory.

4. **Verify** by re-running the smoke test:

   ```bash
   bx web "test" --count 1 </dev/null   # no stdin: with no key, bx fails fast instead of prompting
   ```

   Exit 0 means the key works. Otherwise read stderr rather than guessing from
   the code: `subscription token invalid` means re-issue the key at
   <https://api-dashboard.search.brave.com/app/keys>, `No API key found` means
   nothing is configured. [`/bx-status`](bx-status.md) has the full exit-code
   table.

## Alternatives the user may prefer

If they don't want a config file (e.g. ephemeral environments, CI), env-var
based config also works — `bx` resolves `BRAVE_API_KEY` automatically:

- **direnv** (directory-scoped, recommended for project use): have the user add
  `export BRAVE_API_KEY="..."` to `.envrc` in their editor, then run
  `direnv allow`. Don't write the key with a shell redirect — that puts it in
  shell history, which is the thing this command exists to avoid.

- **Shell profile** (`~/.zshrc` / `~/.bashrc`):

  ```bash
  export BRAVE_API_KEY="..."
  ```

  After editing, restart Cursor (relaunch from a fresh terminal — reloading
  the window is not enough, since Cursor inherits env vars from the shell that
  spawned it).

See [`docs/api-key-setup.md`](../docs/api-key-setup.md) for all setup options.

## Notes

- Get a key at <https://api-dashboard.search.brave.com/app/keys>. The Search
  plan covers everything this plugin does and includes $5/month of free credits.
- Resolution priority in `bx`, highest first: `--api-key` flag,
  `BRAVE_SEARCH_API_KEY`, `BRAVE_API_KEY`, config file. So a config file
  written by this command does **not** override an env var the user already
  exports. Prefer the env var or the config file over `--api-key` — flag values
  show up in `ps`.
