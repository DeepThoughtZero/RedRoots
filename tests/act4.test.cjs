const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const storage=new Map(),ctx=vm.createContext({console:{log(){},warn:console.warn},setTimeout:fn=>{queueMicrotask(fn);return 1},requestAnimationFrame:()=>1,cancelAnimationFrame(){},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)}});
for(const f of ['utils/Constants','core/Grid','core/Territory','core/AI','campaign/Missions','campaign/Story','campaign/Act2','campaign/Act3','campaign/Act4','campaign/Act5','campaign/ObjectiveSystem','campaign/CampaignManager','core/GameState'])vm.runInContext(fs.readFileSync('js/'+f+'.js','utf8'),ctx);
const {GameState,MissionManager,missions,C,CampaignState,AI}=vm.runInContext('({GameState,MissionManager,missions:CAMPAIGN_MISSIONS,C:CONSTANTS,CampaignState,AI})',ctx);
function create(i,seed=12345){vm.runInContext(`Math.random=(()=>{let x=${seed};return()=>((x=(1664525*x+1013904223)>>>0)/4294967296)})()`,ctx);const s=new GameState(MissionManager.config(missions[i]));s.simSpeedMs=0;s.start();s.nextPlayerTurn=()=>{};return s;}
function place(s,k,r,c){assert.ok(s.scenario.patterns.includes(k));s.currentPlayer=0;assert.equal(s.placePattern(C.PATTERNS[k].pattern,r,c),true,`${s.scenario.id}: ${k} ${r},${c}`);}
async function battle(s){for(const e of s.scenario.enemies){if(s.defeatedPlayers.has(e.house))continue;s.currentPlayer=e.house;await new AI(s).takeTurn();}s.currentPlayer=-1;s.phase=C.PHASE_SIMULATION;await s.runSimulation();}
async function finish(s){while(!s.objectiveSystem.result)await battle(s);return s.objectiveSystem.result;}
function rotated(s,k,rotation,r,c){assert.ok(s.scenario.patterns.includes(k));s.currentPlayer=0;let p=C.PATTERNS[k].pattern;for(let i=0;i<rotation;i++)p=p.map(([r,c])=>[c,-r]);assert.ok(s.placePattern(p,r,c));}
storage.clear();
const transferred=new CampaignState();
for(const n of [5, 10, 15, 20]){ const code = CampaignState.encodeExpedition(Array(n).fill(3)); assert.equal(transferred.importCode(code), true); }
assert.match(transferred.exportCode(),/^STURMAUGE-[\d-]+/);const saved=transferred.exportCode();assert.equal(transferred.importCode('INVALID-CODE'),false);assert.equal(transferred.exportCode(),saved);storage.clear();
// Objective rules in isolation: do not let Conway motion mask ownership errors.
function fillZone(s,z,owner,count=4){let n=0;for(let r=z.rMin;r<=z.rMax;r++)for(let c=z.cMin;c<=z.cMax;c++)s.grid.setCell(r,c,n++<count?owner:0);}
let fixture=create(16), objective=fixture.objectiveSystem;
let west=fixture.scenario.map.zones[0],east=fixture.scenario.map.zones[1];
fillZone(fixture,west,1,2);objective.evaluate(fixture,'generation');assert.equal(objective.captureTicks.get(west.id),0,'two cells cannot capture');
fillZone(fixture,west,1);for(let i=0;i<7;i++)objective.evaluate(fixture,'generation');
objective.evaluate(fixture,'round');assert.equal(objective.captureTicks.get(west.id),7,'round event cannot advance hold');
fillZone(fixture,west,4);objective.evaluate(fixture,'generation');assert.equal(objective.captureTicks.get(west.id),0,'loss of majority resets hold');
fillZone(fixture,west,1);for(let i=0;i<8;i++)objective.evaluate(fixture,'generation');
assert.ok(objective.collected.has(west.id));assert.ok(!fixture.defeatedPlayers.has(3),'second camp keeps Tharsis active');
fillZone(fixture,west,0);fillZone(fixture,east,1);for(let i=0;i<8;i++)objective.evaluate(fixture,'generation');
assert.ok(objective.collected.has(west.id),'capture persists');assert.ok(fixture.defeatedPlayers.has(3));fixture.calculateBudgets();assert.equal(fixture.budgets[3],0);assert.equal(fixture.budgets[1],0,'inactive Hellas has no income');
for(const owner of [3,4]){const f=create(17),camp=f.territory.camps.find(c=>c.id===0);f.grid.setCell(camp.rMin,camp.cMin,owner);f.objectiveSystem.evaluate(f,'generation');assert.equal(f.objectiveSystem.result.success,false,'both houses can defeat player');}
for(const owner of [-1,3,4]){const f=create(19),o=f.objectiveSystem;o.generations=159;f.scenario.objective.zones.forEach(id=>o.collected.add(id));const z=f.scenario.map.zones.find(z=>z.id==='evac');f.grid.setCell(z.rMin,z.cMin,owner);f.grid.setCell(5,5,1);o.evaluate(f,'generation');assert.equal(o.result.success,false,'protected zone loss overrides simultaneous victory');}
const a=create(15,1),b=create(15,999);assert.deepEqual(Array.from({length:8},()=>new AI(a).random()),Array.from({length:8},()=>new AI(b).random()),'scenario enemy randomness is repeatable');
(async()=>{
let s=create(15);rotated(s,'lwss',3,14,24);place(s,'block',10,19);assert.equal((await finish(s)).stars,3,'raid and interception');
s=create(16);place(s,'glider',8,10);place(s,'glider',8,30);assert.equal((await finish(s)).stars,3,'two-camp siege');
s=create(17);place(s,'block',10,19);place(s,'block',26,43);place(s,'block',18,26);assert.equal((await finish(s)).stars,3,'defense against both active houses');
s=create(18);rotated(s,'acorn',3,15,26);place(s,'b_heptomino',10,32);await battle(s);place(s,'acorn',22,34);assert.equal((await finish(s)).stars,3,'offensive with civilian protection');
s=create(19);for(const c of [12,32,52])place(s,'glider',10,c);place(s,'block',10,23);await battle(s);for(const c of [24,44,64])rotated(s,'r_pentomino',2,24,c);assert.equal((await finish(s)).stars,3,'three-camp battle with second-round reinforcement');
s=create(17);assert.equal((await finish(s)).success,false,'doing nothing loses the defensive battle');
console.log('PASS: all five Act IV three-star solutions against actual hard AI');
})().catch(e=>{console.error(e);process.exitCode=1});
