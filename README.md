# 🔴 RedRoots: Mars Game of Life

**[🚀 Jetzt direkt im Browser spielen!](https://deepthoughtzero.github.io/RedRoots/)**

![Mars Overview](assets/Mars_Overview.png)

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
3. Konfiguriere im Startmenü deine Mission (Häuser, Mapgröße, Rundenanzahl).
4. Klicke auf **Mission Starten**.

## 🎮 Spielregeln & Steuerung

- **Ziel:** Erreiche das feindliche, schraffiert markierte Lager (in den Ecken). Wer das Lager infiltriert, gewinnt den Sektor für sein Haus!
- **Steuerung (Maus):** 
  - `Linksklick`: Figur platzieren
  - `Mausrad halten`: Kamera verschieben
  - `Mausrad scrollen`: Zoom
  - `R` oder `Rechtsklick`: Figur rotieren
  - `Strg+Z`: Rückgängig
- **Überleben:** Conway's Game of Life Kernregeln gelten (Unterbevölkerung, Überleben, Überbevölkerung, Wachstum). Bei uns entscheidet die *Mehrheitsregel* bei Geburten in Konfliktzonen.

## 🛠️ Architektur

- `index.html`: UI-Struktur.
- `css/style.css`: Custom Styling und Mars-Hintergründe.
- `js/utils/Constants.js`: Farben, Häuser und Figuren.
- `js/core/`: Spiel-Engine (`GameState`, `Grid`, `Territory`, `AI`, `InputHandler`).
- `js/ui/`: Visuelles Rendering auf dem Canvas und Menüsteuerung.

---
Viel Spaß beim Besiedeln des Mars! 🚀
