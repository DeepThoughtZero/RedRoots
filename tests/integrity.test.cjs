// tests/integrity.test.cjs
// Ebene 1: Statische Integrität, Syntax, Script-Reihenfolge und Manifest-Validierung

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
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
    'js/campaign/Assistance.js',
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
    'js/campaign/Assistance.js',
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
    'js/campaign/Act5.js',
    'js/campaign/Assistance.js'
]) {
    vm.runInContext(fs.readFileSync(file, 'utf8'), ctx);
}
const { CAMPAIGN_MISSIONS, CONSTANTS } = vm.runInContext('({CAMPAIGN_MISSIONS, CONSTANTS})', ctx);

assert.equal(CAMPAIGN_MISSIONS.length, 25, 'Fünf Akte mit je fünf Kampagnenmissionen sind deklariert');

const validObjectiveTypes = new Set([
    'survive', 'reachZone', 'race', 'territoryZone', 'territoryZones',
    'orderedZones', 'pulse', 'allZones', 'collectZones', 'holdZones', 'evacuate',
    'captureCamps', 'clearZones', 'oscillate', 'escort', 'exactCount'
]);

CAMPAIGN_MISSIONS.forEach((m, idx) => {
    assert.ok(m.id, `Mission ${idx}: ID vorhanden`);
    assert.ok([1, 2, 3, 4, 5].includes(m.act), `Mission ${m.id}: Gültiger Akt 1 bis 5`);
    assert.ok(m.title, `Mission ${m.id}: Titel vorhanden`);
    assert.ok(m.briefing && m.briefing.length > 20, `Mission ${m.id}: Ausführliches Briefing vorhanden`);
    assert.ok(m.debriefing && m.debriefing.length > 20, `Mission ${m.id}: Ausführliches Debriefing vorhanden`);
    assert.ok(m.hint, `Mission ${m.id}: Taktischer Hinweis vorhanden`);
    assert.ok(Array.isArray(m.hints) && m.hints.length >= 2 && m.hints.includes(m.hint) && m.hints.every(h => typeof h === 'string' && h.length > 20), `Mission ${m.id}: Gestufte Hinweise mit dem taktischen Hinweis`);
    if (m.id !== 'A1_M01') assert.ok(!/Zeile|Spalte/.test(m.hints[0]), `Mission ${m.id}: Erste Hinweisstufe verrät keine Koordinaten`);
    const zoneIds = new Set(m.map.zones.map(z => z.id));
    const inBounds = ([r1, c1, r2, c2]) => r1 >= 0 && c1 >= 0 && r1 <= r2 && c1 <= c2 && r2 < (m.map.rows || 30) && c2 < (m.map.cols || 48);
    m.map.zones.filter(z => z.cache !== undefined).forEach(z => assert.ok(Number.isInteger(z.cache) && z.cache > 0, `Mission ${m.id}: Vorrat ${z.id} mit positiver Menge`));
    const eventIds = new Set();
    for (const e of m.events || []) {
        assert.ok(e.id && !eventIds.has(e.id), `Mission ${m.id}: Ereignis-ID eindeutig`); eventIds.add(e.id);
        assert.ok(typeof e.text === 'string' && e.text.length > 20, `Mission ${m.id}: Ereignis ${e.id} hat einen Ankündigungstext`);
        const eventRound = e.round ?? Math.floor((e.generation - 1) / m.steps) + 1;
        assert.ok(Number.isInteger(eventRound) && eventRound <= m.rounds, `Mission ${m.id}: Ereignis ${e.id} liegt innerhalb der Mission`);
        assert.ok(Number.isInteger(e.announceRound) && e.announceRound < eventRound, `Mission ${m.id}: Ereignis ${e.id} wird mindestens eine Runde vorher angekündigt`);
        for (const a of [].concat(e.action)) {
            assert.ok(['seed', 'clearRocks', 'addRocks', 'budget'].includes(a.type), `Mission ${m.id}: Ereignisaktion ${a.type} bekannt`);
            if (a.type === 'seed') {
                assert.ok(CONSTANTS.PATTERNS[a.pattern], `Mission ${m.id}: Ereignismuster ${a.pattern} existiert`);
                CONSTANTS.PATTERNS[a.pattern].pattern.forEach(([r, c]) => assert.ok(inBounds([a.r + r, a.c + (a.mirror ? -c : c), a.r + r, a.c + (a.mirror ? -c : c)]), `Mission ${m.id}: Ereignissaat ${e.id} liegt im Feld`));
            }
            if (a.rect) assert.ok(inBounds(a.rect), `Mission ${m.id}: Ereignisbereich ${e.id} liegt im Feld`);
        }
    }
    for (const e of m.enemies || []) {
        if (e.doctrine) assert.ok(['raid', 'siege', 'defend', 'expand'].includes(e.doctrine), `Mission ${m.id}: Doktrin ${e.doctrine} bekannt`);
        if (e.target) assert.ok(zoneIds.has(e.target), `Mission ${m.id}: Angriffsziel ${e.target} ist eine Zone`);
    }
    if (m.objective.type === 'escort') assert.ok([2, 3, 4].includes(m.objective.owner) && (m.map.seeds || []).some(s => s.owner === m.objective.owner), `Mission ${m.id}: Geleitzug ist vorgegeben`);
    if (m.objective.type === 'exactCount') assert.ok(Number.isInteger(m.objective.at) && m.objective.at <= m.rounds * m.steps, `Mission ${m.id}: Messzeitpunkt erreichbar`);
    const bonusTypes = ['rounds', 'spent', 'generations', 'population', 'margin', 'patterns', 'onlyPatterns', 'noErase', 'noForecast', 'caches', 'territory'];
    assert.equal(m.bonuses.length, 2, `Mission ${m.id}: genau zwei Bonusziele (Codes kennen höchstens drei Sterne)`);
    for (const b of m.bonuses) {
        assert.ok(bonusTypes.includes(b.type) && b.label, `Mission ${m.id}: Bonustyp ${b.type} bekannt und beschriftet`);
        if (b.type === 'onlyPatterns') assert.ok(b.patterns.every(k => m.patterns.includes(k)), `Mission ${m.id}: Bonusmuster sind erlaubt`);
        if (b.type === 'margin' && b.zones) assert.ok(b.zones.every(id => zoneIds.has(id)), `Mission ${m.id}: Abstandsbonus nennt vorhandene Zonen`);
        if (b.type === 'caches') assert.ok(m.map.zones.some(z => z.cache), `Mission ${m.id}: Vorratsbonus hat einen Vorrat`);
        if (b.type === 'noForecast') assert.ok(m.forecast, `Mission ${m.id}: Prognosebonus nur mit Prognose`);
    }
    for (const line of m.radio || []) {
        assert.ok(['UNSERE BIOLOGIN', 'DIE HELLAS-KOMMANDANTIN', 'GEMEINSAMER FUNKKANAL', 'DIE LANDEFÄHRE'].includes(line.voice), `Mission ${m.id}: Funkspruch mit Rollenbezeichnung`);
        assert.ok(typeof line.on === 'string' && line.text.split(/\s+/).length <= 12, `Mission ${m.id}: Funkspruch „${line.text}“ höchstens zwölf Wörter`);
    }
    assert.ok(m.forecast === null || (Number.isInteger(m.forecast.charges) && m.forecast.charges > 0 && m.forecast.horizon > 0), `Mission ${m.id}: Prognose deaktiviert oder gültig konfiguriert`);
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
console.log(`✓ Alle ${CAMPAIGN_MISSIONS.length} Kampagnenmissionen und Zonen sind syntaktisch und geometrisch valide.`);

// 4. Jede Mission braucht eine eigene registrierte Bilddatei mit eigenem Inhalt.
const missionImageManifest = JSON.parse(fs.readFileSync('assets/missions/manifest.json', 'utf8'));
const imageManifestById = new Map(missionImageManifest.images.map(entry => [entry.id, entry]));
const imageKeys = CAMPAIGN_MISSIONS.map(mission => mission.image || mission.id);
assert.equal(new Set(imageKeys).size, CAMPAIGN_MISSIONS.length,
    'Jede Mission muss auf eine andere Bild-ID verweisen');

const imageHashes = [];
for (const mission of CAMPAIGN_MISSIONS) {
    const imageKey = mission.image || mission.id;
    const manifestEntry = imageManifestById.get(imageKey);
    assert.ok(manifestEntry, `Mission ${mission.id}: Bild ${imageKey} ist im Manifest registriert`);
    const imagePath = path.join('assets/missions', manifestEntry.file);
    assert.ok(fs.existsSync(imagePath), `Mission ${mission.id}: Bilddatei ${imagePath} existiert`);
    imageHashes.push(crypto.createHash('sha256').update(fs.readFileSync(imagePath)).digest('hex'));
}
assert.equal(new Set(imageHashes).size, CAMPAIGN_MISSIONS.length,
    'Jede Mission muss eine Bilddatei mit eindeutigem Inhalt verwenden');
console.log(`✓ Alle ${CAMPAIGN_MISSIONS.length} Missionsbilder sind zugeordnet, vorhanden und inhaltlich eindeutig.`);

// 5. Audio-Manifest Konsistenz
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

// 6. Git-Patch-Hygiene (Whitespace-Check)
try {
    execSync('git diff --check', { stdio: 'pipe' });
    console.log('✓ Git-Patch-Hygiene: Keine Whitespace-Fehler oder Konfliktmarker.');
} catch (err) {
    assert.fail(`Git diff --check meldete Probleme:\n${err.stdout?.toString() || err.message}`);
}

console.log('PASS: Ebene 1 Statische Integrität & Hygiene vollständig erfolgreich.');
