// Act VI: rhythm, escort, containment, calibration and the garden finale, solved with the real simulation.
const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const storage = new Map();
const ctx = vm.createContext({ console: { log() {}, warn: console.warn }, setTimeout: fn => { queueMicrotask(fn); return 1; }, requestAnimationFrame: () => 1, cancelAnimationFrame() {}, performance: { now: () => 0 }, localStorage: { getItem: k => storage.get(k), setItem: (k, v) => storage.set(k, v) } });
for (const f of ['utils/Constants', 'core/Grid', 'core/Territory', 'core/AI', 'campaign/Missions', 'campaign/Story', 'campaign/Act2', 'campaign/Act3', 'campaign/Act4', 'campaign/Act5', 'campaign/Act6', 'campaign/Assistance', 'campaign/ObjectiveSystem', 'campaign/CampaignManager', 'core/GameState']) vm.runInContext(fs.readFileSync('js/' + f + '.js', 'utf8'), ctx);
const { GameState, MissionManager, missions, acts, C, CampaignState, expertMission } = vm.runInContext('({GameState,MissionManager,missions:CAMPAIGN_MISSIONS,acts:CAMPAIGN_ACTS,C:CONSTANTS,CampaignState,expertMission})', ctx);

const act6 = missions.filter(m => m.act === 6);
assert.equal(act6.length, 5, 'Act VI has five missions');
assert.equal(missions.length, 30, 'six acts with thirty missions');
assert.deepEqual(Array.from(act6, m => m.objective.type), ['oscillate', 'escort', 'clearZones', 'exactCount', 'captureCamps'], 'Act VI showcases the four care objectives before the finale');
assert.ok(acts.find(a => a.id === 6).choiceLine.consortium && acts.find(a => a.id === 6).choiceLine.open_genomes && acts.find(a => a.id === 6).choiceLine.none);
for (const m of act6) assert.equal(m.narration, 'browser', `${m.id}: browser voice until recordings pass QA`);
// New genomes: the beacon after the storm, the eater from Hellas. Wild still lifes stay out of the genome archive.
assert.equal(missions.find(m => m.id === 'A6_M01').reward, 'beacon');
assert.equal(missions.find(m => m.id === 'A6_M02').reward, 'eater');
for (const key of ['beehive', 'boat', 'loaf', 'tub']) { assert.ok(C.FORMS[key]); assert.equal(C.PATTERNS[key], undefined, `${key} is a wild form, not a genome`); }
assert.equal(MissionManager.seedCells({ pattern: 'beehive', r: 5, c: 5 }).length, 6, 'seeds resolve wild forms');

// Normalized rotations: n quarter turns clockwise, bounding box at the given top-left cell.
const rot = (k, n = 0) => { let p = C.PATTERNS[k].pattern; for (let i = 0; i < n; i++) p = p.map(([r, c]) => [c, -r]); const r0 = Math.min(...p.map(x => x[0])), c0 = Math.min(...p.map(x => x[1])); return p.map(([r, c]) => [r - r0, c - c0]); };
function create(m) { const s = new GameState(MissionManager.config(m)); s.simSpeedMs = 0; s.start(); s.nextPlayerTurn = () => {}; return s; }
async function evolve(s) { s.currentPlayer = -1; s.phase = C.PHASE_SIMULATION; await s.runSimulation(); }
async function play(id, rounds, mission = missions.find(m => m.id === id)) {
    const s = create(mission);
    for (const plan of rounds) {
        if (s.objectiveSystem.result) break;
        s.currentPlayer = 0;
        for (const [k, r, c, n = 0] of plan) assert.equal(s.placePattern(rot(k, n), r, c), true, `${id}: ${k} ${r},${c} in round ${s.currentRound}`);
        await evolve(s);
    }
    let n = 0; while (!s.objectiveSystem.result && n++ < 12) await evolve(s);
    return { result: s.objectiveSystem.result, s };
}

(async () => {
    // A6_M01: two blocks corner to corner beat in a two-beat rhythm; pre-placed blocks stop both waves.
    let { result, s } = await play('A6_M01', [[['block', 26, 30], ['block', 28, 32], ['block', 20, 23], ['block', 20, 38], ['block', 27, 20], ['block', 27, 42]]]);
    assert.equal(result.success, true, 'A6_M01 beacon held'); assert.equal(result.stars, 3); assert.equal(s.objectiveSystem.generations, 82);
    ({ result } = await play('A6_M01', [[['blinker', 27, 31]]]));
    assert.equal(result.success, false); assert.match(result.details.join(' '), /Generation 44: Wildwuchs erreichte LEUCHTFEUER/, 'the first gliders reach an unprotected beacon');
    ({ result } = await play('A6_M01', [[['blinker', 27, 31], ['block', 20, 23], ['block', 20, 38]]]));
    assert.equal(result.success, false); assert.match(result.details.join(' '), /72 \/ 80/, 'the announced gust breaks a beacon that ignored it, close to the goal');

    // A6_M02: clean annihilations clear the channel; the convoy is an ally, a wild glider from the ice destroys it.
    ({ result, s } = await play('A6_M02', [[['glider', 6, 21, 0], ['glider', 6, 37, 0], ['glider', 23, 50, 3], ['block', 6, 50, 0]]]));
    assert.equal(result.success, true, 'A6_M02 convoy arrives'); assert.equal(result.stars, 3); assert.equal(s.objectiveSystem.spent, 19);
    assert.deepEqual([...s.objectiveSystem.hostiles(s)], [], 'the Hellas convoy is never hostile');
    ({ result } = await play('A6_M02', [[['glider', 6, 21, 0], ['glider', 6, 37, 0], ['glider', 23, 50, 3]]]));
    assert.equal(result.reason, 'Der Geleitzug wurde zerstört.', 'the ice fall wrecks an unguarded convoy');
    ({ result } = await play('A6_M02', [[]]));
    assert.equal(result.success, false, 'the frozen nests block the channel');

    // A6_M03: eaters swallow both streams, two shots silence the cannons; the canal stays empty until generation 160.
    ({ result, s } = await play('A6_M03', [[['eater', 21, 35, 0], ['eater', 21, 54, 1], ['glider', 22, 29, 2], ['glider', 17, 75, 2]]]));
    assert.equal(result.success, true, 'A6_M03 cannons silenced'); assert.equal(result.stars, 3); assert.equal(s.objectiveSystem.generations, 160);
    assert.deepEqual([...s.objectiveSystem.log.filter(e => e.type === 'cleared').map(e => e.zoneId)].sort(), ['gunEast', 'gunWest'], 'silenced cannons are announced');
    ({ result } = await play('A6_M03', [[['eater', 21, 35, 0], ['eater', 21, 54, 1]]]));
    assert.equal(result.success, false); assert.match(result.details.at(-1), /0 \/ 2 Kanonen gleichzeitig verstummt/, 'hedges alone do not silence the cannons');
    const clear = create(missions.find(m => m.id === 'A6_M03')).objectiveSystem;
    assert.equal(clear.terms().unit, 'Kanonen'); assert.equal(clear.countdown().label, 'Kanal schützen noch');

    // A6_M04: frozen gliders count four cells each, a struck seed capsule can give exactly twelve at once.
    ({ result, s } = await play('A6_M04', [[['glider', 19, 12, 3]]]));
    assert.equal(result.success, true, 'one glider into the upper capsule'); assert.equal(result.stars, 3); assert.equal(s.objectiveSystem.measured, 12);
    ({ result, s } = await play('A6_M04', [[['glider', 8, 3, 0], ['glider', 9, 12, 3], ['glider', 18, 12, 3]]]));
    assert.equal(result.success, true, 'three separate lanes freeze into three blocks'); assert.equal(result.stars, 2);
    ({ result, s } = await play('A6_M04', [[['glider', 3, 6, 0], ['glider', 8, 3, 0]]]));
    assert.equal(result.success, true, 'capsule conversion plus one block'); assert.equal(s.objectiveSystem.spent, 10);
    ({ result } = await play('A6_M04', [[['glider', 8, 3, 0], ['glider', 9, 12, 3]]]));
    assert.equal(result.reason, 'Die Kalibrierung wurde verfehlt.'); assert.match(result.details.at(-1), /Gemessen: 8 statt 12/);
    assert.equal(missions.find(m => m.id === 'A6_M04').forecast.horizon, 120, 'the forecast reaches the measurement');

    // A6_M05: three clean shots root the beds, the capsule pays out, two blocks stop both announced waves.
    const finale = [[['glider', 15, 20, 3], ['lwss', 21, 18, 2], ['lwss', 28, 18, 2], ['glider', 10, 16, 3]], [['block', 11, 30, 0]], [['block', 35, 38, 0]]];
    ({ result, s } = await play('A6_M05', finale));
    assert.equal(result.success, true, 'A6_M05 garden grows'); assert.equal(result.stars, 3); assert.equal(s.objectiveSystem.generations, 160);
    assert.ok(s.objectiveSystem.log.some(e => e.type === 'captured' && e.zoneId === 'bedEast'), 'the wild seed in the east bed becomes ours');
    assert.match(s.objectiveSystem.progressText, /Beete/);
    ({ result } = await play('A6_M05', finale.slice(0, 1)));
    assert.equal(result.success, false); assert.match(result.details[0], /TRINKWASSER|KINDERHAUS/, 'unanswered waves breach the garden');

    // Expert protocols keep the verified material, so the known solutions stay affordable.
    for (const m of act6) assert.ok(expertMission(m).budget >= Math.min(m.budget, { A6_M01: 24, A6_M02: 19, A6_M03: 24, A6_M04: 15, A6_M05: 28 }[m.id]), `${m.id}: expert budget covers the verified plan`);
    ({ result } = await play('A6_M04', [[['glider', 19, 12, 3]]], expertMission(missions.find(m => m.id === 'A6_M04'))));
    assert.equal(result.success, true, 'A6_M04 expert protocol solvable');

    // Codes and passwords reach thirty sectors; older codes stay valid.
    assert.equal(CampaignState.passwords.length, missions.length);
    const code = CampaignState.encodeExpedition(Array(30).fill(3));
    assert.match(code, /^FRUEHLING-/);
    assert.deepEqual([...CampaignState.decodeExpedition(code)], Array(30).fill(3));
    assert.match(CampaignState.encodeExpedition(Array(25).fill(3)), /^ERBE-/, 'a finished Act V keeps its familiar code');
    const progress = new CampaignState();
    assert.equal(progress.importCode('PALISADE-FRUEHLING'), true);
    assert.equal(progress.available(29), true, 'the finale password opens sector 30');
    assert.deepEqual([...progress.genomes.filter(k => ['beacon', 'eater'].includes(k))], ['beacon', 'eater'], 'passwords grant the Act VI genomes');
    console.log('PASS: Act VI beacon, escort, cannons, calibration and garden finale solved; codes and genomes extended');
})().catch(e => { console.error(e); process.exitCode = 1; });
