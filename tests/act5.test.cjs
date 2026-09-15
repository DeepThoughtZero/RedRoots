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
