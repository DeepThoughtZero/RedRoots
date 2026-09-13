const {readFileSync} = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const store = new Map();
const context = vm.createContext({ console, setTimeout, requestAnimationFrame: () => 1, cancelAnimationFrame: () => {}, localStorage: { getItem: k => store.get(k) || null, setItem: (k,v) => store.set(k,v) } });
for (const file of ['js/utils/Constants.js','js/core/Grid.js','js/core/Territory.js','js/campaign/Missions.js','js/campaign/Story.js','js/campaign/Act2.js','js/campaign/Act3.js','js/campaign/ObjectiveSystem.js','js/campaign/CampaignManager.js','js/core/GameState.js']) vm.runInContext(readFileSync(file,'utf8'),context);
const api = vm.runInContext('({GameState, MissionManager, CAMPAIGN_MISSIONS, CONSTANTS, CampaignState})', context);
const {GameState, MissionManager, CAMPAIGN_MISSIONS: missions, CONSTANTS: C, CampaignState} = api;
function create(i) { const s = new GameState(MissionManager.config(missions[i])); s.simSpeedMs=0; s.start(); return s; }
function place(s,key,r,c) { assert.ok(s.scenario.patterns.includes(key), `${key} is available in ${s.scenario.id}`); assert.equal(s.placePattern(C.PATTERNS[key].pattern,r,c),true,`${key} can be placed at ${r},${c}`); }
async function evolve(s) { s.currentPlayer=-1; s.phase=C.PHASE_SIMULATION; await s.runSimulation(); }
(async () => {
    let s=create(0); assert.equal(missions[0].patterns.join(','),'cell'); for (const [r,c] of [[10,10],[10,11],[11,10],[11,11]]) place(s,'cell',r,c); await evolve(s); assert.equal(s.objectiveSystem.result.stars,3); assert.equal(s.objectiveSystem.generations,12);
    s=create(0); place(s,'cell',10,10); for(let i=0;i<3;i++) await evolve(s); assert.equal(s.objectiveSystem.result.success,false,'extinct colony cannot win');
    s=create(1); place(s,'block',10,12); await evolve(s); assert.equal(s.objectiveSystem.result,null); place(s,'block',10,17); await evolve(s); assert.equal(s.objectiveSystem.result.stars,3,'expansion route works');
    s=create(2); place(s,'glider',6,8); await evolve(s); assert.equal(s.objectiveSystem.result?.stars,3,'glider passes canyon');
    s=create(3); place(s,'glider',10,14); await evolve(s); assert.equal(s.objectiveSystem.result?.stars,3,'player wins water race');
    s=create(3); for(let i=0;i<3 && !s.objectiveSystem.result;i++) await evolve(s); assert.equal(s.objectiveSystem.result?.reason,'Hellas hat das Wasser zuerst erreicht.','enemy actually reaches water');
    s=create(4); place(s,'glider',8,10); await evolve(s); assert.equal(s.objectiveSystem.result?.stars,3,'invasion route reaches enemy camp');
    s=create(2); place(s,'block',5,5); assert.equal(s.objectiveSystem.spent,4); s.eraseCell(5,5); assert.equal(s.objectiveSystem.spent,3); s.undoLastAction(); assert.equal(s.objectiveSystem.spent,4); s.undoLastAction(); assert.equal(s.objectiveSystem.spent,0);
    s=create(4); s.grid.setCell(4,4,2); await evolve(s); // Explicit occupation tested independently, before Conway may kill a lone invader.
    s=create(4); s.grid.setCell(4,4,2); assert.equal(s.objectiveSystem.evaluate(s,'generation'),true); assert.equal(s.objectiveSystem.result.success,false);
    let progress=new CampaignState(); assert.equal(progress.genomes.join(','),'cell'); assert.equal(progress.available(1),false); progress.record(missions[0].id,3); progress.record(missions[0].id,1); progress=new CampaignState(); assert.equal(progress.completed.A1_M01.stars,3); assert.equal(progress.available(1),true); assert.ok(progress.genomes.includes('block')); assert.equal(progress.genomes.includes('blinker'),false); progress.record(missions[1].id,1); assert.equal(progress.genomes.includes('blinker'),false); assert.ok(progress.genomes.includes('glider')); progress.record(missions[2].id,1); assert.ok(progress.genomes.includes('blinker'));
    store.set(progress.key,'{broken'); assert.deepEqual(Object.keys(new CampaignState().completed),[]);
    store.set(progress.key,JSON.stringify({campaignVersion:1,completedMissions:{A1_M01:{stars:99}}})); assert.equal(new CampaignState().available(1),false);
    // Transfer between independent browser saves, without losing better local ratings.
    store.clear(); progress = new CampaignState(); progress.record(missions[0].id,3); progress.record(missions[1].id,2);
    const exported = progress.exportCode(); store.clear();
    const other = new CampaignState(); assert.equal(other.importCode(exported.toLowerCase()),true);
    assert.equal(other.completed.A1_M01.stars,3); assert.equal(other.completed.A1_M02.stars,2);
    assert.equal(new CampaignState().exportCode(),exported);
    const unchanged = other.exportCode();
    for (const bad of ['RR2-32000-AA', 'RR1-42000-AA', exported.slice(0,-2)+'ZZ', '<script>', 'PALISADE-NOPE']) {
        assert.equal(other.importCode(bad),false); assert.equal(other.exportCode(),unchanged);
    }
    assert.equal(other.importCode(' PALISADE-GRENZE '),true); assert.equal(other.available(4),true);
    assert.equal(other.completed.A1_M01.stars,3); assert.equal(other.completed.A1_M02.stars,2); assert.equal(other.completed.A1_M04.stars,1);
    store.set('redroots_config','keep'); assert.equal(other.reset(),true); assert.equal(other.available(1),false);
    assert.equal(new CampaignState().available(1),false); assert.equal(store.get('redroots_config'),'keep');
    assert.equal(other.importCode(exported),true);
    const originalSet = context.localStorage.setItem;
    context.localStorage.setItem = () => { throw new Error('blocked'); };
    assert.equal(other.reset(),false); assert.equal(other.completed.A1_M01.stars,3);
    context.localStorage.setItem = originalSet;
    for (let i=0;i<5;i++) { other.reset(); assert.equal(other.importCode(CampaignState.passwords[i]),true); assert.equal(other.available(i),true); if(i<4) assert.equal(other.available(i+1),false); }
    const classic=new GameState({rows:30,cols:48,rounds:1,steps:3,playerCount:2,radius:5,rocks:0}); assert.equal(classic.objectiveSystem,undefined); classic.grid.setCell(29,10,1); assert.equal(classic.checkWinCondition(),true); assert.equal(classic.winner,0);
    console.log('PASS: five mission solutions, extinction, race defeat, camp defeat, material undo, persistence validation, skirmish compatibility');
})().catch(e=>{console.error(e);process.exitCode=1});
