#!/usr/bin/env bash
# install.sh — install the Brave Search plugin for Cursor (local development)
#
# Usage:
#   bash install.sh             # install from this checkout
#   bash install.sh --uninstall # remove
#
# Symlinks this repo into ~/.cursor/plugins/local/brave-search and registers
# it in ~/.claude/plugins/installed_plugins.json + ~/.claude/settings.json so
# Cursor discovers and enables it on next reload.
#
# This is the local-development install. The marketplace install (after
# submission) doesn't need any of this — Cursor handles registration itself.

set -euo pipefail

PLUGIN_NAME="brave-search"
# Local-dev plugin id uses an `@local` suffix to coexist with a marketplace
# install of the same plugin (which registers as plain `brave-search`).
PLUGIN_ID="${PLUGIN_NAME}@local"
PLUGIN_DIR="${HOME}/.cursor/plugins/local/${PLUGIN_NAME}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

CLAUDE_DIR="${HOME}/.claude"
CLAUDE_PLUGINS="${CLAUDE_DIR}/plugins/installed_plugins.json"
CLAUDE_SETTINGS="${CLAUDE_DIR}/settings.json"

require_python3() {
  if ! command -v python3 >/dev/null 2>&1; then
    echo "error: python3 is required to register the plugin (steps 2-3)." >&2
    echo "       install python3 (or use the marketplace install) and retry." >&2
    exit 1
  fi
}

# Edit a JSON file in one of four modes. Path values are passed via argv to
# avoid bash→python string interpolation pitfalls (e.g. apostrophes in $HOME).
# Aborts on parse error rather than overwriting, and writes atomically via
# os.replace so a mid-write failure can't corrupt the user's settings.
edit_json() {
  local path="$1" mode="$2" plugin_id="$3" install_path="${4:-}"
  python3 - "$path" "$mode" "$plugin_id" "$install_path" <<'PY'
import json, os, sys, tempfile

path, mode, plugin_id, install_path = sys.argv[1:5]

if os.path.exists(path):
    with open(path) as f:
        try:
            data = json.load(f)
        except json.JSONDecodeError as e:
            print(f"error: {path} is not valid JSON ({e}); refusing to overwrite.", file=sys.stderr)
            sys.exit(2)
    if not isinstance(data, dict):
        print(f"error: {path} top-level is not a JSON object; refusing to overwrite.", file=sys.stderr)
        sys.exit(2)
else:
    data = {}

if mode == "register":
    data.setdefault("version", 2)
    plugins = data.setdefault("plugins", {})
    entries = [e for e in plugins.get(plugin_id, [])
               if not (isinstance(e, dict) and e.get("scope") == "user")]
    entries.insert(0, {"scope": "user", "installPath": install_path})
    plugins[plugin_id] = entries
elif mode == "deregister":
    data.get("plugins", {}).pop(plugin_id, None)
elif mode == "enable":
    data.setdefault("enabledPlugins", {})[plugin_id] = True
elif mode == "disable":
    data.get("enabledPlugins", {}).pop(plugin_id, None)
else:
    print(f"error: unknown mode {mode!r}", file=sys.stderr)
    sys.exit(2)

dirname = os.path.dirname(path) or "."
os.makedirs(dirname, exist_ok=True)
fd, tmp = tempfile.mkstemp(prefix=os.path.basename(path) + ".", dir=dirname)
try:
    with os.fdopen(fd, "w") as f:
        json.dump(data, f, indent=2)
        f.write("\n")
    os.replace(tmp, path)
except BaseException:
    try: os.unlink(tmp)
    except OSError: pass
    raise
PY
}

uninstall() {
  if [ -L "$PLUGIN_DIR" ]; then
    rm "$PLUGIN_DIR"
    echo "Removed symlink ${PLUGIN_DIR}"
  elif [ -d "$PLUGIN_DIR" ]; then
    echo "warning: ${PLUGIN_DIR} is a real directory, not a symlink — leaving it."
    echo "         delete it manually if you want it gone."
  elif [ -e "$PLUGIN_DIR" ]; then
    echo "warning: ${PLUGIN_DIR} exists but is not a symlink or directory — leaving it."
  else
    echo "Plugin not found at ${PLUGIN_DIR} — nothing to remove."
  fi

  require_python3
  if [ -f "$CLAUDE_PLUGINS" ]; then
    edit_json "$CLAUDE_PLUGINS" deregister "$PLUGIN_ID"
  fi
  if [ -f "$CLAUDE_SETTINGS" ]; then
    edit_json "$CLAUDE_SETTINGS" disable "$PLUGIN_ID"
  fi

  echo ""
  echo "Reload Cursor (Cmd/Ctrl+Shift+P → Developer: Reload Window) to apply."
}

install() {
  require_python3

  # 1. Symlink the repo into ~/.cursor/plugins/local/ (live iteration —
  #    edits to the repo show up after a Cursor reload, no re-install).
  mkdir -p "$(dirname "$PLUGIN_DIR")"
  if [ -L "$PLUGIN_DIR" ]; then
    rm "$PLUGIN_DIR"
  elif [ -e "$PLUGIN_DIR" ]; then
    echo "error: ${PLUGIN_DIR} exists and is not a symlink — refusing to overwrite." >&2
    echo "       remove it manually if you want to replace it." >&2
    exit 1
  fi
  ln -s "$SCRIPT_DIR" "$PLUGIN_DIR"
  echo "Symlinked ${SCRIPT_DIR} → ${PLUGIN_DIR}"

  # 2. Register in ~/.claude/plugins/installed_plugins.json
  edit_json "$CLAUDE_PLUGINS" register "$PLUGIN_ID" "$SCRIPT_DIR"
  echo "Registered ${PLUGIN_ID} in ${CLAUDE_PLUGINS}"

  # 3. Enable in ~/.claude/settings.json
  edit_json "$CLAUDE_SETTINGS" enable "$PLUGIN_ID"
  echo "Enabled ${PLUGIN_ID} in ${CLAUDE_SETTINGS}"

  echo ""
  echo "Installed. Next steps:"
  echo "  1. Reload Cursor (Cmd/Ctrl+Shift+P → Developer: Reload Window)."
  echo "  2. The plugin should appear under Cursor Settings → Plugins."
  echo "  3. The bx skill and /bx-* commands should be available in chat."
  echo "  4. Run /bx-install (if bx CLI not yet installed) and /bx-set-key."
}

case "${1:-}" in
  --uninstall|-u) uninstall ;;
  *) install ;;
esac
