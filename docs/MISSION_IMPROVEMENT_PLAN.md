# RedRoots – Verbesserungsplan: Spannendere Missionen

Stand: Oktober 2026 · Grundlage: 25 spielbare Missionen in Akt I–V (`js/campaign/Missions.js`, `Act2.js` … `Act5.js`)

Dieses Dokument beschreibt, wie das Spielen der Kampagnenmissionen spannender werden soll. Die Conway-Regeln bleiben dabei unverändert. Es ist ein Arbeitsplan und noch keine Spielerdokumentation. Umgesetzte Funktionen werden zusätzlich in der README beschrieben; Storyänderungen folgen `docs/CAMPAIGN_STORY.md`.

---

## 1. Kurzfassung

Die Missionen sind inhaltlich abwechslungsreich: Es gibt zwölf Zieltypen, Gegner-KI, Wildwuchs und Quarantänezonen. Die Spannung geht jedoch an drei Stellen verloren:

1. **Während der Evolution ist unklar, was gerade auf dem Spiel steht.** Fortschritt erscheint meist nur als Text im HUD, Bedrohungen werden nicht angekündigt, und es gibt keine Signale für wichtige Momente.
2. **Nach einer Niederlage ist unklar, woran es lag, und ein neuer Versuch ist teuer.** Der Bericht nennt eine von sechs allgemeinen Ursachen. „Erneut versuchen“ lädt die Mission neu, alle Platzierungen gehen verloren.
3. **Die Szenarien sind statisch.** Alles steht ab Generation 0 fest, Gegner verfolgen kein erkennbares Ziel, und alle Bonusziele folgen dem Muster „wenig Material + schnell“.

Der Plan setzt daher fünf Hebel in dieser Reihenfolge an:

| # | Hebel | Wirkung | Risiko |
| --- | --- | --- | --- |
| 1 | **Lesbare Spannung:** Zielstatus, Bedrohungsabstand, Countdowns und Ereignissignale direkt auf dem Spielfeld | Spieler fiebern mit, weil sie sehen, wie knapp es ist | gering, keine Regeländerung |
| 2 | **Schneller Neuversuch:** Analyse des Scheiterns, Runden-Checkpoint, gestufte Hinweise, Pause/Zeitlupe/Turbo | Die Schleife „Noch ein Versuch“ entsteht, Frust geht zurück | mittel |
| 3 | **Fair angekündigte Dynamik:** deklarative Szenarioereignisse, Vorratskapseln, Gegnerdoktrinen | Wendungen innerhalb einer Mission ohne Story-Sonderfälle in der Engine | mittel |
| 4 | **Neue Conway-Ziele:** Eindämmen, Leuchtfeuer, Geleitschutz, Kalibrieren | Neue Rätselideen für bereits freigeschaltete Muster | mittel |
| 5 | **Meisterschaft:** vielfältigere Bonusziele, Bestwerte, Expertenprotokolle | Höherer Wiederspielwert für Sterne-Jäger | gering bis mittel |

---

## 2. Spannungsmodell für ein Conway-Strategiespiel

In RedRoots plant der Spieler und schaut dann zu. Das funktioniert wie bei einem Golfschlag oder einem Lemmings-Level: Die Spannung entsteht in der Evolutionsphase, **wenn der Ausgang offen, aber lesbar ist**. Jede Maßnahme dieses Plans zahlt auf mindestens einen der folgenden Faktoren ein:

- **Einsatz sichtbar machen:** Was geht verloren, wenn es schiefgeht? Welche Zone, welcher Rettungsplatz, welche Kolonie?
- **Knappheit spürbar machen:** Generationen bis zur Frist, Felder bis zum Durchbruch, Haltezähler kurz vor dem Ziel.
- **Beinahe-Momente zeigen:** „Zwei Generationen zu spät“ motiviert stärker als „Zeitfenster geschlossen“.
- **Handlungsfähigkeit geben:** Zwischen den Runden reagieren, Prognosen gezielt einsetzen, nach einem Fehlschlag schnell neu planen.
- **Überraschung nur mit Ankündigung:** Ereignisse sind vorher sichtbar („Sturmwarnung: Runde 4“). Die Natur betrügt nicht (siehe Dramaturgische Regeln in `CAMPAIGN_STORY.md`).

---

## 3. Leitplanken (aus `AGENTS.md`)

Alle Maßnahmen müssen diese Regeln einhalten:

- Conway bleibt B3/S23, und die Engine kennt **keine Story-Sonderfälle**. Neue Mechaniken sind generische, deklarative Missionsfelder.
- Budget wird nach Runden **hinzugefügt**. Kapseln und Ereignisse addieren ebenfalls und setzen keine festen Werte.
- In Missionen findet kein periodischer Frühabbruch statt. Jede Generation wird ausgewertet, auch bei Turbo oder Vorspulen.
- Gespeichert werden Abschlüsse, nicht der laufende Missionszustand. Checkpoints existieren deshalb **nur im Arbeitsspeicher**.
- Missionswechsel per Seitenwechsel. Sobald etwas ohne Neuladen geschieht (Checkpoint), ist explizites Aufräumen nötig: Timer, Render-Loop, Camp-Animation und Audio.
- Querformat ist das Hauptlayout. Touch-Flächen messen mindestens 44–48 px, Fließtext etwa 16 px. Alles bleibt **ohne Ton verständlich** und nicht nur im Bild erkennbar.
- Sternwertung: höchstens drei Sterne, weil der Expeditionscode zwei Bit pro Mission überträgt. Mehr Sterne erfordern ein neues Codeformat.
- Neue oder geänderte Briefings und Berichte brauchen neue Qwen3-Aufnahmen samt QA oder eine ausdrücklich dokumentierte Rückstellung auf die Browserstimme. HUD-Texte, Hinweise und Toasts werden **nicht** vertont. Änderungen dort sind deshalb günstiger.
- Kein Backend, keine Konten, keine laufenden KI-Dienste für Spieler.

---

## 4. Bestandsaufnahme

### 4.1 Was bereits gut funktioniert

- Zwölf Zieltypen (`ObjectiveSystem.evaluate`): survive, territoryZone/-Zones, reachZone, race, allZones, evacuate, collectZones, holdZones, orderedZones, pulse und captureCamps.
- Die Genom-Progression gibt jedem Akt neue Werkzeuge. Missionen beschränken die erlaubten Muster gezielt.
- Vertonte Briefings und Berichte, Atmosphären pro Mission und Situationswechsel zwischen Planung, Simulation und Spannung (`GameAudio.setSituation`).
- Ab Akt IV deterministische Gegner (`aiSeed`). Lösungswege werden gegen die echte KI getestet (`tests/act4.test.cjs`, `tests/act5.test.cjs`).

### 4.2 Was die Spannung bremst (mit Belegen im Code)

| # | Befund | Beleg |
| --- | --- | --- |
| B1 | Fortschritt erscheint nur als Text. Auf dem Spielfeld wird nur `captureCamps` als erobert markiert. Gesicherte Archive, geöffnete Schalter und Haltezähler sind dort nicht zu sehen. | `GameRenderer.drawMissionZones`: `captured` nur für `captureCamps`; `progressText` nur im HUD |
| B2 | Keine Vorwarnung: Fremde Flora kann eine Schutz- oder Sterilzone ohne vorherige Warnung erreichen. Die Niederlage kommt dann schlagartig. | `lostProtected`/`lostSterile` prüfen nur den Kontakt, nicht die Annäherung |
| B3 | Die Eroberung eines Camps (8–32 ununterbrochene Generationen) ist nicht als Zähler sichtbar. Das Zurücksetzen nach einem Mehrheitsverlust bemerkt man nicht. | `captureTicks` wird intern geführt, das HUD zeigt nur „x / y Camps erobert“ |
| B4 | Keine Ereignissignale: Es gibt nur Atmosphäre und Erzählstimme, keine kurzen Signale für „Archiv gesichert“, „Kontakt verloren“ oder „Alarm“. | `GameAudio.js` enthält keine Effekt-Cues |
| B5 | Niederlagen sind unspezifisch: sechs feste Begründungen ohne Ort, Generation oder Beinahe-Wert. | `ObjectiveSystem.result.reason` |
| B6 | Ein Neuversuch ist teuer: „Erneut versuchen“ lädt die Mission neu. Platzierungen und späte Runden gehen verloren. Besonders hart ist das in Akt V (bis zu 7 Runden × 1.000 Generationen). | `CampaignManager.showResult` → `navigate(this.selected)` |
| B7 | Akt V ist lange passiv: Beim Standardwert des Temporeglers (50) wartet die Simulation ~63 ms pro Generation, also über eine Minute pro Phase. Der Regler erscheint erst während der Evolution als schmaler Schieberegler in der Kopfzeile, deutlich unter der Touch-Mindestgröße. Pause, Einzelschritt und Turbo fehlen. | `UIManager.updateSimSpeed` (kubische Kurve, mindestens 16 ms); `#simSpeed` (`w-24`) in `index.html` |
| B8 | Gegnerische Aussaat geht unter: Die KI setzt nach dem Spieler und unmittelbar vor der Evolution, ohne Hervorhebung. | `UIManager.handlePlayerChange` → `AI.takeTurn` |
| B9 | Die KI kennt keine Missionsziele. Sie wählt Muster gewichtet zufällig und zielt immer auf das nächste gegnerische Camp. Schutzzonen, Archive und Relais sind ihr unbekannt. Gegner wirken deshalb ziellos statt bedrohlich. | `AI.js` enthält keinen Bezug auf `scenario`/`zones`; `getNearestEnemyCamp` |
| B10 | Nur ein Hinweistext pro Mission. In A1_M03, A1_M04 und A1_M05 nennt er Zeile und Spalte der Lösung. Nach einer Niederlage wird derselbe Hinweis vollständig gezeigt. | `hint`, `result-hint` in `showResult` |
| B11 | Statische Szenarien: Alle Seeds, Felsen und Gegner stehen ab Generation 0 fest. Eskalation entsteht nur durch das Gegnerbudget. | `MissionManager.apply` |
| B12 | Eintönige Bonusziele: Alle 25 Missionen haben einen Materialbonus. 24 haben zusätzlich einen Tempobonus (Runden oder Generationen), nur A4_M03 eine Populationsgrenze. | Auswertung der Missionsdaten |
| B13 | Wertlose Bonusziele: In **A3_M01** gilt `rounds: 2` bei nur 2 Runden, der Stern ist also immer verdient. In **A2_M03**, **A3_M03** und **A5_M02** fällt der Bonus mit dem Primärziel zusammen (Evakuierungsfrist = frühestmöglicher Sieg). Er geht nur verloren, wenn die eigene Flora genau zur Frist ausgestorben ist. | Missionsdaten vs. `ObjectiveSystem` |
| B14 | In Akt I–III gibt es Gegner ohne `aiSeed` (A1_M05, A2_M04, A3_M04). Ihre Züge sind bei jedem Versuch anders, ein fairer Wiederholungsvergleich ist nicht möglich. | `aiSeed` erst ab Akt IV |
| B15 | Sterne haben keine spielerische Bedeutung über die Summe hinaus. Bestwerte (Material, Generationen) werden nicht gespeichert. | `CampaignState` speichert nur `{stars}` |

---

## 5. Maßnahmen

Jede Maßnahme ist mit Aufwand (S/M/L), betroffenen Dateien und Prüfung angegeben.

### A – Lesbare Spannung (keine Regeländerung)

**A1 · Zielstatus direkt auf dem Spielfeld** · S–M
- `ObjectiveSystem` erhält eine nur lesende Methode `zoneStatus(id)`. Sie liefert `{state: 'open'|'next'|'locked'|'done'|'threatened'|'breached', progress: 0..1, label}`. Die Regeln bleiben so an einer Stelle.
- `GameRenderer.drawMissionZones` zeigt:
  - gesicherte Archive und Schalter mit ✓ in Grün;
  - bei `orderedZones` den nächsten Schalter pulsierend und spätere mit Schloss;
  - bei `holdZones` und `captureCamps` einen Fortschrittsbalken unter dem Zonenlabel (`hold / value` bzw. `captureTicks / hold`);
  - Schutzzonen mit Schild-Symbol.
- Prüfung: Unit-Test für `zoneStatus` je Zieltyp; Sichtprüfung bei 844×390, 1024×768 und auf dem Desktop.

**A2 · Bedrohungsanzeige für Schutz-, Steril- und Habitatzonen** · M
- Nach jeder Generation ermittelt `ObjectiveSystem` je geschützter Zone den kleinsten Chebyshev-Abstand fremder Flora. Bei Sterilzonen zählt jede Flora. Gesucht wird nur im um 8 Felder erweiterten Rechteck der Zone, das bleibt auch auf 96×160-Karten günstig.
- Drei Stufen: ruhig (> 8 Felder), **Warnung** (4–8 Felder) und **Alarm** (≤ 3 Felder). Mit Hysterese, damit die Anzeige nicht flackert.
- HUD-Zeile „⚠ RETTUNG OST · fremde Flora 3 Felder entfernt“. Der Zonenrand pulsiert, bei `prefers-reduced-motion` nur farbig.
- Bei Sterilzonen warnt die Anzeige auch vor **eigener** Flora. Das ist in A3_M04, A3_M05 und A5_M03 entscheidend.
- Prüfung: Core-Test mit gesetzten Zellen in definierter Entfernung; Leistungstest für die größte Karte (A5_M05).

**A3 · Ereignis-Toasts und kurze Signale** · M
- `ObjectiveSystem` legt Ereignisse in einer Warteschlange ab, zum Beispiel `{type, zoneId, generation}`. Typen: Archiv oder Schalter gesichert, Haltezähler unterbrochen, Eroberung begonnen oder abgeschlossen, Haus besiegt (`defeatedPlayers`), Warnung, Alarm, letzte 10 Generationen.
- `CampaignManager` zeigt sie als Toast im HUD (`aria-live="polite"`). Höchstens ein Toast pro 1,5 s, Duplikate werden zusammengefasst. Optional gibt es die Taste „Zum Ereignis springen“, die die Kamera zur Zone bewegt. Automatische Kamerafahrten gibt es nicht.
- Signale werden lokal per WebAudio-Oszillator erzeugt (keine Assets, keine KI) oder als kleine, CPU-gestaltete MP3 mit Herkunftseintrag in `ambience-manifest.json`. Lautstärke über einen eigenen Regler „Signale“. Umgesetzt: Synthese per WebAudio, Standardlautstärke 50 %, hörbar erst nach der ersten Interaktion; Regler auf 0 schaltet die Signale ab.
- Prüfung: `tests/audio.test.cjs` um Cues erweitern (Stummschaltung, Lautstärke, kein Abspielen bei verborgenem Tab).

**A4 · Countdown und Uhr** · S
- Ein großer Generationszähler im HUD für `evacuate` („Fähre startet in 23 Gen.“), `minGenerations` („Rückweg schützen: 41 Gen.“), `pulse` und `survive`. In den letzten 10 Generationen wird er hervorgehoben.
- Für `survive`, `territoryZone`, `reachZone` und `race` gibt es bisher gar keinen `progressText`. Dort wird er ergänzt.

**A5 · Aufklärung: gegnerische Aussaat hervorheben** · S
- `GameState` merkt sich die Platzierungen jeder Runde je Spieler (`lastPlacements`). `placePattern` kennt bereits Muster und Position.
- Zu Beginn der Evolution werden neue gegnerische Kolonien kurz umrandet (Ausblenden über ~2 s bzw. 24 Generationen). Das Protokoll meldet zum Beispiel: „Tharsis: 3 neue Kolonien“.

**A6 · Bewegungspfeile für vorgegebene Flora** · S
- Beim Missionsstart wird jedes fremde `map.seed` isoliert 8–12 Generationen vorausberechnet. Die Verschiebung seines Schwerpunkts wird in Runde 1 als Pfeil gezeigt.
- Das ersetzt Hinweistexte wie „Beobachte die Flugbahn des grauen Gleiters“ durch eine sichtbare, regelgetreue Information.

**A7 · Scheitern verständlich machen** · M
- `ObjectiveSystem.result` erhält zusätzlich `failure: {kind, zoneId, cells, generation}` und Beinahe-Werte: maximaler Haltezähler, gesicherte Archive, überlebte Generationen, Lebensnachweis.
- Der Bericht nennt zum Beispiel: „Generation 71: Viridion-Flora erreichte RETTUNG OST“ und „Bester Haltewert dieses Versuchs: 14 / 16 Generationen“.
- Die Taste „Moment ansehen“ blendet den Bericht aus, zentriert die Kamera auf die markierte Durchbruchszelle und führt danach zurück zum Bericht.
- Die sechs aufgezeichneten Niederlagestimmen bleiben. Die neuen Detailzeilen sind reiner Bildschirmtext.

**A8 · Bonus-Audit** · S
- **A3_M01:** Den immer erfüllten Rundenbonus ersetzen. Die Referenzlösung in `tests/act3.test.cjs` braucht beide Runden, und Schalter 3 liegt für einen Gleiter mehr als 48 Generationen entfernt. `rounds: 1` wäre daher vermutlich unlösbar. Geeignet ist ein Präzisionsbonus wie „Gesperrte Schalter nie näher als 3 Felder ansteuern“ (`margin`, D1) oder „Höchstens 3 Muster“. Auf Runde 1 wird nur verschärft, wenn eine Lösung in der echten Simulation nachgewiesen ist.
- **A2_M03, A3_M03, A5_M02:** Die Tempoboni ersetzen, die mit dem Primärziel zusammenfallen. Beispiele stehen in D1, etwa „Fremde Flora nie näher als 4 Felder am Landeplatz“.
- Bestehende Sterne bleiben erhalten, weil `record` die Bestwertung behält. Die geänderten Bonuslabels stehen nur auf Karte und Ergebnisbildschirm und werden nicht vertont.

### B – Schneller Neuversuch und Handlungsfähigkeit

**B1 · Simulationssteuerung in der Kampagne** · M
- Kompakte Bedienleiste neben `#boardZoomControls`, weil das rechte Panel während der Evolution ausfährt. Tasten mit mindestens 44 px: **Pause/Weiter**, **+1 Generation** (nur in der Pause), **Tempo** (drei Stufen statt des schmalen Kopfzeilen-Schiebereglers) und **Turbo**.
- Turbo nutzt den vorhandenen Pfad `simSpeedMs = 0`, der nur alle 50 Schritte abgibt. Jede Generation wird weiterhin ausgewertet.
- `GameState.runSimulation` erhält ein Pause-Gate (Promise, auf die die Schleife wartet). Platzieren bleibt in der Pause gesperrt.
- Mission 1 behält ihr festes 800-ms-Tempo. Pause ist dort erlaubt, Turbo nicht.

**B2 · Zeitlupe in entscheidenden Momenten** · S
- Bei Alarm (A2), bei einem Haltezähler ≥ 75 % oder wenn ein Rennziel ≤ 3 Felder entfernt ist, verlangsamt sich die Simulation für ~12 Generationen auf ~150 ms pro Generation, danach gilt wieder das gewählte Tempo.
- Abschaltbar in „Einstellungen“. Im Turbo nur, wenn „Bei Alarm anhalten“ aktiv ist (Option für Akt IV/V).

**B3 · Gestufte Hinweise** · S
- Neues optionales Feld `hints: ['Stufe 1', 'Stufe 2', …]`. Das bisherige `hint` bleibt die letzte Stufe und damit abwärtskompatibel.
- Stufe 1 ist sofort im HUD aufklappbar. Stufe 2 erscheint nach dem ersten Fehlschlag, Stufe 3 nach dem zweiten oder auf ausdrücklichen Wunsch („Mehr Hilfe“).
- Der Versuchszähler läuft über den Retry-Link (`?mission=A1_M03&attempt=2`), dafür braucht es keinen Speicher.
- Die Koordinatenhinweise in Akt I wandern in die letzte Stufe. Hinweise werden nicht vertont, es entsteht also kein Audioaufwand.

**B4 · Runden-Checkpoint „Ab Runde N neu planen“** · L
- `GameState.snapshot()` zu Beginn jeder menschlichen Platzierungsphase. Gesichert werden:
  - `grid.owners` und `grid.isOldFlags` (`slice()` der Typed Arrays);
  - `territory.territoryMap`, `budgets`, `currentRound`, `defeatedPlayers` und `aiRandomSeed`;
  - alle `ObjectiveSystem`-Felder: `generations`, `streak`, `spent`, `collected`, `hold`, `captureTicks`, `maxPopulation` und `pulseAlive`.
- Zusätzlich ein Platzierungsprotokoll der Runde. Damit lässt sich „Letzte Aufstellung wiederherstellen“ als gewöhnliche, rückgängig machbare Platzierung erneut ausführen.
- Nach einer Niederlage bietet der Bericht „Runde N neu planen“ (für jede gespielte Runde) neben „Mission neu starten“ an.
- Wiederherstellen nur in `PHASE_GAMEOVER`, wenn Simulation und KI-Züge beendet sind. Vorher werden Render-Loop, Camp-Animation, Erzählstimme und Toasts explizit beendet, wie es die Invariante zum Seitenwechsel verlangt.
- Voraussetzung ist B14 (Abschnitt 4.2): A1_M05, A2_M04 und A3_M04 erhalten ein `aiSeed`, damit gleiche Pläne zu gleichen Gegnerzügen führen. Die Tests dieser Missionen werden danach erneut gegen die echte KI geprüft.
- Prüfung: Snapshot → Simulation → Wiederherstellen ergibt einen identischen Zobrist-Hash und identischen Zielzustand. Gleiche Platzierungen mit gleichem Seed führen zum identischen Ergebnis.

**B5 · Prognose („Sporenscanner“), begrenzt** · M
- Während der Platzierung wird ein Gitter-Klon (`Grid` mit Kopie von `owners`/`isOld`) H Generationen vorausberechnet. Eigene Zellen erscheinen als durchscheinende Geister, fremde als Umriss, betroffene Zonen werden markiert.
- **Ohne** künftige Gegneraussaat. Das steht ausdrücklich in der Beschriftung.
- Deklarativ pro Mission: `forecast: {charges: 2, horizon: 24}`. In Entdeckungsmissionen (A1_M01, A3_M02) gibt es keinen Scanner. Verbrauchte Ladungen kommen durch Rückgängig nicht zurück.
- Für `race` liefert dieselbe Vorausberechnung eine **Rennuhr**: „Hellas erreicht das Eis in ca. N Generationen“. Sie läuft ohne Ladung, weil sie das Kernspannungselement von A1_M04 ist.
- Der Scanner verändert weder `GameState` noch `ObjectiveSystem`. Ein Test vergleicht den Zustandshash vor und nach der Prognose.

### C – Fair angekündigte Dynamik im Szenario

**C1 · Deklarative Szenarioereignisse** · M–L
```js
events: [{
  id: 'flood', round: 5, announceRound: 4,          // oder generation: 150
  action: { type: 'seed', pattern: 'glider', r: 2, c: 60, owner: -1, mirror: true },
  // weitere Typen: clearRocks/addRocks {rect}, budget {player, amount}, enemyBudget {house, amount}
  text: 'Der Kanal flutet: Wildwuchs aus Nordosten in Runde 5.'
}]
```
- Anwendung zu definierten Zeitpunkten: Rundenbeginn vor der Platzierung oder vor einer bestimmten Generation in `runSimulation`. Generisch, ohne Story-Sonderfall.
- **Ankündigung ist Pflicht:** HUD-Liste „Vorwarnungen“ mit Countdown, dazu ein gestrichelter Umriss des betroffenen Bereichs. Der Integritätstest erzwingt `announceRound < round`.
- Seeds belegen nur leere Felder. Budgetereignisse **addieren**. Felsänderungen wirken erst bei der nächsten Gebietsauswertung auf das Territorium.
- Prüfung: Core-Test (Ereignis exakt in Generation/Runde, deterministisch). Integritätstest (Rechtecke im Feld, Muster vorhanden). Lösungswege der betroffenen Missionen erneut gegen die echte KI.

**C2 · Vorratskapseln (Risiko gegen Ertrag)** · S–M
- Zone mit `cache: 6`. Der erste Kontakt eigener lebender Flora gutschreibt 6 Genmaterial **zu Beginn der nächsten Runde**, damit sich das Budget nur zwischen Runden ändert. Danach ist die Zone abgehakt.
- Umwege kosten Tempo und Material, lohnen sich aber für spätere Runden. Der Materialbonus (`spent`) zählt weiter nur eingesetztes Material und bleibt dadurch fair.

**C3 · Gegnerdoktrinen und Angriffsziele** · M
- `enemies: [{house: 3, budget: 24, strength: 'hard', doctrine: 'raid', target: 'civilians'}]`.
- Mögliche Doktrinen:
  - `raid`: Gleiter und LWSS gezielt auf ein Zielrechteck;
  - `siege`: Methusalems an der Front;
  - `defend`: stabile Muster am eigenen Camp;
  - `expand`: Gebietswachstum.
- `AI.findBestSpotForPattern` erhält optional ein Zielrechteck statt `getNearestEnemyCamp`. Die KI kennt weiterhin nur Rechtecke und keine Geschichte.
- **Ohne** `doctrine` bleibt das Verhalten unverändert. Ein Test prüft, dass bestehende Seeds dieselben Platzierungen liefern. Das freie Gefecht bleibt zufällig.
- Das Briefing oder der Hinweis kündigt die Doktrin an („Die Garnison greift die Zivilstation an“). So kann der Spieler die Bedrohung vorhersehen.

**C4 · Neue Conway-Zieltypen** · M je Typ

Jeder Typ erhält einen Zweig in `ObjectiveSystem.evaluate`, einen `progressText`, einen Niederlagengrund, eine Darstellung in `zoneStatus`, eine Integritätsprüfung und eine mit der echten Simulation getestete Lösung.

| Typ | Idee | Conway-Kern | Einsatz |
| --- | --- | --- | --- |
| `clearZones` | **Eindämmung:** Vorgegebene neutrale Wucherherde (Block, Bienenstock) müssen bis zu einer Frist vollständig verschwinden. | Präzise Gleiter-Kollisionen zerstören stabile Formen | Passt zum Akt-II-Thema „Wachstum begrenzen“ |
| `oscillate` | **Leuchtfeuer:** In der Zone muss eigene Flora N Generationen lang mit Periode 2 schwingen (Zonen-Hash von g gleich g−2, aber ungleich g−1). | Der Blinker wird freigeschaltet, aber bisher von keinem Ziel verlangt | Signal für eine Fähre, früh in Akt II |
| `escort` | **Geleitschutz:** Ein vorgegebener **eigener** Seed (owner 1, z. B. LWSS) muss ein Ziel erreichen. Das eigene Gebiet liegt weit entfernt, Hindernisse müssen per Kollision geräumt werden, ohne den Geleitzug zu treffen. | Abfangen, ohne zu zerstören | Mit vorhandenen Bausteinen (`seeds`, `reachZone`) prototypisierbar |
| `exactCount` | **Kalibrierung:** Bei Generation G genau N eigene Zellen in der Zone. | Vorhersage von Populationsentwicklung | Kurze Präzisionsrätsel in Akt III |

### D – Meisterschaft und Wiederspielwert

**D1 · Vielfältigere Bonusziele** · S–M
- Neue Bonustypen in der Ergebnisauswertung:
  - `patterns`: höchstens N verschiedene Muster;
  - `onlyPatterns`: nur bestimmte Muster, z. B. „nur Gleiter“;
  - `noErase`: kein Radieren;
  - `margin`: fremde Flora nie näher als N Felder an einer Schutzzone;
  - `territory`: mindestens N Einflussfelder am Ende;
  - `caches`: alle Vorratskapseln;
  - `noForecast`: ohne Prognose.
- Pro Mission bleiben es zwei Bonusziele, weil der Code höchstens drei Sterne kennt. Etwa die Hälfte der Missionen ersetzt den Materialbonus durch einen thematisch passenden Bonus.

**D2 · Persönliche Bestwerte** · S–M
- `completedMissions[id]` wird additiv erweitert, z. B. `{stars, best: {spent, generations, rounds}}`. Der Lader in `CampaignState` übernimmt diese Felder geprüft. Bisher werden sie verworfen.
- `campaignVersion` bleibt 1. Codes übertragen weiterhin nur Sterne, darauf weist die README hin.
- Die Marskarte zeigt „Bestwert: 9 Material · Gen 64“ beim Sektor.

**D3 · Expertenprotokolle (nach drei Sternen)** · M
- Generische Modifikatoren pro Mission, z. B. `{budget: -25%, enemyBudget: +50%, hints: false, forecast: false}` oder ein angekündigtes Zusatzereignis aus C1. Ein Expertenabschluss wird als eigener Status gespeichert (`veteran: true`) und zählt **nicht** als zusätzlicher Stern.
- Ideal für inhaltliche Wendungen, die den vertonten Basistext nicht verändern.

**D4 · Funksprüche während der Evolution** · S (Text) / M (Audio)
- Pro Mission `radio: [{on: 'collect:north', voice: 'UNSERE BIOLOGIN', text: 'Archiv eins gesichert. Weiter nach Osten!'}]`. Generische Auslöser: collect, capture, threat, holdHalf, defeatHouse, event.
- Phase 1 nur als HUD-Toast mit höchstens 12 Wörtern. Später bei Bedarf über `generate_audio.py` vertonen, mit Manifest, Speaches-Prüfung und `audioRevision`.
- Story-Regeln beachten: Rollenbezeichnungen statt neuer Namen, keine vorweggenommenen Enthüllungen.

**D5 · Ergebnis-Zeitleiste** · M
- Populationskurve (eigene vs. fremde Flora) als kleine Linie, Ereignismarken mit Generation (Archiv 1 bei Gen 34, Alarm bei Gen 70 …) und Beinahe-Werte aus A7. Das macht den Verlauf nachvollziehbar und motiviert zum Neuversuch.

**D6 · Dynamische Spannungsmusik** · S
- `GameAudio.setSituation('tension')` während der Simulation bei Alarm oder einem Haltezähler ≥ 75 %. Rückkehr zu `simulation` erst nach ≥ 30 ruhigen Generationen (Hysterese). Die vorhandene Zweikanal-Überblendung wird genutzt, die Absenkung bei Sprache bleibt bestehen.

**D7 · Visuelles Feedback** · M
- Kurze Aufblitzer an Kollisionsstellen verschiedener Eigentümer, in der Anzahl begrenzt.
- Leuchtspuren für bewegte eigene Muster (Alter pro Zelle in einem `Uint8Array`).
- Ein Leuchten, wenn eine Zone gesichert wird.
- `shadowBlur` bleibt in der Simulation aus. `prefers-reduced-motion` und eine Einstellung schalten Effekte ab.

---

## 6. Anwendung auf die bestehenden Missionen

Grundsatz: HUD, Spielfeldanzeige, Hinweise und Boni dürfen in den Basismissionen geändert werden. **Inhaltliche Wendungen** (Ereignisse) kommen nur dort in die Basismission, wo der vertonte Text sie bereits trägt. Sonst gehören sie in ein Expertenprotokoll (D3).

### Akt I – Landung

| Mission | Spannungsdefizit | Maßnahmen |
| --- | --- | --- |
| A1_M01 Erstes Leben | Scheitern wirkt zufällig | Herzschlagzähler „Gen 7 / 12“ (A4); Analyse „Kolonie erlosch in Gen 3, eine Zelle hatte nur einen Nachbarn“ (A7); Stufenhinweise, die keine Lösung vorgeben (B3) |
| A1_M02 Die erste Wurzel | Ein Weg, keine Entscheidung | Vorratskapsel abseits des direkten Wegs (C2): Tempo- oder Materialbonus? Reichweitenvorschau beim Platzieren (5 Felder Einfluss) |
| A1_M03 Der Pass | Koordinaten nehmen das Rätsel vorweg | Koordinaten erst in Stufe 3 (B3); eine Scannerladung mit Horizont 16 als Lernwerkzeug (B5) |
| A1_M04 Erster Kontakt | Das Rennen ist unsichtbar | **Rennuhr** (B5); Zeitlupe ≤ 3 Felder vor dem Eis (B2); Bericht „Hellas war 4 Generationen schneller“ (A7) |
| A1_M05 Die rote Grenze | Gegner zufällig, Bedrohung unsichtbar | `aiSeed` (B4); Aufklärung (A5); Bedrohungsanzeige Habitat (A2) |

### Akt II – Die Häuser

| Mission | Spannungsdefizit | Maßnahmen |
| --- | --- | --- |
| A2_M01 Zwei Städte | Gebietsverlust bemerkt man spät | Pumpenstatus „versorgt / Wurzel reißt ab“ (A1); Vorratskapsel (C2) |
| A2_M02 Geteilte Schlucht | Knapp verpasste Gleichzeitigkeit bleibt unsichtbar | Ankunftszeiten je Schleuse und Bericht „Süd 3 Generationen zu spät“ (A7); Zeitlupe, sobald eine Schleuse besetzt ist (B2) |
| A2_M03 Die letzte Fähre | Trivialer Tempobonus, keine Vorwarnung | Bonus → `margin` 4 Felder (A8/D1); Fähren-Countdown (A4); Bedrohungsanzeige (A2). Expertenprotokoll: angekündigte zweite Front ab Gen 48 (C1) |
| A2_M04 Gestohlene Warnungen | Gesicherte Archive nicht sichtbar, Wache zufällig | Archive ✓ (A1); `aiSeed` (B4); Doktrin `raid` auf die Landefläche (C3) |
| A2_M05 Netz aus Inseln | Unterbrochene Haltezähler bemerkt man nicht | Haltebalken und Toast „Kontakt verloren“ (A1/A3); Zeitlupe in den letzten 3 Generationen (B2) |
| *neu in Akt II* | – | Für eine spätere Erweiterung: `oscillate`-Mission „Leuchtfeuer“ und `clearZones`-Mission „Eindämmung“ (C4) |

### Akt III – Das stille Netz

| Mission | Spannungsdefizit | Maßnahmen |
| --- | --- | --- |
| A3_M01 Drei Schlüssel | Bonus immer erfüllt; frühe Kontakte kommen überraschend | Bonus → Abstand zu gesperrten Schaltern (A8/D1); nächster Schalter pulsiert, spätere gesperrt (A1); Warnung „Flora nähert sich Schalter 3, Schalter 2 noch offen!“ (A2) |
| A3_M02 Kunst zu verschwinden | Der Puls ist unsichtbar | Live-Populationskurve und Countdown 100 → 130 (A4/D5); Bericht „Letzte Zelle starb in Gen 141“ (A7) |
| A3_M03 Zwei Fronten | Bonus fällt mit dem Ziel zusammen | Bonus → `margin` oder „Reservekolonie nie unter 4 Zellen“ (A8/D1); zwei Bedrohungsanzeigen (A2) |
| A3_M04 Versiegelte Wahrheit | Eigene Flora driftet unbemerkt in die Quarantäne | Steril-Abstandswarnung auch für eigene Flora (A2); `aiSeed` (B4); Doktrin `raid` durch die Lücke im Felsriegel, wie im Hinweis angekündigt (C3) |
| A3_M05 Das stille Netz | Drei Haltezähler ohne Anzeige | Haltebalken je Relais (A1); Zeitlupe (B2); Steril-Warnung (A2) |

### Akt IV – Der rote Sturm

| Mission | Spannungsdefizit | Maßnahmen |
| --- | --- | --- |
| A4_M01 Gebrochene Waffenruhe | Eroberung als Blackbox | Eroberungsring 8 Ticks (A1); Rückweg-Countdown bis Gen 112 (A4); Aufklärung (A5) |
| A4_M02 Zangenstellung | Briefing droht mit Flutung, die nie eintritt | **Angekündigte Flutung als Ereignis in Runde 5** (C1, im vertonten Text bereits angelegt); zwei Eroberungsringe; Banner „Tharsis-Aussaat gestoppt“ |
| A4_M03 Zwischen den Fronten | Gegner greifen das eigene Camp statt der Rettungsplätze an | Doktrin `raid` auf beide Rettungsplätze (C3); doppelte Bedrohungsanzeige (A2) |
| A4_M04 Letzte Gegenoffensive | Zivilstation nur Nebensache | Tharsis-Doktrin `raid` auf die Zivilstation (C3); „Haus besiegt“-Toast (A3) |
| A4_M05 Auge des Sturms | „Letzter Sturmstoß“ steht nur im Bonuslabel | **Sturmstoß als angekündigtes Ereignis nach Gen 160** (C1): Wildwuchswelle am Rettungsplatz; Vorratskapsel für die Kanonenstrategie (C2) |

### Akt V – Das geteilte Netz

Für alle fünf Missionen gilt: Turbo und Zeitlupe bei Alarm (B1/B2), ein **Phasenbericht** nach jeder 1.000er-Phase (Einflussdifferenz, eroberte Knoten, nächste Bedrohungen, Gegnerbudget), „Zum Ereignis springen“ (A3) und Runden-Checkpoint (B4).

| Mission | Spannungsdefizit | Maßnahmen |
| --- | --- | --- |
| A5_M01 Tausend rote Morgen | Lange Passivphasen | Eroberungsringe (24 Ticks); Vorratskapseln in den Korridoren (C2) |
| A5_M02 Drei Lichter | Trivialer Generationsbonus | Bonus → „Kein Habitat jemals in Alarmstufe“ (A8/D1); Doktrinen Grün → Nord, Gelb → Süd (C3) |
| A5_M03 Offene Tore | Drei Sperrkorridore, unbemerkte eigene Drift | Steril-Abstandswarnungen (A2); Lageliste je Korridor im HUD |
| A5_M04 Kein Haus allein | Vier Fronten unübersichtlich | Kompakte Statusliste aller Zonen im HUD (A1), springbar (A3) |
| A5_M05 Gedächtnis des Bodens | Finale ohne Wendung | Angekündigte Wildwuchswelle aus dem Kern in Phase 3 (C1, Expertenprotokoll oder nach Textprüfung Basismission); Ergebnis-Zeitleiste über 4.000 Gen. (D5) |

---

## 7. Fahrplan

### Phase 1 – „Lesbare Spannung“ (empfohlener Start)
Umfang: A1–A8 und D6.
Abnahme:
- Jede Mission zeigt Zielstatus und Bedrohungen auf dem Spielfeld.
- Jede Niederlage nennt Ort, Generation und einen Beinahe-Wert.
- A3_M01 hat keinen automatisch erfüllten Bonus mehr.
- `node tests/run-all.cjs` ist grün.
- Browserprüfung bei 844×390, 1024×768 und auf dem Desktop: keine Überlagerung von HUD, Toasts und Zoomtasten.
- Signale respektieren Stummschaltung, Regler und verborgenen Tab.

**Status: umgesetzt (Oktober 2026).**
- `ObjectiveSystem` liefert `zoneStatus`, `countdown`, `worstThreat`, eine Ereigniswarteschlange (`events`), die Niederlagenanalyse (`result.failure`, `result.details`) und den Bonustyp `margin` (geringster gemessener Abstand ≥ Wert, optional auf `zones` begrenzt).
- Bonus-Audit: A2_M03 und A3_M03 verlangen jetzt mehr als 8 Felder Abstand zu den Rettungsplätzen. A3_M01 verlangt mindestens 5 Felder Abstand zu wartenden Schaltern. A5_M02 verlangt, dass kein Habitat in Alarmstufe gerät. Die Referenzlösungen von A2_M03, A3_M01 und A3_M03 erreichen weiterhin drei Sterne (`tests/objectives.test.cjs`). Für A5_M02 gibt es keine automatisch geprüfte Lösung.
- Nebenbei behoben: Auf Bildschirmen bis 1024 px verschwand das HUD nach der ersten Platzierung vollständig, weil der Aufklappknopf dort ausgeblendet ist. Das kompakte HUD bleibt jetzt sichtbar. Auf niedrigen Querformat-Bildschirmen haben Warnung und Fortschritt Vorrang vor dem Zieltext.
- Bewusst nicht umgesetzt: Zeitlupe und Rennuhr. Sie gehören zu Phase 2 (B2, B5).

### Phase 2 – „Noch ein Versuch“
Umfang: B1–B5 sowie `aiSeed` für A1_M05, A2_M04 und A3_M04.
Abnahme:
- Ein Neustart ab Runde N dauert unter 3 s und ist deterministisch (Test).
- Akt-V-Phasen lassen sich im Turbo ohne ausgelassene Zielauswertung durchlaufen.
- Die Prognose verändert keinen Spielzustand (Test).
- Koordinaten in Akt I erscheinen erst in Stufe 3.

**Status: umgesetzt (Oktober 2026).**
- `GameState`:
  - Pause-Gate, `stepOnce`, `turbo`, Zeitlupe (12 Generationen mit mindestens 150 ms nach einem entscheidenden Moment laut `ObjectiveSystem.isCritical`) und `pauseOnAlarm`.
  - Runden-Checkpoints (`snapshot`/`restoreCheckpoint`) mit erneut eingespielter Rundenplanung.
  - `forecast()` auf einer Gitterkopie und `raceClock()`.
- Neue Datei `js/campaign/Assistance.js`: Hinweisstufen für alle 25 Missionen und Prognose-Kontingente. Zwei Ladungen, Horizont 32 Generationen (Akt V: 120); A1_M01 und A3_M02 haben keine Prognose.
- `aiSeed` für A1_M05, A2_M04 und A3_M04. Die Referenzlösungen erreichen weiterhin drei Sterne.
- Abweichungen vom Plan:
  - Die Rennuhr rechnet nur mit der Hellas-Flora, damit sie das eigene Ergebnis nicht verrät.
  - Mission 1 behält ihr festes Tempo ohne Turbo, aber mit Pause.
  - Checkpoints kosten keine Sterne.

### Phase 3 – „Lebendige Szenarien“
Umfang: C1–C4 (inklusive neuer Zieltypen). Nachrüstung von A4_M02 (Flutung), A4_M05 (Sturmstoß), Doktrinen für A4_M03 und A4_M04 sowie Vorratskapseln für A1_M02, A2_M01 und A5_M01.
Abnahme:
- Jedes Ereignis ist mindestens eine Runde vorher sichtbar (Integritätstest).
- Alle betroffenen Lösungswege bestehen gegen die echte KI (`act*.test.cjs`).
- Missionen ohne neue Felder verhalten sich unverändert (Seed-Vergleichstest).

**Status: umgesetzt (Oktober 2026).**
- C1:
  - `events` mit Aktionen `seed`, `clearRocks`, `addRocks` und `budget`; mehrere Aktionen pro Ereignis sind möglich.
  - Rundenereignisse wirken zu Beginn der Planungsphase, Generationsereignisse unmittelbar vor ihrer Generation.
  - Vorwarnung im HUD, gestrichelte Umrisse und Meldungen. Rückspulen wendet nichts doppelt an.
- C2: Zonen mit `cache` zahlen über `pendingMaterial` nach `calculateBudgets` aus.
- C3: `doctrine`/`target` je Gegner.
  - Raids starten fair: Spots näher als zwölf Felder am Ziel erhalten Gewicht × 0,05.
  - Ohne Doktrin sind die gesetzten KI-Züge aller Missionen bitgenau unverändert (Fingerabdrucktest).
- C4: `clearZones`, `oscillate`, `escort` und `exactCount` mit Fortschritt, Countdown, Niederlagengrund, Beinahe-Wert und Integritätsprüfung.
  - Getestet sind sie mit Testszenarien und echten Conway-Lösungen.
  - Noch nutzt sie keine Kampagnenmission. Neue Missionen brauchen nach `AGENTS.md` Bild und Vertonung.
- Nachrüstungen:
  - Flutung in A4_M02 (zwei Acorns, Runde 5).
  - Sturmstoß in A4_M05 (zwei Gleiter, Runde 6).
  - Raids in A4_M03 (Viridion → Ost, Tharsis → West).
  - Kapseln in A1_M02 (+6), A2_M01 (+8) und A5_M01 (+20).
- Abweichung bei A4_M04: Ein Tharsis-Raid auf die direkt angrenzende Zivilstation war nicht abwehrbar (Durchbruch in Generation 11). Den Angriff führt deshalb Viridion aus der Ferne. Der neue `aiSeed` 831068837 hält die Referenzlösung bei drei Sternen; Nichtstun verliert in Generation 97.
- Die vertonten Briefings bleiben unverändert. Die Gefahren werden über Hinweisstufe 1, die Vorwarnung und die README angekündigt.

### Phase 4 – „Meisterschaft“
Umfang: D1–D5 (Bonusvielfalt, Bestwerte, Expertenprotokolle, Funksprüche, Ergebnis-Zeitleiste).
Abnahme:
- Alte Spielstände laden verlustfrei, neue Felder sind additiv.
- Codes bleiben kompatibel.
- Vertonte Funksprüche sind per Speaches geprüft, oder sie sind ausdrücklich nur Text.

**Status: umgesetzt (Oktober 2026).**
- D1: neue Bonustypen `patterns`, `onlyPatterns`, `noErase`, `noForecast`, `caches` und `territory`. Ausgewertet werden sie über `ObjectiveSystem.bonusMet`, ergänzt um ein Platzierungsprotokoll mit Mustererkennung in allen Drehungen. Zwölf der 25 Materialboni sind ersetzt:
  - A1_M02, A2_M02, A2_M05 und A3_M05: nur bestimmte Muster;
  - A2_M04, A4_M01 und A4_M05: begrenzte Zahl an Musterarten;
  - A1_M04, A3_M01, A3_M04 und A4_M02: ohne Prognose;
  - A5_M01: Notvorrat bergen.
- D2: `best` und `veteran` werden additiv in `redroots_campaign_v1` gespeichert. Der Lader prüft beide Felder. Das Sektorbriefing zeigt die Bestwerte.
- D3: `expertMission()` liefert Material × 0,8 (nie unter dem ursprünglichen Materialbonus), Gegnerbudget × 1,5, keine Hinweise und keine Prognose. Optionale Missionsfelder `expert` mit Faktoren und Zusatzereignissen sind möglich. Das Expertenprotokoll öffnet sich mit drei Sternen.
- D4: 22 Funksprüche in 15 Missionen, nur als Text, höchstens zwölf Wörter, mit Rollenbezeichnungen. Auslöser sind Ereignisse wie `collect`, `alarm:<zone>`, `captured:<zone>`, `houseDefeated:<haus>`, `scenario:<id>`, `cache:<zone>`, `holdHalf` und `holdLost`.
- D5: Zeitleiste im Missionsbericht. Die Daten liefert `ObjectiveSystem.timeline` mit höchstens etwa 1200 Punkten, gleichmäßig ausgedünnt; dazu kommen Ereignismarken aus `ObjectiveSystem.log`. Die Palette eigene `#1a9fb0` und fremde `#c96f38` ist auf `#101d24` validiert. Dazu gehören Legende, Endbeschriftungen, Fadenkreuz-Tooltip und Tabellenansicht.
- Offen:
  - Für Expertenprotokolle mit Gegnern gibt es keine geprüfte Lösung.
  - Für A5_M01 ist der neue Vorratsbonus nicht automatisch geprüft.
  - Die Funksprüche sind bewusst nicht vertont.

**Prüfung der Expertenprotokolle mit Gegnern (Oktober 2026):**
- Gegen die echte, gesetzte KI gelöst und in `tests/expert.test.cjs` festgehalten sind neun Missionen:
  - mit der unveränderten Referenzlösung: A1_M05, A2_M04, A3_M04, A4_M01 und A4_M03;
  - mit neu gesuchten Zügen: A4_M02 (zweiter Gleiter bei Zeile 3, Spalte 24), A4_M04 (Block vor der Zivilstation, dann Gleiter; zwei Sterne), A4_M05 (Acorn statt der blockierten R-Pentominos; zwei Sterne) und A5_M02 (ein R-Pentomino).
- Gefundener Fehler in A5_M03: Das Startgebiet beider Gegner überlappte den östlichen Sperrkorridor, sodass die KI hineinsäen konnte (Niederlage in Generation 1 bzw. 20, auch im Normalmodus). Behoben durch eine generische Regel: Sperrzonen sind unbesäbar, die KI hält Abstand.
  - Danach bricht der vorgegebene Acorn-Wildwuchs nach etwa 40 Generationen in den westlichen Korridor ein; chaotisches Wachstum lässt sich nicht aufhalten.
  - Überarbeitet: Ein grauer Wildwuchs-Gleiter (abfangbar, Bruch ohne Eingriff erst in Generation 71) ersetzt den Acorn. Die gegnerischen Startgebiete beginnen ab Spalte 112. Die KI sät nur dann näher als acht Felder an einer Sperrzone, wenn kein anderer Platz frei ist.
- Für A5_M01, A5_M04 und A5_M05 fand die automatische Suche bisher keine Lösung. Ihre Expertenprotokolle bleiben geschlossen (`expert.disabled`), bis eine Lösung nachgewiesen ist.

---

## 8. Qualitätssicherung und Playtest

**Automatisiert** (passend zu `docs/TEST_CONCEPT.md`):
- `core.test.cjs`:
  - Bedrohungsabstand, Snapshot/Restore (Hash-Gleichheit), Pause-Gate;
  - Turbo ohne ausgelassene Generationen;
  - Szenarioereignisse auf exakte Generation oder Runde;
  - Prognose ohne Nebenwirkungen.
- `act*.test.cjs`: geänderte Boni und Lösungswege mit echter Simulation und echter KI; neue Zieltypen mit je einem positiven und einem negativen Fall.
- `integrity.test.cjs`: neue Felder (`events`, `cache`, `hints`, `forecast`, `doctrine`, `target`) mit gültigen Zonen, Rechtecken, Mustern und Ankündigung vor dem Ereignis. Eine neue JS-Datei (z. B. für die Prognose) muss in die Ladereihenfolge von `index.html` und des Integritätstests.
- `audio.test.cjs`: Signale, Spannungsmusik mit Hysterese, Stummschaltung.
- Keine Tests, die nur Texte oder Darstellung spiegeln. Dafür genügt eine Sichtprüfung.

**Playtest** (lokal, ohne Backend):
- 3–5 Personen spielen Akt I–II, eine erfahrene Person zusätzlich Akt IV–V.
- Erhoben werden: Versuche pro Mission, Zeit bis zum Sieg, die selbst genannte Niederlagenursache im Vergleich zur tatsächlichen sowie Momente, die als spannend oder frustrierend benannt werden.
- Ein optionaler Entwicklungsschalter `?debug=playtest` gibt diese Zählwerte nur in der Konsole aus. Er schreibt keinen neuen Spielstand.
- Zielwerte:
  - Erstversuch-Erfolg in Akt I bei 60–80 %, in Akt III–V bei 20–40 %;
  - ≥ 90 % der Spieler benennen die Ursache einer Niederlage richtig;
  - in Akt V keine Phase länger als 20 s ohne neue Zustandsinformation (Toast, Balken, Countdown).

---

## 9. Checkliste „Spannung“ für neue Missionen

Ergänzt die sechs Schritte für neue Missionen in `AGENTS.md`:

1. **Sichtbarer Einsatz:** Welche Zone oder Kolonie steht auf dem Spiel, und ist sie auf dem Feld markiert?
2. **Uhr oder Front:** Gibt es eine Frist, eine sich nähernde Bedrohung oder einen Haltezähler mit Anzeige?
3. **Entscheidung zwischen Runden:** Gibt es mindestens eine echte Abwägung (Kapsel, zweite Front, Reserve), nicht nur Ausführung?
4. **Beinahe-Moment:** Kann der Spieler knapp scheitern, und sagt ihm der Bericht wie knapp?
5. **Angekündigte Wendung (optional):** Ist jedes Ereignis mindestens eine Runde vorher sichtbar?
6. **Zwei verschiedene Bonusachsen:** nicht beide aus Material und Tempo, kein Bonus, der mit dem Primärziel zusammenfällt.
7. **Stufenhinweise:** Stufe 1 ohne Lösung, letzte Stufe konkret.

---

## 10. Offene Entscheidungen

1. **Sterne und Hilfen:** Kosten Checkpoints oder Prognosen Sterne? *Empfehlung:* nein. Sterne bewerten die Qualität der Lösung, nicht die Zahl der Versuche. Wo es passt, gibt es stattdessen den Bonus `noForecast`.
2. **Basismission oder Expertenprotokoll:** Sollen Wendungen auch Basismissionen verändern? *Empfehlung:* nur A4_M02 (Flutung) und A4_M05 (Sturmstoß), weil der vertonte Text sie bereits trägt. Alles Weitere als Expertenprotokoll.
3. **Spielstandschema:** Bestwerte und Expertenstatus additiv in `redroots_campaign_v1` (Version 1 bleibt)? Codes übertragen weiterhin nur Sterne.
4. **Funksprüche:** zunächst nur Text oder sofort vertonen? *Empfehlung:* erst Text. Vertonung nach dem Playtest für die Zeilen, die sich bewähren.
5. **Signale:** WebAudio-Synthese (keine Assets) oder gestaltete MP3s? *Empfehlung:* Synthese für Phase 1, MP3 optional später.

---

## 11. Bewusst nicht geplant

- Echtzeitdruck in der Planungsphase (Zugtimer). Das widerspricht dem Hot-Seat-Spiel und der Barrierefreiheit.
- Unangekündigte Zufallsereignisse oder Zufallsfelsen in handgebauten Missionen.
- Änderungen an B3/S23 oder Spezialzellen mit eigenen Regeln.
- Online-Bestenlisten, Konten, Cloud-Spielstände oder laufende KI-Dienste.
- Erzwungene Kamerafahrten. Kamerasprünge erfolgen nur auf Tastendruck.
- Eine Storyerweiterung um Aliens, Zeitreisen oder „denkende“ Flora.
