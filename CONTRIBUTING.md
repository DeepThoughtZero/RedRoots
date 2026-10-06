# Mitwirken an RedRoots

## Arbeitsablauf: immer direkt auf `main`

Der Projektinhaber wünscht ausdrücklich und dauerhaft einen einfachen, linearen Ablauf:

1. Änderung umsetzen (keine Feature-Branches, keine Pull Requests).
2. Gesamte Testsuite ausführen: `node tests/run-all.cjs` – nur bei grünem Ergebnis weiter.
3. Sofort festhalten und veröffentlichen:

   ```bash
   git add -A
   git commit -m "Short English summary of the change"
   git push origin main
   ```

- Das gilt nach **jeder merklichen Änderung** – fertige Funktionen, Fehlerbehebungen und Dokumentation werden nicht gesammelt. Größere Vorhaben werden in mehreren, jeweils lauffähigen Commits gepusht.
- Auch Agenten- und Cloud-Sitzungen mit vorgegebenem Arbeitsbranch pushen auf `main`; ein zusätzlicher Push auf den vorgegebenen Branch ist erlaubt.
- Commit-Nachrichten immer auf Englisch (Betreff und Beschreibung).
- Wird der Push abgelehnt, weil `main` auf dem Server neuer ist: `git pull --rebase origin main`, Konflikte lösen, Tests erneut ausführen, dann pushen. **Niemals force-pushen.**
- Optional erzwingt ein Pre-Push-Hook die Testsuite: `./scripts/install-hooks.sh`.

Weitere Regeln für Engine, Kampagne, Audio und Oberfläche stehen in [AGENTS.md](AGENTS.md).
