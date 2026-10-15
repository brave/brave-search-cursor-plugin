#!/usr/bin/env bash
# install.sh — copy the Brave Search plugin into Cursor's local plugins dir
# (local development; marketplace installs don't need this).
#
# Cursor skips symlinks there that point elsewhere, so this copies: re-run it
# after editing the checkout, then reload Cursor.

set -euo pipefail

# CDPATH can make `cd` print a path into SCRIPT_DIR's substitution. `:?` also
# rejects an empty HOME, which would point rm -rf at /.cursor/...
CDPATH=
: "${HOME:?HOME must be set}"

PLUGIN_NAME="brave-search"
PLUGIN_DIR="${HOME}/.cursor/plugins/local/${PLUGIN_NAME}"
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
# What Cursor loads. An allowlist, so local files (.envrc, .cursor/mcp.json)
# never ship; CI fails if a tracked top-level entry is neither here nor dev-only.
PLUGIN_FILES=(.cursor-plugin assets commands docs rules skills README.md LICENSE CHANGELOG.md)

usage() {
  cat <<'EOF'
Usage: bash install.sh [--uninstall|-u] [--help|-h]

  (no flags)       Copy this repo into ~/.cursor/plugins/local for Cursor.
  --uninstall, -u  Remove the Cursor copy.
  --help, -h       Show this help.
EOF
}

# A copy made by this script: our manifest and no .git, so a clone is never ours.
is_our_copy() {
  [ ! -e "$1/.git" ] && grep -qs '"name"[[:space:]]*:[[:space:]]*"brave-search"' "$1/.cursor-plugin/plugin.json"
}

uninstall() {
  if [ -L "$PLUGIN_DIR" ]; then
    rm "$PLUGIN_DIR"
    echo "Removed symlink ${PLUGIN_DIR}"
  elif [ "$PLUGIN_DIR" -ef "$SCRIPT_DIR" ]; then
    echo "warning: ${PLUGIN_DIR} is this checkout — leaving it in place."
  elif is_our_copy "$PLUGIN_DIR"; then
    rm -rf "$PLUGIN_DIR"
    echo "Removed copy ${PLUGIN_DIR}"
  elif [ -e "$PLUGIN_DIR" ]; then
    echo "warning: ${PLUGIN_DIR} is not a copy made by install.sh — leaving it."
  else
    echo "Plugin not found at ${PLUGIN_DIR} — nothing to remove."
  fi

  echo ""
  echo "Reload Cursor (Cmd/Ctrl+Shift+P → Developer: Reload Window) to apply."
}

install_cursor() {
  if [ ! -L "$PLUGIN_DIR" ] && [ "$PLUGIN_DIR" -ef "$SCRIPT_DIR" ]; then
    echo "Checkout is already at ${PLUGIN_DIR} — nothing to copy."
    return
  fi
  if [ -e "$PLUGIN_DIR" ] && [ ! -L "$PLUGIN_DIR" ] && ! is_our_copy "$PLUGIN_DIR"; then
    echo "error: ${PLUGIN_DIR} exists and is not a copy made by install.sh — refusing to overwrite." >&2
    exit 1
  fi

  mkdir -p "$(dirname "$PLUGIN_DIR")"
  # Stage in a hidden sibling: Cursor never sees a partial copy, and mv is a rename.
  # Global, not local: the EXIT trap reads it after this function returns.
  tmp="$(mktemp -d "$(dirname "$PLUGIN_DIR")/.${PLUGIN_NAME}.tmp.XXXXXX")"
  trap 'rm -rf "$tmp"' EXIT
  (cd "$SCRIPT_DIR" && cp -R "${PLUGIN_FILES[@]}" "$tmp/")
  # Gitignored secrets nested inside a copied directory.
  find "$tmp" \( -name '.env*' -o -name .direnv \) -prune -exec rm -rf {} +
  rm -rf "$PLUGIN_DIR"
  mv "$tmp" "$PLUGIN_DIR"
  echo "Copied ${SCRIPT_DIR} → ${PLUGIN_DIR}"
}

ACTION="install"

for arg in "$@"; do
  case "$arg" in
    --uninstall|-u) ACTION="uninstall" ;;
    --help|-h) usage; exit 0 ;;
    *)
      echo "error: unknown argument ${arg}" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [ "$ACTION" = "uninstall" ]; then
  uninstall
  exit 0
fi

install_cursor

echo ""
echo "Installed. Next steps:"
echo "  1. Reload Cursor (Cmd/Ctrl+Shift+P → Developer: Reload Window)."
echo "  2. The plugin should appear under Customize → Plugins."
echo "  3. The bx skill appears under Customize → Skills; /bx-* commands in the slash menu."
echo "  4. Run /bx-setup (install bx and set the CLI key)."
echo "  5. Run /bx-status to verify."
echo "  6. After editing this checkout, re-run bash install.sh and reload again."
