// Mission feedback layer: threat distances, event queue, zone status, failure analysis and margin bonuses.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const ctx=vm.createContext({console:{log(){},warn:console.warn},setTimeout:fn=>{queueMicrotask(fn);return 1},requestAnimationFrame:()=>1,cancelAnimationFrame(){},localStorage:{getItem(){},setItem(){}}});
for(const f of ['utils/Constants','core/Grid','core/Territory','core/AI','campaign/Missions','campaign/Story','campaign/Act2','campaign/Act3','campaign/Act4','campaign/Act5','campaign/ObjectiveSystem','core/GameState'])vm.runInContext(fs.readFileSync('js/'+f+'.js','utf8'),ctx);
const {GameState,MissionManager,missions,C}=vm.runInContext('({GameState,MissionManager,missions:CAMPAIGN_MISSIONS,C:CONSTANTS})',ctx);
const index=id=>missions.findIndex(m=>m.id===id);
function create(id){const s=new GameState(MissionManager.config(missions[index(id)]));s.simSpeedMs=0;s.start();return s;}
function place(s,k,r,c){s.currentPlayer=0;assert.equal(s.placePattern(C.PATTERNS[k].pattern,r,c),true,`${k} ${r},${c}`);}
async function evolve(s){s.currentPlayer=-1;s.phase=C.PHASE_SIMULATION;await s.runSimulation();}
(async()=>{
// Threat levels follow the Chebyshev distance to protected zones and are announced once per escalation.
let s=create('A2_M03'),o=s.objectiveSystem;const landing=o.zone('landing');s.grid.resetGrid();s.grid.setCell(0,0,1);
s.grid.setCell(landing.rMin-6,landing.cMin,C.OWNER_NEUTRAL);o.evaluate(s,'generation');
assert.equal(o.threats.get('landing').level,'warning');assert.equal(o.threats.get('landing').distance,6);
s.grid.setCell(landing.rMin-6,landing.cMin,0);s.grid.setCell(landing.rMin-2,landing.cMax+1,C.OWNER_NEUTRAL);o.evaluate(s,'generation');
assert.equal(o.threats.get('landing').level,'alarm');assert.equal(o.worstThreat().distance,2);
assert.deepEqual(Array.from(o.events,e=>e.level),['warning','alarm'],'each escalation is announced');
o.evaluate(s,'generation');assert.equal(o.events.length,2,'a persisting threat is not repeated');
assert.equal(o.zoneStatus('landing').state,'protect');assert.equal(o.zoneStatus('landing').threat,'alarm');
// Own flora counts for sterile zones, but not for protected ones.
s=create('A3_M04');o=s.objectiveSystem;const seal=o.zone('seal');s.grid.setCell(seal.rMin-1,seal.cMin+3,1);o.evaluate(s,'generation');
assert.equal(o.threats.get('seal').level,'alarm');assert.equal(o.threats.get('seal').kind,'sterile');
// Locked switches warn about own flora and disappear from the watch list once they are next.
s=create('A3_M01');o=s.objectiveSystem;assert.equal(o.zoneStatus('one').state,'next');assert.equal(o.zoneStatus('two').state,'locked');
const one=o.zone('one');s.grid.setCell(one.rMin,one.cMin,1);o.evaluate(s,'generation');
assert.equal(o.zoneStatus('one').state,'done');assert.equal(o.zoneStatus('two').state,'next');assert.equal(o.threats.has('two'),false);
assert.equal(o.events.find(e=>e.type==='switch').zoneId,'one');
// Failure analysis names zone, generation, cells and a near-miss value.
s=create('A3_M03');place(s,'block',10,19);place(s,'block',18,26);await evolve(s);await evolve(s);
let r=s.objectiveSystem.result;assert.equal(r.success,false);assert.equal(r.failure.zoneId,'east');assert.ok(r.failure.cells.length>0);
assert.match(r.details[0],/^Generation \d+: Wildwuchs erreichte RETTUNG OST\.$/);assert.match(r.details[1],/^Durchgehalten bis Generation \d+ von 96\.$/);
s=create('A1_M01');place(s,'cell',8,8);await evolve(s);while(!s.objectiveSystem.result)await evolve(s);
r=s.objectiveSystem.result;assert.equal(r.failure.cells.length,0);assert.match(r.details.at(-1),/^Längste Überlebensdauer: 0 \/ 12 Generationen\.$/);
// Margin bonuses: the reference solutions earn them; a late interception loses only the bonus.
s=create('A2_M03');place(s,'block',10,19);place(s,'block',18,26);await evolve(s);assert.equal(s.objectiveSystem.result.stars,3,'evacuation with clean margin');
s=create('A3_M03');place(s,'block',10,19);place(s,'block',26,43);place(s,'block',18,26);await evolve(s);await evolve(s);assert.equal(s.objectiveSystem.result.stars,3,'dual interception with clean margin');
s=create('A3_M01');place(s,'glider',4,4);place(s,'glider',4,16);place(s,'glider',4,28);await evolve(s);await evolve(s);assert.equal(s.objectiveSystem.result.stars,3,'switch order with distance to waiting switches');
s=create('A2_M03');o=s.objectiveSystem;o.closestBy.set('landing',4);o.generations=95;s.grid.setCell(0,0,1);s.grid.setCell(1,0,1);s.grid.setCell(0,1,1);s.grid.setCell(1,1,1);o.evaluate(s,'generation');
assert.equal(o.result.success,true);assert.deepEqual([...o.result.bonuses],[false,true],'near miss forfeits only the margin star');
// Capture progress and countdowns are exposed for the board and the HUD.
s=create('A4_M01');o=s.objectiveSystem;const fort=o.zone('fort');for(let i=0;i<4;i++)s.grid.setCell(fort.rMin,fort.cMin+i,1);
for(let i=0;i<4;i++)o.evaluate(s,'generation');assert.equal(o.zoneStatus('fort').progress,.5);assert.equal(o.zoneStatus('fort').progressLabel,'4/8');
assert.deepEqual({...o.countdown()},{label:'Rückweg schützen noch',remaining:108});
for(let i=0;i<4;i++)o.evaluate(s,'generation');assert.equal(o.zoneStatus('fort').state,'done');assert.ok(o.events.some(e=>e.type==='captured'));assert.ok(o.events.some(e=>e.type==='houseDefeated'&&e.house===3));
// Enemy placements of the round are remembered for the reconnaissance overlay; undo keeps them in sync.
s=create('A1_M05');place(s,'block',8,8);assert.equal(s.roundPlacements[0].length,1);s.undoLastAction();assert.equal(s.roundPlacements[0].length,0);
s.currentPlayer=1;s.budgets[1]=8;await new (vm.runInContext('AI',ctx))(s).takeTurn();assert.ok(s.roundPlacements[1].length>0,'AI placements are recorded');
// Direction arrows only for spaceships, matching the hints of the scenario.
assert.deepEqual({...MissionManager.seedMotion({pattern:'glider',r:1,c:34,mirror:true})},{dr:1,dc:-1,period:4});
assert.equal(MissionManager.seedMotion({pattern:'r_pentomino',r:12,c:41}),null);
console.log('PASS: threat levels, sterile and switch warnings, zone status, failure analysis, margin bonuses, capture progress, reconnaissance and seed motion');
})().catch(e=>{console.error(e);process.exitCode=1});
