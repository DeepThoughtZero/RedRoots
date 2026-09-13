// tests/ai.test.cjs
// Ebene 3: KI-Verhalten, Budget-Disziplin, Platzierungsgültigkeit und Robustheit bei Grenzfällen

const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');

console.log('--- Ebene 3: KI-Verhalten & Grenzfälle ---');

const ctx = vm.createContext({
    console: { log() {}, warn: console.warn, error: console.error },
    setTimeout,
    requestAnimationFrame: () => 1,
    cancelAnimationFrame: () => {},
    localStorage: { getItem: () => null, setItem: () => {} }
});

for (const file of [
    'js/utils/Constants.js',
    'js/core/Grid.js',
    'js/core/Territory.js',
    'js/core/AI.js',
    'js/core/GameState.js'
]) {
    vm.runInContext(fs.readFileSync(file, 'utf8'), ctx);
}

const { GameState, AI, CONSTANTS: C } = vm.runInContext('({GameState, AI, CONSTANTS})', ctx);

// Seeded PRNG für deterministische KI-Tests
function setSeed(seed = 42) {
    vm.runInContext(`Math.random = (() => { let x = ${seed}; return () => ((x = (1664525 * x + 1013904223) >>> 0) / 4294967296); })()`, ctx);
}

// 1. Schwierigkeitsgrade & Genome
{
    const state = new GameState({ rows: 20, cols: 20, rounds: 1, steps: 1, playerCount: 2, radius: 3, rocks: 0 });
    const ai = new AI(state);

    const easy = ai.getDefaultGenome('easy');
    const medium = ai.getDefaultGenome('medium');
    const hard = ai.getDefaultGenome('hard');

    assert.ok(easy.random_rotation_chance > hard.random_rotation_chance, 'Easy hat höhere Zufallsrotation als Hard');
    assert.ok(hard.expansion_weight > easy.expansion_weight, 'Hard priorisiert Expansion stärker als Easy');
    assert.ok(hard.r_pentomino_weight > easy.r_pentomino_weight, 'Hard bevorzugt stärkere Muster');
}
console.log('✓ KI-Genome: Schwierigkeitsgrade (easy, medium, hard) syntaktisch und gewichtungstechnisch korrekt.');

// 2. Budgetdisziplin & Regelkonformität
(async () => {
    setSeed(12345);
    const state = new GameState({
        rows: 24,
        cols: 24,
        rounds: 3,
        steps: 5,
        playerCount: 2,
        humanFlags: [true, false], // Spieler 1 ist KI
        radius: 4,
        rocks: 10
    });
    state.start();
    state.currentPlayer = 1; // KI-Zug
    const startBudget = state.budgets[1];
    assert.ok(startBudget > 0, 'KI startet mit positivem Budget');

    // Speichere Zustand vor KI-Zug
    const ownersBefore = new Int8Array(state.grid.owners);

    const ai = new AI(state);
    await ai.takeTurn();

    // 2.1 Budget darf niemals negativ werden
    assert.ok(state.budgets[1] >= 0, `Budget darf nicht negativ sein: ${state.budgets[1]}`);
    assert.ok(state.budgets[1] <= startBudget, 'Budget darf durch Platzierungen nur sinken oder gleich bleiben');

    // 2.2 Alle neu gesetzten Zellen müssen im eigenen Territorium liegen und regelkonform sein
    let newlyPlaced = 0;
    for (let r = 0; r < state.rows; r++) {
        for (let c = 0; c < state.cols; c++) {
            const idx = r * state.cols + c;
            if (ownersBefore[idx] === 0 && state.grid.owners[idx] === 2) { // Spieler 1 hat Grid-Owner 2
                newlyPlaced++;
                const terrOwner = state.territory.getOwnerAt(r, c);
                assert.equal(terrOwner, 1, `KI darf nur im eigenen Territorium platzieren (Feld ${r},${c} gehört ${terrOwner})`);
            }
        }
    }
    console.log(`✓ KI platzierte ${newlyPlaced} Zellen vorschriftsmäßig im eigenen Territorium ohne Budgetüberziehung.`);

    // 3. Grenzfälle & Robustheit
    // 3.1 KI mit Budget = 0
    state.budgets[1] = 0;
    let errorThrown = false;
    try {
        await new AI(state).takeTurn();
    } catch (e) {
        errorThrown = true;
    }
    assert.equal(errorThrown, false, 'KI darf bei Budget = 0 keinen Fehler werfen');
    assert.equal(state.budgets[1], 0, 'Budget bleibt 0');

    // 3.2 KI ohne jedes Territorium
    const emptyTerrState = new GameState({ rows: 10, cols: 10, rounds: 1, steps: 1, playerCount: 2, radius: 2, rocks: 0 });
    emptyTerrState.start();
    emptyTerrState.currentPlayer = 1;
    // Lösche Territorium für Spieler 1 vollständig
    for (let r = 0; r < emptyTerrState.rows; r++) {
        for (let c = 0; c < emptyTerrState.cols; c++) {
            emptyTerrState.territory.territoryMap[r][c] = 0; // Gehört alles Spieler 0
        }
    }
    // Auch Camps leeren
    emptyTerrState.territory.camps = [];

    errorThrown = false;
    try {
        await new AI(emptyTerrState).takeTurn();
    } catch (e) {
        errorThrown = true;
    }
    assert.equal(errorThrown, false, 'KI terminiert sicher ohne Exception, wenn kein Territorium existiert');

    console.log('✓ KI-Grenzfälle: Budget 0 und blockierte Territorien werden sauber und sicher behandelt.');
    console.log('PASS: Ebene 3 KI-Verhalten & Grenzfälle vollständig erfolgreich.');
})().catch(err => {
    console.error(err);
    process.exitCode = 1;
});
