class CampaignState {
    constructor() {
        this.key = 'redroots_campaign_v1';
        this.completed = {};
        this.finalChoice = null;
        this.storageAvailable = true;
        try {
            const data = JSON.parse(localStorage.getItem(this.key) || 'null');
            if (data?.campaignVersion === 1 && data.completedMissions && typeof data.completedMissions === 'object') {
                for (const m of CAMPAIGN_MISSIONS) {
                    const entry = data.completedMissions[m.id], stars = entry?.stars;
                    if (!(Number.isInteger(stars) && stars >= 1 && stars <= 3)) continue;
                    this.completed[m.id] = { stars };
                    // Additive fields since phase 4; invalid values are dropped, never the stars.
                    const best = entry.best && Object.fromEntries(['spent', 'generations', 'rounds'].filter(k => Number.isInteger(entry.best[k]) && entry.best[k] >= 0).map(k => [k, entry.best[k]]));
                    if (best && Object.keys(best).length) this.completed[m.id].best = best;
                    if (entry.veteran === true) this.completed[m.id].veteran = true;
                }
                if (['consortium', 'open_genomes'].includes(data.finalChoice)) this.finalChoice = data.finalChoice;
            }
        } catch { this.storageAvailable = false; }
    }
    available(index) { return index === 0 || !!this.completed[CAMPAIGN_MISSIONS[index - 1].id]; }
    get genomes() { return ['cell', ...CAMPAIGN_MISSIONS.filter(m => this.completed[m.id]).flatMap(m => [m.reward, ...(m.additionalRewards || [])].filter(Boolean))]; }
    save() {
        try {
            localStorage.setItem(this.key, JSON.stringify({ campaignVersion: 1, selectedHouse: 'marineris', completedMissions: this.completed, unlockedPatterns: this.genomes, finalChoice: this.finalChoice }));
            this.storageAvailable = true;
        } catch { this.storageAvailable = false; }
        return this.storageAvailable;
    }
    // Keeps the best star rating and, per metric, the lowest material, generation and round count.
    record(id, stars, stats = null, expert = false) {
        const previous = this.completed[id] || {};
        const entry = { ...previous, stars: Math.max(previous.stars || 0, stars) };
        if (stats) entry.best = Object.fromEntries(['spent', 'generations', 'rounds'].filter(k => Number.isInteger(stats[k])).map(k => [k, Math.min(previous.best?.[k] ?? Infinity, stats[k])]));
        if (expert) entry.veteran = true;
        this.completed[id] = entry;
        this.save();
    }
    chooseEnding(choice) {
        if (!['consortium', 'open_genomes'].includes(choice) || !this.completed.A5_M05) return false;
        this.finalChoice = choice;
        return this.save();
    }
    reset() {
        const previous = this.completed;
        const previousChoice = this.finalChoice;
        this.completed = {};
        this.finalChoice = null;
        if (!this.save()) { this.completed = previous; this.finalChoice = previousChoice; return false; }
        return true;
    }
    static get passwords() { return ['PALISADE-LANDUNG', 'PALISADE-WURZEL', 'PALISADE-PASS', 'PALISADE-WASSER', 'PALISADE-GRENZE', 'PALISADE-WASSERSTROM', 'PALISADE-SCHLEUSEN', 'PALISADE-FAEHRE', 'PALISADE-ARCHIVE', 'PALISADE-INSELN', 'PALISADE-SCHLUESSEL', 'PALISADE-STILLE', 'PALISADE-RUECKWEG', 'PALISADE-SIEGEL', 'PALISADE-NETZ', 'PALISADE-WAFFENRUHE', 'PALISADE-ZANGE', 'PALISADE-FRONTEN', 'PALISADE-GEGENSTOSS', 'PALISADE-STURMAUGE', 'PALISADE-MORGEN', 'PALISADE-LICHTER', 'PALISADE-TORE', 'PALISADE-VERTEILER', 'PALISADE-ERBE']; }
    static get sectorNames() {
        return CampaignState.passwords.map(p => p.replace('PALISADE-', ''));
    }
    static modInversePow2(a, bits) {
        let mask = (1n << BigInt(bits)) - 1n;
        let x = 1n;
        for (let i = 0; i < 7; i++) x = (x * (2n - (a & mask) * x)) & mask;
        return x & mask;
    }
    static encodeExpedition(ratings) {
        let K = 0;
        for (let i = ratings.length - 1; i >= 0; i--) {
            if (ratings[i] > 0) { K = i + 1; break; }
        }
        if (K === 0) return 'CHRYSE-0';
        const bits = 2 * K;
        const mask = (1n << BigInt(bits)) - 1n;
        let raw = 0n;
        for (let i = 0; i < K; i++) raw |= BigInt((ratings[i] || 0) & 3) << BigInt(2 * i);
        const A_SEED = 0x5851f42d4c957f2dn | 1n;
        const B_SEED = 0x9e3779b97f4a7c15n;
        const A_K = (A_SEED & mask) | 1n;
        const B_K = (BigInt(K) * B_SEED + 0x1337n) & mask;
        const N_prime = (raw * A_K + B_K) & mask;
        const C = Number((N_prime * 37n + BigInt(K) * 73n + 19n) % 97n);
        const combined = N_prime * 100n + BigInt(C);
        const str = combined.toString();
        let formatted;
        if (str.length <= 5) {
            formatted = str;
        } else {
            const parts = [];
            for (let i = 0; i < str.length; i += 4) parts.push(str.slice(i, i + 4));
            formatted = parts.join('-');
        }
        return `${CampaignState.sectorNames[K - 1]}-${formatted}`;
    }
    static decodeExpedition(input) {
        if (!input || typeof input !== 'string') return null;
        const norm = input.trim().toUpperCase().replace(/^PALISADE[-\s]+/, '');
        if (/^(CHRYSE|START|ARES)[-\s]0$/.test(norm)) {
            return Array(CAMPAIGN_MISSIONS.length).fill(0);
        }
        const sepIdx = norm.search(/[-\s]/);
        if (sepIdx < 0) return null;
        const name = norm.slice(0, sepIdx).trim();
        const numPart = norm.slice(sepIdx + 1).replace(/[-\s]/g, '');
        const kIndex = CampaignState.sectorNames.indexOf(name);
        if (kIndex < 0 || !/^\d+$/.test(numPart)) return null;
        const K = kIndex + 1;
        const combined = BigInt(numPart);
        const bits = 2 * K;
        const mask = (1n << BigInt(bits)) - 1n;
        const C = Number(combined % 100n);
        const N_prime = combined / 100n;
        if (N_prime > mask) return null;
        const expectedC = Number((N_prime * 37n + BigInt(K) * 73n + 19n) % 97n);
        if (C !== expectedC) return null;
        const A_SEED = 0x5851f42d4c957f2dn | 1n;
        const B_SEED = 0x9e3779b97f4a7c15n;
        const A_K = (A_SEED & mask) | 1n;
        const B_K = (BigInt(K) * B_SEED + 0x1337n) & mask;
        const inv = CampaignState.modInversePow2(A_K, bits);
        const raw = ((N_prime - B_K) * inv) & mask;
        const ratings = Array(CAMPAIGN_MISSIONS.length).fill(0);
        for (let i = 0; i < K; i++) {
            ratings[i] = Number((raw >> BigInt(2 * i)) & 3n);
        }
        return ratings;
    }
    exportCode() {
        const ratings = CAMPAIGN_MISSIONS.map(m => this.completed[m.id]?.stars || 0);
        return CampaignState.encodeExpedition(ratings);
    }
    importCode(input) {
        if (!input || typeof input !== 'string') return false;
        const code = input.trim().toUpperCase();
        const checkpoint = CampaignState.passwords.indexOf(code);
        let ratings;
        if (checkpoint >= 0) {
            ratings = CAMPAIGN_MISSIONS.map((m, i) => i < checkpoint ? 1 : 0);
        } else {
            const decoded = CampaignState.decodeExpedition(code);
            if (!decoded) return false;
            ratings = decoded;
        }
        // Merge instead of replacing: a transferred code never reduces earned stars.
        ratings.forEach((stars, i) => {
            if (stars) this.completed[CAMPAIGN_MISSIONS[i].id] = { ...this.completed[CAMPAIGN_MISSIONS[i].id], stars: Math.max(stars, this.completed[CAMPAIGN_MISSIONS[i].id]?.stars || 0) };
        });
        this.save();
        return true;
    }

}

class CampaignManager {
    constructor(ui) {
        this.ui = ui;
        this.progress = new CampaignState();
        this.selected = CAMPAIGN_MISSIONS.findIndex((m, i) => this.progress.available(i) && !this.progress.completed[m.id]);
        if (this.selected < 0) this.selected = CAMPAIGN_MISSIONS.length - 1;
        this.overlay = document.createElement('section');
        this.overlay.className = 'campaign-screen';
        this.overlay.hidden = true;
        this.overlay.setAttribute('aria-label', 'Mars-Expedition');
        document.body.append(this.overlay);
        this.hud = document.createElement('section');
        this.hud.className = 'mission-hud';
        this.hud.hidden = true;
        this.hud.setAttribute('aria-label', 'Missionsinformation');
        this.hudBody = document.createElement('div');
        this.hudBody.className = 'mission-hud-body';
        this.hud.append(this.hudBody);
        this.hudToggle = document.createElement('button');
        this.hudToggle.type = 'button';
        this.hudToggle.className = 'mission-hud-toggle';
        this.hudToggle.id = 'btnToggleHud';
        this.hudToggle.setAttribute('aria-label', 'Missions-Info ein- oder ausfahren');
        this.hudToggle.setAttribute('aria-expanded', 'true');
        this.hudToggle.title = 'Missions-Info ein- oder ausfahren';
        this.hudToggle.innerHTML = CampaignManager.toggleIcon(true);
        this.hudToggle.onclick = () => this.toggleHUD();
        this.hud.append(this.hudToggle);
        this.hudCollapsed = false;
        document.querySelector('#app > main').prepend(this.hud);
        // Event toasts sit on the board; they repeat nothing that the HUD does not also show.
        this.toast = document.createElement('div');
        this.toast.className = 'mission-toast';
        this.toast.setAttribute('role', 'status');
        this.toast.setAttribute('aria-live', 'polite');
        this.toast.hidden = true;
        (document.getElementById('canvasContainer') || document.querySelector('#app > main')).append(this.toast);
        this.toastQueue = [];
        document.getElementById('btnCampaign').onclick = () => this.showMap();
        this.showStartProgress();
        // A page transition disposes all simulation timers, canvas listeners and AI work.
        const params = new URLSearchParams(location.search);
        const selected = CAMPAIGN_MISSIONS.findIndex(m => m.id === params.get('sector'));
        if (selected >= 0 && this.progress.available(selected)) this.selected = selected;
        // Failed attempts travel in the retry link and open further hint stages; nothing is stored.
        this.attempt = Math.max(1, Math.min(9, parseInt(params.get('attempt'), 10) || 1));
        this.expert = params.get('expert') === '1';
        this.hudBody.addEventListener('click', event => {
            if (!event.target.closest('[data-more-hint]')) return;
            this.hintLevel++; this.hintOpen = true; this.updateHUD();
        });
        const launch = params.get('mission');
        if (launch) {
            const index = CAMPAIGN_MISSIONS.findIndex(m => m.id === launch);
            if (index >= 0 && this.progress.available(index)) this.start(index);
            else this.showMap();
        } else if (params.has('campaign')) {
            this.showMap();
            if (selected >= 0) this.overlay.querySelector('.expedition-layout').scrollIntoView({block:'start'});
        }
    }
    static toggleIcon(expanded) {
        return `<svg class="icon hud-toggle-icon" aria-hidden="true"><use href="#i-chevron-${expanded ? 'left' : 'right'}"/></svg>`;
    }
    // The campaign card on the start screen shows the saved progress and offers to continue.
    showStartProgress() {
        const line = document.getElementById('campaignProgressLine'), cta = document.querySelector('#btnCampaign .mode-cta');
        const done = Object.keys(this.progress.completed).length;
        if (!line || !done) return;
        const stars = Object.values(this.progress.completed).reduce((sum, v) => sum + v.stars, 0);
        line.hidden = false;
        line.textContent = `${done} / ${CAMPAIGN_MISSIONS.length} Sektoren gesichert · ★ ${stars} / ${CAMPAIGN_MISSIONS.length * 3}`;
        if (cta && done < CAMPAIGN_MISSIONS.length) cta.innerHTML = 'Expedition fortsetzen <span aria-hidden="true">→</span>';
    }
    navigateToMap(index) { location.href = `${location.pathname}?campaign&sector=${CAMPAIGN_MISSIONS[index].id}`; }
    navigate(index, attempt = 1, expert = false) { location.href = `${location.pathname}?mission=${CAMPAIGN_MISSIONS[index].id}${attempt > 1 ? `&attempt=${attempt}` : ''}${expert ? '&expert=1' : ''}`; }
    hintStages(m) { return m.hints || [m.hint]; }
    showMap() {
        const m = CAMPAIGN_MISSIONS[this.selected];
        const visible = CAMPAIGN_MISSIONS.filter(n => n.act === m.act);
        const act = CAMPAIGN_ACTS.find(a => a.id === m.act);
        const chapter = act.roman;
        const nextAct = CAMPAIGN_ACTS.find(a => a.id === m.act + 1);
        const actComplete = visible.every(n => this.progress.completed[n.id]);
        const completed = Object.keys(this.progress.completed).length;
        const stars = Object.values(this.progress.completed).reduce((s, v) => s + v.stars, 0);
        this.overlay.hidden = false;
        this.overlay.innerHTML = `
            <header class="expedition-header"><a class="expedition-brand" href="${location.pathname}"><svg class="brand-mark" aria-hidden="true"><use href="#i-brand"/></svg><span class="expedition-brand-text">Red<span>Roots</span><small>EXPEDITION COMMAND</small></span></a><span class="mission-eyebrow">KAMPAGNE / AKT ${chapter}</span><button class="quiet-button" id="campaignClose">← Spielmodi</button>${this.ui.audio.controls()}</header>
            <div class="expedition-intro"><div><div class="mission-eyebrow">PROJECT REDROOTS · ${act.name.toUpperCase()}</div><h1>${act.headline}<br><em>${act.subtitle}</em></h1><p>Das Gedächtnis des roten Bodens · Fünf Akte · fünfundzwanzig Missionen.</p></div><div class="expedition-progress"><strong>${String(completed).padStart(2,'0')}<span> / ${CAMPAIGN_MISSIONS.length}</span></strong><small>SEKTOREN GESICHERT</small><div>★ <span>${stars} / ${CAMPAIGN_MISSIONS.length * 3}</span></div></div></div>
            <nav class="act-tabs" aria-label="Akt auswählen">${CAMPAIGN_ACTS.map(a => { const first = CAMPAIGN_MISSIONS.findIndex(n => n.act === a.id); return `<button data-act="${a.id}" aria-pressed="${m.act === a.id}" ${this.progress.available(first) ? '' : 'disabled'}>Akt ${a.roman} · ${a.name}${this.progress.available(first) ? '' : ' · Gesperrt'}</button>`; }).join('')}</nav>
            ${actComplete ? `<section class="campaign-completion"><h2>Akt ${chapter} abgeschlossen</h2><p>${nextAct ? `Die Reise geht weiter: Akt ${nextAct.roman} · ${nextAct.name} ist jetzt spielbar.` : this.progress.finalChoice === 'consortium' ? 'Das Mars-Konsortium beginnt seine gemeinsame Wache über Wasserwege und Sperrkorridore.' : this.progress.finalChoice === 'open_genomes' ? 'Die PALISADE-Archive sind frei; ein gemeinsamer Vertrag schützt die Grenzen der lokalen Genome.' : 'Alle fünfundzwanzig Sektoren sind gesichert. Im letzten Missionsbericht wartet noch die Entscheidung über die gemeinsame Zukunft.'}</p>${nextAct ? `<button class="launch-button" data-act="${nextAct.id}">Weiter zu Akt ${nextAct.roman} →</button>` : ''}</section>` : ''}<div class="expedition-layout"><div class="mars-chart"><div class="chart-caption">MARS / EXPEDITIONSROUTE </div>
                <div class="mars-globe"><div class="mars-surface"></div><div class="mars-grid"></div>
                    <svg class="route-lines" viewBox="0 0 100 100" aria-hidden="true">${visible.filter(n => this.progress.completed[n.id]).map(n => `<circle cx="${n.point[0]}" cy="${n.point[1]}" r="7" fill="#62ffd52b" stroke="#9bffe044" stroke-width=".2"/>`).join('')}${visible.slice(1).map((n,i) => `<line x1="${visible[i].point[0]}" y1="${visible[i].point[1]}" x2="${n.point[0]}" y2="${n.point[1]}" class="${this.progress.completed[visible[i].id] ? 'explored' : ''}"/>`).join('')}</svg>
                    <span class="planet-label label-tharsis">THARSIS<small>VULKANPLATEAU</small></span><span class="planet-label label-chryse">${m.act === 1 ? 'CHRYSE · LANDEEBENE' : m.act === 2 ? 'HELLAS · WASSERSIEDLUNGEN' : m.act === 3 ? 'OLYMPUS · SCHUTZANLAGE' : m.act === 4 ? 'UTOPIA · STURMFRONT' : 'ARCADIA · FERNLEITUNGEN'}</span><span class="planet-label label-valles">${m.act === 1 ? 'VALLES · SCHLUCHTEN' : m.act === 2 ? 'SCHUTZGÜRTEL' : m.act === 3 ? 'UNTER DEM VULKAN' : m.act === 4 ? 'WASSERADERN' : 'OLYMPUS · HAUPTNETZ'}</span>
                    ${visible.map(n => { const i = CAMPAIGN_MISSIONS.indexOf(n); return `<button style="left:${n.point[0]}%;top:${n.point[1]}%" class="sector-node ${this.progress.completed[n.id] ? 'conquered' : ''} ${i === this.selected ? 'selected' : ''}" data-sector="${i}" ${this.progress.available(i) ? '' : 'disabled'} aria-label="${this.progress.available(i) ? n.title : 'Unbekannter Sektor'}" aria-pressed="${i === this.selected}">${i === this.selected ? '▶' : this.progress.completed[n.id] ? '✓' : this.progress.available(i) ? String(i+1).padStart(2,'0') : '·'}</button>`; }).join('')}
                </div><nav class="sector-list" aria-label="Missionsauswahl">${visible.map(n => { const i = CAMPAIGN_MISSIONS.indexOf(n); return `<button type="button" data-sector="${i}" aria-pressed="${i === this.selected}" ${this.progress.available(i) ? '' : 'disabled'}><span>${String(i+1).padStart(2,'0')}</span> ${this.progress.available(i) ? n.title : 'Unbekannter Sektor'} <span>${i === this.selected ? '▶ AUSGEWÄHLT' : this.progress.completed[n.id] ? (this.progress.completed[n.id].veteran ? '✓ ✦' : '✓') : this.progress.available(i) ? '→' : '🔒'}</span></button>`; }).join('')}</nav><div class="chart-legend"><span>● Gesichert</span><span>◎ Expeditionsziel</span><span>◌ Unbekannt</span></div><div class="chart-transmission"><span class="signal-dot"></span> LANDEFÄHRE / VERBINDUNG STABIL <span>HAUS MARINERIS</span></div></div>
                <article class="mission-briefing"><div class="mission-art"><img src="assets/missions/${m.image || m.id}.webp" alt="${m.title} – Illustration des Missionsschauplatzes" width="1672" height="941" decoding="async"></div><div class="selected-mission-label">▶ AUSGEWÄHLTE MISSION</div><div class="mission-eyebrow">SEKTOR ${String(this.selected+1).padStart(2,'0')}</div><h2>${m.title}</h2><div class="mission-location">${m.region}</div><blockquote>„${m.quote}“</blockquote><p>${m.briefing}</p>${this.ui.audio.narrationButton(m, 'briefing')}${this.progress.completed[m.id] ? `<div class="sector-report"><div class="mission-eyebrow">SEKTOR GESICHERT</div><p>${m.debriefing}</p></div>` : ''}<div class="brief-objective"><small>PRIMÄRZIEL</small><strong>${m.objective.label}</strong>${m.objective.type === 'captureCamps' ? `<p>Je Camp mindestens 3 eigene Zellen und mehr eigene als fremde Flora: ${m.objective.hold} Generationen ohne Unterbrechung halten.</p>` : ''}${m.map.zones.filter(z => z.cache).map(z => `<p>◆ ${z.label}: Kontakt mit lebender Flora bringt +${z.cache} Genmaterial zur nächsten Runde (freiwillig).</p>`).join('')}</div><ul class="bonus-list">${m.bonuses.map(b => `<li>☆ ${b.label}</li>`).join('')}</ul>${this.bestLine(m)}<div class="mission-meta"><span>${m.rounds} RUNDEN</span><span>${m.budget} GENMATERIAL</span></div>${m.reward ? `<div class="genome-reward"><span>GENOM-ENTDECKUNG</span><strong>+ ${[m.reward, ...(m.additionalRewards || [])].filter(Boolean).map(key => CONSTANTS.PATTERNS[key].name).join(' + ')}</strong></div>` : ''}${this.progress.completed[m.id]?.stars === 3 && !m.expert?.disabled ? `<div class="expert-launch"><button class="quiet-button" id="launchExpert">✦ Expertenprotokoll starten</button><small>Weniger Material, stärkere Gegner, keine Hinweise und keine Prognose. Zählt nicht als zusätzlicher Stern.</small></div>` : ''}<button class="launch-button" id="launchMission">${this.progress.completed[m.id] ? 'Sektor erneut betreten' : 'Expedition starten'} <span>→</span></button></article></div>
            <section class="genome-archive"><div><div class="mission-eyebrow">FORSCHUNG / GENARCHIV</div><h3>Aus einfachen Regeln entsteht Leben.</h3></div><div class="genome-cards">${Object.keys(CONSTANTS.PATTERNS).map(key => {
                const p = CONSTANTS.PATTERNS[key], unlocked = this.progress.genomes.includes(key);
                return `<div class="genome-card ${unlocked ? '' : 'locked'}"><span class="genome-shape">${patternPreviewSvg(p.pattern)}</span><strong>${unlocked ? p.name : 'Verschlüsselt'}</strong><small>${unlocked ? p.cost+' Material' : 'Forschung ausstehend'}</small></div>`;
            }).join('')}</div></section><section class="story-archive progress-tools"><div class="mission-eyebrow">EXPEDITION / SPIELSTAND</div><h3>Deine Reise mitnehmen.</h3><p>Dieser Browser speichert abgeschlossene Missionen, Sterne und Forschung. Mit dem Expeditionscode kannst du sie auf einem anderen Gerät übernehmen. Eine laufende Mission wird nicht gespeichert.</p><label for="expeditionCode">Dein Expeditionscode · inklusive Sterne</label><div class="code-controls"><input id="expeditionCode" readonly value="${this.progress.exportCode()}" spellcheck="false"><button id="copyExpeditionCode" class="quiet-button">Code kopieren</button></div><form id="importExpedition"><label for="importCode">Expeditionscode oder Sektorpasswort eingeben</label><div class="code-controls"><input id="importCode" maxlength="80" placeholder="z. B. PASS-… oder PALISADE-…" required autocomplete="off" spellcheck="false"><button class="quiet-button" type="submit">Übernehmen</button></div></form><p>Vorhandene Sterne bleiben erhalten. Sektorpasswörter werten frühere Missionen mit einem Stern und öffnen ihre Forschung und Sektorberichte.</p><button id="resetCampaign" class="quiet-button">Kampagne zurücksetzen</button><div id="resetConfirmation" hidden><p>Alle Kampagnensterne, Sektoren und Sektorberichte auf diesem Gerät zurücksetzen? Sichere zuvor deinen Expeditionscode. Gefecht-Einstellungen bleiben erhalten.</p><button id="confirmReset" class="quiet-button">Ja, Kampagne zurücksetzen</button> <button id="cancelReset" class="quiet-button">Abbrechen</button></div><p id="progressMessage" role="status" aria-live="polite"></p></section><footer class="campaign-footer">${!this.progress.storageAvailable ? 'Speichern nicht verfügbar. Fortschritt bleibt nur bis zum Verlassen dieser Seite erhalten.' : 'Fortschritt wird auf diesem Gerät gespeichert.'}<span>FÜNF AKTE · 25 handgebaute Missionen</span></footer>`;
        this.overlay.querySelectorAll('[data-act]').forEach(button => button.onclick = () => {
            const act = Number(button.dataset.act);
            const index = CAMPAIGN_MISSIONS.findIndex((n, i) => n.act === act && this.progress.available(i) && !this.progress.completed[n.id]);
            this.selected = index >= 0 ? index : CAMPAIGN_MISSIONS.findIndex(n => n.act === act);
            this.showMap();
        });
        this.ui.audio.stopNarration();
        this.ui.audio.scene = null;
        this.ui.audio.startGameAmbience(m);
        this.overlay.querySelector('#campaignClose').onclick = () => { this.ui.audio.stopNarration(); this.ui.audio.scene = null; this.overlay.hidden = true; document.getElementById('btnCampaign').focus(); };
        const message = text => { this.overlay.querySelector('#progressMessage').textContent = text; };
        this.overlay.querySelector('#copyExpeditionCode').onclick = async () => {
            const input = this.overlay.querySelector('#expeditionCode');
            input.focus(); input.select();
            try { await navigator.clipboard.writeText(input.value); message('Expeditionscode kopiert.'); }
            catch { message('Code markiert. Bitte mit Strg+C / Cmd+C oder über das Auswahlmenü kopieren.'); }
        };
        this.overlay.querySelector('#importExpedition').onsubmit = e => {
            e.preventDefault();
            if (!this.progress.importCode(this.overlay.querySelector('#importCode').value)) {
                message('Code ungültig. Bitte Schreibweise und Prüfziffer prüfen.'); return;
            }
            this.selected = CAMPAIGN_MISSIONS.reduce((last, m, i) => this.progress.available(i) ? i : last, 0);
            this.showMap();
            this.overlay.querySelector('#progressMessage').textContent = this.progress.storageAvailable ? 'Fortschritt übernommen und gespeichert. Vorhandene Bestwertungen bleiben erhalten.' : 'Code übernommen, aber Speichern ist blockiert. Vor dem Verlassen den Expeditionscode sichern.';
            this.overlay.querySelector('#launchMission').focus();
        };
        this.overlay.querySelector('#resetCampaign').onclick = () => {
            this.overlay.querySelector('#resetConfirmation').hidden = false;
            this.overlay.querySelector('#cancelReset').focus();
        };
        this.overlay.querySelector('#cancelReset').onclick = () => { this.overlay.querySelector('#resetConfirmation').hidden = true; this.overlay.querySelector('#resetCampaign').focus(); };
        this.overlay.querySelector('#confirmReset').onclick = () => {
            if (!this.progress.reset()) { message('Zurücksetzen nicht möglich: Der Browser blockiert das Speichern.'); return; }
            this.selected = 0; this.showMap();
            this.overlay.querySelector('#progressMessage').textContent = 'Kampagne zurückgesetzt. Dein bisheriger Expeditionscode bleibt zum Wiederherstellen gültig.';
            this.overlay.querySelector('#launchMission').focus();
        };
        this.overlay.querySelector('#launchMission').onclick = () => this.navigate(this.selected);
        const expertButton = this.overlay.querySelector('#launchExpert');
        if (expertButton) expertButton.onclick = () => this.navigate(this.selected, 1, true);
        this.overlay.querySelectorAll('[data-sector]').forEach(btn => btn.onclick = () => { this.selected = Number(btn.dataset.sector); this.showMap(); this.overlay.querySelector(`[data-sector="${this.selected}"]`).focus(); });
    }
    bestLine(m) {
        const entry = this.progress.completed[m.id];
        if (!entry?.best && !entry?.veteran) return '';
        const best = entry.best || {}, parts = [];
        if (best.spent !== undefined) parts.push(`${best.spent} Material`);
        if (best.generations !== undefined) parts.push(`Generation ${best.generations}`);
        if (best.rounds !== undefined) parts.push(`Runde ${best.rounds}`);
        return `<p class="best-line">${parts.length ? `Bestwert: ${parts.join(' · ')}` : ''}${entry.veteran ? `${parts.length ? ' · ' : ''}✦ Expertenprotokoll bestanden` : ''}</p>`;
    }
    start(index) {
        this.selected = index;
        document.body.classList.add('in-mission');
        // The expert protocol is a modified copy of the mission, open after three stars.
        const base = CAMPAIGN_MISSIONS[index];
        const mission = this.expert && this.progress.completed[base.id]?.stars === 3 && !base.expert?.disabled ? expertMission(base) : base;
        this.hintLevel = Math.min(this.attempt, this.hintStages(mission).length);
        this.ui.startGame(MissionManager.config(mission));
        this.hud.hidden = false;
        this.expandHUD();
        this.ui.elBtnFinishTurn.innerHTML = `Evolution starten<br><span class="btn-sub">${this.ui.gameState.stepsPerRound} Generationen →</span>`;
        this.updateHUD();
        this.ui.elPatternList.querySelector('[data-pattern="cell"]').click();
        this.ui.audio.enterScene(CAMPAIGN_MISSIONS[index], 'briefing');
    }
    hintDetails(m) {
        if (!this.hintStages(m).length) return `<details class="hud-hints"><summary>Ziel · Expertenprotokoll</summary><div class="hud-hints-body"><p><strong>${m.objective.label}</strong></p><p>Expertenprotokoll: weniger Material, stärkere Gegner, keine Hinweise und keine Prognose.</p></div></details>`;
        const stages = this.hintStages(m), level = Math.max(1, Math.min(this.hintLevel || 1, stages.length));
        return `<details class="hud-hints"><summary>Ziel &amp; Hinweis · Stufe ${level}/${stages.length}</summary><div class="hud-hints-body"><p><strong>${m.objective.label}</strong></p>${stages.slice(0, level).map((text, i) => `<p class="${i === level - 1 ? 'hint-current' : 'hint-earlier'}">${text}</p>`).join('')}${level < stages.length ? '<button type="button" class="quiet-button" data-more-hint>Mehr Hilfe</button>' : ''}</div></details>`;
    }
    // Rewinds to the start of a round in place; the page and its listeners stay, so clean up explicitly.
    rewind(round) {
        const m = this.ui.gameState.scenario;
        this.ui.audio.stopNarration(); this.ui.audio.scene = null;
        document.querySelector('.failure-return')?.remove();
        clearTimeout(this.toastTimer); this.toastTimer = null; this.toastQueue = []; this.toast.hidden = true;
        this.lastTick = null; this.calmSince = null;
        this.attempt++;
        this.hintLevel = Math.max(this.hintLevel || 1, Math.min(this.attempt, this.hintStages(m).length));
        this.overlay.hidden = true;
        if (!this.ui.gameState.restoreCheckpoint(round)) { this.navigate(this.selected, this.attempt); return; }
        this.ui.render();
    }
    collapseHUD() {
        this.hudCollapsed = true;
        this.hud.classList.add('collapsed');
        if (this.hudToggle) {
            this.hudToggle.setAttribute('aria-expanded', 'false');
            this.hudToggle.innerHTML = CampaignManager.toggleIcon(false);
        }
    }
    expandHUD() {
        this.hudCollapsed = false;
        this.hud.classList.remove('collapsed');
        if (this.hudToggle) {
            this.hudToggle.setAttribute('aria-expanded', 'true');
            this.hudToggle.innerHTML = CampaignManager.toggleIcon(true);
        }
    }
    toggleHUD() {
        if (this.hudCollapsed) this.expandHUD();
        else this.collapseHUD();
    }
    updateHUD() {
        const s = this.ui.gameState;
        if (!s?.objectiveSystem) return;
        const o = s.objectiveSystem, m = s.scenario;
        const target = this.hudBody || this.hud;
        this.hintOpen = target.querySelector('details')?.open ?? this.hintOpen;
        const countdown = s.phase !== CONSTANTS.PHASE_GAMEOVER ? o.countdown() : null, threat = o.worstThreat();
        const threatText = threat && !threat.distance ? (threat.kind === 'locked' ? 'zu früh berührt' : 'Flora hat die Zone erreicht') : threat ? (threat.kind === 'locked' ? `eigene Flora ${threat.distance} Felder entfernt – Schalter wartet noch` : threat.kind === 'sterile' ? `Flora ${threat.distance} Felder vor der Sperrzone` : `fremde Flora ${threat.distance} Felder entfernt`) : '';
        const progress = [o.progressText, countdown ? `<span class="objective-countdown${countdown.remaining <= 10 ? ' urgent' : ''}">⏱ ${countdown.label} ${countdown.remaining} Gen.</span>` : ''].filter(Boolean).join(' · ');
        const upcoming = s.upcomingEvents?.()[0];
        const warning = upcoming ? `<p class="objective-progress objective-alert objective-event">⚡ Vorwarnung (${upcoming.when}): ${upcoming.text}</p>` : '';
        const status = `${threat ? `<p class="objective-progress objective-alert ${threat.level}">⚠ ${threat.label}: ${threatText}</p>` : ''}${warning}${progress ? `<p class="objective-progress">${progress}</p>` : ''}`;
        target.innerHTML = `<div class="hud-head"><span class="hud-sector">Akt ${CAMPAIGN_ACTS.find(a => a.id === m.act).roman} · Sektor ${String(this.selected+1).padStart(2,'0')}${m.expertMode ? ' · <em>✦ Experte</em>' : ''}<b> · ${m.title}</b></span><a class="hud-map-link" href="${location.pathname}?campaign"><svg class="icon" aria-hidden="true"><use href="#i-map"/></svg><span>Marskarte</span></a></div><h2 class="hud-title">${m.title}</h2><p class="hud-objective">${m.objective.label}</p><div class="hud-status">${status}</div><div class="hud-telemetry"><span>Gen ${String(o.generations).padStart(3,'0')}</span><span>${o.spent} Material eingesetzt</span></div>${this.hintDetails(m)}`;
        // Preserve an opened hint across frequent simulation renders.
        if (this.hintOpen) target.querySelector('details').open = true;
        this.processEvents();
    }
    // Turns objective events into toasts and signals and drives the simulation's tension music.
    processEvents() {
        const s = this.ui.gameState, o = s?.objectiveSystem;
        if (!o) return;
        const audio = this.ui.audio;
        for (const e of o.events.splice(0)) {
            const zone = e.zoneId === 'camp' ? s.territory.camps.find(c => c.id === 0) : o.zone(e.zoneId);
            this.radio(s.scenario, e);
            if (e.type === 'collect' || e.type === 'switch') this.notify(`✓ ${e.label} gesichert`, 'success', zone);
            if (e.type === 'captured') this.notify(`✓ ${e.label} erobert`, 'success', zone);
            if (e.type === 'cache') this.notify(`◆ ${e.label}: +${e.amount} Genmaterial zur nächsten Runde`, 'success', zone);
            if (e.type === 'announce') this.notify(`⚡ Vorwarnung: ${e.text}`, 'warning');
            if (e.type === 'scenario') this.notify(`⚡ ${e.text}`, 'alarm');
            if (e.type === 'houseDefeated') this.notify(`${CONSTANTS.PLAYER_COLORS[e.house].name} sät nicht mehr nach`, 'success');
            if (e.type === 'captureLost') this.notify(`${e.label}: Mehrheit verloren – Eroberung beginnt neu`, 'lost', zone);
            if (e.type === 'holdLost') this.notify(`Kontakt verloren nach ${e.held} Generationen – Haltezähler neu`, 'lost');
            if (e.type === 'threat') {
                const what = e.kind === 'locked' ? 'Eigene Flora nähert sich dem wartenden Schalter' : e.kind === 'sterile' ? 'Flora nähert sich der Sperrzone' : 'Fremde Flora nähert sich';
                this.notify(`${e.level === 'alarm' ? '⛔ ALARM' : '⚠'} ${e.label}: ${what} (${e.distance} Felder)`, e.level, zone, `threat:${e.zoneId}`);
            }
        }
        for (const line of (this.radioQueue || []).splice(0)) this.notify(`${line.voice}: „${line.text}“`, null, null, `radio:${line.on}`);
        if (s.phase !== CONSTANTS.PHASE_SIMULATION || !audio) return;
        const countdown = o.countdown();
        if (countdown && countdown.remaining > 0 && countdown.remaining <= 5 && countdown.remaining !== this.lastTick) { this.lastTick = countdown.remaining; audio.cue('tick'); }
        const goal = s.scenario.objective, nearGoal = (goal.zones || []).some(id => (o.zoneStatus(id).progress || 0) >= .75);
        if (o.worstThreat()?.level === 'alarm' || nearGoal) { this.calmSince = null; audio.setSituation('tension'); }
        else if (audio.currentSituation === 'tension') {
            this.calmSince ??= o.generations;
            if (o.generations - this.calmSince >= 30) { this.calmSince = null; audio.setSituation('simulation'); }
        }
    }
    // Each radio line plays once per mission run, after the event toast it belongs to.
    radio(m, e) {
        const id = e.zoneId ?? e.house ?? e.eventId;
        const keys = [e.type, id !== undefined ? `${e.type}:${id}` : null, e.type === 'threat' && e.level === 'alarm' ? `alarm:${e.zoneId}` : null].filter(Boolean);
        this.radioUsed ??= new Set();
        const line = (m.radio || []).find(r => keys.includes(r.on) && !this.radioUsed.has(r.on));
        if (!line) return;
        this.radioUsed.add(line.on);
        (this.radioQueue ??= []).push(line);
    }
    notify(text, cue, zone = null, key = null) {
        if (cue) this.ui.audio?.cue?.(cue);
        if (!this.toast) return;
        // A newer message about the same zone replaces an older one that is still waiting or showing.
        if (key) this.toastQueue = this.toastQueue.filter(t => t.key !== key);
        this.toastQueue.push({ text, zone, key, urgent: cue === 'alarm' });
        if (key && this.toastTimer && this.currentToastKey === key) { clearTimeout(this.toastTimer); this.toastTimer = null; }
        // Keep the queue short; alarms are never dropped in favour of older news.
        while (this.toastQueue.length > 3) { const stale = this.toastQueue.findIndex(t => !t.urgent); this.toastQueue.splice(stale < 0 ? 0 : stale, 1); }
        if (!this.toastTimer) this.nextToast();
    }
    nextToast() {
        const item = this.toastQueue.shift();
        this.currentToastKey = item?.key;
        if (!item) { this.toast.hidden = true; this.toastTimer = null; return; }
        this.toast.hidden = false;
        this.toast.className = `mission-toast${item.urgent ? ' urgent' : ''}`;
        this.toast.innerHTML = `<span></span>${item.zone ? '<button type="button" class="quiet-button">Zum Ort</button>' : ''}`;
        this.toast.querySelector('span').textContent = item.text;
        if (item.zone) this.toast.querySelector('button').onclick = () => this.ui.renderer?.focusCell((item.zone.rMin + item.zone.rMax) / 2, (item.zone.cMin + item.zone.cMax) / 2);
        this.toastTimer = setTimeout(() => this.nextToast(), item.urgent ? 3200 : 2400);
    }
    onPhaseChange(phase) {
        const s = this.ui.gameState;
        if (phase !== CONSTANTS.PHASE_SIMULATION || !s?.roundPlacements) return;
        s.roundPlacements.forEach((placements, player) => {
            if (player && placements.length) this.notify(`Aufklärung: ${CONSTANTS.PLAYER_COLORS[player].name} setzt ${placements.length} neue ${placements.length === 1 ? 'Kolonie' : 'Kolonien'}`, null);
        });
    }
    nextHint(m) {
        const stages = this.hintStages(m), level = Math.min((this.hintLevel || 1) + 1, stages.length);
        if (!stages.length) return '';
        return `<div class="result-hint"><small>HINWEIS FÜR DEN NÄCHSTEN VERSUCH · STUFE ${level}/${stages.length}</small><p>${stages[level - 1]}</p></div>`;
    }
    rewindOptions() {
        const rounds = Object.keys(this.ui.gameState.checkpoints || {}).map(Number).sort((a, b) => a - b);
        if (!rounds.length) return '';
        return `<section class="rewind-options"><small>NEU PLANEN</small><p>Die Mission springt an den Anfang der gewählten Runde zurück. Deine damaligen Platzierungen sind wieder gesetzt; mit Rückgängig änderst du sie.</p><div>${rounds.map(r => `<button type="button" class="quiet-button" data-rewind="${r}">Runde ${r} neu planen</button>`).join('')}</div></section>`;
    }
    // Mission timeline: own vs. foreign flora per generation, with the decisive events marked.
    timelineHtml(o, result) {
        const t = o.timeline;
        if (!t || t.generation.length < 2) return '';
        const W = 560, H = 120, pad = { l: 34, r: 70, t: 10, b: 22 }, last = t.generation.at(-1);
        const max = Math.max(4, ...t.own, ...t.foreign), x = g => pad.l + (W - pad.l - pad.r) * g / last, y = v => pad.t + (H - pad.t - pad.b) * (1 - v / max);
        const line = values => values.map((v, i) => `${x(t.generation[i]).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
        const names = { collect: '✓ gesichert', switch: '✓ Schalter', captured: '✓ erobert', houseDefeated: 'Nachsaat gestoppt', cache: '◆ Vorrat', scenario: '⚡ Ereignis', holdLost: 'Kontakt verloren', captureLost: 'Mehrheit verloren', threat: '⚠ Alarm' };
        const marks = o.log.filter(e => names[e.type] && (e.type !== 'threat' || e.level === 'alarm') && e.generation !== undefined).slice(0, 8);
        if (!result.success && result.failure?.generation) marks.push({ type: 'failure', generation: result.failure.generation, label: result.failure.label });
        const markText = e => `Gen ${e.generation}: ${e.type === 'failure' ? `Durchbruch${e.label ? ` · ${e.label}` : ''}` : `${names[e.type]}${e.label ? ` · ${e.label}` : e.house ? ` · ${CONSTANTS.PLAYER_COLORS[e.house].name}` : ''}`}`;
        const ticks = [0, Math.round(last / 2), last];
        this.timelineData = { t, x, W, pad, last };
        const rows = t.generation.filter((_, i) => i % Math.max(1, Math.ceil(t.generation.length / 12)) === 0 || i === t.generation.length - 1);
        return `<figure class="mission-timeline"><figcaption>Verlauf der Mission</figcaption>
            <div class="timeline-legend"><span><i class="swatch own"></i>Eigene Flora</span><span><i class="swatch foreign"></i>Fremde Flora und Wildwuchs</span></div>
            <div class="timeline-plot"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Lebende Zellen je Generation: eigene Flora höchstens ${Math.max(...t.own)}, fremde Flora höchstens ${Math.max(...t.foreign)}, über ${last} Generationen.">
            <line x1="${pad.l}" x2="${W - pad.r}" y1="${y(0)}" y2="${y(0)}" class="tl-axis"/><line x1="${pad.l}" x2="${W - pad.r}" y1="${y(max)}" y2="${y(max)}" class="tl-grid"/>
            <text x="${pad.l - 6}" y="${y(max) + 4}" text-anchor="end" class="tl-label">${max}</text><text x="${pad.l - 6}" y="${y(0) + 4}" text-anchor="end" class="tl-label">0</text>
            ${ticks.map(g => `<text x="${x(g)}" y="${H - 6}" text-anchor="middle" class="tl-label">Gen ${g}</text>`).join('')}
            ${marks.map(e => `<line x1="${x(e.generation)}" x2="${x(e.generation)}" y1="${pad.t}" y2="${y(0)}" class="tl-mark${e.type === 'failure' ? ' failure' : ''}"><title>${markText(e)}</title></line>`).join('')}
            <polyline points="${line(t.foreign)}" class="tl-line foreign"/><polyline points="${line(t.own)}" class="tl-line own"/>
            ${(() => { let a = y(t.own.at(-1)), b = y(t.foreign.at(-1)); if (Math.abs(a - b) < 12) { if (a <= b) { a -= 6; b += 6; } else { a += 6; b -= 6; } } return `<text x="${W - pad.r + 6}" y="${a + 4}" class="tl-end">eigene ${t.own.at(-1)}</text><text x="${W - pad.r + 6}" y="${b + 4}" class="tl-end">fremde ${t.foreign.at(-1)}</text>`; })()}
            <line class="tl-cross" y1="${pad.t}" y2="${y(0)}" x1="${pad.l}" x2="${pad.l}" style="display:none"/><rect class="tl-hit" x="${pad.l}" y="0" width="${W - pad.l - pad.r}" height="${H}"/></svg><div class="timeline-tip" hidden></div></div>
            ${marks.length ? `<ol class="timeline-events">${marks.map(e => `<li>${markText(e)}</li>`).join('')}</ol>` : ''}
            <details class="timeline-table"><summary>Als Tabelle anzeigen</summary><table><thead><tr><th>Generation</th><th>Eigene Flora</th><th>Fremde Flora</th></tr></thead><tbody>${rows.map(g => { const i = t.generation.indexOf(g); return `<tr><td>${g}</td><td>${t.own[i]}</td><td>${t.foreign[i]}</td></tr>`; }).join('')}</tbody></table></details></figure>`;
    }
    bindTimeline() {
        const figure = this.overlay.querySelector('.mission-timeline'), data = this.timelineData;
        if (!figure || !data) return;
        const svg = figure.querySelector('svg'), tip = figure.querySelector('.timeline-tip'), cross = figure.querySelector('.tl-cross');
        const show = event => {
            const box = svg.getBoundingClientRect(), px = (event.touches?.[0] ?? event).clientX;
            const vx = (px - box.left) / box.width * data.W;
            const g = Math.max(0, Math.min(data.last, (vx - data.pad.l) / (data.W - data.pad.l - data.pad.r) * data.last));
            let i = 0;
            for (let k = 1; k < data.t.generation.length; k++) if (Math.abs(data.t.generation[k] - g) < Math.abs(data.t.generation[i] - g)) i = k;
            const gx = data.x(data.t.generation[i]);
            cross.setAttribute('x1', gx); cross.setAttribute('x2', gx); cross.style.display = '';
            tip.hidden = false;
            tip.textContent = `Gen ${data.t.generation[i]} · eigene ${data.t.own[i]} · fremde ${data.t.foreign[i]}`;
            tip.style.left = `${Math.min(box.width - 170, Math.max(0, gx / data.W * box.width - 85))}px`;
        };
        const hide = () => { tip.hidden = true; cross.style.display = 'none'; };
        const hit = figure.querySelector('.tl-hit');
        hit.addEventListener('pointermove', show); hit.addEventListener('pointerleave', hide);
        hit.addEventListener('touchstart', show, { passive: true });
    }
    showResult() {
        this.ui.audio.stopNarration();
        clearTimeout(this.toastTimer); this.toastTimer = null; this.toastQueue = []; this.toast.hidden = true;
        this.updateHUD();
        document.querySelector('.failure-return')?.remove();
        const s = this.ui.gameState, result = s.objectiveSystem.result, m = s.scenario;
        const newlyUnlocked = result.success && !this.progress.completed[m.id];
        if (result.success) this.progress.record(m.id, result.stars, result.stats, !!m.expertMode);
        this.overlay.hidden = false;
        const ending = m.finalChoices && result.success ? `<section class="campaign-completion"><div class="mission-eyebrow">DIE GEMEINSAME ZUKUNFT</div><h2>${this.progress.finalChoice ? 'Entscheidung gespeichert' : 'Wer trägt die Verantwortung?'}</h2><p>${this.progress.finalChoice ? m.finalChoices.find(c => c.id === this.progress.finalChoice).text : 'Beide Wege bewahren das verteilte Netz. Sie unterscheiden sich darin, wem Kontrolle und Wissen anvertraut werden.'}</p>${this.progress.finalChoice ? `<strong>${m.finalChoices.find(c => c.id === this.progress.finalChoice).title}</strong>` : m.finalChoices.map(c => `<button class="quiet-button" data-ending="${c.id}"><strong>${c.title}</strong><br>${c.text}</button>`).join('')}</section>` : '';
        this.overlay.innerHTML = `<div class="mission-result ${result.success ? 'is-success' : 'is-failure'}"><div class="mission-eyebrow">LANDEFÄHRE / MISSIONSBERICHT${m.expertMode ? ` · ✦ EXPERTENPROTOKOLL ${result.success ? 'BESTANDEN' : ''}` : ''}</div><div class="result-stars">${'★'.repeat(result.stars)}${'☆'.repeat(3-result.stars)}</div><h1>${result.success ? 'Wurzeln geschlagen.' : 'Signal verloren.'}</h1><h2>${m.title}</h2><p>${result.reason}</p>${this.ui.audio.narrationButton(m, result.success ? 'debriefing' : 'failure')}${this.ui.audio.controls()}${result.details?.length ? `<ul class="result-analysis">${result.details.map(d => `<li>${d}</li>`).join('')}</ul>${result.failure?.cells.length ? '<button type="button" class="quiet-button" id="viewFailure">Moment ansehen</button>' : ''}` : ''}${this.timelineHtml(s.objectiveSystem, result)}<ul class="result-objectives"><li>${result.success ? '✓' : '○'} ${m.objective.label}</li>${m.bonuses.map((b,i) => `<li>${result.bonuses[i] ? '★' : '☆'} ${b.label}</li>`).join('')}</ul>${result.success && m.reward ? `<div class="genome-reward"><span>${newlyUnlocked ? 'NEUE GENOMSTRUKTUR ENTDECKT' : 'GENOM ARCHIVIERT'}</span><strong>${[m.reward, ...(m.additionalRewards || [])].filter(Boolean).map(key => CONSTANTS.PATTERNS[key].name).join(' + ')}</strong></div>` : !result.success ? this.nextHint(m) : ''}${!result.success ? this.rewindOptions() : ''}${ending}${!this.progress.storageAvailable ? '<p>Fortschritt konnte nicht gespeichert werden.</p>' : ''}${result.success ? `<div class="result-code"><label for="resultCode">Expeditionscode zum Mitnehmen</label><input id="resultCode" readonly value="${this.progress.exportCode()}" onclick="this.select()"><small>Sektorpasswort: ${CampaignState.passwords[Math.min(this.selected + 1, CAMPAIGN_MISSIONS.length - 1)]}</small></div>` : ''}<div class="result-actions"><a class="quiet-button" href="${location.pathname}?campaign">Zur Marskarte</a><button class="launch-button" id="resultContinue">${result.success && this.selected < CAMPAIGN_MISSIONS.length - 1 ? 'Nächster Sektor · Marskarte →' : result.success ? 'Expedition auf der Marskarte ansehen →' : 'Erneut versuchen ↻'}</button></div>${result.success && this.selected === CAMPAIGN_MISSIONS.length - 1 ? '<p class="mission-eyebrow">AKT V ABGESCHLOSSEN · DAS NETZ IST GETEILT UND VERBUNDEN</p>' : ''}</div>`;
        this.overlay.querySelectorAll('[data-ending]').forEach(button => button.onclick = () => { this.progress.chooseEnding(button.dataset.ending); this.showResult(); });
        this.bindTimeline(s.objectiveSystem);
        const viewFailure = this.overlay.querySelector('#viewFailure');
        if (viewFailure) viewFailure.onclick = () => {
            this.overlay.hidden = true;
            const back = document.createElement('button');
            back.type = 'button'; back.className = 'launch-button failure-return'; back.textContent = 'Zurück zum Bericht';
            back.onclick = () => { back.remove(); this.overlay.hidden = false; this.overlay.querySelector('#viewFailure').focus(); };
            document.body.append(back);
            const { r, c } = result.failure.cells[0];
            this.ui.renderer.focusCell(r, c);
            back.focus();
        };
        this.overlay.querySelectorAll('[data-rewind]').forEach(button => button.onclick = () => this.rewind(Number(button.dataset.rewind)));
        this.overlay.querySelector('#resultContinue').onclick = () => result.success ? this.navigateToMap(Math.min(this.selected+1, CAMPAIGN_MISSIONS.length-1)) : this.navigate(this.selected, Math.max(this.attempt, this.hintLevel || 1) + 1, !!m.expertMode);
        if (result.success) this.ui.audio.enterScene(m, 'debriefing');
        else this.ui.audio.failureReport(m, result.reason);
        this.overlay.querySelector('#resultContinue').focus();
    }
}
