// Local ambience assets and browser narration; no connection to the development AI services.
class GameAudio {
    constructor() {
        this.settings = { ambient: false, ambienceVolume: .35, voiceVolume: .85 };
        try {
            const saved = JSON.parse(localStorage.getItem('redroots_audio_v1') || 'null');
            if (saved) {
                this.settings.ambient = saved.ambient === true;
                for (const key of ['ambienceVolume', 'voiceVolume']) {
                    if (Number.isFinite(saved[key])) this.settings[key] = Math.max(0, Math.min(1, saved[key]));
                }
            }
        } catch { /* Audio works without storage. */ }
        this.ambience = new Audio('assets/audio/mars-ambient.mp3');
        this.ambience.loop = true;
        this.ambience.preload = 'none';
        this.voice = new Audio();
        this.voice.preload = 'none';
        this.current = null;
        this.pendingNarration = null;
        this.error = '';
        this.unlocked = false;
        for (const event of ['play', 'pause', 'ended']) this.voice.addEventListener(event, () => this.sync());
        this.voice.addEventListener('error', () => { this.error = 'Sprachaufnahme konnte nicht geladen werden. Der Text bleibt lesbar.'; this.sync(); });
        this.ambience.addEventListener('error', () => { this.error = 'Atmosphäre konnte nicht geladen werden.'; this.sync(); });
        document.addEventListener('click', event => {
            this.unlocked = true;
            const button = event.target.closest('[data-narration], [data-ambient]');
            if (button?.hasAttribute('data-narration')) { this.pendingNarration = null; this.narrate(button.dataset.narration); }
            else if (button?.hasAttribute('data-ambient')) {
                this.settings.ambient = !this.settings.ambient;
                this.error = '';
                this.save();
            }
            if (this.pendingNarration) { const key = this.pendingNarration; this.pendingNarration = null; this.narrate(key, true); }
            this.updateAmbience();
            this.sync();
        });
        document.addEventListener('input', event => {
            const key = event.target.dataset.audioVolume;
            if (!['ambienceVolume', 'voiceVolume'].includes(key)) return;
            this.settings[key] = Number(event.target.value) / 100;
            this.save(); this.sync();
        });
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) { this.stopNarration(); this.ambience.pause(); }
            else this.updateAmbience();
        });
        window.addEventListener('pagehide', () => { this.stopNarration(); this.ambience.pause(); });
        this.sync();
    }
    controls() {
        return `<details class="audio-settings"><summary>Ton &amp; Atmosphäre</summary><div class="audio-options"><button type="button" data-ambient aria-pressed="${this.settings.ambient}">${this.settings.ambient ? 'Atmosphäre ausschalten' : 'Atmosphäre einschalten'}</button><label>Hintergrund<input type="range" min="0" max="100" value="${Math.round(this.settings.ambienceVolume*100)}" data-audio-volume="ambienceVolume"></label><label>Stimme<input type="range" min="0" max="100" value="${Math.round(this.settings.voiceVolume*100)}" data-audio-volume="voiceVolume"></label><p data-audio-status role="status"></p></div></details>`;
    }
    narrationButton(mission, kind) {
        return `<button type="button" class="quiet-button narration-button" data-narration="${mission.id}_${kind}" aria-pressed="false">${kind === 'briefing' ? 'Briefing vorlesen' : 'Bericht vorlesen'} ▶</button>`;
    }
    save() { try { localStorage.setItem('redroots_audio_v1', JSON.stringify(this.settings)); } catch { /* optional */ } }
    updateAmbience() {
        if (!this.settings.ambient || document.hidden || !document.getElementById('helpOverlay')?.classList.contains('hidden')) { this.ambience.pause(); return; }
        if (!this.unlocked || !this.ambience.paused) return;
        this.ambience.play().catch(error => {
            if (error.name !== 'AbortError') { this.error = 'Atmosphäre bitte durch erneutes Antippen starten.'; this.sync(); }
        });
    }
    enterScene(mission, kind) {
        const scene = `${mission.id}_${kind}`;
        if (this.scene === scene) return;
        this.scene = scene;
        this.stopNarration();
        const ambience = ['ambient','research','canyon','ice','outpost'].includes(mission.ambience) ? mission.ambience : 'ambient';
        const path = `assets/audio/mars-${ambience}.mp3`;
        if (!this.ambience.src.endsWith(path)) { this.ambience.pause(); this.ambience.src = path; }
        this.updateAmbience();
        this.narrate(scene, true);
    }
    failureReport(mission, text) {
        this.stopNarration();
        this.scene = `${mission.id}_failure`;
        this.failure = { key: this.scene, text };
        this.narrate(this.scene, true);
    }
    narrate(key, automatic = false) {
        const spokenMission = CAMPAIGN_MISSIONS.find(m => m.narration === 'browser' && (key === `${m.id}_briefing` || key === `${m.id}_debriefing`));
        const spokenText = spokenMission ? spokenMission[key.endsWith('_briefing') ? 'briefing' : 'debriefing'] : null;
        if (this.failure?.key === key || spokenText) {
            this.error = '';
            this.voice.pause();
            if (!window.speechSynthesis) { this.error = 'Vorlesen dieses Berichts wird von diesem Browser nicht unterstützt.'; this.sync(); return; }
            if (!automatic && this.current === key && this.utterance) {
                if (this.speaking) { window.speechSynthesis.pause(); this.speaking = false; }
                else { window.speechSynthesis.resume(); this.speaking = true; }
                this.sync(); return;
            }
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(spokenText || this.failure.text);
            this.utterance = utterance;
            utterance.lang = 'de-DE';
            const germanVoice = window.speechSynthesis.getVoices().find(voice => voice.lang.toLowerCase().startsWith('de'));
            if (germanVoice) utterance.voice = germanVoice;
            utterance.volume = this.settings.voiceVolume;
            this.current = key;
            utterance.onstart = () => { if (this.utterance === utterance) { this.speaking = true; this.sync(); } };
            utterance.onend = () => { if (this.utterance === utterance) { this.speaking = false; this.utterance = null; this.sync(); } };
            utterance.onerror = event => {
                if (this.utterance !== utterance) return;
                this.speaking = false;
                if (event.error === 'not-allowed' && automatic) this.pendingNarration = key;
                this.error = 'Bericht vorlesen: bitte einmal antippen.'; this.sync();
            };
            window.speechSynthesis.speak(utterance);
            return;
        }
        if (!CAMPAIGN_MISSIONS.some(m => key === `${m.id}_briefing` || key === `${m.id}_debriefing`)) return;
        this.error = '';
        if (!automatic && this.current === key && !this.voice.paused) { this.voice.pause(); return; }
        if (this.current !== key) {
            this.voice.pause(); this.current = key;
            this.voice.src = `assets/audio/${key}.mp3`;
        }
        if (this.voice.ended) this.voice.currentTime = 0;
        this.voice.play().catch(error => {
            if (error.name !== 'AbortError') {
                if (automatic && error.name === 'NotAllowedError') this.pendingNarration = key;
                this.error = error.name === 'NotAllowedError' ? 'Zum automatischen Vorlesen einmal die Seite antippen.' : 'Wiedergabe nicht möglich. Bitte erneut antippen.'; this.sync();
            }
        });
    }
    stopNarration() { this.utterance = null; this.speaking = false; window.speechSynthesis?.cancel(); this.pendingNarration = null; this.voice.pause(); this.voice.currentTime = 0; this.current = null; this.sync(); }
    sync() {
        const speaking = this.speaking || (!this.voice.paused && !this.voice.ended);
        this.voice.volume = this.settings.voiceVolume;
        this.ambience.volume = this.settings.ambienceVolume * (speaking ? .25 : 1);
        document.querySelectorAll('[data-ambient]').forEach(button => {
            button.textContent = this.settings.ambient ? 'Atmosphäre ausschalten' : 'Atmosphäre einschalten';
            button.setAttribute('aria-pressed', String(this.settings.ambient));
        });
        document.querySelectorAll('[data-narration]').forEach(button => {
            const active = speaking && this.current === button.dataset.narration;
            button.textContent = active ? 'Vorlesen pausieren ❚❚' : (button.dataset.narration.endsWith('_briefing') ? 'Briefing vorlesen ▶' : 'Bericht vorlesen ▶');
            button.setAttribute('aria-pressed', String(active));
        });
        document.querySelectorAll('[data-audio-volume]').forEach(input => { input.value = Math.round(this.settings[input.dataset.audioVolume] * 100); });
        document.querySelectorAll('[data-audio-status]').forEach(el => { el.textContent = this.error; });
    }
}
