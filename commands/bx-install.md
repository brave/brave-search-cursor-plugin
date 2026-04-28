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
3. **Run the installer.**

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
5. **Next step:** prompt the user to run `/bx-set-key` to configure their
   Brave Search API key.

## Notes

- Source: <https://github.com/brave/brave-search-cli>.
- Alternative install paths (manual):
  - Build from source with `cargo install --git https://github.com/brave/brave-search-cli` (requires Rust toolchain).
  - Download a release binary from
    <https://github.com/brave/brave-search-cli/releases> and place on `$PATH`.
- The installer is a small POSIX shell script (`scripts/install.sh`) — review
  it before running if you're security-conscious; it's open source.
