// Expert protocols of all missions with opponents: each has a verified solution against the real seeded AI.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const ctx=vm.createContext({console:{log(){},warn:console.warn},setTimeout:fn=>{queueMicrotask(fn);return 1},requestAnimationFrame:()=>1,cancelAnimationFrame(){},localStorage:{getItem(){},setItem(){}}});
for(const f of ['utils/Constants','core/Grid','core/Territory','core/AI','campaign/Missions','campaign/Story','campaign/Act2','campaign/Act3','campaign/Act4','campaign/Act5','campaign/Assistance','campaign/ObjectiveSystem','core/GameState'])vm.runInContext(fs.readFileSync('js/'+f+'.js','utf8'),ctx);
const {GameState,MissionManager,missions,C,AI,expertMission}=vm.runInContext('({GameState,MissionManager,missions:CAMPAIGN_MISSIONS,C:CONSTANTS,AI,expertMission})',ctx);
const rot=(k,n)=>{let p=C.PATTERNS[k].pattern;for(let i=0;i<n;i++)p=p.map(([r,c])=>[c,-r]);return p;};
const houses=s=>s.scenario.enemies?s.scenario.enemies.map(e=>e.house):s.scenario.enemy?[1]:[];
async function battle(s){for(const h of houses(s)){if(s.defeatedPlayers.has(h))continue;s.currentPlayer=h;await new AI(s).takeTurn();}s.currentPlayer=-1;s.phase=C.PHASE_SIMULATION;await s.runSimulation();}
async function play(id,rounds){
 const s=new GameState(MissionManager.config(expertMission(missions.find(m=>m.id===id))));s.simSpeedMs=0;s.start();s.nextPlayerTurn=()=>{};
 for(const plan of rounds){if(s.objectiveSystem.result)break;s.currentPlayer=0;for(const [k,r,c,n=0] of plan)assert.equal(s.placePattern(rot(k,n),r,c),true,`${id}: ${k} ${r},${c} in round ${s.currentRound}`);await battle(s);}
 let n=0;while(!s.objectiveSystem.result&&n++<12)await battle(s);return s.objectiveSystem.result;
}
// Solutions found by a greedy search against the actual AI (stars in brackets).
const SOLUTIONS={
 A1_M05:[3,[[['glider',8,10]]]],
 A2_M04:[3,[[['glider',4,22],['glider',8,13],['glider',10,24]]]],
 A3_M04:[3,[[['glider',4,22],['glider',8,13],['glider',10,24]]]],
 A4_M01:[3,[[['lwss',14,24,3],['block',10,19]]]],
 A4_M02:[3,[[['glider',8,10],['glider',3,24]]]],
 A4_M03:[3,[[['block',10,19],['block',26,43],['block',18,26]]]],
 A4_M04:[2,[[['acorn',15,26,3],['b_heptomino',10,32]],[['block',21,18]],[['glider',3,15]]]],
 A4_M05:[2,[[['glider',10,12],['glider',10,32],['glider',10,52],['block',10,23]],[['acorn',24,42,2]]]],
 A5_M01:[2,[[['glider',9,84,0],['r_pentomino',59,86,1]]]],
 A5_M02:[3,[[['r_pentomino',8,56,1]]]],
 A5_M03:[3,[[['glider',9,108,0],['block',55,109,0]]]],
 A5_M04:[3,[[['block',8,120,0],['glider',73,120,3]]]],
 A5_M05:[3,[[['r_pentomino',42,114,2]]]]
};
(async()=>{
for(const [id,[stars,rounds]] of Object.entries(SOLUTIONS)){const r=await play(id,rounds);assert.equal(r.success,true,`${id}: expert protocol solvable (${r.reason})`);assert.equal(r.stars,stars,`${id}: expected stars`);}
const withEnemies=missions.filter(m=>m.enemy||m.enemies).map(m=>m.id);
const covered=new Set([...Object.keys(SOLUTIONS),...missions.filter(m=>m.expert?.disabled).map(m=>m.id)]);
assert.deepEqual([...withEnemies.filter(id=>!covered.has(id))],[],'every expert protocol with opponents is verified or explicitly closed');
console.log(`PASS: ${Object.keys(SOLUTIONS).length} expert protocols with opponents solved against the real seeded AI`);
})().catch(e=>{console.error(e);process.exitCode=1});
