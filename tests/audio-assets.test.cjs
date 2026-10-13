// Verify recordings against current mission texts without requiring local AI services.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const context=vm.createContext({});
for(const file of ['Missions','Story','Act2','Act3','Act4','Act5','Act6'])vm.runInContext(fs.readFileSync(`js/campaign/${file}.js`,'utf8'),context);
const missions=vm.runInContext('CAMPAIGN_MISSIONS',context);
const manifest=JSON.parse(fs.readFileSync('assets/audio/manifest.json'));
const reports=JSON.parse(fs.readFileSync('assets/audio/verification.json'));
const hash=data=>crypto.createHash('sha256').update(data).digest('hex');
// The text manifest covers every mission, so scripts/generate_audio.py can record pending texts later.
assert.equal(manifest.length,missions.length*2);
assert.equal(new Set(manifest.map(x=>x.id)).size,manifest.length);
let recorded=0;
for(const mission of missions)for(const kind of ['briefing','debriefing']){
 const id=`${mission.id}_${kind}`,entry=manifest.find(x=>x.id===id),report=reports.find(x=>x.id===id);
 assert.equal(entry?.text,mission[kind],`${id}: manifest must match current story`);
 assert.ok(['recorded','browser'].includes(mission.narration),`${id}: narration is recorded or explicitly the browser voice`);
 if(mission.narration!=='recorded')continue;
 recorded++;
 assert.equal(report?.status,'pass',`${id}: transcript needs review`);
 assert.equal(report.sourceTextSha256,hash(entry.text),`${id}: stale transcript verification`);
 const spoken=entry.text.toLowerCase().replace(/[^\p{L}\p{N}_\s]/gu,'').trim().split(/\s+/).join(' ');
 assert.equal(report.expectedSpokenSha256,hash(spoken),`${id}: spoken text hash differs`);
 assert.equal(report.audioSha256,hash(fs.readFileSync(`assets/audio/${id}.mp3`)),`${id}: audio differs from verified recording`);
 assert.ok(report.transcript.length>20,`${id}: missing speech`);
}
console.log(`PASS: ${recorded} recordings match current mission texts and verified audio hashes; ${manifest.length-recorded} texts wait for recording (browser voice)`);
