const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const storage=new Map();
const ctx=vm.createContext({console:{log(){},warn:console.warn},setTimeout:fn=>{queueMicrotask(fn);return 1},requestAnimationFrame:()=>1,cancelAnimationFrame(){},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)}});
for(const f of ['utils/Constants','core/Grid','core/Territory','core/AI','campaign/Missions','campaign/Story','campaign/Act2','campaign/Act3','campaign/Act4','campaign/Act5','campaign/ObjectiveSystem','campaign/CampaignManager','core/GameState'])vm.runInContext(fs.readFileSync('js/'+f+'.js','utf8'),ctx);
const {GameState,MissionManager,missions,C,CampaignState}=vm.runInContext('({GameState,MissionManager,missions:CAMPAIGN_MISSIONS,C:CONSTANTS,CampaignState})',ctx);
const act5=missions.filter(m=>m.act===5);
assert.equal(act5.length,5);
for(const mission of act5){
 assert.equal(mission.steps,1000,`${mission.id}: exactly 1,000 generations per round`);
 assert.ok(mission.rounds>=5,`${mission.id}: several playable rounds`);
 assert.ok(mission.map.rows>=72&&mission.map.cols>=112,`${mission.id}: skirmish-scale landscape`);
 assert.ok(mission.enemies?.length,`${mission.id}: active opposing houses`);
 assert.equal(mission.narration,'recorded',`${mission.id}: Qwen3 narration is active`);
 assert.equal(mission.audioRevision,'20260915-v1',`${mission.id}: fresh recordings bypass stale browser caches`);
}
function create(index){const s=new GameState(MissionManager.config(missions[index]));s.simSpeedMs=0;s.start();return s;}
function fill(s,z,owner,count=4){let n=0;for(let r=z.rMin;r<=z.rMax;r++)for(let c=z.cMin;c<=z.cMax;c++)s.grid.setCell(r,c,n++<count?owner:0);}
let s=create(20),o=s.objectiveSystem;
for(const id of s.scenario.objective.zones)fill(s,s.scenario.map.zones.find(z=>z.id===id),1);
s.grid.setCell(5,5,1);
for(let i=0;i<1999;i++)o.evaluate(s,'generation');
assert.equal(o.result,null,'captured relays cannot end the two-round endurance early');
o.evaluate(s,'generation');
assert.equal(o.result?.success,true,'two full 1,000-generation phases complete mission 21');
s=create(22);
assert.equal(s.territory.getOwnerAt(8,108),0,'sterile labyrinth has a player staging island beyond all corridors');
s=create(24);
assert.equal(s.territory.getOwnerAt(40,108),0,'finale has separated player staging islands beyond the seal');
s=create(21);o=s.objectiveSystem;s.grid.setCell(5,5,1);
const threatened=s.scenario.map.zones.find(z=>z.id==='centerHab');s.grid.setCell(threatened.rMin,threatened.cMin,3);
o.generations=2999;o.evaluate(s,'generation');
assert.equal(o.result?.success,false,'hostile flora in any habitat overrides the long-term survival target');
s=create(24);o=s.objectiveSystem;
for(const id of s.scenario.objective.zones)fill(s,s.scenario.map.zones.find(z=>z.id===id),1);
s.grid.setCell(5,5,1);
for(let i=0;i<3999;i++)o.evaluate(s,'generation');
assert.equal(o.result,null,'finale requires four complete long phases');
o.evaluate(s,'generation');assert.equal(o.result?.success,true);
const finalState=new CampaignState();
assert.equal(finalState.chooseEnding('consortium'),false,'ending is locked before the finale is recorded');
finalState.record('A5_M05',3);assert.equal(finalState.chooseEnding('open_genomes'),true);
assert.equal(new CampaignState().finalChoice,'open_genomes','final political choice persists');
const code=CampaignState.encodeExpedition(Array(25).fill(3));
assert.match(code,/^ERBE-/);assert.equal(new CampaignState().importCode(code),true,'25-sector codes round-trip');
assert.equal(CampaignState.decodeExpedition(CampaignState.encodeExpedition(Array(20).fill(3))).slice(0,20).every(v=>v===3),true,'20-sector expedition codes remain compatible');
console.log('PASS: Act V long battles, large maps, protection, codes and ending choice');
// Verified solutions against the real seeded AI (the maintenance platforms make the distant targets reachable).
const AI=vm.runInContext('AI',ctx),rot=(k,n)=>{let p=C.PATTERNS[k].pattern;for(let i=0;i<n;i++)p=p.map(([r,c])=>[c,-r]);return p;};
async function solve(id,rounds){
 const i=missions.findIndex(m=>m.id===id),s=create(i);s.nextPlayerTurn=()=>{};
 const battle=async()=>{for(const e of s.scenario.enemies){if(s.defeatedPlayers.has(e.house))continue;s.currentPlayer=e.house;await new AI(s).takeTurn();}s.currentPlayer=-1;s.phase=C.PHASE_SIMULATION;await s.runSimulation();};
 for(const plan of rounds){if(s.objectiveSystem.result)break;s.currentPlayer=0;for(const [k,r,c,n=0] of plan)assert.equal(s.placePattern(rot(k,n),r,c),true,`${id}: ${k} ${r},${c}`);await battle();}
 let n=0;while(!s.objectiveSystem.result&&n++<12)await battle();return s.objectiveSystem.result;
}
(async()=>{
 let r=await solve('A5_M01',[[['glider',9,84,0],['r_pentomino',59,86,1]]]);assert.equal(r.success,true,'A5_M01 relays captured from the maintenance platforms');assert.equal(r.stars,2);
 r=await solve('A5_M04',[[['r_pentomino',9,122,1],['r_pentomino',74,122,2]]]);assert.equal(r.success,true,'A5_M04 key stations captured from the maintenance platforms');assert.equal(r.stars,3);
 console.log('PASS: A5_M01 and A5_M04 solved against the real AI');
})().catch(e=>{console.error(e);process.exitCode=1});
