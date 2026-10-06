// Phase 4: varied bonus goals, best values, expert protocols, radio lines and the mission timeline.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const storage=new Map();
const ctx=vm.createContext({console:{log(){},warn:console.warn},setTimeout:fn=>{queueMicrotask(fn);return 1},requestAnimationFrame:()=>1,cancelAnimationFrame(){},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)}});
for(const f of ['utils/Constants','core/Grid','core/Territory','core/AI','campaign/Missions','campaign/Story','campaign/Act2','campaign/Act3','campaign/Act4','campaign/Act5','campaign/Assistance','campaign/ObjectiveSystem','campaign/CampaignManager','core/GameState'])vm.runInContext(fs.readFileSync('js/'+f+'.js','utf8'),ctx);
const {GameState,MissionManager,missions,C,CampaignState,CampaignManager,ObjectiveSystem,expertMission}=vm.runInContext('({GameState,MissionManager,missions:CAMPAIGN_MISSIONS,C:CONSTANTS,CampaignState,CampaignManager,ObjectiveSystem,expertMission})',ctx);
const start=m=>{const s=new GameState(MissionManager.config(m));s.simSpeedMs=0;s.start();return s;};
const create=id=>start(missions.find(m=>m.id===id));
const rot=(k,n)=>{let p=C.PATTERNS[k].pattern;for(let i=0;i<n;i++)p=p.map(([r,c])=>[c,-r]);return p;};
function place(s,k,r,c,n=0){s.currentPlayer=0;assert.equal(s.placePattern(rot(k,n),r,c),true,`${k} ${r},${c}`);}
async function evolve(s){s.currentPlayer=-1;s.phase=C.PHASE_SIMULATION;await s.runSimulation();}
(async()=>{
// Placed patterns are recognised in every rotation; undo and erase keep the record consistent.
for(const k of ['glider','lwss','acorn','block','r_pentomino'])for(let n=0;n<4;n++)assert.equal(ObjectiveSystem.patternKey(rot(k,n)),k);
let s=create('A2_M02');place(s,'glider',6,8);place(s,'block',3,3);assert.deepEqual([...s.objectiveSystem.placements],['glider','block']);
s.undoLastAction();assert.deepEqual([...s.objectiveSystem.placements],['glider']);
assert.equal(s.eraseCell(6,9)||s.eraseCell(7,10)||s.eraseCell(8,8),true);assert.equal(s.objectiveSystem.erased,1);s.undoLastAction();assert.equal(s.objectiveSystem.erased,0);
// onlyPatterns / patterns: the reference solutions keep three stars, an extra pattern kind costs the bonus.
s=create('A2_M02');place(s,'glider',6,8);place(s,'glider',8,3);await evolve(s);assert.equal(s.objectiveSystem.result.stars,3);
s=create('A2_M02');place(s,'glider',6,8);place(s,'glider',8,3);place(s,'cell',3,13);await evolve(s);assert.equal(s.objectiveSystem.result.success,true);assert.equal(s.objectiveSystem.result.bonuses[1],false,'only gliders');
s=create('A2_M04');place(s,'glider',4,22);place(s,'glider',8,13);place(s,'glider',10,24);place(s,'cell',3,4);await evolve(s);assert.equal(s.objectiveSystem.result.bonuses[1],false,'one pattern kind');
// noForecast: using the forecast forfeits the bonus, also across a rewind.
s=create('A1_M04');s.forecast();place(s,'glider',10,14);await evolve(s);assert.equal(s.objectiveSystem.result.success,true);assert.equal(s.objectiveSystem.result.bonuses[1],false);
s=create('A1_M04');place(s,'glider',10,14);await evolve(s);assert.equal(s.objectiveSystem.result.stars,3);
// caches, noErase and territory are evaluated from the run itself.
s=create('A5_M01');const o=s.objectiveSystem;assert.equal(o.bonusMet({type:'caches'},s),false);o.caches.add('depot');assert.equal(o.bonusMet({type:'caches'},s),true);
assert.equal(o.bonusMet({type:'noErase'},s),true);o.erased=1;assert.equal(o.bonusMet({type:'noErase'},s),false);
assert.equal(o.bonusMet({type:'territory',value:1},s),true);assert.equal(o.bonusMet({type:'territory',value:1e6},s),false);
const counts={};for(const m of missions)for(const b of m.bonuses)counts[b.type]=(counts[b.type]||0)+1;
assert.ok(counts.spent<=13&&counts.onlyPatterns>=3&&counts.patterns>=3&&counts.noForecast>=3&&counts.caches>=1,'about half of the material bonuses are replaced');
// Best values: minima per metric, additive in the save; old saves, codes and imports stay compatible.
storage.clear();let p=new CampaignState();p.record('A1_M01',2,{spent:6,generations:12,rounds:2});p.record('A1_M01',1,{spent:4,generations:14,rounds:3});
assert.deepEqual({...p.completed.A1_M01.best},{spent:4,generations:12,rounds:2});assert.equal(p.completed.A1_M01.stars,2);
const code=p.exportCode();p.record('A1_M01',2,null,true);assert.equal(p.exportCode(),code,'codes carry stars only');
let q=new CampaignState();assert.deepEqual({...q.completed.A1_M01.best},{spent:4,generations:12,rounds:2});assert.equal(q.completed.A1_M01.veteran,true);
q.importCode(CampaignState.encodeExpedition([3]));assert.equal(q.completed.A1_M01.stars,3);assert.equal(q.completed.A1_M01.veteran,true,'import keeps veteran and best values');assert.ok(q.completed.A1_M01.best);
storage.set('redroots_campaign_v1',JSON.stringify({campaignVersion:1,completedMissions:{A1_M01:{stars:3},A1_M02:{stars:2,best:{spent:'x',rounds:-1,generations:9},veteran:'yes'}}}));
q=new CampaignState();assert.deepEqual({...q.completed.A1_M01},{stars:3},'old saves load unchanged');assert.deepEqual({...q.completed.A1_M02.best},{generations:9},'invalid best values are dropped, stars kept');assert.equal(q.completed.A1_M02.veteran,undefined);
assert.equal(q.reset(),true);assert.deepEqual(Object.keys(q.completed),[]);
// Expert protocol: stronger opponents, less material (never below the known solution), no hints or forecast.
const e4=expertMission(missions.find(m=>m.id==='A4_M01'));assert.equal(e4.enemies[0].budget,36);assert.equal(e4.budget,18);assert.equal(e4.forecast,null);assert.equal(e4.hints.length,0);assert.equal(e4.expertMode,true);
assert.equal(expertMission(missions.find(m=>m.id==='A1_M05')).enemyBudget,12,'single enemy missions scale their default budget');
assert.equal(missions.find(m=>m.id==='A4_M01').budget,22,'the campaign mission itself is unchanged');
s=start(expertMission(missions.find(m=>m.id==='A1_M03')));place(s,'glider',6,8);await evolve(s);assert.equal(s.objectiveSystem.result.success,true,'expert puzzle stays solvable');
s=start(expertMission(missions.find(m=>m.id==='A3_M02')));place(s,'diehard',17,24);await evolve(s);assert.equal(s.objectiveSystem.result.success,true,'expert diehard still affordable');
// Radio lines play once per run on their trigger.
const cm=Object.create(CampaignManager.prototype),m=missions.find(m=>m.id==='A3_M01');
cm.radio(m,{type:'threat',level:'warning',zoneId:'three'});assert.equal(cm.radioQueue,undefined,'warnings do not trigger alarm lines');
cm.radio(m,{type:'threat',level:'alarm',zoneId:'three'});cm.radio(m,{type:'threat',level:'alarm',zoneId:'three'});cm.radio(m,{type:'switch',zoneId:'one'});
assert.deepEqual(Array.from(cm.radioQueue,l=>l.on),['alarm:three','switch:one']);
// Timeline: one sample per generation, evenly thinned for long missions.
s=create('A2_M03');place(s,'block',10,19);place(s,'block',18,26);await evolve(s);const t=s.objectiveSystem.timeline;
assert.equal(t.generation.length,96);assert.equal(t.own[0],8);assert.ok(t.foreign.every(v=>v>=0));
const long=new ObjectiveSystem(missions[0]);for(let g=1;g<=4000;g++){long.generations=g;long.sample(1,2);}
assert.ok(long.timeline.generation.length<=1200&&long.timeline.stride>=4);assert.equal(long.timeline.generation.at(-1)%long.timeline.stride,0);
console.log('PASS: pattern recognition, onlyPatterns/patterns/noForecast/caches/noErase/territory bonuses, best values and save compatibility, expert protocols, radio triggers and timeline sampling');
})().catch(e=>{console.error(e);process.exitCode=1});
