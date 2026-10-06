// Phase 3: announced scenario events, supply caches, enemy doctrines and new Conway objective types.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const ctx=vm.createContext({console:{log(){},warn:console.warn},setTimeout:fn=>{queueMicrotask(fn);return 1},requestAnimationFrame:()=>1,cancelAnimationFrame(){},localStorage:{getItem(){},setItem(){}}});
for(const f of ['utils/Constants','core/Grid','core/Territory','core/AI','campaign/Missions','campaign/Story','campaign/Act2','campaign/Act3','campaign/Act4','campaign/Act5','campaign/Assistance','campaign/ObjectiveSystem','core/GameState'])vm.runInContext(fs.readFileSync('js/'+f+'.js','utf8'),ctx);
const {GameState,MissionManager,missions,C,AI}=vm.runInContext('({GameState,MissionManager,missions:CAMPAIGN_MISSIONS,C:CONSTANTS,AI})',ctx);
const start=m=>{const s=new GameState(MissionManager.config(m));s.simSpeedMs=0;s.start();return s;};
const create=id=>start(missions.find(m=>m.id===id));
function place(s,k,r,c,pattern=C.PATTERNS[k].pattern){s.currentPlayer=0;assert.equal(s.placePattern(pattern,r,c),true,`${k} ${r},${c}`);}
async function evolve(s){s.currentPlayer=-1;s.phase=C.PHASE_SIMULATION;await s.runSimulation();}
const settle=async(n=300)=>{for(let i=0;i<n;i++)await Promise.resolve();};
const count=(s,owner)=>s.grid.owners.filter(v=>v===owner).length;
const test=(objective,zones,extra={})=>({id:'T_'+objective.type,title:'Test',patterns:['cell','block','blinker','glider'],rounds:1,steps:60,budget:20,bonuses:[],objective,map:{rows:30,cols:40,territory:[[0,0,0,12,15]],rocks:[],zones,...extra}});
(async()=>{
// Round events are announced one round earlier, applied exactly once and survive a rewind without repeating.
let s=create('A4_M02'),o=s.objectiveSystem;const flood=s.scenario.events[0],acorn=MissionManager.seedCells(flood.action[0]);
assert.equal(s.upcomingEvents().length,0,'nothing is announced before its round');
s.currentRound=4;s.changePhase(C.PHASE_PLACEMENT);
assert.equal(s.upcomingEvents().length,1);assert.equal(s.upcomingEvents()[0].when,'Runde 5');assert.equal(s.upcomingEvents()[0].areas.length,2);
assert.ok(o.events.some(e=>e.type==='announce'));assert.ok(acorn.every(([r,c])=>s.grid.getOwner(r,c)===0),'announced flora is not there yet');
s.currentRound=5;s.changePhase(C.PHASE_PLACEMENT);
assert.ok(acorn.every(([r,c])=>s.grid.getOwner(r,c)===C.OWNER_NEUTRAL),'flood seeds arrive at the start of round 5');
assert.ok(o.events.some(e=>e.type==='scenario'&&e.eventId==='flood'));assert.equal(s.upcomingEvents().length,0);
const neutral=count(s,C.OWNER_NEUTRAL);s.changePhase(C.PHASE_PLACEMENT);assert.equal(count(s,C.OWNER_NEUTRAL),neutral,'an event never repeats');
s.phase=C.PHASE_GAMEOVER;s.restoreCheckpoint(5);assert.equal(count(s,C.OWNER_NEUTRAL),neutral,'a rewind keeps the applied event once');
// The storm surge of A4_M05 really heads for the rescue site (announced threats are never empty).
s=create('A4_M05');for(let i=0;i<s.grid.size;i++)if(s.grid.owners[i]!==C.OWNER_ROCK)s.grid.owners[i]=0;
MissionManager.applyAction(s,s.scenario.events[0].action);const evac=s.objectiveSystem.zone('evac');let hit=0;
for(let g=1;g<=120&&!hit;g++){s.grid.calculateNextGeneration();if(s.objectiveSystem.inZone(s,evac,C.OWNER_NEUTRAL))hit=g;}
assert.ok(hit>0,'storm gliders reach the rescue site without intervention');
// Generation events happen right before their generation is computed.
const timed={...test({type:'evacuate',value:40},[]),events:[{id:'wave',generation:10,announceRound:0,text:'Testwelle in Generation zehn.',action:{type:'seed',pattern:'block',r:25,c:30,owner:-1}}]};
s=start(timed);place(s,'block',2,2);s.paused=true;s.currentPlayer=-1;s.phase=C.PHASE_SIMULATION;const run=s.runSimulation();
for(let i=0;i<9;i++){s.stepOnce();await settle();}assert.equal(s.objectiveSystem.generations,9);assert.equal(count(s,C.OWNER_NEUTRAL),0);
s.stepOnce();await settle();assert.equal(s.objectiveSystem.generations,10);assert.equal(count(s,C.OWNER_NEUTRAL),4,'wave present in generation 10');
s.setPaused(false);await run;
// Rock events and budget events add, they never overwrite.
s=start({...test({type:'evacuate',value:40},[]),map:{...test({},[]).map,rocks:[[20,20,20,25]]}});
MissionManager.applyAction(s,[{type:'clearRocks',rect:[20,20,20,22]},{type:'addRocks',rect:[25,0,25,1]},{type:'budget',player:0,amount:5}]);
assert.equal(s.grid.getOwner(20,21),0);assert.equal(s.grid.getOwner(20,24),C.OWNER_ROCK);assert.equal(s.grid.getOwner(25,1),C.OWNER_ROCK);assert.equal(s.budgets[0],25);
// Supply caches pay out once, between rounds, on top of the regular income; material spent is unaffected.
const withCache=create('A1_M02'),control=create('A1_M02');control.objectiveSystem.caches.add('depot');
for(const g of [withCache,control]){for(const [r,c] of [[2,13],[2,14],[3,13],[3,14]])g.grid.setCell(r,c,1);await evolve(g);}
assert.equal(withCache.budgets[0],control.budgets[0]+6,'cache adds six material to the next round');
assert.ok(withCache.objectiveSystem.caches.has('depot'));assert.equal(withCache.objectiveSystem.pendingMaterial,0);assert.equal(withCache.objectiveSystem.spent,0);
assert.equal(withCache.objectiveSystem.zoneStatus('depot').state,'done');assert.equal(create('A1_M02').objectiveSystem.zoneStatus('depot').state,'cache');
for(const id of ['A1_M02','A2_M01','A5_M01'])assert.ok(missions.find(m=>m.id===id).map.zones.some(z=>z.cache>0),`${id} offers a supply cache`);
// Doctrines: declared targets replace the nearest camp; missions without a doctrine keep their exact seeded moves.
s=create('A4_M03');assert.equal(s.aiProfiles[2].doctrine,'raid');assert.equal(s.aiProfiles[2].target.id,'east');assert.equal(s.aiProfiles[3].target.id,'west');
s.currentPlayer=2;const ai=new AI(s);assert.equal(ai.getNearestEnemyCamp(10,60,2).id,'east');assert.ok(ai.genome.glider_weight>=1,'raiders favour gliders');
assert.equal(create('A4_M04').aiProfiles[2].target.id,'civilians');
// A5_M03 changed deliberately: opponents avoid seeding within eight cells of sterile corridors (their start area overlapped one).
const before={A1_M05:146374426,A2_M04:3763444888,A3_M04:1414227562,A4_M01:1871258490,A4_M02:2364985806,A4_M05:4213402834,A5_M01:2027174418,A5_M02:3511569193,A5_M03:553233566,A5_M04:1182372394,A5_M05:2842492467};
for(const [id,expected] of Object.entries(before)){
 const m=missions.find(m=>m.id===id),g=create(id);g.nextPlayerTurn=()=>{};let h=0;
 for(const p of m.enemies?m.enemies.map(e=>e.house):[1]){g.currentPlayer=p;await new AI(g).takeTurn();}
 for(let i=0;i<g.grid.size;i++)if(g.grid.owners[i]>1)h=(h*31+i*7+g.grid.owners[i])>>>0;
 assert.equal(h,expected,`${id}: seeded enemy moves unchanged without a doctrine`);
}
// clearZones: a glider absorbs a neutral nest by Conway collision.
const clear=test({type:'clearZones',zones:['nest']},[{id:'nest',label:'HERD',rMin:13,rMax:18,cMin:18,cMax:23}],{seeds:[{pattern:'block',r:15,c:20,owner:-1}]});
s=start(clear);place(s,'glider',0,6);await evolve(s);assert.equal(s.objectiveSystem.result.success,true);assert.equal(s.objectiveSystem.zoneStatus('nest').state,'done');
s=start(clear);place(s,'glider',10,0);await evolve(s);assert.equal(s.objectiveSystem.result.success,false);assert.match(s.objectiveSystem.result.details.at(-1),/Herde gleichzeitig beseitigt/);
// oscillate: a blinker keeps the beacon in period 2, a block does not.
const beacon=test({type:'oscillate',zone:'beacon',value:6},[{id:'beacon',label:'LEUCHTFEUER',rMin:4,rMax:8,cMin:4,cMax:8}]);
s=start(beacon);place(s,'blinker',6,5);await evolve(s);assert.equal(s.objectiveSystem.result.success,true);assert.equal(s.objectiveSystem.generations,8);
s=start(beacon);place(s,'block',5,5);await evolve(s);assert.equal(s.objectiveSystem.result.success,false);assert.equal(s.objectiveSystem.bestBeacon,0);
// exactCount: exactly four own cells at the measurement.
const calibrate=test({type:'exactCount',zone:'probe',value:4,at:10},[{id:'probe',label:'SONDE',rMin:4,rMax:8,cMin:4,cMax:8}]);
s=start(calibrate);place(s,'block',5,5);await evolve(s);assert.equal(s.objectiveSystem.result.success,true);assert.equal(s.objectiveSystem.generations,10);
s=start(calibrate);place(s,'blinker',6,5);await evolve(s);assert.equal(s.objectiveSystem.result.reason,'Die Kalibrierung wurde verfehlt.');assert.match(s.objectiveSystem.result.details.at(-1),/Gemessen: 3 statt 4/);
// escort: an allied convoy reaches its target; blocking its path destroys it. The ally is never treated as hostile.
const convoy=test({type:'escort',zone:'dock',owner:2},[{id:'dock',label:'ANLEGER',rMin:20,rMax:24,cMin:34,cMax:39}],{seeds:[{pattern:'lwss',r:21,c:4,owner:2,mirror:true}],territory:[[0,14,10,28,30]]});
s=start(convoy);assert.deepEqual([...s.objectiveSystem.hostiles(s)],[]);place(s,'block',15,12);await evolve(s);assert.equal(s.objectiveSystem.result.success,true,'convoy arrives');
s=start(convoy);place(s,'block',21,20);place(s,'block',23,20);await evolve(s);assert.equal(s.objectiveSystem.result.reason,'Der Geleitzug wurde zerstört.');
console.log('PASS: announced round and generation events, rewind safety, rock/budget actions, supply caches, doctrines with unchanged seeded defaults, clearZones, oscillate, exactCount and escort');
})().catch(e=>{console.error(e);process.exitCode=1});
