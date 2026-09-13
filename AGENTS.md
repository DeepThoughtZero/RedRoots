# RedRoots – Leitfaden für KI-Agenten

## Auftrag und feste Produktentscheidungen

RedRoots ist ein deutschsprachiges Strategiespiel auf Grundlage von Conways Game of Life auf dem Mars. Entwickle ein verständliches, spielbares Abenteuer mit emergenten Conway-Situationen. Die Erzählung dient dem Spiel; besondere Szenarien sollen aus den bestehenden Regeln entstehen.

- **Drei getrennte Modi erhalten:** Kampagne, freies Gefecht (klassischer Modus) und Sandbox.
- Der Start zeigt nur drei verständlich erklärte Modusoptionen. Häuserkonfiguration erscheint erst nach Auswahl des freien Gefechts.
- Häusersteuerung ausdrücklich als **Mensch / Computer** kennzeichnen. Mehrere Menschen spielen abwechselnd am selben Gerät. Nicht mit Online-Multiplayer verwechseln.
- **Querformat ist das Ziel auf PC, Tablet und Handy.** Kleine Querformatgeräte haben die Werkzeugleiste rechts neben dem Spielfeld. Hochformat bleibt bedienbar, ist aber nicht das primäre Spiellayout.
- Gut lesbare deutsche Texte, wichtige Fließtexte etwa 16 px, ausreichend Kontrast und Touch-Flächen von mindestens 44–48 px. Kleine Zellen müssen durch Pinch oder Zoomtasten präzise erreichbar sein.
- Die vollständige **Testcodeliste ausschließlich in der README dokumentieren**, nicht in der Kampagnenoberfläche. Die Code-Eingabe, portable Spielstandcodes und nach einem Sieg erlangte Sektorpasswörter bleiben reguläre Funktionen.
- Keine Backend-Pflicht, Konten oder laufenden KI-Dienste für Spieler einführen. Statische Bereitstellung bleibt möglich.
- Bestehende Änderungen im Arbeitsverzeichnis respektieren. Nicht pauschal zurücksetzen, Daten löschen oder fremde Änderungen überschreiben.

## Start und Projektstruktur

Das aktive Spiel startet über **`index.html`**. Kein Build-Schritt, kein Framework und kein npm-Projekt erforderlich. Die Seite verwendet klassische Scripts mit gemeinsamen globalen Klassen; ihre Ladereihenfolge ist relevant. Tailwind und Webfonts kommen bisher von CDNs, daher keine vollständige Offline-Fähigkeit behaupten.

```bash
python3 -m http.server 8765 --bind 127.0.0.1
# http://127.0.0.1:8765/index.html
node tests/campaign.test.cjs
node tests/audio.test.cjs
node tests/act2.test.cjs
```

Wenn ein Port belegt ist, einen freien Port wählen; keine fremden Server beenden. Unterschiedliche Ports haben unterschiedliche Browserspeicher.

| Datei / Verzeichnis | Verantwortung |
| --- | --- |
| `index.html` | Aktuelle Oberfläche, Modusauswahl, Panels und Script-Ladereihenfolge |
| `css/style.css` | Darstellung, responsive Regeln und Touch-Layouts |
| `js/main.js` | Initialisierung von UIManager, GameAudio und CampaignManager |
| `js/utils/Constants.js` | Häuserfarben, Phasen, Eigentümerwerte, Muster und Kosten |
| `js/core/Grid.js` | Conway-Berechnung mit flachen Typed Arrays und Double Buffering |
| `js/core/Territory.js` | Gebiete, Camps, Einflussberechnung |
| `js/core/GameState.js` | Phasen, Runden, Budget, Platzierung, Simulation, Undo und Ergebnis-Hooks |
| `js/core/AI.js` | KI-Züge und Musterwahl |
| `js/core/AIEvolver.js` | Optionaler Dojo-/Trainingsmodus; nur bei Bedarf initialisieren |
| `js/core/InputHandler.js` | Maus, Touch, Rotation und Platzierung |
| `js/ui/UIManager.js` | Spielaufbau, Bedienelemente und Engine-Callbacks |
| `js/ui/GameRenderer.js` | Canvas, Kamera, ResizeObserver, Camps, Flora und Zielzonen |
| `js/ui/GameAudio.js` | Audio-Einstellungen, Wiedergabe, Pause, Hintergrundabsenkung |
| `js/campaign/Missions.js` | Deklarative Missionen und MissionManager zur Szenarioinitialisierung |
| `js/campaign/ObjectiveSystem.js` | Missionsziele, Niederlagen, Statistiken und Sterne |
| `js/campaign/Act2.js` | Fünf Szenarien von Akt II; nach Story.js laden |
| `js/campaign/Story.js` | Briefings, Berichte und nach Siegen freigeschaltete Archivtexte |
| `js/campaign/CampaignManager.js` | CampaignState, Marskarte, Missions-HUD, Ergebnisse und Codes |
| `docs/CAMPAIGN_STORY.md` | Durchgehende Geschichte, Figuren, spätere Akte und dramaturgische Regeln |
| `assets/audio/` | Fertige Audiodateien, Textmanifest und QA-Bericht |
| `scripts/generate_audio.py` | Lokale Audioerzeugung und Transkriptprüfung, nur für Entwicklung |
| `tests/` | Node-Tests ohne Browser oder GPU |

`RedRoots.html` ist ein älterer eigenständiger Prototyp, nicht der Einstieg der aktuellen modularen Version. `benchmark.html` und `RedRoots_Overview.md` sind ergänzende Referenzen; bei Abweichungen aktuellen Code und README prüfen.

## Engine-Invarianten

- Conway bleibt B3/S23. Bei Geburten gelten die konfigurierten Mehrheits-/Neutralitätsregeln.
- **Grid-Eigentümer:** `0` leer, `1..4` Häuser, `-1` neutrale Flora, `-3` Fels.
- **Spieler-/Camp-Indizes:** `0..3`. Zwischen Grid und Spielerindex liegt ein Offset von 1.
- **Territorium:** `null` unbesetzt, `-1` umkämpft, `0..3` Häuser. Eigentümer 0 nicht mit einem falsy-Test versehentlich ausschließen.
- Koordinaten sind Zeile/Spalte. Rechtecke in den Szenariodaten sind inklusive ihrer Endpunkte; Felder nutzen `rMin/rMax/cMin/cMax`.
- Die Engine kennt keine Story-Sonderfälle. Missionen konfigurieren Gelände, Besitz, Camps, Startflora, Gegner, Budget und erlaubte Muster.
- Das freie Gefecht behält die klassische Camp-Siegbedingung. Kampagnenziele werden während jeder Generation sowie nach der Gebietsauswertung am Rundenende geprüft.
- Periodenerkennung darf die tatsächlichen Generationen von Überlebenszielen nicht überspringen. Missionssimulationen deaktivieren deshalb den periodischen Frühabbruch.
- Budget wird nach Runden anhand des Gebiets **hinzugefügt**, nicht schlicht auf einen festen Wert gesetzt. Bei Änderungen an dieser Semantik alle Modi prüfen.
- Platzieren, Radieren und Undo müssen den Materialverbrauch für Bonusziele konsistent ändern. Neutrale Flora darf nicht als Spieler oder Camp-Eroberer behandelt werden.
- Mission abbrechen führt zur Marskarte (Kampagne) bzw. zur Modusauswahl (Gefecht/Sandbox), nicht zum Neuladen derselben Missions-URL.
- Ein Missionswechsel erfolgt derzeit per Seitenwechsel. Dies entsorgt alte Listener, Animationen, KI-Züge und Audiowiedergabe. Bei Umstellung auf Navigation ohne Neuladen explizites Cleanup implementieren.
- Canvas-Größe und Kameraposition hängen von tatsächlichem verfügbarem Raum und Panelposition ab. Breakpoints in CSS und Renderer gemeinsam ändern; Touch-Koordinaten müssen nach Zoom und Formatwechsel stimmen.

## Kampagne und Geschichte

**Spielbar sind zehn Missionen in Akt I und II.** Akt II ergänzt territoriale Versorgung, gleichzeitige Zielbesetzung, Evakuierung mit Schutzzone, dauerhaft gesammelte Archive und ununterbrochenes Halten mehrerer Pumpen. Akte III–V bleiben geplant.

Mission 1 beginnt nur mit Einzelzellen und schaltet den Block frei. Ihr Überlebensziel umfasst zwölf Generationen, mit festen 800 ms pro Generation und 1000 ms sichtbarem Endzustand; andere Missionen behalten den Temporegler. Mission 2 erlaubt Zelle/Block und schaltet Gleiter plus Blinker frei. Keine vorgefertigte Lösung in Mission 1 auswählen; alternative Conway-Lösungen bleiben gültig. Die Kampagne folgt derzeit Haus Marineris. Zentrale Geschichte: Eine verschwiegene Expedition namens PALISADE entwickelte die vermeintlich neuen Genome Jahrzehnte zuvor. Kesslers Sperrnetz, die Wasserkrise und der Konflikt mit Hellas führen zur Frage gemeinsamer Verantwortung. Keine Aliens, Zeitreise oder magisch denkende Flora einführen. Vor Storyänderungen `docs/CAMPAIGN_STORY.md` lesen.

Für neue Missionen:

1. Eine eigenständige Conway-Idee und einen überprüfbaren Lösungsweg festlegen.
2. Deklarative Karte, Startbedingungen und Ziele anlegen; keine zufälligen Felsen in handgebauten Szenarien.
3. Briefing, konkreten taktischen Hinweis, Abschlussbericht und Archivfund ergänzen.
4. Freischaltung, Muster, Bonusbedingungen und Niederlagen prüfen.
5. Löseweg mit der tatsächlichen Simulation testen; bei Gegnern auch tatsächliche KI bzw. Rennflora berücksichtigen.
6. Kartendarstellung, Texte und Audio aktualisieren. Aktfilter, Fortschrittsanzeige, Ergebnisnavigation, Codeformat und Passworttabelle bei Erweiterungen gemeinsam migrieren.

## Spielstand und Codes

- `redroots_campaign_v1`: Kampagnenversion, ausgewähltes Haus, abgeschlossene Missionen mit Sternen und freigeschaltete Genome.
- `redroots_config`: Einstellungen des freien Gefechts.
- `redroots_audio_v1`: Audio-Einstellungen.
- Weitere bestehende Keys betreffen Hilfe/Dojo; Kampagnenreset darf diese nicht pauschal löschen.
- Gespeichert werden Abschlüsse, nicht der laufende Missionszustand. Browserprofil, Website und Port bestimmen den Speicherbereich; keine automatische Synchronisierung.
- Neue `RR2`-Expeditionscodes übertragen zehn Sternwertungen mit Prüfziffer; alte `RR1`-Codes mit fünf Wertungen bleiben importierbar. Sie sind absichtlich keine kryptografisch geschützten Zugangsdaten.
- Import vereinigt Fortschritte und behält die jeweils bessere Wertung. Sektorpasswörter geben früheren Missionen mindestens einen Stern und ihre Forschung/Archive.
- Reset verlangt eine Bestätigung und betrifft nur die Kampagne. Ungültige Codes dürfen den Spielstand nicht verändern.
- Speicherfehler behandeln und korrekt anzeigen. Keine Speicherung behaupten, wenn localStorage blockiert ist.
- Versionsänderungen benötigen einen bewussten Kompatibilitäts-/Migrationsplan. Nutzerfortschritt nicht still verwerfen.

## Audio und lokale KI

Die kanonischen Skills liegen im AiStack:

- `/home/bigbrain/AiStack/.agents/skills/local-ai-tts/SKILL.md`: Qwen3-TTS und Speaches.
- `/home/bigbrain/AiStack/.agents/skills/local-ai-sound/SKILL.md`: AudioGen und Ambient-Mastering.
- `/home/bigbrain/AiStack/.agents/skills/local-ai-image/SKILL.md`: lokale Bildgenerierung für Laufzeit-/Batch-Workflows.
- Vollständige Infrastrukturreferenz: `/home/bigbrain/AiStack/AGENTS.md`.

Vor Nutzung den passenden Skill lesen. Einmalige Bildassets bevorzugt mit den integrierten Bildgenerierungstools erstellen; bestehende Assets wiederverwenden, wenn geeignet. Kein lokaler KI-Zugriff aus dem Browser-Spiel.

| Dienst | Lokaler Endpunkt |
| --- | --- |
| Qwen3-TTS | `POST http://127.0.0.1:8880/v1/audio/speech` |
| Speaches | `POST http://127.0.0.1:8000/v1/audio/transcriptions` |
| AudioGen | `POST http://127.0.0.1:8011/generate` |

Deutsche Erzählstimme derzeit `uncle_fu`. Sprache auf −16 LUFS, Atmosphäre auf −23 LUFS normalisieren. TTS-Text reinigen, Satzzeichen sicherstellen und Funkkennungen sprachgerecht schreiben. Hintergrund aus mehreren Takes mit weichen Übergängen erzeugen. Manifest, Storytext, Audio und QA-Prüfsummen synchron halten: Das Manifest wird derzeit separat gepflegt, nicht automatisch aus Story.js nachgeführt.

Speaches benötigt auf dieser Workstation einen Schlüssel. Nur für den lokalen Dienst aus Umgebung/AiStack-Konfiguration lesen; niemals Geheimnisse in Quellcode, Assets, Logs, Prozessargumenten oder Commits ablegen. Spieler erhalten nur fertige Dateien.

Briefings und Missionsberichte automatisch vorlesen; bei Autoplay-Sperre mit der nächsten Interaktion nachholen. Hintergrund bleibt separat zuschaltbar und regelbar und darf Hinweise nicht übertönen. Niederlagen nutzen bei Verfügbarkeit die deutsche Browser-Sprachausgabe. Missionsatmosphären stehen in den Szenariodaten; zusätzliche CPU-Sounddesign-Varianten sind im Audio-Herkunftsmanifest gekennzeichnet. Vorlesen ist pausierbar; beim Szenenwechsel stoppen, bei verborgenem Tab pausieren. Texte müssen ohne Ton verständlich bleiben.

**Audiozustand:** Alle aktuellen Missionen setzen `narration: browser`, damit neue Storytexte automatisch statt veralteter MP3s gesprochen werden. Deutsche Systemstimme bevorzugen; Verfügbarkeit hängt vom Gerät ab. „Ares-1“ ist in der aktiven Erzählung durch „Landefähre“ ersetzt. Das Manifest enthält zwanzig aktuelle Texte, alte MP3s und verification.json sind historische Aufnahmen. Die lokale GPU fiel aus; vor Neugenerierung Status prüfen, anschließend alle Clips verifizieren und erst dann die Wiedergabe umstellen. Keine GPU-Resets/Rechnerneustarts ohne Autorisierung.

## Verifikation und Übergabe

- Engine-/Kampagnenänderungen: `node tests/campaign.test.cjs` und `node tests/act2.test.cjs`.
- Audio-Steuerung: `node tests/audio.test.cjs`.
- Geänderte JS-Dateien mit `node --check` prüfen; `git diff --check` für Patch-Hygiene.
- UI-Änderungen im Browser testen, besonders 844×390 (Handy quer), 1024×768 (Tablet quer) und Desktop. Prüfen: Modusauswahl, keine unklaren Zusatzoptionen, Lesbarkeit, Scrollbarkeit, Panel-/HUD-Überlagerungen und erreichbare Aktionen.
- Bei Eingabe-/Kameraänderungen tatsächliche Platzierung, Zoom, Einpassen und Formatwechsel prüfen. Bei Audioänderungen echte MP3-Wiedergabe, Pause, Hintergrundabsenkung und gespeicherte Regler prüfen.
- Browser-Tests in separaten Testkontexten ausführen; nicht den echten Nutzerfortschritt zurücksetzen.
- Die bisher verwendeten temporären Browser-Skripte unter `/tmp` sind keine dauerhaften Projektabhängigkeiten. Bei Bedarf neue reproduzierbare Tests anlegen und verfügbare Browser-/Runtime-Werkzeuge entdecken.
- Keine Tests für reine Text-/Darstellungsänderungen schreiben, die nur den Quelltext spiegeln. Passende Sichtprüfung reicht; vorhandene Tests bei relevanten Verhaltensänderungen ausführen.
- Neue Funktionen und Bedienung in README dokumentieren. Technische Details nicht unnötig in die Spieleroberfläche tragen.
- Abschluss auf Deutsch: konkrete Änderungen, tatsächlich durchgeführte Prüfungen und offene Einschränkungen nennen. Deployment oder Veröffentlichung nur im beauftragten Umfang durchführen.

Storyverständlichkeit: Rollen beim ersten Auftreten erklären und anschließend Rollenbezeichnungen bevorzugen. Chryse ist die Landeebene, Hellas das südliche Becken mit Wassersiedlungen. Voss führt Hellas; Kessler leitete die frühere Expedition PALISADE. Keine weiteren Eigennamen ohne erzählerische Notwendigkeit.
