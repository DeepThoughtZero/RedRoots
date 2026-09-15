const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const storage=new Map();const ctx=vm.createContext({console,setTimeout,requestAnimationFrame:()=>1,cancelAnimationFrame:()=>{},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)}});
for(const file of ['js/utils/Constants.js','js/core/AI.js','js/core/Grid.js','js/core/Territory.js','js/campaign/Missions.js','js/campaign/Story.js','js/campaign/Act2.js','js/campaign/Act3.js','js/campaign/Act4.js','js/campaign/Act5.js','js/campaign/ObjectiveSystem.js','js/campaign/CampaignManager.js','js/core/GameState.js'])vm.runInContext(fs.readFileSync(file,'utf8'),ctx);
const {GameState,MissionManager,CAMPAIGN_MISSIONS:missions,CONSTANTS:C,CampaignState,AI}=vm.runInContext('({GameState,MissionManager,CAMPAIGN_MISSIONS,CONSTANTS,CampaignState,AI})',ctx);
function create(i){const s=new GameState(MissionManager.config(missions[i]));s.simSpeedMs=0;s.start();return s;}
function place(s,key,r,c){assert.ok(s.scenario.patterns.includes(key), `${key} is available in ${s.scenario.id}`); assert.equal(s.placePattern(C.PATTERNS[key].pattern,r,c),true,`mission ${s.scenario.id}: ${key} at ${r},${c}`);}
async function evolve(s){s.phase=C.PHASE_SIMULATION;s.currentPlayer=-1;await s.runSimulation();}
(async()=>{
let s=create(5);place(s,'block',10,13);place(s,'block',13,10);await evolve(s);place(s,'block',10,16);place(s,'block',16,10);await evolve(s);place(s,'block',10,19);place(s,'block',19,10);await evolve(s);assert.equal(s.objectiveSystem.result?.stars,3,'two supply chains');
s=create(6);place(s,'glider',6,8);place(s,'glider',8,3);await evolve(s);assert.equal(s.objectiveSystem.result?.stars,3,'two simultaneous gates');
// This pair intercepts the neutral glider while preserving a separate colony.
s=create(7);place(s,'block',10,19);place(s,'block',18,26);await evolve(s);assert.equal(s.objectiveSystem.result?.stars,3);
s=create(7);place(s,'block',18,26);await evolve(s);assert.equal(s.objectiveSystem.result?.success,false,'ignoring neutral threat loses');
s=create(8);place(s,'glider',4,22);place(s,'glider',8,13);place(s,'glider',10,24);await evolve(s);assert.equal(s.objectiveSystem.result?.stars,3,'three archives can be collected');
s=create(9);place(s,'glider',4,6);place(s,'glider',4,24);await evolve(s);assert.equal(s.objectiveSystem.result,null);await evolve(s);assert.equal(s.objectiveSystem.result?.stars,3,'finale holds both pumps');
// Real opponent placement is included in the archive route, with reproducible randomness.
vm.runInContext('Math.random = (() => { let x=12345; return () => ((x=(1664525*x+1013904223)>>>0)/4294967296); })()',ctx);
s=create(8);place(s,'glider',4,22);place(s,'glider',8,13);place(s,'glider',10,24);s.currentPlayer=1;await new AI(s).takeTurn();await evolve(s);assert.equal(s.objectiveSystem.result?.success,true,'archive route with actual medium AI');
// Simultaneous holding is consecutive; losing one pump resets the counter.
s=create(9);let obj=s.objectiveSystem;const zones=s.scenario.map.zones;
s.grid.setCell(zones[0].rMin,zones[0].cMin,1);s.grid.setCell(zones[1].rMin,zones[1].cMin,1);
for(let i=0;i<6;i++)obj.evaluate(s,'generation');assert.equal(obj.hold,6);s.grid.setCell(zones[1].rMin,zones[1].cMin,0);obj.evaluate(s,'generation');assert.equal(obj.hold,0);
s=create(8);obj=s.objectiveSystem;for(const z of s.scenario.map.zones){s.grid.owners.fill(0);s.grid.setCell(z.rMin,z.cMin,1);obj.evaluate(s,'generation');}assert.equal(obj.collected.size,3);assert.equal(obj.result.success,true,'archives persist after cells leave');
// Act-I saves and legacy codes remain valid; new codes carry all ten ratings.
storage.set('redroots_campaign_v1',JSON.stringify({campaignVersion:1,completedMissions:Object.fromEntries(missions.slice(0,5).map(m=>[m.id,{stars:3}]))}));let p=new CampaignState();assert.equal(p.available(5),true);assert.equal(p.available(6),false);p.record(missions[5].id,2);const code=p.exportCode();assert.match(code,/^WASSERSTROM-[\d-]+/);storage.clear();p=new CampaignState();assert.equal(p.importCode(code),true);assert.equal(p.completed.A2_M01.stars,2);assert.equal(p.importCode(CampaignState.encodeExpedition([3,3,3,3,3])),true);assert.equal(p.completed.A2_M01.stars,2);
// Rewards accumulate slowly; replay loadouts stay fixed even with a complete old save.
let unlocked=new Set(['cell']);
for(const m of missions){for(const key of m.patterns)assert.ok(unlocked.has(key),`${m.id}: ${key} must be earned first`);if(m.reward)unlocked.add(m.reward);}
assert.ok(missions.slice(0,6).every(m=>m.patterns.every(k=>['cell','block','blinker','glider'].includes(k))));
assert.ok(missions.slice(0,9).every(m=>!m.patterns.includes('acorn')));
assert.ok(missions.slice(0,10).every(m=>!m.patterns.includes('b_heptomino')));
storage.set('redroots_campaign_v1',JSON.stringify({campaignVersion:1,completedMissions:Object.fromEntries(missions.slice(0,5).map(m=>[m.id,{stars:3}])),unlockedPatterns:['cell','acorn','rabbits']}));
p=new CampaignState();assert.equal(p.genomes.includes('acorn'),false);assert.equal(p.genomes.includes(null),false);assert.equal(p.completed.A1_M05.stars,3);
console.log('PASS: slower genome progression, fixed replay loadouts, old-save stars preserved');
console.log('PASS: Act II solutions, neutral-flora defeat and progressive expedition code transfer');
})().catch(e=>{console.error(e);process.exitCode=1});
