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
PLUGIN_ID="${PLUGIN_NAME}@local"
PLUGIN_DIR="${HOME}/.cursor/plugins/local/${PLUGIN_NAME}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

CLAUDE_DIR="${HOME}/.claude"
CLAUDE_PLUGINS="${CLAUDE_DIR}/plugins/installed_plugins.json"
CLAUDE_SETTINGS="${CLAUDE_DIR}/settings.json"

# Upsert a plugin entry into a JSON file without clobbering other plugins.
# Requires python3 (ships with macOS and most Linux).
json_upsert() {
  local file="$1" script="$2"
  if ! command -v python3 >/dev/null 2>&1; then
    echo "  warning: python3 not found — skipping ${file}"
    return
  fi
  mkdir -p "$(dirname "$file")"
  python3 -c "$script"
}

uninstall() {
  if [ -L "$PLUGIN_DIR" ] || [ -d "$PLUGIN_DIR" ]; then
    rm -rf "$PLUGIN_DIR"
    echo "Removed ${PLUGIN_DIR}"
  else
    echo "Plugin not found at ${PLUGIN_DIR} — nothing to remove."
  fi

  json_upsert "$CLAUDE_PLUGINS" "
import json, os, sys
path = '$CLAUDE_PLUGINS'
if not os.path.exists(path): sys.exit(0)
data = json.load(open(path))
data.get('plugins', {}).pop('$PLUGIN_ID', None)
json.dump(data, open(path, 'w'), indent=2)
"
  json_upsert "$CLAUDE_SETTINGS" "
import json, os, sys
path = '$CLAUDE_SETTINGS'
if not os.path.exists(path): sys.exit(0)
data = json.load(open(path))
data.get('enabledPlugins', {}).pop('$PLUGIN_ID', None)
json.dump(data, open(path, 'w'), indent=2)
"

  echo ""
  echo "Reload Cursor (Cmd/Ctrl+Shift+P → Developer: Reload Window) to apply."
}

install() {
  # 1. Symlink the repo into ~/.cursor/plugins/local/ (live iteration —
  #    edits to the repo show up after a Cursor reload, no re-install).
  mkdir -p "$(dirname "$PLUGIN_DIR")"
  if [ -e "$PLUGIN_DIR" ] || [ -L "$PLUGIN_DIR" ]; then
    rm -rf "$PLUGIN_DIR"
  fi
  ln -s "$SCRIPT_DIR" "$PLUGIN_DIR"
  echo "Symlinked ${SCRIPT_DIR} → ${PLUGIN_DIR}"

  # 2. Register in ~/.claude/plugins/installed_plugins.json
  json_upsert "$CLAUDE_PLUGINS" "
import json, os
path = '$CLAUDE_PLUGINS'
data = {'version': 2, 'plugins': {}}
if os.path.exists(path):
    try: data = json.load(open(path))
    except: pass
data.setdefault('plugins', {})
entries = [e for e in data['plugins'].get('$PLUGIN_ID', [])
           if not (isinstance(e, dict) and e.get('scope') == 'user')]
entries.insert(0, {'scope': 'user', 'installPath': '$SCRIPT_DIR'})
data['plugins']['$PLUGIN_ID'] = entries
os.makedirs(os.path.dirname(path), exist_ok=True)
json.dump(data, open(path, 'w'), indent=2)
"
  echo "Registered ${PLUGIN_ID} in ${CLAUDE_PLUGINS}"

  # 3. Enable in ~/.claude/settings.json
  json_upsert "$CLAUDE_SETTINGS" "
import json, os
path = '$CLAUDE_SETTINGS'
data = {}
if os.path.exists(path):
    try: data = json.load(open(path))
    except: pass
data.setdefault('enabledPlugins', {})['$PLUGIN_ID'] = True
os.makedirs(os.path.dirname(path), exist_ok=True)
json.dump(data, open(path, 'w'), indent=2)
"
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
