---
name: bx-install
description: Install the Brave Search CLI (`bx`) on the user's machine, via npm or the official install script for their OS.
---

# /bx-install

Install or update the Brave Search CLI (`bx`) on the user's machine.

## Steps

1. **Detect the OS.**
   - macOS / Linux → use the shell installer.
   - Windows → use the PowerShell installer.
   - WSL → use the shell installer (it's a Linux env).
2. **Check for an existing install** by running `bx --version`. If a recent
   version already exists, ask the user whether to reinstall before
   proceeding.
3. **Run the installer.** Two supported routes — ask the user which they
   prefer if it is not obvious.

   **npm** (Node ≥ 16). Prefer this when Node is present, or whenever the
   user or their organization would rather not pipe a script to a shell. It
   installs a versioned, signed registry package:

   ```bash
   npm install -g @brave/brave-search-cli
   ```

   **Official install script.** It downloads the release binary over HTTPS
   and verifies it against a published SHA256 checksum, using no `sudo` and
   no `eval`. It is still a remote script piped to an interpreter, so a
   security-conscious user may prefer to fetch it first
   (`curl ... -o install.sh`) and read it before running.

   macOS / Linux / WSL:

   ```bash
   curl -fsSL https://raw.githubusercontent.com/brave/brave-search-cli/main/scripts/install.sh | sh
   ```

   Windows (PowerShell) — note this bypasses execution policy for the
   command, which some managed environments disallow:

   ```powershell
   powershell -ExecutionPolicy Bypass -c "irm https://raw.githubusercontent.com/brave/brave-search-cli/main/scripts/install.ps1 | iex"
   ```

4. **Verify** by running `bx --version`. If `bx: command not found`, the
   installer probably dropped the binary somewhere not on `$PATH` — surface
   the script's stdout/stderr so the user can see the install location, and
   suggest adding it to `PATH` (e.g. `~/.local/bin` on Linux,
   `/usr/local/bin` on macOS, `%USERPROFILE%\.bx\bin` on Windows).

   If the installer fails with a sandbox / permission / network error, tell
   the user to re-run `/bx-install` with sandbox mode disabled, or to run
   the installer in their own terminal and then `/bx-status`.
5. **Next step:** run `/bx-setup` if this is first-run. If `BRAVE_API_KEY` is
   already in the environment, `bx` will use it; otherwise `/bx-set-key`.

## Notes

- Source: <https://github.com/brave/brave-search-cli>.
- Alternative install paths (manual):
  - Build from source with `cargo install --git https://github.com/brave/brave-search-cli` (requires Rust toolchain).
  - Download a release binary from
    <https://github.com/brave/brave-search-cli/releases> and place on `$PATH`.
