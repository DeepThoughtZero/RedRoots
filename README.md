# 🔴 RedRoots: Mars Game of Life

**[🚀 Jetzt direkt im Browser spielen!](https://deepthoughtzero.github.io/RedRoots/)**

![Mars Overview](assets/Mars_Overview01.png)

RedRoots ist ein rundenbasiertes, kompetitives Strategiespiel, das auf **Conway's Game of Life** aufbaut. Das Spielgeschehen ist in ein packendes Sci-Fi-Szenario auf dem Mars eingebettet: Spieler übernehmen die Rolle von Siedlern, die im Wettbewerb miteinander wuchern und versuchen, durch cleveres Platzieren von lebenden Zellen (Pflanzen) die Lager der gegnerischen Siedler zu überwuchern.

## 🌌 Die Geschichte: Der Kampf um die roten Wurzeln
Im Jahr 2148 ist die Oberfläche des Mars nicht mehr nur roter Staub. Forscher haben die "Mars-Flora" entdeckt — eine genetisch instabile, aber extrem schnell wachsende Vegetation, die sich nach den mathematischen Gesetzen von *Conway's Game of Life* verhält. 

Vier große Fraktionen, die **Häuser des Mars**, kämpfen nun um die fruchtbarsten Sektoren:
- **Haus Marineris (Cyan)**: Die Entdecker der großen Gräben.
- **Haus Hellas (Pink)**: Industrielle Tiefkrater-Bewohner.
- **Haus Viridion (Grün)**: Meister der Bio-Engineers und Terraformer.
- **Haus Tharsis (Gelb)**: Mächtige Broker aus den vulkanischen Regionen.

Übernimm das Kommando über eine dieser Fraktionen und nutze die Biologische Kriegsführung, um den Planeten für dein Haus zu beanspruchen.

## ✨ Features

- **Kompetitiver Multiplayer:** Spiele gegen bis zu 3 Freunde im Hot-Seat-Modus an einem Gerät oder trete gegen Computergegner (KI) an.
- **Drei Schwierigkeitsstufen:** Die KI der Häuser agiert unterschiedlich — von einfachen Gleitern bis hin zu komplexen Gleiter-Kanonen.
- **Strategische Runden:** Nutze ein zugeteiltes Zell-Budget, um komplexe Figuren (Gleiter, Raumschiff, R-Pentomino) in deinem eigenen Territorium zu platzieren.
- **Marsfelsen & Gebirge:** Prozedural generierte Bergketten blockieren die Vegetation und erfordern kluges Umschiffen der natürlichen Barrieren.
- **Dynamische Territorien:** Nach jeder Runde erobern überlebende Zellen automatisch neues Gebiet für dich. Überschneiden sich Einflussbereiche, entsteht Niemandsland.
- **Optimierte Performance:** Endlosschleifen (periodische Zustände) werden automatisch erkannt und übersprungen.
- **Cross-Platform:** Voller Touch-Support für Tablets und mobile Endgeräte (Pinch-to-Zoom, Wischen & Tippen).
- **Aesthetic UI:** Modernes Design mit Glassmorphismus, leuchtenden Laserlinien (Brennlinien) und Neon-Akzenten.

## 🚀 Spielstart

Das Spiel besteht aus purem HTML, CSS und JavaScript. Es werden keine externen Server, Datenbanken oder Build-Tools benötigt!

1. Klone dieses Repository oder lade es als ZIP herunter.
2. Öffne die Datei `index.html` in einem modernen Webbrowser.
3. Wähle **Kampagne**, **Freies Gefecht** oder **Sandbox** im Startmenü. Die Häuserauswahl erscheint erst unter **Freies Gefecht**; stelle dort jedes Haus ausdrücklich auf **Mensch** oder **Computer**.
4. Im freien Gefecht wählst du die menschlich gespielten Häuser und klickst auf **Gefecht starten**. Die erweiterten Einstellungen erreichst du wie bisher mit fünf Klicks auf den Setup-Titel.

## 🎮 Spielregeln & Steuerung

- **Ziel:** Erreiche das feindliche, schraffiert markierte Lager (in den Ecken). Wer das Lager infiltriert, gewinnt den Sektor für sein Haus!
- **Tablet & Handy:** Muster auswählen und auf das Spielfeld tippen. Mit zwei Fingern zoomen/verschieben oder die Tasten **− / Einpassen / +** verwenden. Die Werkzeugleiste liegt im Hochformat unten und auf schmalen Querformat-Bildschirmen rechts. Die Marskarte bietet zusätzlich eine große Missionsliste.
- **Steuerung (Maus):** 
  - `Linksklick`: Figur platzieren
  - `Mausrad halten`: Kamera verschieben
  - `Mausrad scrollen`: Zoom
  - `R` oder `Rechtsklick`: Figur rotieren
  - `Strg+Z`: Rückgängig
- **Überleben:** Conway's Game of Life Kernregeln gelten (Unterbevölkerung, Überleben, Überbevölkerung, Wachstum). Bei uns entscheidet die *Mehrheitsregel* bei Geburten in Konfliktzonen.


## Kampagne: Das Gedächtnis des roten Bodens

Drei Akte mit fünfzehn handgebauten Missionen sind spielbar. Akt I führt Haus Marineris durch Überleben, Expansion, ein Gleiterpass, ein Rennen um Wasser und eine Invasion. Missionsziele werden während der Evolution und nach der Gebietsauswertung geprüft. Gelbe Markierungen zeigen Ziele auf dem Spielfeld; der Funkkanal liefert konkrete taktische Hinweise.

Mission 1 beginnt ausschließlich mit Einzelzellen: Eine Anordnung, die zwölf Generationen überlebt, muss selbst gefunden werden. Die erste Mission läuft bewusst langsam (0,8 Sekunden je Generation) und zeigt den Endzustand kurz vor dem Ergebnis. Der Sieg schaltet die Block-Vorlage frei; nach Mission 2 folgen Gleiter und Blinker. Auch beim Wiederholen bleiben die missionsspezifischen Musterbeschränkungen bestehen.

Die Marskarte öffnet weitere Sektoren nach einem Sieg. Zwei optionale Herausforderungen vergeben zusätzliche Sterne; bei Wiederholungen bleibt die beste Wertung erhalten. Genome und kurze Sektorberichte werden nach und nach freigeschaltet. Kampagnenfortschritt wird separat unter `redroots_campaign_v1` im lokalen Browserspeicher abgelegt. Gelöschte Browserdaten löschen auch diesen Fortschritt. Laufende Missionen beginnen nach Neuladen von vorn.

Auf der Marskarte findest du unten **Expedition / Spielstand**:

- **Code kopieren**: portabler `RR3`-Code mit allen erreichten Sternwertungen. Auf einem anderen Gerät unter **Übernehmen** einlösen. Die Prüfziffer erkennt Tippfehler; der Code ist bewusst kein geheimes Passwort.
- **Sektorpasswörter** öffnen Mission 1 bis 5; die Testcodes stehen in der Tabelle unten. Frühere Missionen erhalten mindestens einen Stern, samt Forschung und Archivfunden. Höhere lokale Wertungen bleiben bestehen.
- **Kampagne zurücksetzen**: nach Bestätigung beginnt die Kampagne wieder bei Mission 1. Die Gefecht-Einstellungen bleiben erhalten. Mit einem vorher gesicherten Expeditionscode lässt sich der alte Stand wiederherstellen.

### Testcodes für den direkten Sektoreinstieg

Diese vollständige Testcodeliste steht nur in der README, nicht in der Kampagnenoberfläche. Einlösen unter **Marskarte → Expedition / Spielstand → Übernehmen**.

| Passwort | Einstieg |
| --- | --- |
| `PALISADE-LANDUNG` | Mission 1 – Erstes Leben |
| `PALISADE-WURZEL` | Mission 2 – Die erste Wurzel |
| `PALISADE-PASS` | Mission 3 – Der Pass |
| `PALISADE-WASSER` | Mission 4 – Erster Kontakt |
| `PALISADE-GRENZE` | Mission 5 – Die rote Grenze |
| `PALISADE-WASSERSTROM` | Mission 6 – Zwei Städte, ein Wasserstrom |
| `PALISADE-SCHLEUSEN` | Mission 7 – Die geteilte Schlucht |
| `PALISADE-FAEHRE` | Mission 8 – Die letzte Fähre |
| `PALISADE-ARCHIVE` | Mission 9 – Die gestohlenen Warnungen |
| `PALISADE-INSELN` | Mission 10 – Ein Netz aus Inseln |
| `PALISADE-SCHLUESSEL` | Mission 11 – Drei Schlüssel im Staub |
| `PALISADE-STILLE` | Mission 12 – Die Kunst zu verschwinden |
| `PALISADE-RUECKWEG` | Mission 13 – Zwei Fronten, kein Rückweg |
| `PALISADE-SIEGEL` | Mission 14 – Die versiegelte Wahrheit |
| `PALISADE-NETZ` | Mission 15 – Das stille Netz |

Ein Code wird auch nach jeder erfolgreichen Mission angezeigt. Es gibt keine automatische Cloud-Synchronisierung. Browserspeicher ist je Browserprofil und Website-Adresse getrennt; unterschiedliche lokale Ports oder die veröffentlichte Website haben eigene Spielstände. Codes funktionieren zwischen diesen Installationen derselben Kampagnenversion.

Das freie Gefecht bleibt mit allen 13 Mustern und den bisherigen Zufallskarten verfügbar. Die Sandbox ist jetzt direkt im Startmenü erreichbar. Es gibt keine Kampagnenbeschränkungen für diese Modi.

- `js/campaign/Missions.js`: Szenariodaten und Karteninitialisierung, inklusive asymmetrischer Gebiete, Camps, Felsen, Zielzonen und vorgegebener Flora.
- `js/campaign/ObjectiveSystem.js`: Sieg/Niederlage, Generationen, Materialverbrauch und Bonuswertung.
- `js/campaign/Story.js`: Funkbriefings, Missionsberichte und freischaltbare Archivfunde.
- `js/campaign/CampaignManager.js`: Marskarte, Missions-HUD, Ergebnisansicht und versionierter Fortschritt.
- [Geschichte und weitere Akte](docs/CAMPAIGN_STORY.md): durchgehender Handlungsbogen; Akte IV–V sind geplant, noch nicht spielbar.

### Prüfen und lokal starten

`node tests/campaign.test.cjs` prüft konkrete Lösungswege für Akt I sowie Niederlagen, Rückgängig-Kosten, Fortschritt und die klassische Siegbedingung. Für den Browser: `python3 -m http.server 8765`, dann `http://localhost:8765/index.html`. Es gibt keinen Build-Schritt. Die bestehende Oberfläche lädt Tailwind und Schriften weiterhin über CDNs.

`node tests/act2.test.cjs` prüft die fünf neuen Lösungswege, Schutz- und Halteziele sowie Spielstandmigration. Alte lokale Spielstände und RR1-Codes bleiben gültig; neue RR3-Codes übertragen alle fünfzehn Wertungen (RR2 bleibt importierbar). Nach Akt I öffnet sich Akt II automatisch.

Akt II setzt die Rettung der Hellas-Siedlungen fort: zwei Versorgungswege, gleichzeitige Schleusenkontrolle, Evakuierung unter Wildwuchs, drei Forschungsarchive und ein gemeinsamer Schutzgürtel. Knappere Budgets, mehrere Ziele und gefährdete Schutzzonen verlangen abgestimmte Conway-Muster. Akt III führt diese Geschichte unter Olympus fort. Akte IV–V sind noch nicht spielbar.

## 🛠️ Architektur

- `index.html`: UI-Struktur.
- `css/style.css`: Custom Styling und Mars-Hintergründe.
- `js/utils/Constants.js`: Farben, Häuser und Figuren.
- `js/core/`: Spiel-Engine (`GameState`, `Grid`, `Territory`, `AI`, `InputHandler`).
- `js/ui/`: Visuelles Rendering auf dem Canvas und Menüsteuerung.

---
Viel Spaß beim Besiedeln des Mars! 🚀

## Sprache und Mars-Atmosphäre

Briefings und erfolgreiche Missionsberichte werden automatisch vorgelesen. **Briefing vorlesen** und **Bericht vorlesen** erlauben zusätzlich manuelles Starten/Pausieren. Bei direktem Seitenaufruf kann der Browser Autoplay blockieren; dann startet die Stimme mit der nächsten Interaktion. Niederlagenberichte nutzen die deutsche System-Sprachausgabe, soweit der Browser diese unterstützt. Im Spiel findest du das Briefing auch in der Werkzeugleiste. **Ton & Atmosphäre** bietet eine zuschaltbare Wind-/Habitat-Kulisse und getrennte Regler für Stimme und Hintergrund. Während Sprache läuft, wird der Hintergrund automatisch abgesenkt. Beim Verlassen einer Missionsansicht endet das Vorlesen; in einem verborgenen Tab pausiert der Ton. Alle Texte bleiben lesbar.

Die fertigen MP3-Dateien unter `assets/audio/` werden mit der Website ausgeliefert. Geräte benötigen beim Spielen keine KI-Dienste. Audio-Einstellungen werden separat unter `redroots_audio_v1` gespeichert. Die Atmosphäre ist beim ersten Besuch ausgeschaltet und beginnt nur nach einer Interaktion.

Erzeugung: `python3 scripts/generate_audio.py` nutzt die lokalen AiStack-Dienste Qwen3-TTS (deutsche Erzählerstimme `uncle_fu`), Speaches und AudioGen. Der Speaches-Schlüssel wird aus der Umgebung oder der lokalen AiStack-Konfiguration gelesen und niemals in Assets gespeichert. Sprache wird auf −16 LUFS, die in acht Takes erzeugte Atmosphäre auf −23 LUFS normalisiert. `manifest.json` enthält die Texte; `verification.json` enthält die Transkriptprüfung. `node tests/audio.test.cjs` prüft die Audio-Steuerung ohne GPU.

Aktueller Audio-QA-Hinweis: Die überarbeitete Erzählung und Akt II werden mit der deutschen Systemstimme des Browsers vorgelesen, sofern verfügbar. Die Funkkennung wurde durch „Landefähre“ ersetzt. Alte Sprachaufnahmen werden nicht für die neuen Texte abgespielt. Ihre bisherige Prüfung in `verification.json` ist historisch; das aktuelle Manifest enthält die dreißig aktuellen Texte. Neue lokale Sprachaufnahmen benötigen die Wiederherstellung der ausgefallenen GPU und anschließende Transkriptprüfung.

### Missionsabhängige Atmosphäre und Abbrechen

Die Missionen beider Akte verwenden unterschiedliche Klangkulissen: Landewind, Forschungsstation (Lüftung/Strom), Canyon (resonanter Wind), Eiskammer (luftige Höhen/Kristallresonanzen) und Außenposten (Generator/Staubwind). Der Hintergrund bleibt separat zuschaltbar und regelbar. Die vier Ergänzungen wurden wegen des weiterhin bestehenden GPU-Ausfalls mit `scripts/design_mission_ambience.py` aus dem vorhandenen AudioGen-Material und synthetischen Schichten gestaltet; sie sind keine neuen AudioGen-Aufnahmen. `scripts/generate_mission_ambience.py` enthält alternativ die vorbereitete GPU-Pipeline. Herkunft: `assets/audio/ambience-manifest.json`.

**Einstellungen → Mission abbrechen** führt in der Kampagne zur Marskarte, im freien Gefecht und in der Sandbox zur Modusauswahl. Bereits gespeicherter Fortschritt bleibt bestehen.

### Missionsbilder

Die zehn Missionen von Akt I und II besitzen eigene Illustrationen im Stil der bisherigen Mars- und Häuserbilder. Im Briefing lässt sich das Motiv in voller Größe öffnen. Die WebP-Dateien liegen in `assets/missions/`; `manifest.json` dokumentiert die integrierte Bildgenerierung, Stilreferenzen und vollständigen Prompts. Die Bilder illustrieren die Geschichte, nicht den exakten Aufbau des taktischen Spielfelds.

### Langsamere Genom-Forschung

| Nach Sektor | Neues Muster |
| --- | --- |
| 1 | Block |
| 2 | Gleiter |
| 3 | Blinker |
| 4–5 | Keine neue Figur: vorhandene Muster meistern |
| 6 | R-Pentomino |
| 7 | Raumschiff (LWSS) |
| 8 | Diehard |
| 9 | Acorn |
| 10 | B-Heptomino |

Akt III ergänzt Rabbits nach Sektor 12, Switch Engine nach Sektor 14 und Lidka nach Sektor 15. Die Gleiterkanone bleibt zukünftigen Akten vorbehalten. Frühere Missionen behalten beim Wiederholen ihre begrenzte Auswahl. Vorhandene Sterne und Sektorabschlüsse bleiben erhalten; die Forschung wird aus der neuen Staffelung abgeleitet. Freies Gefecht und Sandbox behalten sämtliche Figuren.

### Akt III – Das stille Netz

Fünf schwierige Missionen unter Olympus: drei Schalter in fester Reihenfolge, eine nach hundert Generationen noch lebende und bis Generation 140 ausgestorbene Kolonie, zwei gleichzeitige Abfangmanöver, Archivbergung gegen schwere KI unter Quarantäne und drei sechzehn Generationen lang gemeinsam gehaltene Relais. Rote Bereiche müssen frei von **jeder** lebenden Flora bleiben; auch eigene Zellen verletzen die Quarantäne.

Nach Akt II öffnet sich Sektor 11. Alte Sterne und Codes bleiben erhalten. Die Sektortexte und Berichte werden automatisch vorgelesen. Akt III verwendet vorläufig passende vorhandene Missionsillustrationen über das optionale `image`-Feld. `node tests/act3.test.cjs` prüft Lösungswege, Niederlagen und Codekompatibilität.
