// Static local recordings and ambience; browser speech is reserved for dynamic reports.
const AMBIENT_POOLS = {
    planning: [
        'mars-planning-1', 'mars-planning-2', 'mars-planning-3', 'mars-planning-4', 'mars-planning-5',
        'mars-ambient', 'mars-research'
    ],
    simulation: [
        'mars-simulation-1', 'mars-simulation-2', 'mars-simulation-3', 'mars-simulation-4', 'mars-simulation-5',
        'mars-canyon', 'mars-ambient'
    ],
    tension: [
        'mars-tension-1', 'mars-tension-2', 'mars-tension-3', 'mars-tension-4', 'mars-tension-5',
        'mars-outpost', 'mars-canyon'
    ],
    exploration: [
        'mars-ambient', 'mars-planning-3', 'mars-planning-5', 'mars-canyon', 'mars-simulation-5'
    ],
    canyon: ['mars-canyon', 'mars-tension-3', 'mars-planning-5', 'mars-simulation-5'],
    ice: ['mars-ice', 'mars-planning-3', 'mars-planning-4', 'mars-simulation-4'],
    outpost: ['mars-outpost', 'mars-tension-2', 'mars-tension-4', 'mars-planning-1'],
    research: ['mars-research', 'mars-planning-2', 'mars-simulation-1', 'mars-simulation-4'],
    ambient: ['mars-ambient', 'mars-planning-1', 'mars-planning-2', 'mars-simulation-3']
};

const FAILURE_AUDIO = {
    'Unser Habitat wurde überwuchert.': 'assets/audio/failure-habitat.mp3',
    'Das Zeitfenster ist geschlossen.': 'assets/audio/failure-timeout.mp3',
    'Hellas hat das Wasser zuerst erreicht.': 'assets/audio/failure-race.mp3',
    'Die Quarantäne wurde durch lebende Flora verletzt.': 'assets/audio/failure-sterile.mp3',
    'Die Schalter wurden in falscher Reihenfolge berührt.': 'assets/audio/failure-order.mp3',
    'Fremde Flora hat die geschützte Zone erreicht.': 'assets/audio/failure-protected.mp3'
};

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

        // Dual channels for seamless crossfading
        this.channelA = new Audio('assets/audio/mars-ambient.mp3');
        this.channelB = new Audio('');
        this.channelA.preload = 'none';
        this.channelB.preload = 'none';
        this.activeChannel = this.channelA;
        this.fadingChannel = null;
        this.crossfadeAnim = null;
        this.duckFactor = 1.0;
        this.targetDuckFactor = 1.0;
        this.duckAnim = null;

        this.currentTheme = 'ambient';
        this.currentSituation = 'planning';
        this.recentTracks = ['mars-ambient'];
        this.advancing = false;

        this.voice = new Audio();
        this.voice.preload = 'none';
        this.current = null;
        this.pendingNarration = null;
        this.error = '';
        this.unlocked = false;

        for (const event of ['play', 'pause', 'ended']) this.voice.addEventListener(event, () => this.sync());
        this.voice.addEventListener('error', () => { this.error = 'Sprachaufnahme konnte nicht geladen werden. Der Text bleibt lesbar.'; this.sync(); });

        const setupChannel = (ch) => {
            ch.addEventListener('error', () => { this.error = 'Atmosphäre konnte nicht geladen werden.'; this.sync(); });
            ch.addEventListener('timeupdate', () => this.checkTrackAdvance(ch));
            ch.addEventListener('ended', () => this.onTrackEnded(ch));
        };
        setupChannel(this.channelA);
        setupChannel(this.channelB);

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
            if (document.hidden) {
                this.stopNarration();
                this.channelA.pause();
                this.channelB.pause();
            } else {
                this.updateAmbience();
            }
        });
        window.addEventListener('pagehide', () => {
            this.stopNarration();
            this.channelA.pause();
            this.channelB.pause();
        });
        this.sync();
    }

    get ambience() {
        return this.activeChannel;
    }
    set ambience(channel) {
        this.activeChannel = channel;
    }

    controls() {
        return `<details class="audio-settings"><summary>Ton &amp; Atmosphäre</summary><div class="audio-options"><button type="button" data-ambient aria-pressed="${this.settings.ambient}">${this.settings.ambient ? 'Atmosphäre ausschalten' : 'Atmosphäre einschalten'}</button><label>Hintergrund<input type="range" min="0" max="100" value="${Math.round(this.settings.ambienceVolume*100)}" data-audio-volume="ambienceVolume"></label><label>Stimme<input type="range" min="0" max="100" value="${Math.round(this.settings.voiceVolume*100)}" data-audio-volume="voiceVolume"></label><p data-audio-status role="status"></p></div></details>`;
    }

    narrationButton(mission, kind) {
        return `<button type="button" class="quiet-button narration-button" data-narration="${mission.id}_${kind}" aria-pressed="false">${kind === 'briefing' ? 'Briefing vorlesen' : 'Bericht vorlesen'} ▶</button>`;
    }

    save() { try { localStorage.setItem('redroots_audio_v1', JSON.stringify(this.settings)); } catch { /* optional */ } }

    getTargetAmbienceVolume() {
        const speaking = this.speaking || (!this.voice.paused && !this.voice.ended);
        const factor = (typeof requestAnimationFrame === 'undefined') ? (speaking ? .25 : 1) : this.duckFactor;
        return this.settings.ambienceVolume * factor;
    }

    updateAmbience() {
        const shouldPause = !this.settings.ambient || document.hidden || !document.getElementById('helpOverlay')?.classList.contains('hidden');
        if (shouldPause) {
            this.activeChannel.pause();
            if (this.fadingChannel) this.fadingChannel.pause();
            return;
        }
        if (!this.unlocked || !this.activeChannel.paused) return;
        this.activeChannel.volume = this.getTargetAmbienceVolume();
        this.activeChannel.play().catch(error => {
            if (error.name !== 'AbortError') { this.error = 'Atmosphäre bitte durch erneutes Antippen starten.'; this.sync(); }
        });
    }

    crossfadeTo(newPath, duration = 2.5) {
        if (this.activeChannel.src.endsWith(newPath) && !this.activeChannel.paused) {
            return;
        }

        if (this.crossfadeAnim) {
            if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(this.crossfadeAnim);
            else clearInterval(this.crossfadeAnim);
            this.crossfadeAnim = null;
        }

        const outChannel = this.activeChannel;
        const inChannel = (outChannel === this.channelA) ? this.channelB : this.channelA;

        if (this.fadingChannel && this.fadingChannel !== inChannel) {
            this.fadingChannel.pause();
            this.fadingChannel.currentTime = 0;
            this.fadingChannel = null;
        }

        inChannel.pause();
        inChannel.src = newPath;
        inChannel.currentTime = 0;
        this.activeChannel = inChannel;
        this.fadingChannel = outChannel;
        this.advancing = false;

        const targetVol = this.getTargetAmbienceVolume();

        // Immediate switch in test / headless environments
        if (typeof requestAnimationFrame === 'undefined') {
            outChannel.pause();
            outChannel.currentTime = 0;
            outChannel.volume = 0;
            inChannel.volume = targetVol;
            this.fadingChannel = null;
            if (this.settings.ambient && this.unlocked && !document.hidden) {
                inChannel.play().catch(() => {});
            }
            return;
        }

        if (!this.settings.ambient || document.hidden || !document.getElementById('helpOverlay')?.classList.contains('hidden')) {
            outChannel.pause();
            outChannel.volume = 0;
            inChannel.volume = 0;
            this.fadingChannel = null;
            return;
        }

        if (!this.unlocked) {
            inChannel.volume = targetVol;
            this.fadingChannel = null;
            return;
        }

        inChannel.volume = 0;
        inChannel.play().catch(error => {
            if (error.name !== 'AbortError') {
                this.error = 'Atmosphäre bitte durch erneutes Antippen starten.';
                this.sync();
            }
        });

        const startTime = (typeof performance !== 'undefined') ? performance.now() : Date.now();
        const startOutVol = outChannel.volume > 0 ? outChannel.volume : targetVol;
        const step = () => {
            const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();
            const elapsed = (now - startTime) / 1000;
            const p = Math.min(1.0, elapsed / Math.max(0.1, duration));

            // Equal-power crossfade curve prevents perceptual volume dips
            const gainOut = Math.cos(p * Math.PI * 0.5);
            const gainIn = Math.sin(p * Math.PI * 0.5);
            const currentTarget = this.getTargetAmbienceVolume();

            outChannel.volume = Math.max(0, Math.min(1, startOutVol * gainOut));
            inChannel.volume = Math.max(0, Math.min(1, currentTarget * gainIn));

            if (p < 1.0) {
                this.crossfadeAnim = requestAnimationFrame(step);
            } else {
                outChannel.pause();
                outChannel.currentTime = 0;
                outChannel.volume = 0;
                inChannel.volume = currentTarget;
                this.fadingChannel = null;
                this.crossfadeAnim = null;
            }
        };
        this.crossfadeAnim = requestAnimationFrame(step);
    }

    checkTrackAdvance(ch) {
        if (ch !== this.activeChannel || this.fadingChannel || this.advancing) return;
        if (ch.duration && Number.isFinite(ch.duration) && ch.duration > 8) {
            // Trigger seamless crossfade 3.5 seconds before track end
            if (ch.currentTime >= ch.duration - 3.5) {
                this.advanceTrack(3.0);
            }
        }
    }

    onTrackEnded(ch) {
        if (ch === this.activeChannel && !this.fadingChannel) {
            this.advanceTrack(2.5);
        }
    }

    getCurrentPool() {
        const sitPool = AMBIENT_POOLS[this.currentSituation] || AMBIENT_POOLS.planning;
        const themePool = AMBIENT_POOLS[this.currentTheme] || AMBIENT_POOLS.ambient;
        const combined = Array.from(new Set([...sitPool, ...themePool]));
        return combined.length > 0 ? combined : ['mars-ambient'];
    }

    getNextTrack() {
        const pool = this.getCurrentPool();
        let candidates = pool.filter(id => !this.recentTracks.includes(id));
        if (candidates.length === 0) {
            candidates = pool.filter(id => id !== this.recentTracks[this.recentTracks.length - 1]);
        }
        if (candidates.length === 0) candidates = pool;
        const chosen = candidates[Math.floor(Math.random() * candidates.length)];
        this.recentTracks.push(chosen);
        if (this.recentTracks.length > 5) this.recentTracks.shift();
        return chosen;
    }

    advanceTrack(duration = 2.5) {
        if (this.advancing) return;
        this.advancing = true;
        const nextId = this.getNextTrack();
        const nextPath = `assets/audio/${nextId}.mp3`;
        this.crossfadeTo(nextPath, duration);
    }

    setSituation(situation) {
        if (!AMBIENT_POOLS[situation] || this.currentSituation === situation) return;
        this.currentSituation = situation;
        this.advanceTrack(2.5);
    }

    startGameAmbience(scenario) {
        const ambience = scenario && ['ambient','research','canyon','ice','outpost'].includes(scenario.ambience) ? scenario.ambience : 'ambient';
        this.currentTheme = ambience;
        this.currentSituation = 'planning';
        const primaryTrack = `assets/audio/mars-${ambience}.mp3`;
        this.crossfadeTo(primaryTrack, 2.0);
    }

    enterScene(mission, kind) {
        const scene = `${mission.id}_${kind}`;
        if (this.scene === scene) return;
        this.scene = scene;
        this.stopNarration();
        const ambience = ['ambient','research','canyon','ice','outpost'].includes(mission.ambience) ? mission.ambience : 'ambient';
        this.currentTheme = ambience;
        this.currentSituation = (kind === 'briefing' ? 'planning' : 'exploration');
        const path = `assets/audio/mars-${ambience}.mp3`;
        if (!this.activeChannel.src.endsWith(path)) {
            this.crossfadeTo(path, 2.0);
        }
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
        if (this.failure?.key === key && this.failure.text && FAILURE_AUDIO[this.failure.text]) {
            const audioPath = FAILURE_AUDIO[this.failure.text];
            this.error = '';
            if (!automatic && this.current === key && !this.voice.paused) { this.voice.pause(); return; }
            if (this.current !== key) {
                this.voice.pause();
                this.current = key;
                this.voice.src = audioPath;
            }
            if (this.voice.ended) this.voice.currentTime = 0;
            this.voice.play().catch(error => {
                if (error.name !== 'AbortError') {
                    if (automatic && error.name === 'NotAllowedError') this.pendingNarration = key;
                    this.error = error.name === 'NotAllowedError' ? 'Zum automatischen Vorlesen einmal die Seite antippen.' : 'Wiedergabe nicht möglich. Bitte erneut antippen.';
                    this.sync();
                }
            });
            return;
        }
        const spokenMission = CAMPAIGN_MISSIONS.find(m => m.narration === 'browser' && (key === `${m.id}_briefing` || key === `${m.id}_debriefing`));
        const spokenText = spokenMission ? spokenMission[key.endsWith('_briefing') ? 'briefing' : 'debriefing'] : null;
        if (this.failure?.key === key || spokenText) {
            this.error = '';
            this.voice.pause();
            if (!window.speechSynthesis) { this.error = 'Vorlesen dieses Berichts wird von diesem Browser nicht unterstützt.'; this.sync(); return; }
            if (!automatic && this.current === key && this.utterance && this.speaking) {
                window.speechSynthesis.pause(); this.speaking = false; this.sync(); return;
            }
            if (!automatic && this.current === key && this.utterance && !this.speaking && (typeof window.speechSynthesis.speaking === 'undefined' || window.speechSynthesis.speaking)) {
                window.speechSynthesis.resume(); this.speaking = true; this.sync(); return;
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
                this.utterance = null;
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
            const mission = CAMPAIGN_MISSIONS.find(m => key === `${m.id}_briefing` || key === `${m.id}_debriefing`);
            const revision = mission?.audioRevision ? `?v=${encodeURIComponent(mission.audioRevision)}` : '';
            this.voice.src = `assets/audio/${key}.mp3${revision}`;
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
        this.targetDuckFactor = speaking ? .25 : 1.0;

        if (typeof requestAnimationFrame === 'undefined') {
            this.duckFactor = this.targetDuckFactor;
            const targetVol = this.settings.ambienceVolume * this.duckFactor;
            this.activeChannel.volume = targetVol;
            if (this.fadingChannel) this.fadingChannel.volume = targetVol;
        } else {
            // Smooth ducking transition in browser
            if (this.duckFactor !== this.targetDuckFactor && !this.duckAnim) {
                const duckStep = () => {
                    const diff = this.targetDuckFactor - this.duckFactor;
                    const stepSize = (diff < 0 ? 0.08 : 0.04); // Fast duck down (300ms), slower return (700ms)
                    if (Math.abs(diff) <= stepSize) {
                        this.duckFactor = this.targetDuckFactor;
                        this.duckAnim = null;
                    } else {
                        this.duckFactor += Math.sign(diff) * stepSize;
                        this.duckAnim = requestAnimationFrame(duckStep);
                    }
                    const targetVol = this.settings.ambienceVolume * this.duckFactor;
                    if (!this.fadingChannel) {
                        this.activeChannel.volume = targetVol;
                    }
                };
                this.duckAnim = requestAnimationFrame(duckStep);
            } else if (!this.duckAnim && !this.fadingChannel) {
                this.activeChannel.volume = this.settings.ambienceVolume * this.duckFactor;
            }
        }

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
