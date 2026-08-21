---
name: bx-install
description: Install the Brave Search CLI (`bx`) on the user's machine via the official one-liner. Detects the OS and runs the right installer script.
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
3. **Run the installer.** The shell/PowerShell script is open source — for
   security-conscious users, fetch it first (`curl ... -o install.sh`) and
   review before piping to the interpreter.

   **macOS / Linux / WSL:**

   ```bash
   curl -fsSL https://raw.githubusercontent.com/brave/brave-search-cli/main/scripts/install.sh | sh
   ```

   **Windows (PowerShell):**

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
