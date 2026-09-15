const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const storage=new Map(),ctx=vm.createContext({console,setTimeout,requestAnimationFrame:()=>1,cancelAnimationFrame:()=>{},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)}});
for(const f of ['utils/Constants','core/Grid','core/Territory','core/AI','campaign/Missions','campaign/Story','campaign/Act2','campaign/Act3','campaign/Act4','campaign/Act5','campaign/ObjectiveSystem','campaign/CampaignManager','core/GameState'])vm.runInContext(fs.readFileSync('js/'+f+'.js','utf8'),ctx);
const {GameState,MissionManager,missions,C,CampaignState,AI}=vm.runInContext('({GameState,MissionManager,missions:CAMPAIGN_MISSIONS,C:CONSTANTS,CampaignState,AI})',ctx);
function create(i){const s=new GameState(MissionManager.config(missions[i]));s.simSpeedMs=0;s.start();return s;}
function place(s,k,r,c){assert.ok(s.scenario.patterns.includes(k));assert.equal(s.placePattern(C.PATTERNS[k].pattern,r,c),true,`${s.scenario.id}: ${k} ${r},${c}`);}
async function evolve(s){s.currentPlayer=-1;s.phase=C.PHASE_SIMULATION;await s.runSimulation();}
(async()=>{
let s=create(10);place(s,'glider',4,4);place(s,'glider',4,16);place(s,'glider',4,28);await evolve(s);await evolve(s);assert.equal(s.objectiveSystem.result?.success,true,'three ordered gates');
s=create(11);place(s,'diehard',17,24);await evolve(s);assert.equal(s.objectiveSystem.result?.stars,3,'intentional extinction');
s=create(12);place(s,'block',10,19);place(s,'block',26,43);place(s,'block',18,26);await evolve(s);await evolve(s);assert.equal(s.objectiveSystem.result?.stars,3,'dual interception');
s=create(13);place(s,'glider',4,22);place(s,'glider',8,13);place(s,'glider',10,24);s.currentPlayer=1;vm.runInContext('Math.random=(()=>{let x=343;return()=>((x=(1664525*x+1013904223)>>>0)/4294967296)})()',ctx);await new AI(s).takeTurn();await evolve(s);if(!s.objectiveSystem.result)await evolve(s);assert.equal(s.objectiveSystem.result?.stars,3,'quarantined archives with hard AI');
s=create(14);place(s,'glider',4,4);place(s,'glider',4,20);place(s,'glider',4,36);await evolve(s);await evolve(s);assert.equal(s.objectiveSystem.result?.stars,3,'three synchronized relays');
// Incorrect order and forbidden growth lose immediately, even on an otherwise winning tick.
s=create(10);let z=s.scenario.map.zones[1];s.grid.setCell(z.rMin,z.cMin,1);s.objectiveSystem.evaluate(s,'generation');assert.equal(s.objectiveSystem.result.success,false);
for(const owner of [1,2,-1]){s=create(14);z=s.scenario.map.zones[3];s.grid.setCell(z.rMin,z.cMin,owner);s.objectiveSystem.evaluate(s,'generation');assert.equal(s.objectiveSystem.result.success,false);}
s=create(11);place(s,'block',17,24);await evolve(s);assert.equal(s.objectiveSystem.result.success,false,'permanent life fails sterile chamber');
s=create(11);place(s,'cell',17,24);await evolve(s);assert.equal(s.objectiveSystem.result.success,false,'dying before generation 100 fails');
s=create(12);place(s,'block',10,19);place(s,'block',18,26);await evolve(s);await evolve(s);assert.equal(s.objectiveSystem.result.success,false,'unprotected second front loses');
s=create(14);for(const z of s.scenario.map.zones.slice(0,3))s.grid.setCell(z.rMin,z.cMin,1);for(let i=0;i<15;i++)s.objectiveSystem.evaluate(s,'generation');assert.equal(s.objectiveSystem.result,null);s.grid.setCell(23,39,0);s.objectiveSystem.evaluate(s,'generation');assert.equal(s.objectiveSystem.hold,0);
const tenStars=CampaignState.encodeExpedition(Array(10).fill(3));let p=new CampaignState();assert.equal(p.importCode(tenStars),true);assert.equal(p.available(10),true);assert.equal(p.available(11),false);p.record('A3_M01',2);const code=p.exportCode();assert.match(code,/^SCHLUESSEL-[\d-]+/);storage.clear();p=new CampaignState();assert.equal(p.importCode(code),true);assert.equal(p.completed.A3_M01.stars,2);assert.equal(p.completed.A2_M05.stars,3);assert.equal(p.importCode(CampaignState.encodeExpedition(Array(5).fill(3))),true);assert.equal(p.completed.A3_M01.stars,2);
for(let i=10;i<15;i++){p.reset();assert.equal(p.importCode(CampaignState.passwords[i]),true);assert.equal(p.available(i),true);if(i<14)assert.equal(p.available(i+1),false);}
console.log('PASS: five Act III solutions, extinction/order/quarantine failures, dual-front defeat, continuous holding, progressive code transfer and checkpoints');
})().catch(e=>{console.error(e);process.exitCode=1});
