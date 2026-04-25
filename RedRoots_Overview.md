# RedRoots: Game of Life auf dem Mars
**WICHTIGER HINWEIS FÜR KI-AGENTEN:** Dieses Dokument dient als zentrale Wissens- und Planungsbasis für das RedRoots Projekt. Es ist **fortwährend und eigenständig von KI-Agenten zu pflegen** und anzupassen, sobald sich Mechaniken, Architekturen oder Zustände ändern.

## Spielvision
Ein rundenbasiertes, kompetitives Strategiespiel auf Basis von Conway's Game of Life. Das Setting ist der Mars ("RedRoots"): Spieler sind Siedler, die Pflanzen züchten und versuchen, gegnerische Lager/Grundreihen zu überwuchern. 

## Kern-Features & Spielmechanik
1. **Spielfeld & Spieler**: 
   - Rechteckiges Gitter, einstellbare Größe.
   - 1 bis 4 Spieler (Menschlich oder KI mit verschiedenen Schwierigkeitsgraden).
   - Start in den Ecken oder auf Grundreihen (je nach Spieleranzahl).
   - "Brennlinien" trennen faire Startgebiete visuell ab.

2. **Spielablauf**:
   - Festlegbare Anzahl an Runden.
   - Festlegbare Anzahl an Evolutionsschritten pro Runde.
   - Spieler erhalten pro Runde ein Zell-Budget zur Platzierung.
   - Abwechselndes Platzieren oder simultanes Planen (wird im Detail noch geklärt).

3. **Gebietskontrolle**:
   - Eigenes Gebiet entsteht im Umkreis eigener lebender Zellen (Zell-Einflussbereich).
   - Neue Zellen dürfen nur im eigenen Gebiet platziert werden.

4. **Siegbedingung**:
   - Eigene Zellen müssen in die gegnerische Grundreihe / das gegnerische Lager vordringen.

5. **Zell-Interaktion / Kollision**:
   - Wenn Zellen verschiedener Spieler zu einer neuen Zelle verschmelzen (Regel: 3 Nachbarn generieren eine neue Zelle), entscheidet eine Einstellung, wem die Zelle gehört:
     - *Neutral*: Zelle gehört niemandem (oder ist eine spezielle neutrale Farbe).
     - *Mehrheit*: Zelle gehört dem Spieler, der die meisten Nachbarn beigesteuert hat.

6. **Benutzeroberfläche (GUI)**:
   - "Wow-Effekt": Mars-Theme (Dunkel, Rottöne, leuchtendes Pflanzen-Neon-Grün/Blau), Glassmorphism, flüssige Animationen.
   - Start-Menü: Konfiguration von Spielfeld, Gegneranzahl, KI, Runden, Schritte, Kollisionsregeln.
   - Rechtes aufklappbares Menü: Auswahl vorgefertigter Figuren (Gleiter, etc.), drehbar, mit hervorgehobenem Ankerpunkt.

## Architektur & Technik
- **Frontend**: HTML5 Canvas für das Spielfeld, Vanilla CSS / Tailwind für UI.
- **Logik**: Reines JavaScript.
- **Zustandsverwaltung**: GameState-Objekt verwaltet Runden, Budgets, Rasterzustände und Spielereigenschaften.
- **Zell-Darstellung**: Array oder Map, das nicht nur 0/1 speichert, sondern die Player-ID (-1 für leer/neutral, 0-3 für Spieler).

## Aktueller Status
- [x] Initiales Game of Life Skript vorhanden (`RedRoots.html`).
- [x] Projekt-Übersicht erstellt.
- [x] Architektur- und Implementierungsplan abgestimmt.
- [x] UI/UX Redesign für Mars-Theme und modulare Architektur abgeschlossen.
- [x] Spiel-Kernschleife, KI, und Hot-Seat-Modus implementiert.
- [ ] Weitere Balancing-Anpassungen (Kosten für Figuren, Radius-Feinjustierung).
