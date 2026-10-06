// Phase 2 aids: pause, single step, turbo, slow motion, round checkpoints, forecast and race clock.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const delays=[];
const ctx=vm.createContext({console:{log(){},warn:console.warn},setTimeout:(fn,ms)=>{delays.push(ms);queueMicrotask(fn);return 1},requestAnimationFrame:()=>1,cancelAnimationFrame(){},localStorage:{getItem(){},setItem(){}}});
for(const f of ['utils/Constants','core/Grid','core/Territory','core/AI','campaign/Missions','campaign/Story','campaign/Act2','campaign/Act3','campaign/Act4','campaign/Act5','campaign/Assistance','campaign/ObjectiveSystem','core/GameState'])vm.runInContext(fs.readFileSync('js/'+f+'.js','utf8'),ctx);
const {GameState,MissionManager,missions,C,AI}=vm.runInContext('({GameState,MissionManager,missions:CAMPAIGN_MISSIONS,C:CONSTANTS,AI})',ctx);
const create=id=>{const s=new GameState(MissionManager.config(missions.find(m=>m.id===id)));s.simSpeedMs=0;s.start();return s;};
function place(s,k,r,c){s.currentPlayer=0;assert.equal(s.placePattern(C.PATTERNS[k].pattern,r,c),true,`${k} ${r},${c}`);}
const settle=async(n=200)=>{for(let i=0;i<n;i++)await Promise.resolve();};
async function evolve(s){s.currentPlayer=0;s.nextPlayerTurn();s.currentPlayer=-1;s.phase=C.PHASE_SIMULATION;await s.runSimulation();}
async function battle(s){s.currentPlayer=0;s.nextPlayerTurn();s.currentPlayer=1;await new AI(s).takeTurn();s.currentPlayer=-1;s.phase=C.PHASE_SIMULATION;await s.runSimulation();}
(async()=>{
// Pause holds the evolution, a single step advances exactly one generation, resume finishes the round.
let s=create('A2_M03');place(s,'block',10,19);place(s,'block',18,26);s.paused=true;s.currentPlayer=-1;s.phase=C.PHASE_SIMULATION;
const run=s.runSimulation();await settle();assert.equal(s.objectiveSystem.generations,0,'paused before the first generation');
assert.equal(s.stepOnce(),true);await settle();assert.equal(s.objectiveSystem.generations,1,'one step = one generation');
s.stepOnce();await settle();assert.equal(s.objectiveSystem.generations,2);
s.setPaused(false);await run;assert.equal(s.objectiveSystem.result.success,true,'resumed run completes the mission');assert.equal(s.objectiveSystem.generations,96);
assert.equal(s.stepOnce(),false,'no stepping outside a paused evolution');
// Turbo skips waiting but still evaluates every generation.
s=create('A2_M03');place(s,'block',10,19);place(s,'block',18,26);s.simSpeedMs=100;s.turbo=true;delays.length=0;await evolve(s);
assert.equal(s.objectiveSystem.generations,96);assert.ok(delays.every(d=>d===0),'turbo never waits');
// Slow motion stretches twelve generations after a decisive moment; pause-on-alarm stops instead.
s=create('A2_M03');s.slowMotion=true;delays.length=0;await evolve(s);assert.equal(s.objectiveSystem.result.success,false);
assert.ok(delays.filter(d=>d===150).length>=1&&delays.filter(d=>d===150).length<=24,'slow motion around the breach');
s=create('A2_M03');s.pauseOnAlarm=true;s.currentPlayer=-1;s.phase=C.PHASE_SIMULATION;const halted=s.runSimulation();await settle(3000);
assert.equal(s.paused,true,'alarm pauses the evolution');assert.equal(s.objectiveSystem.result,null);assert.equal(s.objectiveSystem.worstThreat().level,'alarm');
s.pauseOnAlarm=false;s.setPaused(false);await halted;assert.equal(s.objectiveSystem.result.success,false);
// Round checkpoints restore board, budget, objective state and replay the round plan for re-planning.
s=create('A3_M03');place(s,'block',10,19);place(s,'block',18,26);await evolve(s);await evolve(s);
assert.equal(s.objectiveSystem.result.success,false);assert.deepEqual(Object.keys(s.checkpoints),['1','2']);
assert.equal(s.restoreCheckpoint(1),true);assert.equal(s.phase,C.PHASE_PLACEMENT);assert.equal(s.currentRound,1);assert.equal(s.objectiveSystem.result,null);
assert.equal(s.objectiveSystem.generations,0);assert.equal(s.objectiveSystem.spent,8,'replayed plan counts as material');assert.equal(s.budgets[0],8);assert.equal(s.undoStack.length,2,'replayed placements can be undone');
assert.deepEqual(Object.keys(s.checkpoints),['1'],'later checkpoints are discarded');
place(s,'block',26,43);await evolve(s);await evolve(s);assert.equal(s.objectiveSystem.result.stars,3,'re-planned round wins with full stars');
assert.equal(create('A3_M03').restoreCheckpoint(1),false,'no rewind while the mission is running');
// Seeded enemies make a rewound round identical when the plan is unchanged.
s=create('A1_M05');place(s,'block',6,10);await battle(s);const first=Array.from(s.grid.owners);const firstResult=s.objectiveSystem.result;
s.phase=C.PHASE_GAMEOVER;s.restoreCheckpoint(1);await battle(s);assert.deepEqual(Array.from(s.grid.owners),first,'same plan, same seed, same outcome');
assert.equal(s.objectiveSystem.result?.success??null,firstResult?.success??null);
for(const id of ['A1_M05','A2_M04','A3_M04'])assert.ok(Number.isInteger(missions.find(m=>m.id===id).aiSeed),`${id} uses a reproducible enemy`);
// Forecast: consumes a charge, reports reached targets, never changes the real state.
s=create('A3_M01');place(s,'glider',4,4);const before=Array.from(s.grid.owners),version=s.boardVersion;
const f=s.forecast();assert.equal(s.forecastCharges,1);assert.deepEqual(Array.from(s.grid.owners),before);assert.equal(s.objectiveSystem.generations,0);
assert.equal(f.version,version);assert.ok(f.hits.some(h=>h.zoneId==='one'&&h.kind==='reach'&&h.generation<=32),'forecast sees switch 1');
assert.ok(f.trail.some(Boolean));s.forecast();assert.equal(s.forecast(),null,'charges are limited');
place(s,'block',8,20);assert.notEqual(s.boardVersion,f.version,'a placement invalidates the forecast');
assert.equal(create('A1_M01').forecast(),null,'discovery missions have no forecast');
// Race clock predicts when Hellas reaches the water without intervention.
s=create('A1_M04');const arrival=s.objectiveSystem.raceArrival;assert.ok(arrival>0);
assert.deepEqual({...s.objectiveSystem.countdown()},{label:'Hellas am Ziel in ca.',remaining:arrival});
while(!s.objectiveSystem.result)await evolve(s);assert.equal(s.objectiveSystem.result.success,false);assert.equal(s.objectiveSystem.result.failure.generation,arrival,'clock matches the actual arrival');
console.log('PASS: pause, single step, turbo, slow motion, pause on alarm, round checkpoints with replay, seeded rewinds, forecast and race clock');
})().catch(e=>{console.error(e);process.exitCode=1});
