#!/usr/bin/env bash
# install.sh — install the Brave Search plugin for Cursor (local development)
#
# Usage:
#   bash install.sh                # symlink into ~/.cursor/plugins/local
#   bash install.sh --with-claude  # also register in Claude Code's plugin files
#   bash install.sh --uninstall    # remove the Cursor symlink (and Claude
#                                  # registration if present)
#
# Default is Cursor-only. --with-claude writes ~/.claude/plugins/installed_plugins.json
# and ~/.claude/settings.json so the same checkout can load in Claude Code.
#
# This is the local-development install. The marketplace install (after
# submission) doesn't need any of this — Cursor handles registration itself.

set -euo pipefail

PLUGIN_NAME="brave-search-api"
# Local-dev plugin id uses an `@local` suffix to coexist with a marketplace
# install of the same plugin (which registers as plain `brave-search-api`).
PLUGIN_ID="${PLUGIN_NAME}@local"
PLUGIN_DIR="${HOME}/.cursor/plugins/local/${PLUGIN_NAME}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

CLAUDE_DIR="${HOME}/.claude"
CLAUDE_PLUGINS="${CLAUDE_DIR}/plugins/installed_plugins.json"
CLAUDE_SETTINGS="${CLAUDE_DIR}/settings.json"

usage() {
  cat <<'EOF'
Usage: bash install.sh [--with-claude] [--uninstall|-u] [--help|-h]

  (no flags)       Symlink this repo into ~/.cursor/plugins/local for Cursor.
  --with-claude    Also register/enable the plugin in Claude Code
                   (~/.claude/plugins/installed_plugins.json and
                   ~/.claude/settings.json).
  --uninstall, -u  Remove the Cursor symlink. Also drops a leftover Claude
                   Code registration if those files exist.
  --help, -h       Show this help.
EOF
}

require_python3() {
  if ! command -v python3 >/dev/null 2>&1; then
    echo "error: python3 is required to register the plugin in Claude Code." >&2
    echo "       install python3 and retry, or omit --with-claude." >&2
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

deregister_claude() {
  if [ ! -f "$CLAUDE_PLUGINS" ] && [ ! -f "$CLAUDE_SETTINGS" ]; then
    return 0
  fi
  if ! command -v python3 >/dev/null 2>&1; then
    echo "warning: leftover Claude Code registration not removed (python3 missing)."
    echo "         remove ${PLUGIN_ID} from ${CLAUDE_PLUGINS} and ${CLAUDE_SETTINGS} manually."
    return 0
  fi
  if [ -f "$CLAUDE_PLUGINS" ]; then
    edit_json "$CLAUDE_PLUGINS" deregister "$PLUGIN_ID"
    echo "Deregistered ${PLUGIN_ID} from ${CLAUDE_PLUGINS}"
  fi
  if [ -f "$CLAUDE_SETTINGS" ]; then
    edit_json "$CLAUDE_SETTINGS" disable "$PLUGIN_ID"
    echo "Disabled ${PLUGIN_ID} in ${CLAUDE_SETTINGS}"
  fi
}

register_claude() {
  require_python3
  edit_json "$CLAUDE_PLUGINS" register "$PLUGIN_ID" "$SCRIPT_DIR"
  echo "Registered ${PLUGIN_ID} in ${CLAUDE_PLUGINS}"
  edit_json "$CLAUDE_SETTINGS" enable "$PLUGIN_ID"
  echo "Enabled ${PLUGIN_ID} in ${CLAUDE_SETTINGS}"
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

  deregister_claude

  echo ""
  echo "Reload Cursor (Cmd/Ctrl+Shift+P → Developer: Reload Window) to apply."
}

install_cursor() {
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
}

ACTION="install"
WITH_CLAUDE=0

for arg in "$@"; do
  case "$arg" in
    --uninstall|-u) ACTION="uninstall" ;;
    --with-claude) WITH_CLAUDE=1 ;;
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
if [ "$WITH_CLAUDE" -eq 1 ]; then
  register_claude
fi

echo ""
echo "Installed. Next steps:"
echo "  1. Reload Cursor (Cmd/Ctrl+Shift+P → Developer: Reload Window)."
echo "  2. The plugin should appear under Customize → Plugins."
echo "  3. Skills appear under Customize → Skills; /bx-* commands in the slash menu."
echo "  4. Run /bx-setup (Configure for MCP, then install bx and set the CLI key)."
if [ "$WITH_CLAUDE" -eq 0 ]; then
  echo ""
  echo "Cursor-only install. To also register in Claude Code: bash install.sh --with-claude"
fi
