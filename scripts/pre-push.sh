#!/usr/bin/env bash
# scripts/pre-push.sh
# Git Pre-Push Hook für RedRoots
# Führt vor jedem git push automatisch die gesamte Testsuite aus.

set -e

echo ""
echo "🚀 [Git Pre-Push Hook] Starte automatische Qualitätssicherung für RedRoots..."
echo "------------------------------------------------------------------------"

# 1. Prüfe auf Git-Whitespace-Fehler & Konfliktmarker
if ! git diff --check; then
    echo "❌ [Git Pre-Push Hook] Whitespace- oder Konflikt-Fehler im Arbeitsverzeichnis!"
    exit 1
fi

# 2. Führe zentralen Test-Runner aus
if ! node tests/run-all.cjs; then
    echo ""
    echo "❌ [Git Pre-Push Hook] PUSH ABGEBROCHEN: Die Testsuite ist fehlgeschlagen!"
    echo "   Bitte behebe alle Fehler, bevor du Änderungen auf das Remote überträgst."
    echo ""
    exit 1
fi

echo "✔ [Git Pre-Push Hook] Alle Prüfungen bestanden. Push wird freigegeben."
echo ""
exit 0
