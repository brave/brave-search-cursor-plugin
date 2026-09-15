#!/usr/bin/env bash
# install.sh — install the Brave Search plugin for Cursor (local development)
#
# Cursor currently rejects local-plugin symlinks whose target is outside
# ~/.cursor/plugins/local, so the default is a real copy. Re-run this script
# after you edit the checkout, then reload Cursor.
#
# This is the local-development install. The marketplace install (after
# submission) doesn't need any of this — Cursor handles registration itself.

set -euo pipefail

# A hostile CDPATH makes `cd` jump elsewhere *and* echo the path, corrupting
# SCRIPT_DIR's command substitution below. An empty HOME would make PLUGIN_DIR
# `/.cursor/...`, which copy_plugin_files then `rm -rf`s — `set -u` catches an
# unset HOME but not an empty one.
CDPATH=
: "${HOME:?HOME must be set}"

PLUGIN_NAME="brave-search"
PLUGIN_DIR="${HOME}/.cursor/plugins/local/${PLUGIN_NAME}"
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"

usage() {
  cat <<'EOF'
Usage: bash install.sh [--symlink] [--uninstall|-u] [--help|-h]

  (no flags)       Copy this repo into ~/.cursor/plugins/local for Cursor.
  --symlink        Symlink instead of copy. Current Cursor builds often
                   ignore symlinks that point outside ~/.cursor/plugins/local
                   — use this only if a copy is working and you want live
                   iteration on a build that allows it.
  --uninstall, -u  Remove the Cursor copy or symlink.
  --help, -h       Show this help.
EOF
}

looks_like_our_plugin() {
  local manifest="$1/.cursor-plugin/plugin.json"
  [ -f "$manifest" ] || return 1
  grep -q '"name"[[:space:]]*:[[:space:]]*"brave-search"' "$manifest"
}

uninstall() {
  if [ -L "$PLUGIN_DIR" ]; then
    rm "$PLUGIN_DIR"
    echo "Removed symlink ${PLUGIN_DIR}"
  elif [ -d "$PLUGIN_DIR" ]; then
    if [ "$PLUGIN_DIR" -ef "$SCRIPT_DIR" ]; then
      echo "warning: ${PLUGIN_DIR} is this checkout — leaving it in place."
      echo "         the plugin is installed by living at the local-plugins path;"
      echo "         move or delete the repo yourself if you want it gone."
    elif looks_like_our_plugin "$PLUGIN_DIR"; then
      rm -rf "$PLUGIN_DIR"
      echo "Removed copy ${PLUGIN_DIR}"
    else
      echo "warning: ${PLUGIN_DIR} exists but does not look like this plugin — leaving it."
      echo "         delete it manually if you want it gone."
    fi
  elif [ -e "$PLUGIN_DIR" ]; then
    echo "warning: ${PLUGIN_DIR} exists but is not a symlink or directory — leaving it."
  else
    echo "Plugin not found at ${PLUGIN_DIR} — nothing to remove."
  fi

  echo ""
  echo "Reload Cursor (Cmd/Ctrl+Shift+P → Developer: Reload Window) to apply."
}

# `.env*` and `.direnv` are gitignored, so they exist only on a developer's
# machine — and docs/api-key-setup.md suggests putting the API key in `.envrc`.
# Copying one would carry a plaintext key out to a path the ignore rules were
# never protecting.
COPY_EXCLUDES=(.git .claude .github node_modules '.env*' .direnv)

copy_plugin_files() {
  local excludes=() pattern
  if command -v rsync >/dev/null 2>&1; then
    for pattern in "${COPY_EXCLUDES[@]}"; do
      excludes+=(--exclude "$pattern")
    done
    # --delete alone keeps excluded files in the destination forever, so an
    # `.envrc` an older version of this script copied would survive every
    # reinstall. --delete-excluded removes it.
    rsync -a --delete --delete-excluded "${excludes[@]}" "$SCRIPT_DIR/" "$PLUGIN_DIR/"
    return
  fi

  # `tar -c .` stores names as `./name`. bsdtar (macOS) matches --exclude
  # patterns start-anchored against that stored name, so the bare pattern
  # excludes nothing there; emit both spellings. Free on GNU tar.
  for pattern in "${COPY_EXCLUDES[@]}"; do
    excludes+=("--exclude=$pattern" "--exclude=./$pattern")
  done
  local tmp
  # Hidden, so Cursor's plugin scan never sees a half-built copy; a sibling, so
  # the swap below stays a single atomic rename.
  tmp="$(mktemp -d "$(dirname "$PLUGIN_DIR")/.${PLUGIN_NAME}.tmp.XXXXXX")"
  if ! tar -C "$SCRIPT_DIR" "${excludes[@]}" -cf - . | tar -C "$tmp" -xf -; then
    rm -rf "$tmp"
    echo "error: failed to copy plugin files to ${PLUGIN_DIR}." >&2
    exit 1
  fi
  rm -rf "$PLUGIN_DIR"
  mv "$tmp" "$PLUGIN_DIR"
}

install_cursor() {
  mkdir -p "$(dirname "$PLUGIN_DIR")"

  if [ -e "$PLUGIN_DIR" ] && [ ! -L "$PLUGIN_DIR" ] && [ ! -d "$PLUGIN_DIR" ]; then
    echo "error: ${PLUGIN_DIR} exists and is not a directory or symlink — refusing to overwrite." >&2
    exit 1
  fi

  if [ -d "$PLUGIN_DIR" ] && [ ! -L "$PLUGIN_DIR" ] && [ "$PLUGIN_DIR" -ef "$SCRIPT_DIR" ]; then
    echo "Checkout is already at ${PLUGIN_DIR} — nothing to copy."
    return
  fi

  if [ "$USE_SYMLINK" -eq 1 ]; then
    if [ -L "$PLUGIN_DIR" ] || [ -d "$PLUGIN_DIR" ]; then
      if [ -d "$PLUGIN_DIR" ] && [ ! -L "$PLUGIN_DIR" ] && ! looks_like_our_plugin "$PLUGIN_DIR"; then
        echo "error: ${PLUGIN_DIR} exists and does not look like this plugin — refusing to overwrite." >&2
        exit 1
      fi
      rm -rf "$PLUGIN_DIR"
    fi
    ln -s "$SCRIPT_DIR" "$PLUGIN_DIR"
    echo "Symlinked ${SCRIPT_DIR} → ${PLUGIN_DIR}"
    echo "warning: current Cursor builds often ignore symlinks whose target is"
    echo "         outside ~/.cursor/plugins/local. If the plugin does not appear"
    echo "         after a reload, re-run: bash install.sh"
    return
  fi

  if [ -L "$PLUGIN_DIR" ]; then
    rm "$PLUGIN_DIR"
  elif [ -d "$PLUGIN_DIR" ] && ! looks_like_our_plugin "$PLUGIN_DIR"; then
    echo "error: ${PLUGIN_DIR} exists and does not look like this plugin — refusing to overwrite." >&2
    echo "       remove it manually if you want to replace it." >&2
    exit 1
  fi

  copy_plugin_files
  echo "Copied ${SCRIPT_DIR} → ${PLUGIN_DIR}"
  echo "This is a copy, not a live link. Re-run bash install.sh after editing the plugin."
}

ACTION="install"
USE_SYMLINK=0

for arg in "$@"; do
  case "$arg" in
    --uninstall|-u) ACTION="uninstall" ;;
    --symlink) USE_SYMLINK=1 ;;
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
echo "  3. Skills appear under Customize → Skills; /bx-* commands in the slash menu."
echo "  4. Run /bx-setup (install bx and set the CLI key)."
echo "  5. Run /bx-status to verify."
if [ "$USE_SYMLINK" -eq 0 ]; then
  echo "  6. After editing this checkout, re-run bash install.sh and reload again."
fi
