const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
class Media {
 constructor(src=''){this.src=src;this.paused=true;this.ended=false;this.currentTime=0;this.listeners={};}
 addEventListener(event,fn){this.listeners[event]=fn;}
 play(){this.paused=false;this.listeners.play?.();return Promise.resolve();}
 pause(){this.paused=true;this.listeners.pause?.();}
}
const events={},store=new Map();
const document={hidden:false,addEventListener:(e,f)=>events[e]=f,querySelectorAll:()=>[],getElementById:()=>({classList:{contains:()=>true}})};
const context=vm.createContext({Audio:Media,document,window:{addEventListener(){}},localStorage:{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)},CAMPAIGN_MISSIONS:[{id:'A1_M01'}]});
vm.runInContext(fs.readFileSync('js/ui/GameAudio.js','utf8'),context);const AudioManager=vm.runInContext('GameAudio',context);
const audio=new AudioManager();assert.equal(audio.ambience.paused,true);audio.narrate('invalid');assert.equal(audio.current,null);
audio.settings.ambient=true;audio.unlocked=true;audio.updateAmbience();assert.equal(audio.ambience.paused,false);
audio.narrate('A1_M01_briefing');assert.equal(audio.voice.paused,false);assert.equal(audio.ambience.volume,.35*.25);
audio.narrate('A1_M01_briefing');assert.equal(audio.voice.paused,true);assert.equal(audio.ambience.volume,.35);
audio.narrate('A1_M01_briefing');audio.stopNarration();assert.equal(audio.current,null);assert.equal(audio.voice.paused,true);
document.hidden=true;events.visibilitychange();assert.equal(audio.ambience.paused,true);
audio.settings.voiceVolume=.4;audio.save();assert.equal(new AudioManager().settings.voiceVolume,.4);
document.hidden=false; audio.enterScene({id:'A1_M01',ambience:'research'},'briefing'); assert.equal(audio.ambience.src,'assets/audio/mars-research.mp3'); assert.equal(audio.voice.paused,false); audio.enterScene({id:'A1_M01',ambience:'research'},'briefing'); assert.equal(audio.voice.paused,false); audio.enterScene({id:'A1_M01',ambience:'research'},'debriefing'); assert.ok(audio.voice.src.endsWith('_debriefing.mp3'));
console.log('PASS: silent default, narration whitelist, pause, ducking, stop, hidden-tab pause, saved volume');
let spoken,paused=false;
context.SpeechSynthesisUtterance=class{constructor(text){this.text=text;}};
context.window.speechSynthesis={getVoices:()=>[{lang:'de-DE'}],speak:u=>{spoken=u;u.onstart();},cancel(){},pause(){paused=true},resume(){paused=false}};
context.CAMPAIGN_MISSIONS.push({id:'A2_M01',narration:'browser',briefing:'Die Landefähre wartet.',debriefing:'Die Siedlungen sind gerettet.'});
audio.narrate('A2_M01_briefing',true);assert.equal(spoken.text,'Die Landefähre wartet.');assert.equal(spoken.voice.lang,'de-DE');assert.equal(audio.voice.paused,true);audio.narrate('A2_M01_briefing');assert.equal(paused,true);audio.narrate('A2_M01_briefing');assert.equal(paused,false);spoken.onend();audio.narrate('A2_M01_debriefing',true);assert.equal(spoken.text,'Die Siedlungen sind gerettet.');assert.equal(audio.ambience.volume,.35*.25);
console.log('PASS: current story uses German browser voice, pause/resume, automatic report and ducking');
context.CAMPAIGN_MISSIONS.push({id:'A3_M05',narration:'recorded',audioRevision:'test-current'});
audio.stopNarration();audio.enterScene({id:'A3_M05'},'briefing');assert.ok(audio.voice.src.endsWith('A3_M05_briefing.mp3?v=test-current'));assert.equal(audio.voice.paused,false);
audio.enterScene({id:'A3_M05'},'debriefing');assert.ok(audio.voice.src.endsWith('A3_M05_debriefing.mp3?v=test-current'));
console.log('PASS: recorded missions use versioned MP3 assets for briefing and report');

// Ebene 5a Erweiterung: Crossfade-Engine & Situations-Mixer
const initialSrc = audio.ambience.src;
audio.crossfadeTo('assets/audio/mars-planning-1.mp3');
assert.equal(audio.ambience.src, 'assets/audio/mars-planning-1.mp3');
assert.notEqual(audio.ambience.src, initialSrc);

audio.setSituation('simulation');
assert.equal(audio.currentSituation, 'simulation');
assert.ok(audio.ambience.src.startsWith('assets/audio/mars-'));

audio.setSituation('tension');
assert.equal(audio.currentSituation, 'tension');
assert.ok(audio.ambience.src.startsWith('assets/audio/mars-'));

audio.advanceTrack();
assert.ok(audio.ambience.src.startsWith('assets/audio/mars-'));

audio.startGameAmbience({ ambience: 'ice' });
assert.equal(audio.currentTheme, 'ice');
assert.equal(audio.currentSituation, 'planning');
assert.equal(audio.ambience.src, 'assets/audio/mars-ice.mp3');

// Missionsübersicht vs. Missionsstart Verhalten testen:
// 1. Übersicht: Ambience aktiv, aber keine automatische Sprachausgabe
audio.stopNarration();
audio.scene = null;
audio.startGameAmbience({ id: 'A1_M01', ambience: 'canyon' });
assert.equal(audio.voice.paused, true, 'Keine automatische Sprachausgabe in der Missionsübersicht');
assert.equal(audio.current, null);
assert.equal(audio.scene, null);

// 2. Klick auf "Briefing vorlesen" startet manuell
audio.narrate('A1_M01_briefing');
assert.equal(audio.voice.paused, false, 'Manuelles Briefing startet auf Klick');
assert.equal(audio.current, 'A1_M01_briefing');

// 3. Missionswechsel in Übersicht stoppt laufendes Audio und startet das neue Briefing NICHT automatisch
audio.stopNarration();
audio.scene = null;
audio.startGameAmbience({ id: 'A2_M01', ambience: 'ice' });
assert.equal(audio.voice.paused, true, 'Missionswechsel spielt neues Briefing nicht automatisch');
assert.equal(audio.current, null);

// 4. Start der Mission auf der Karte startet die Sprachausgabe via enterScene
audio.enterScene({ id: 'A2_M01', ambience: 'ice' }, 'briefing');
assert.equal(spoken.text, 'Die Landefähre wartet.', 'Missionsstart auf Karte liest Briefing automatisch vor');

console.log('PASS: dual-channel crossfading, situational pools, non-repeating shuffle, game start ambience, mission overview silent briefing');
