// tests/core.test.cjs
// Ebene 2: Kern-Engine, Conway B3/S23, Felsen, Territorium, Budget & Undo-Invarianten

const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');

console.log('--- Ebene 2: Kern-Engine & Conway-Simulation ---');

const ctx = vm.createContext({
    console,
    setTimeout,
    requestAnimationFrame: () => 1,
    cancelAnimationFrame: () => {},
    localStorage: { getItem: () => null, setItem: () => {} }
});

for (const file of [
    'js/utils/Constants.js',
    'js/core/Grid.js',
    'js/core/Territory.js',
    'js/core/GameState.js'
]) {
    vm.runInContext(fs.readFileSync(file, 'utf8'), ctx);
}

const { Grid, Territory, GameState, CONSTANTS: C } = vm.runInContext('({Grid, Territory, GameState, CONSTANTS})', ctx);

// ==========================================
// 1. Conway B3/S23 & Kollisionsregeln (Grid.js)
// ==========================================

// 1.1 Einsamkeit (<2) & Überbevölkerung (>3)
{
    const grid = new Grid(10, 10, 'majority');
    // Einzelne Zelle stirbt durch Einsamkeit
    grid.setCell(5, 5, 1);
    grid.calculateNextGeneration();
    assert.equal(grid.getOwner(5, 5), 0, 'Zelle mit 0 Nachbarn muss sterben (Einsamkeit)');

    // Zelle mit 1 Nachbarn stirbt
    grid.setCell(5, 5, 1);
    grid.setCell(5, 6, 1);
    grid.calculateNextGeneration();
    assert.equal(grid.getOwner(5, 5), 0, 'Zelle mit 1 Nachbarn muss sterben');
    assert.equal(grid.getOwner(5, 6), 0, 'Zelle mit 1 Nachbarn muss sterben');

    // Zelle mit 4 Nachbarn stirbt durch Überbevölkerung
    grid.resetGrid();
    grid.setCell(5, 5, 1); // Zentrum
    grid.setCell(4, 5, 1); // Oben
    grid.setCell(6, 5, 1); // Unten
    grid.setCell(5, 4, 1); // Links
    grid.setCell(5, 6, 1); // Rechts
    grid.calculateNextGeneration();
    assert.equal(grid.getOwner(5, 5), 0, 'Zelle mit 4 Nachbarn muss sterben (Überbevölkerung)');
}
console.log('✓ Conway B3/S23: Einsamkeit und Überbevölkerung korrekt.');

// 1.2 Überleben (2 oder 3 Nachbarn) & Geburt (exakt 3 Nachbarn)
{
    // Blinker (Periode 2 Oszillator)
    const grid = new Grid(5, 5, 'majority');
    grid.setCell(2, 1, 1);
    grid.setCell(2, 2, 1);
    grid.setCell(2, 3, 1);

    grid.calculateNextGeneration();
    assert.equal(grid.getOwner(1, 2), 1, 'Blinker vertikal: Zelle (1,2) geboren');
    assert.equal(grid.getOwner(2, 2), 1, 'Blinker Zentrum (2,2) überlebt mit 2 Nachbarn');
    assert.equal(grid.getOwner(3, 2), 1, 'Blinker vertikal: Zelle (3,2) geboren');
    assert.equal(grid.getOwner(2, 1), 0, 'Blinker Endzelle (2,1) stirbt');
    assert.equal(grid.getOwner(2, 3), 0, 'Blinker Endzelle (2,3) stirbt');

    // Nächste Generation rotiert zurück
    grid.calculateNextGeneration();
    assert.equal(grid.getOwner(2, 1), 1, 'Blinker horizontal zurückgekehrt');
    assert.equal(grid.getOwner(2, 2), 1, 'Blinker Zentrum bleibt');
    assert.equal(grid.getOwner(2, 3), 1, 'Blinker horizontal zurückgekehrt');
    assert.equal(grid.getOwner(1, 2), 0);
    assert.equal(grid.getOwner(3, 2), 0);
}
console.log('✓ Conway B3/S23: Überleben, Geburt und Oszillation (Blinker) verifiziert.');

// 1.3 Mehrheitsregel (majority) vs Neutralitätsregel (neutral)
{
    // 2 Nachbarn von Spieler 1, 1 Nachbar von Spieler 2 -> Spieler 1 gewinnt
    const gridMaj = new Grid(5, 5, 'majority');
    gridMaj.setCell(1, 2, 1);
    gridMaj.setCell(2, 1, 1);
    gridMaj.setCell(3, 2, 2);
    gridMaj.calculateNextGeneration();
    assert.equal(gridMaj.getOwner(2, 2), 1, 'Mehrheit 2:1 für Spieler 1 entscheidet Geburt');

    // Gleichstand: 1 Nachbar Spieler 1, 1 Nachbar Spieler 2, 1 Nachbar Spieler 3 -> Neutrale Flora (-1)
    const gridTie = new Grid(5, 5, 'majority');
    gridTie.setCell(1, 2, 1);
    gridTie.setCell(2, 1, 2);
    gridTie.setCell(3, 2, 3);
    gridTie.calculateNextGeneration();
    assert.equal(gridTie.getOwner(2, 2), C.OWNER_NEUTRAL, 'Gleichstand (1:1:1) erzeugt neutrale Flora');

    // Regel 'neutral': Jeder Konflikt erzeugt sofort neutrale Flora
    const gridNeu = new Grid(5, 5, 'neutral');
    gridNeu.setCell(1, 2, 1);
    gridNeu.setCell(2, 1, 1);
    gridNeu.setCell(3, 2, 2);
    gridNeu.calculateNextGeneration();
    assert.equal(gridNeu.getOwner(2, 2), C.OWNER_NEUTRAL, 'Regel neutral erzeugt bei jedem Mehr-Parteien-Konflikt neutrale Flora');
}
console.log('✓ Geburts-Konfliktregeln (majority und neutral) funktionieren vorschriftsmäßig.');

// 1.4 Felsen-Invariante (OWNER_ROCK = -3)
{
    const grid = new Grid(5, 5, 'majority');
    grid.setCell(2, 2, C.OWNER_ROCK);
    // 0 Nachbarn: Fels darf nicht sterben
    grid.calculateNextGeneration();
    assert.equal(grid.getOwner(2, 2), C.OWNER_ROCK, 'Fels überlebt mit 0 Nachbarn');

    // 8 Nachbarn: Fels darf nicht durch Überbevölkerung sterben
    for (let r = 1; r <= 3; r++) {
        for (let c = 1; c <= 3; c++) {
            if (r !== 2 || c !== 2) grid.setCell(r, c, 1);
        }
    }
    grid.calculateNextGeneration();
    assert.equal(grid.getOwner(2, 2), C.OWNER_ROCK, 'Fels überlebt selbst bei 8 Nachbarn');

    // Felsen selbst pflanzen sich nicht fort
    grid.resetGrid();
    grid.setCell(1, 2, C.OWNER_ROCK);
    grid.setCell(2, 1, C.OWNER_ROCK);
    grid.setCell(3, 2, C.OWNER_ROCK);
    grid.calculateNextGeneration();
    assert.equal(grid.getOwner(2, 2), 0, 'Drei Felsen erzeugen keine neue Zelle');
}
console.log('✓ Fels-Invariante: Felsen sind unzerstörbar und nicht reproduzierbar.');

// 1.5 Neutrale Flora (OWNER_NEUTRAL = -1)
{
    const grid = new Grid(5, 5, 'majority');
    // Block aus neutraler Flora (Stillleben)
    grid.setCell(2, 2, C.OWNER_NEUTRAL);
    grid.setCell(2, 3, C.OWNER_NEUTRAL);
    grid.setCell(3, 2, C.OWNER_NEUTRAL);
    grid.setCell(3, 3, C.OWNER_NEUTRAL);
    grid.calculateNextGeneration();
    assert.equal(grid.getOwner(2, 2), C.OWNER_NEUTRAL, 'Neutrale Flora überlebt mit 3 Nachbarn');
    assert.equal(grid.getOwner(2, 3), C.OWNER_NEUTRAL);
    assert.equal(grid.getOwner(3, 2), C.OWNER_NEUTRAL);
    assert.equal(grid.getOwner(3, 3), C.OWNER_NEUTRAL);
}
console.log('✓ Neutrale Flora: Folgt Conway-Regeln und bleibt neutral.');

// ==========================================
// 2. Territoriums-Berechnung (Territory.js)
// ==========================================
{
    const terr = new Territory(20, 20, 2);
    terr.setInitialTerritories();

    // 2-Spieler-Aufteilung: Obere Hälfte Spieler 0, untere Hälfte Spieler 1
    assert.equal(terr.getOwnerAt(0, 0), 0, 'Camp 0 gehört Spieler 0');
    assert.equal(terr.getOwnerAt(19, 19), 1, 'Camp 1 gehört Spieler 1');

    // Falsy-Check Invariante: Eigentümer 0 ist nicht null / unbesetzt
    const owner0 = terr.getOwnerAt(2, 2);
    assert.equal(owner0, 0);
    assert.ok(owner0 !== null && owner0 >= 0, 'Eigentümer 0 darf nicht durch falsy-Prüfung verworfen werden');

    // BFS-Einflussbereich nach Zellwachstum
    const grid = new Grid(20, 20, 'majority');
    grid.setCell(5, 5, 1); // Spieler 0 (Grid-Wert: 1)
    grid.setCell(15, 5, 2); // Spieler 1 (Grid-Wert: 2)

    terr.updateTerritories(grid, 4);
    assert.equal(terr.getOwnerAt(5, 5), 0, 'Zelle von Spieler 0 erzeugt Territorium 0');
    assert.equal(terr.getOwnerAt(5, 6), 0, 'Direkter Nachbar gehört Spieler 0');
    assert.equal(terr.getOwnerAt(15, 5), 1, 'Zelle von Spieler 1 erzeugt Territorium 1');

    // Niemandsland bei äquidistantem Einfluss zweier Spieler
    grid.resetGrid();
    grid.setCell(10, 4, 1); // Spieler 0
    grid.setCell(10, 6, 2); // Spieler 1
    terr.updateTerritories(grid, 3);
    assert.equal(terr.territoryMap[10][5], -1, 'Mitte zwischen zwei Spielern wird Niemandsland (-1)');
}
console.log('✓ Territorium: Multi-Source BFS, Niemandsland (-1) und Falsy-Player-0-Schutz verifiziert.');

// ==========================================
// 3. GameState: Budget, Undo & Skirmish-Sieg
// ==========================================
{
    const state = new GameState({
        rows: 20,
        cols: 20,
        rounds: 3,
        steps: 5,
        playerCount: 2,
        radius: 3,
        rocks: 0,
        collisionRule: 'majority',
        budgetFactor: 10
    });
    state.simSpeedMs = 0;
    state.start();

    // 3.1 Initiales Budget
    const initialBudget = state.budgets[0];
    assert.ok(initialBudget > 0, 'Initiales Budget muss > 0 sein');

    // 3.2 Platzierung & Budgetabzug
    const block = C.PATTERNS.block.pattern; // 4 Zellen, Kosten 4
    assert.equal(state.placePattern(block, 2, 2), true, 'Block in eigenem Territorium platzierbar');
    assert.equal(state.budgets[0], initialBudget - 4, 'Budget um 4 reduziert');

    // 3.3 Ungültige Platzierung (bereits besetzt)
    assert.equal(state.placePattern(block, 2, 2), false, 'Keine Überlappung auf besetzte Zellen');

    // 3.4 Undo-Funktion stellt Budget exakt wieder her
    assert.equal(state.undoLastAction(), true, 'Undo erfolgreich');
    assert.equal(state.budgets[0], initialBudget, 'Budget nach Undo vollständig wiederhergestellt');
    assert.equal(state.grid.getOwner(2, 2), 0, 'Zellen nach Undo wieder frei');

    // 3.5 Erase-Funktion
    state.placePattern(block, 2, 2);
    assert.equal(state.eraseCell(2, 2), true, 'Einzelne frische Zelle radierbar');
    assert.equal(state.budgets[0], initialBudget - 3, 'Budget um 1 erstattet nach Radieren');
    assert.equal(state.grid.getOwner(2, 2), 0, 'Zelle wieder leer');

    // 3.6 Budget-Addition Invariante (wird nach Runden hinzugefügt, nicht überschrieben)
    const budgetBeforeEnd = state.budgets[0];
    state.calculateBudgets();
    assert.ok(state.budgets[0] > budgetBeforeEnd, 'Neues Budget wird additiv hinzugefügt');

    // 3.7 Skirmish-Camp-Invasion Siegbedingung
    const skirmish = new GameState({
        rows: 20,
        cols: 20,
        rounds: 2,
        steps: 5,
        playerCount: 2,
        radius: 3,
        rocks: 0
    });
    skirmish.start();
    // Feindliches Camp von Spieler 1 liegt bei r=17..19
    skirmish.grid.setCell(18, 10, 1); // Spieler 0 (Grid-Wert 1) dringt in Camp 1 ein
    assert.equal(skirmish.checkWinCondition(), true, 'Invasion des gegnerischen Camps löst Sieg aus');
    assert.equal(skirmish.winner, 0, 'Spieler 0 ist Sieger');

    // Eigene Zelle im eigenen Camp löst keinen Sieg aus
    skirmish.winner = -1;
    skirmish.grid.resetGrid();
    skirmish.grid.setCell(1, 10, 1); // Spieler 0 in Camp 0
    assert.equal(skirmish.checkWinCondition(), false, 'Eigene Zellen im eigenen Camp lösen keinen Sieg aus');

    // Neutrale Flora im Camp löst keinen Sieg aus
    skirmish.grid.setCell(18, 10, C.OWNER_NEUTRAL);
    assert.equal(skirmish.checkWinCondition(), false, 'Neutrale Flora im Camp löst keinen Sieg aus');
}
console.log('✓ GameState: Platzierung, Budget-Akkumulation, Undo/Erase und Skirmish-Siegregeln verifiziert.');

console.log('PASS: Ebene 2 Kern-Engine & Conway-Simulation vollständig erfolgreich.');
