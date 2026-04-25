# 🔴 RedRoots: Mars Game of Life

RedRoots ist ein rundenbasiertes, kompetitives Strategiespiel, das auf **Conway's Game of Life** aufbaut. Das Spielgeschehen ist in ein packendes Sci-Fi-Szenario auf dem Mars eingebettet: Spieler übernehmen die Rolle von Siedlern, die im Wettbewerb miteinander wuchern und versuchen, durch cleveres Platzieren von lebenden Zellen (Pflanzen) die Lager der gegnerischen Siedler zu überwuchern.

## ✨ Features

- **Kompetitiver Multiplayer:** Spiele gegen bis zu 3 Freunde im Hot-Seat-Modus an einem Gerät oder trete gegen Computergegner (KI) an.
- **Strategische Runden:** Nutze ein zugeteiltes Zell-Budget, um komplexe Figuren (Gleiter, Raumschiffe, R-Pentominos) in deinem eigenen Territorium zu platzieren.
- **Dynamische Territorien:** Nach jeder Runde erobern überlebende Zellen automatisch neues Gebiet für dich (mit definierbarem Radius). Überschneiden sich Einflussbereiche, entsteht Niemandsland.
- **Auto-Stopp & Echtzeit-Kontrolle:** Ein Slider erlaubt die Kontrolle der Geschwindigkeit während der Simulation. Endlosschleifen (periodische Zustände) werden automatisch erkannt und übersprungen.
- **Neon Mars Theme:** Modernes, visuell ansprechendes Design mit Glassmorphismus, leuchtenden Laserlinien (Brennlinien) und Neon-Akzenten.

## 🚀 Spielstart

Das Spiel besteht aus purem HTML, CSS und JavaScript. Es werden keine externen Server, Datenbanken oder Build-Tools benötigt!

1. Klone dieses Repository oder lade es als ZIP herunter.
2. Öffne die Datei `index.html` in einem modernen Webbrowser (Chrome, Firefox, Safari, Edge).
3. Konfiguriere im Startmenü deine Mission (Rastergröße, KI-Gegner, Rundenanzahl).
4. Klicke auf **Mission Starten**.

## 🎮 Spielregeln & Steuerung

- **Ziel:** Platziere deine Zellen so, dass sie sich nach den Game of Life-Regeln vermehren und bewege deine Organismen bis in das feindliche, schraffiert markierte Lager (in den Ecken oder an der Grundlinie). Wer das feindliche Lager erreicht, gewinnt sofort!
- **Platzieren:** Klicke mit der linken Maustaste in dein farbig markiertes Gebiet. Figuren können mit `R` oder `Rechtsklick` vor dem Setzen rotiert werden.
- **Überleben:** Conway's Game of Life Kernregeln gelten:
  1. Zelle mit < 2 Nachbarn stirbt (Unterbevölkerung).
  2. Zelle mit 2 oder 3 Nachbarn überlebt.
  3. Zelle mit > 3 Nachbarn stirbt (Überbevölkerung).
  4. Leeres Feld mit genau 3 Nachbarn wird neu geboren. Bei uns entscheidet hierbei (einstellbar) die *Mehrheitsregel*: Welcher Spieler die meisten Nachbarn beigesteuert hat, dem gehört die neue Zelle!

## 🛠️ Architektur

- `index.html`: UI-Struktur.
- `css/style.css`: Custom Styling und Mars-Hintergründe.
- `js/utils/Constants.js`: Farben, Figuren und Kosten.
- `js/core/`: Spiel-Engine (`GameState`, `Grid`, `Territory`, `AI`, `InputHandler`).
- `js/ui/`: Visuelles Rendering auf dem Canvas und Menüsteuerung.

---
Viel Spaß beim Besiedeln des Mars! 🚀
