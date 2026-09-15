// tests/integrity.test.cjs
// Ebene 1: Statische Integrität, Syntax, Script-Reihenfolge und Manifest-Validierung

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { execSync } = require('node:child_process');

console.log('--- Ebene 1: Statische Integrität & Hygiene ---');

// 1. Syntaxprüfung aller JS- und CJS-Dateien via node --check
const jsFiles = [
    'js/utils/Constants.js',
    'js/core/Grid.js',
    'js/core/Territory.js',
    'js/core/AI.js',
    'js/core/AIEvolver.js',
    'js/core/InputHandler.js',
    'js/campaign/Missions.js',
    'js/campaign/Story.js',
    'js/campaign/Act2.js',
    'js/campaign/Act3.js',
    'js/campaign/Act4.js',
    'js/campaign/Act5.js',
    'js/campaign/ObjectiveSystem.js',
    'js/campaign/CampaignManager.js',
    'js/core/GameState.js',
    'js/ui/GameRenderer.js',
    'js/ui/GameAudio.js',
    'js/ui/UIManager.js',
    'js/main.js'
];

for (const file of jsFiles) {
    assert.ok(fs.existsSync(file), `Datei existiert: ${file}`);
    try {
        execSync(`node --check "${file}"`, { stdio: 'pipe' });
    } catch (err) {
        assert.fail(`Syntaxfehler in ${file}: ${err.message}`);
    }
}
console.log(`✓ Alle ${jsFiles.length} JavaScript-Quelldateien haben gültige Syntax.`);

// 2. Script-Ladereihenfolge in index.html validieren
const indexHtml = fs.readFileSync('index.html', 'utf8');
const scriptRegex = /<script\s+src="([^"]+)"><\/script>/g;
const loadedScripts = [];
let match;
while ((match = scriptRegex.exec(indexHtml)) !== null) {
    if (match[1].startsWith('js/')) {
        loadedScripts.push(match[1]);
    }
}

const expectedScripts = [
    'js/utils/Constants.js',
    'js/core/Territory.js',
    'js/core/Grid.js',
    'js/core/AI.js',
    'js/core/AIEvolver.js',
    'js/core/InputHandler.js',
    'js/campaign/Missions.js',
    'js/campaign/Story.js',
    'js/campaign/Act2.js',
    'js/campaign/Act3.js',
    'js/campaign/Act4.js',
    'js/campaign/Act5.js',
    'js/campaign/ObjectiveSystem.js',
    'js/campaign/CampaignManager.js',
    'js/core/GameState.js',
    'js/ui/GameRenderer.js',
    'js/ui/GameAudio.js',
    'js/ui/UIManager.js',
    'js/main.js'
];

assert.deepEqual(
    loadedScripts,
    expectedScripts,
    'Script-Ladereihenfolge in index.html muss exakt der Komponenten-Abhängigkeitskette entsprechen'
);
console.log(`✓ Script-Ladereihenfolge in index.html ist konsistent (${loadedScripts.length} Scripts).`);

// 3. Missions-Deklarationen & Zonen-Grenzen validieren
const ctx = vm.createContext({ console, window: {}, document: {}, localStorage: { getItem: () => null, setItem: () => {} } });
for (const file of [
    'js/utils/Constants.js',
    'js/campaign/Missions.js',
    'js/campaign/Story.js',
    'js/campaign/Act2.js',
    'js/campaign/Act3.js',
    'js/campaign/Act4.js',
    'js/campaign/Act5.js'
]) {
    vm.runInContext(fs.readFileSync(file, 'utf8'), ctx);
}
const { CAMPAIGN_MISSIONS, CONSTANTS } = vm.runInContext('({CAMPAIGN_MISSIONS, CONSTANTS})', ctx);

assert.equal(CAMPAIGN_MISSIONS.length, 25, 'Fünf Akte mit je fünf Kampagnenmissionen sind deklariert');

const validObjectiveTypes = new Set([
    'survive', 'reachZone', 'race', 'territoryZone', 'territoryZones',
    'orderedZones', 'pulse', 'allZones', 'collectZones', 'holdZones', 'evacuate',
    'captureCamps'
]);

CAMPAIGN_MISSIONS.forEach((m, idx) => {
    assert.ok(m.id, `Mission ${idx}: ID vorhanden`);
    assert.ok([1, 2, 3, 4, 5].includes(m.act), `Mission ${m.id}: Gültiger Akt 1 bis 5`);
    assert.ok(m.title, `Mission ${m.id}: Titel vorhanden`);
    assert.ok(m.briefing && m.briefing.length > 20, `Mission ${m.id}: Ausführliches Briefing vorhanden`);
    assert.ok(m.debriefing && m.debriefing.length > 20, `Mission ${m.id}: Ausführliches Debriefing vorhanden`);
    assert.ok(m.hint, `Mission ${m.id}: Taktischer Hinweis vorhanden`);
    assert.ok(Array.isArray(m.patterns), `Mission ${m.id}: Muster-Array vorhanden`);
    for (const pat of m.patterns) {
        assert.ok(CONSTANTS.PATTERNS[pat], `Mission ${m.id}: Muster ${pat} ist in CONSTANTS definiert`);
    }
    if (m.reward) {
        assert.ok(CONSTANTS.PATTERNS[m.reward], `Mission ${m.id}: Belohnungsmuster ${m.reward} existiert`);
    }

    assert.ok(validObjectiveTypes.has(m.objective.type), `Mission ${m.id}: Zieltyp ${m.objective.type} ist zulässig`);

    // Map & Dimensionen
    const rows = m.map?.rows || 30;
    const cols = m.map?.cols || 48;
    assert.ok(rows >= 10 && cols >= 10, `Mission ${m.id}: Spielfeldmaße ${rows}x${cols} ausreichend`);

    // Zonen validieren
    if (m.map?.zones) {
        for (const zone of m.map.zones) {
            assert.ok(zone.id, `Mission ${m.id}: Zone hat eine ID`);
            assert.ok(zone.rMin >= 0 && zone.rMin <= zone.rMax && zone.rMax < rows,
                `Mission ${m.id}: Zone ${zone.id} Zeilen [${zone.rMin}..${zone.rMax}] innerhalb von [0..${rows - 1}]`);
            assert.ok(zone.cMin >= 0 && zone.cMin <= zone.cMax && zone.cMax < cols,
                `Mission ${m.id}: Zone ${zone.id} Spalten [${zone.cMin}..${zone.cMax}] innerhalb von [0..${cols - 1}]`);
        }
    }

    // Camps validieren
    if (m.map?.camps) {
        for (const camp of m.map.camps) {
            assert.ok(camp.rMin >= 0 && camp.rMin <= camp.rMax && camp.rMax < rows,
                `Mission ${m.id}: Camp ${camp.id} Zeilen im Spielfeld`);
            assert.ok(camp.cMin >= 0 && camp.cMin <= camp.cMax && camp.cMax < cols,
                `Mission ${m.id}: Camp ${camp.id} Spalten im Spielfeld`);
        }
    }
});
console.log(`✓ Alle 15 Kampagnenmissionen und Zonen sind syntaktisch und geometrisch valide.`);

// 4. Audio-Manifest Konsistenz
if (fs.existsSync('assets/audio/manifest.json')) {
    const audioManifest = JSON.parse(fs.readFileSync('assets/audio/manifest.json', 'utf8'));
    assert.ok(Array.isArray(audioManifest), 'assets/audio/manifest.json ist ein Array');
    assert.ok(audioManifest.length >= 30, 'Mindestens 30 Audio-Einträge im Manifest vorhanden');
    for (const entry of audioManifest) {
        assert.ok(entry.id, 'Audio-Eintrag hat ID');
        assert.ok(entry.text, 'Audio-Eintrag hat Text');
    }
    console.log(`✓ Audio-Manifest geprüft (${audioManifest.length} registrierte Audio-Einträge).`);
}

// 5. Git-Patch-Hygiene (Whitespace-Check)
try {
    execSync('git diff --check', { stdio: 'pipe' });
    console.log('✓ Git-Patch-Hygiene: Keine Whitespace-Fehler oder Konfliktmarker.');
} catch (err) {
    assert.fail(`Git diff --check meldete Probleme:\n${err.stdout?.toString() || err.message}`);
}

console.log('PASS: Ebene 1 Statische Integrität & Hygiene vollständig erfolgreich.');
