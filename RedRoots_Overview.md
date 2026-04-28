# 🔴 RedRoots: Project Overview & Master Documentation

> [!WARNING]
> Dieses Dokument muss bei künftigen Erweiterungen **fortwährend aktualisiert** werden! Es dient zukünftigen Entwicklungs-Agenten als zentrales Einstiegs- und Architektur-Dokument.

## 1. Projekt-Beschreibung
**RedRoots** ist ein browserbasiertes, kompetitives Strategiespiel auf Basis von *Conway's Game of Life*. Die Spieler siedeln auf dem Mars und kämpfen durch geschicktes Platzieren von zellulären Mustern um knappe Gebiete. 
Das Spiel kommt komplett **ohne Backend, Datenbank oder Build-Prozess** aus und nutzt reines HTML, CSS (Tailwind via CDN) und Vanilla JavaScript (ES6 Modules).

## 2. Spiel-Mechaniken
- **Biologische Kriegsführung:** Es gelten die Standard-Regeln von *Conway's Game of Life* (B3/S23). Eine Zelle ("Pflanze") stirbt bei Einsamkeit oder Überbevölkerung und gedeiht bei optimaler Nachbarschaft.
- **Rundenbasiert:** Spieler haben ein Budget an genetischem Material, um Setzlinge und komplexe Flora-Strukturen in ihrem Einflussgebiet zu züchten.
- **Gebirgsketten:** Statische Felsen dienen als natürliche Barrieren, blockieren das Pflanzenwachstum und Gebietsansprüche.
- **Ziel:** Wer zuerst das Start-Camp eines gegnerischen Hauses mit einer lebenden Pflanzen-Zelle überwuchert, gewinnt den Sektor.
- **KI-Gegner:** Nutzen Heuristiken, um "Gleiter-Kanonen" und andere biologische Waffen strategisch in Richtung feindlicher Lager abzufeuern.
- **Periodizitäts-Erkennung:** Stoppt Simulationen frühzeitig, wenn die Flora in eine stabile Endlosschleife (z.B. Blinker) gerät.

## 6. Das Setting: Der Kampf um den Mars
Statt generischer Spielernamen nutzt RedRoots ein atmosphärisches Setting, das an *Dune* angelehnt ist. Vier große Häuser kämpfen mit genetisch modifizierter **Mars-Flora** um die Vorherrschaft:

| Haus | Farbe | Hintergrund |
| :--- | :--- | :--- |
| **Haus Marineris** | Cyan (`#00FFFF`) | Forscher und Eistechniker aus den tiefen Tälern des Valles Marineris. |
| **Haus Hellas** | Pink (`#FF00FF`) | Industrielle Großmacht aus dem Hellas-Einschlagbecken. |
| **Haus Viridion** | Grün (`#39FF14`) | Spezialisten für biologische Kriegsführung und Terraforming. |
| **Haus Tharsis** | Gelb (`#FFFF00`) | Die Lords der Energie, sesshaft auf dem vulkanischen Tharsis-Plateau. |

### Die Regeln des Wachstums
Die Pflanzen folgen den strikten Gesetzen der zellulären Automaten:
- **Einsamkeit:** < 2 Nachbarn = Pflanze vertrocknet.
- **Überleben:** 2 oder 3 Nachbarn = Pflanze überlebt.
- **Überbevölkerung:** > 3 Nachbarn = Pflanze erstickt.
- **Wachstum (Geburt):** Exakt 3 Nachbarn = Ein neuer **Setzling** sprießt!


## 3. Architektur & Dateisystem

```text
redroots/
├── index.html                 # UI, Startmenü, Canvas-Container
├── README.md                  # Kurz-Anleitung für Endnutzer
├── RedRoots_Overview.md       # DIESES DOKUMENT (Master Doku)
├── css/
│   └── style.css              # Custom Styling (Glassmorphism, Neon Glows)
└── js/
    ├── RedRoots.js            # Main Entry Point, Initialisierung
    ├── core/                  # Spiellogik
    │   ├── GameState.js       # Phasen-Management, Run-Loop, Undo-Stack
    │   ├── Grid.js            # Conway's Rules, 2D-Array Verwaltung
    │   ├── Territory.js       # BFS-basierte Einflussgebiets-Berechnung
    │   ├── InputHandler.js    # Maus- & Touch-Steuerung (Pan, Zoom, Undo)
    │   ├── AI.js              # Heuristik-basierte Computergegner (genomgesteuert)
    │   └── AIEvolver.js       # Genetischer Algorithmus für KI-Selbstoptimierung
    ├── ui/                    # Visualisierung
    │   ├── GameRenderer.js    # Canvas Rendering (Pflanzen, Berge, Gebiete)
    │   └── UIManager.js       # DOM Manipulation, Settings-Parsing, Menüs
    └── utils/
        ├── Constants.js       # Farben, Phasen, Patterns (Gleiter, Kanonen)
        └── PeriodicityTracker.js # Hash-basiertes Tracken von Schleifen
```

## 4. Aktuelle Features (Stand: Phase 6)
- **Kamera-System:** Unendlicher Zoom (Mausrad/Pinch) und Pan (Mittlere Maustaste/2-Finger-Wischen).
- **Undo-System:** Platzierungsfehler können Schritt für Schritt (Budget inkl.) rückgängig gemacht werden (`Strg+Z` oder UI-Button).
- **Prozedurales Terrain:** Felsen-Gruppen (`Random Walk`), die strategische Engpässe auf der Mars-Map bilden.
- **Responsive UI:** Das rechte Tool-Panel fährt auf mobilen Geräten oder während der Simulation aus dem Weg.
- **Multi-Touch:** Vollständige Unterstützung für Tablets (Wischen, Kneifen, Tippen).

## 5. Leitlinien für Erweiterungen
1. **Performance:** `calculateNextGeneration()` wird Tausende Male pro Sekunde aufgerufen. Code-Änderungen in `Grid.js` müssen extrem performant sein (keine unnötigen Array-Allozierungen).
2. **Vanilla JS:** Keine externen Abhängigkeiten (außer Tailwind-CDN und FontAwesome-CDN) einführen, um das Deployment via GitHub Pages trivial zu halten.
3. **Visueller Stil:** Der "Neon Sci-Fi Mars" Stil (dunkle Hintergründe, stark leuchtende Farben, Glassmorphism) muss beibehalten werden.

## 7. KI-Selbstoptimierung (Dojo & Evolution)
RedRoots verfügt über ein integriertes Lernsystem für Computergegner:
- **Dojo-Modus:** Ein spezieller Simulationsmodus, in dem 4 KIs in beschleunigter Zeit gegeneinander antreten (7 Runden à 150 Schritte).
- **Genetischer Algorithmus:** Jede KI wird durch ein "Genom" (Pattern-Gewichtung, Taktik-Heuristiken) gesteuert.
- **Batch-Evolution:** In Läufen von 30 Spielen werden die erfolgreichsten Genome selektiert und mutiert, um die optimale Mars-Strategie zu "züchten".
- **Monitoring:** Die Fitness-Entwicklung und Simulationsergebnisse werden detailliert in der Browser-Konsole (`F12`) ausgegeben.

---
*End of Document. Please update when adding new core mechanics or refactoring major components.*
