---
name: bx-set-key
description: Configure the Brave Search API key for the `bx` CLI without leaking it into shell history. Uses `bx config set-key` interactively, with direnv / shell-profile fallbacks documented.
---

# /bx-set-key

Configure the Brave Search API key the `bx` CLI uses for authentication. Sets
the key without exposing it in shell history or process listings.

Skip this command if `BRAVE_API_KEY` is already set in the environment —
`bx` reads that name directly. This writes the `bx` config file.

## Steps

1. **Verify install.** Run `bx --version`. If it fails, run `/bx-install`
   first and stop.
2. **Check whether a key is already set** without printing it:

   ```bash
   bx config show-key >/dev/null 2>&1 && echo "key already set" || echo "no key set"
   ```

   Never run `bx config show-key` directly — its stdout is the plaintext key,
   which would land in this chat's context (and from there in the model
   provider's logs). If the check reports "key already set", ask the user
   whether to overwrite before proceeding.

3. **Run interactive set-key:**

   ```bash
   bx config set-key
   ```

   No argument — the CLI prompts for the key on a hidden TTY input. This
   avoids both shell history (`history`) and process listings (`ps aux`).
   The key is written to the config file (run `bx config path` to see the
   exact location):
   - Linux: `~/.config/brave-search/config.json`
   - macOS: `~/Library/Application Support/brave-search/config.json`
   - Windows: `%APPDATA%\brave-search\config.json`

4. **Verify** with the same `bx config show-key >/dev/null 2>&1` presence
   check (do **not** print the key). Then sanity-check connectivity:

   ```bash
   bx web "test" --count 1
   ```

   - Exit 0 → working.
   - Exit 3 → bad/expired key. Have the user re-issue at
     <https://api-dashboard.search.brave.com/app/keys> and retry.
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
- Resolution priority in `bx`: `--api-key` flag > `BRAVE_API_KEY` env >
  config file > interactive prompt. Prefer the config file or env var over
  the CLI flag — flag values show up in `ps`.
