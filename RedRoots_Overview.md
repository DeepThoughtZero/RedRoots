# 🔴 RedRoots: Project Overview & Master Documentation

> [!WARNING]
> Dieses Dokument muss bei künftigen Erweiterungen **fortwährend aktualisiert** werden! Es dient zukünftigen Entwicklungs-Agenten als zentrales Einstiegs- und Architektur-Dokument.

## 1. Projekt-Beschreibung
**RedRoots** ist ein browserbasiertes, kompetitives Strategiespiel auf Basis von *Conway's Game of Life*. Die Spieler siedeln auf dem Mars und kämpfen durch geschicktes Platzieren von zellulären Mustern um knappe Gebiete. 
Das Spiel kommt komplett **ohne Backend, Datenbank oder Build-Prozess** aus und nutzt reines HTML, CSS (Tailwind via CDN) und Vanilla JavaScript (ES6 Modules).

## 2. Spiel-Mechaniken
- **Game of Life:** Es gelten die Standard-Regeln (B3/S23). Die "Mehrheitsregel" entscheidet, welchem Spieler eine neu geborene Zelle zugesprochen wird.
- **Rundenbasiert:** Spieler haben ein Budget, um Patterns in ihrem Einflussgebiet zu setzen. Ist das Budget aufgebraucht (oder der Zug beendet), simulieren wir `X` Evolutionsschritte.
- **Gebirgsketten:** Statische Felsen (`OWNER_ROCK: -3`) dienen als natürliche Barrieren, blockieren Gebietsansprüche und Zellwachstum.
- **Ziel:** Wer als erstes das Start-Camp eines gegnerischen Spielers mit einer lebenden Zelle erreicht, gewinnt.
- **KI-Gegner:** Berechnen Heuristiken (Schaden/Kosten), rotieren Schusswaffen (`glider`, `lwss`) intelligent in Richtung Spielfeldmitte und nutzen "BurnLines" für weitreichende Schüsse.
- **Periodizitäts-Erkennung:** Das Spiel stoppt Simulationen frühzeitig, wenn ein exakter Zustand nach 1 bis 10 Schritten wiederkehrt (Early Stop), um Endlosschleifen zu vermeiden.

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
    │   └── AI.js              # Heuristik-basierte Computergegner
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

---
*End of Document. Please update when adding new core mechanics or refactoring major components.*
