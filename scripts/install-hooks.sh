#!/usr/bin/env bash
# scripts/install-hooks.sh
# Installiert die Git-Hooks für RedRoots im lokalen Repository (.git/hooks).

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

if [ ! -d "$REPO_ROOT/.git" ]; then
    echo "❌ Fehler: Kein .git-Verzeichnis in $REPO_ROOT gefunden."
    exit 1
fi

HOOKS_DIR="$REPO_ROOT/.git/hooks"
mkdir -p "$HOOKS_DIR"

# Installiere pre-push Hook
chmod +x "$REPO_ROOT/scripts/pre-push.sh"
chmod +x "$REPO_ROOT/tests/run-all.cjs"
cp -f "$REPO_ROOT/scripts/pre-push.sh" "$HOOKS_DIR/pre-push"
chmod +x "$HOOKS_DIR/pre-push"

echo "✅ Git Pre-Push Hook erfolgreich installiert unter $HOOKS_DIR/pre-push"
echo "   Bei jedem 'git push' wird nun automatisch 'node tests/run-all.cjs' ausgeführt."
