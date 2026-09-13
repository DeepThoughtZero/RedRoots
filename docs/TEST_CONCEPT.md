# RedRoots – Testkonzept & Qualitätssicherung

Dieses Dokument definiert das modulare, hermetische Testkonzept für das browserbasierte Mars-Strategiespiel **RedRoots** (Conway's Game of Life).

---

## 1. Motivation & Leitprinzipien

RedRoots ist ein komplexes, deterministisches Strategiespiel mit zellulären Automaten, dynamischer Territoriumsverwaltung, asymmetrischen Kampagnenszenarien und einer Heuristik-KI. Bereits kleine Änderungen an Conway-Berechnungen, Array-Offsets oder Budgetformeln können kaskadierende Fehler oder unlösbare Missionen verursachen.

### Leitprinzipien des Testkonzepts:
1. **Zero External Dependencies:** Reines Node.js mit `node:assert/strict`, `node:vm` und `node:fs`. Keine npm-Pakete, kein Webpack/Vite-Build-Overhead.
2. **Subsekunden-Laufzeit:** Die gesamte Testsuite läuft in unter 5 Sekunden durch.
3. **Deterministische Reproduzierbarkeit:** Keine zufälligen Fehlschläge (Flakiness). Zufallszahlen in KI- oder Szenariotests werden durch Pseudozufallsgeneratoren (LCG PRNG) mit festen Seeds hermetisch kontrolliert.
4. **Schichtenarchitektur (Testpyramide):** Trennung von statischer Hygiene, Kern-Unit-Tests, KI-Disziplin, Kampagnen-Lösungswegen und System-Audio.
5. **Pre-Push Quality Gate:** Kein Code gelangt ohne bestandene Testsuite und saubere Patch-Hygiene in das Git-Remote (`origin/main`).

---

## 2. Die 5 Testebenen (Testpyramide)

```
              ┌───────────────────────────────────────────────┐
              │  Ebene 5: Audio & Benutzeroberfläche          │
              │  (GameAudio.js, Ducking, Tab-Pause, TTS)      │
              ├───────────────────────────────────────────────┤
              │  Ebene 4: Kampagnen-Szenarien & Progression   │
              │  (Akte I, II, III, ObjectiveSystem, Saves)    │
              ├───────────────────────────────────────────────┤
              │  Ebene 3: KI-Verhalten & Grenzfälle           │
              │  (AI.js, Budgetgrenzen, gültige Züge, Robust) │
              ├───────────────────────────────────────────────┤
              │  Ebene 2: Kern-Engine & Conway-Simulation     │
              │  (Grid.js, Territory.js, GameState.js)        │
              ├───────────────────────────────────────────────┤
              │  Ebene 1: Statische Integrität & Hygiene      │
              │  (Syntax, Script-Reihenfolge, Manifeste)      │
              └───────────────────────────────────────────────┘
```

---

### Ebene 1: Statische Integrität & Hygiene (`tests/integrity.test.cjs`)
Sichert die strukturelle Basis des Projekts ab, bevor Spiellogik geladen wird:
- **Syntaxvalidierung:** Führt `node --check` über alle JavaScript-Dateien in `js/` und `tests/` aus.
- **Script-Ladereihenfolge in `index.html`:** Da das Spiel klassische Skripte mit globalem Scope verwendet, ist die Ladereihenfolge überlebenswichtig:
  `Constants.js` $\rightarrow$ `Territory.js` $\rightarrow$ `Grid.js` $\rightarrow$ `AI.js` $\rightarrow$ `AIEvolver.js` $\rightarrow$ `InputHandler.js` $\rightarrow$ `Missions.js` $\rightarrow$ `Story.js` $\rightarrow$ `Act2.js` $\rightarrow$ `Act3.js` $\rightarrow$ `ObjectiveSystem.js` $\rightarrow$ `CampaignManager.js` $\rightarrow$ `GameState.js` $\rightarrow$ `GameRenderer.js` $\rightarrow$ `GameAudio.js` $\rightarrow$ `UIManager.js` $\rightarrow$ `main.js`.
- **Missions-Validierung:** Prüft alle deklarierten Missionen auf konsistente Daten:
  - Spielfeldmaße (`rows`, `cols` > 0).
  - Bounding-Boxes (`rMin <= rMax`, `cMin <= cMax`) aller Zonen und Camps innerhalb der Spielfeldgrenzen.
  - Erlaubte Genom-Muster existieren in `CONSTANTS.PATTERNS`.
  - Zielobjekte (`objective`) besitzen gültige Typen und Zielzonen.
- **Asset-Manifeste:**
  - Audio-Manifest (`assets/audio/manifest.json`): Alle Missionen besitzen verifizierte Briefing- und Debriefing-Einträge.
  - Bild-Manifest (`assets/missions/manifest.json`): Alle Missionen verweisen auf existierende WebP-Grafiken oder explizite Fallbacks.
- **Git-Patch-Hygiene:** Führt `git diff --check` aus, um Whitespace-Fehler, CRLF-Mischungen und ungelöste Git-Konfliktmarker zu blockieren.

---

### Ebene 2: Kern-Engine & Conway-Simulation (`tests/core.test.cjs`)
Isolierte Unit-Tests für die mathematischen und regeltechnischen Grundlagen:
- **Conway B3/S23:**
  - Unterbevölkerung (< 2 Nachbarn $\rightarrow$ Zelle stirbt).
  - Überleben (2 oder 3 Nachbarn $\rightarrow$ Zelle überlebt).
  - Überbevölkerung (> 3 Nachbarn $\rightarrow$ Zelle stirbt).
  - Geburt (exakt 3 Nachbarn auf leerem Feld $\rightarrow$ neue Zelle sprießt).
- **Konfliktregeln bei Geburt:**
  - Regel `majority`: Nachbarn des dominanten Hauses bestimmen den Eigentümer. Gleichstand erzeugt neutrale Flora (`OWNER_NEUTRAL: -1`).
  - Regel `neutral`: Jeder Konflikt zweier Häuser erzeugt neutrale Flora (`-1`).
- **Fels-Unveränderlichkeit (`OWNER_ROCK: -3`):**
  - Felsen sterben nie (weder durch Einsamkeit noch Überbevölkerung).
  - Auf Felsfeldern können niemals neue Zellen geboren werden.
- **Neutrale Flora (`OWNER_NEUTRAL: -1`):**
  - Wächst und vergeht nach den normalen Conway-Regeln.
  - Kann keine Camps erobern und wird niemals als Spieler gewertet.
- **Double-Buffering & Zero-Allocation:**
  - Buffer-Swap zwischen `owners` und `_nextOwners` sowie `isOldFlags` ohne Heap-Neuallokation im Render-Loop.
- **Territorium & BFS (`Territory.js`):**
  - Multi-Source BFS bis zum Radius `radius`.
  - Niemandsland (`-1`) bei gleichem Abstand zu zwei gegnerischen Spielern.
  - **Falsy-Trap-Prüfung:** Haus 0 besitzt Eigentümer-ID `0`. Sicherstellung, dass `0` nicht fälschlich als `null` / unbesetzt interpretiert wird (`owner !== null && owner >= 0`).
  - Camp-Priorität: Camp-Felder behalten unveränderlich ihren festen Eigentümer.
- **GameState-Rundenschleife & Budget (`GameState.js`):**
  - Budget-Akkumulation: Nach der Simulation wird neues Budget **hinzugefügt** (`+= Math.max(1, Math.floor(count / factor))`), nicht überschrieben.
  - Platzierung: Nur im eigenen Territorium, nur auf leeren Feldern, nur bei ausreichendem Budget.
  - Undo/Erase-Invariante: Exakte Rückerstattung des Budgets und synchrone Anpassung des Materialzählers `objectiveSystem.spent`.
  - Skirmish-Sieg: Invasion eines gegnerischen Camps durch eine feindliche Spielerzelle.

---

### Ebene 3: KI-Verhalten & Dojo (`tests/ai.test.cjs`)
Verifikation der Computergegner auf Regelkonformität und Stabilität:
- **Budget-Disziplin:** Die KI platziert niemals mehr Zellen, als ihr aktuelles Budget erlaubt.
- **Territoriums-Gültigkeit:** Alle von der KI gesetzten Muster liegen ausnahmslos in ihrem kontrollierten Territorium und kollidieren weder mit Felsen noch mit besetzten Zellen.
- **Robustheit bei Randfällen:**
  - Budget = 0 $\rightarrow$ KI beendet den Zug sauber ohne Aktionen.
  - Kein freies Territorium vorhanden $\rightarrow$ keine unhandled Exception.
  - Keine gegnerischen Camps erreichbar $\rightarrow$ sichere Fallback-Logik.
- **Schwierigkeitsstufen:** Überprüfung, dass `easy`, `medium` und `hard` unterschiedliche Genomgewichte (z. B. Acorn, Switch Engine) anwenden.

---

### Ebene 4: Kampagnen-Szenarien & Progression
Validiert alle Missionslösungen und Spielstandsmechaniken:
- **Akt I (`tests/campaign.test.cjs`):**
  - Mission 1 (Extinktion vs. 12 Generationen Überleben).
  - Mission 2 (Expansion über Versorgungsbrücke).
  - Mission 3 (Gleiter überquert Felsspalte).
  - Mission 4 (Wasserrennen gegen Hellas).
  - Mission 5 (Infiltration des feindlichen Habitats).
  - Spielstandsverwaltung: Reset, Sektorpasswörter (`PALISADE-*`), Fehlerresistenz bei blockiertem `localStorage`.
- **Akt II (`tests/act2.test.cjs`):**
  - Mission 6 (Zwei getrennte Versorgungsketten).
  - Mission 7 (Gleichzeitige Besetzung zweier Schleusen).
  - Mission 8 (Gleiter-Abfangmanöver bei Schutz der Zivilkolonie).
  - Mission 9 (Bergung von 3 persistenten Forschungsarchiven).
  - Mission 10 (Simultanes Halten zweier Pumpen über mehrere Generationen).
  - Codes: `RR1`-Migration und `RR2`-Übertragung.
- **Akt III (`tests/act3.test.cjs`):**
  - Mission 11 (`orderedZones`): Sequenzielle Schalteraktivierung (1 $\rightarrow$ 2 $\rightarrow$ 3). Vorzeitiger Kontakt führt zur sofortigen Niederlage.
  - Mission 12 (`pulse`): Kolonie muss exakt bei Generation 100 leben und bis Generation 130/140 restlos ausgestorben sein (Diehard-Muster).
  - Mission 13 (`evacuate` & `protect`): Zwei getrennte neutrale Gleiterfronten abfangen und zwei Rettungsplätze 96 Generationen sichern.
  - Mission 14 (`collectZones` & `sterile`): Drei Archive unter gegnerischem Beschuss bergen; der rote Quarantänestreifen darf von keiner Zelle berührt werden.
  - Mission 15 (`holdZones` & `sterile`): Drei Relais 16 Generationen ununterbrochen halten; Trennstreifen steril halten.
  - Codes: `RR3`-Expeditionscodes mit 15 Bewertungen und 36-stelliger Prüfsumme.

---

### Ebene 5: Audio & Systemtests (`tests/audio.test.cjs`)
Verifikation des Klang- und Narrationssystems:
- **Standardzustand:** Standardmäßig stummgeschaltet, kein Autoplay-Verstoß.
- **Whitelisting:** Nur deklarierte Szenen (`briefing`, `debriefing`) dürfen Audio starten.
- **Ducking:** Absenkung der Hintergrundlautstärke auf 25 %, sobald Sprachausgabe aktiv ist.
- **Visibility API:** Automatisches Stummschalten/Pausieren bei `document.hidden = true` (Tab-Wechsel).
- **Persistenz:** Lautstärke-Einstellungen bleiben in `redroots_audio_v1` erhalten.
- **Browser-TTS Fallback:** Sprachausgabe mit deutscher Systemstimme (`de-DE`) für dynamische Berichte.

---

## 3. Testausführung

### Zentrale Ausführung aller Suiten
```bash
node tests/run-all.cjs
```
Führt alle sieben Testsuiten nacheinander aus, misst die Laufzeiten und gibt einen übersichtlichen Erfolgs- oder Fehlerbericht aus.

### Einzelne Suiten ausführen
```bash
node tests/integrity.test.cjs  # Statische Integrität & Manifeste
node tests/core.test.cjs       # Conway-Simulation, Territorium, Budget
node tests/ai.test.cjs         # KI-Verhalten & Budgetdisziplin
node tests/campaign.test.cjs   # Akt I Szenarien & Codes
node tests/act2.test.cjs       # Akt II Szenarien & Hold-Zonen
node tests/act3.test.cjs       # Akt III Szenarien & Quarantäne
node tests/audio.test.cjs      # GameAudio & Sprachausgabe
```

---

## 4. Git Pre-Push Hook Integration

Um sicherzustellen, dass niemals fehlerhafter oder ungetesteter Code auf das Remote-Repository (`origin/main`) übertragen wird, erzwingt ein Git `pre-push` Hook die Testsuite vor jedem Push.

### Installation des Hooks
```bash
./scripts/install-hooks.sh
```
Das Skript verlinkt oder kopiert `scripts/pre-push.sh` nach `.git/hooks/pre-push` und setzt die Ausführungsrechte (`chmod +x`).

### Verhalten beim Push
Wenn ein Entwickler `git push` ausführt:
1. Der Hook startet automatisch im Hintergrund.
2. `git diff --check` prüft auf Whitespace-Fehler und ungelöste Konflikte.
3. `node tests/run-all.cjs` führt die gesamte Testsuite aus.
4. **Ergebnis:**
   - **Alle Tests grün:** Push wird sofort freigegeben (`exit 0`).
   - **Mindestens ein Fehler:** Push wird **vollständig blockiert** (`exit 1`), und die genaue Fehlerursache wird im Terminal angezeigt.
