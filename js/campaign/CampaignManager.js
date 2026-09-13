class CampaignState {
    constructor() {
        this.key = 'redroots_campaign_v1';
        this.completed = {};
        this.storageAvailable = true;
        try {
            const data = JSON.parse(localStorage.getItem(this.key) || 'null');
            if (data?.campaignVersion === 1 && data.completedMissions && typeof data.completedMissions === 'object') {
                for (const m of CAMPAIGN_MISSIONS) {
                    const stars = data.completedMissions[m.id]?.stars;
                    if (Number.isInteger(stars) && stars >= 1 && stars <= 3) this.completed[m.id] = { stars };
                }
            }
        } catch { this.storageAvailable = false; }
    }
    available(index) { return index === 0 || !!this.completed[CAMPAIGN_MISSIONS[index - 1].id]; }
    get genomes() { return ['cell', ...CAMPAIGN_MISSIONS.filter(m => this.completed[m.id]).flatMap(m => [m.reward, ...(m.additionalRewards || [])].filter(Boolean))]; }
    save() {
        try {
            localStorage.setItem(this.key, JSON.stringify({ campaignVersion: 1, selectedHouse: 'marineris', completedMissions: this.completed, unlockedPatterns: this.genomes }));
            this.storageAvailable = true;
        } catch { this.storageAvailable = false; }
        return this.storageAvailable;
    }
    record(id, stars) {
        this.completed[id] = { stars: Math.max(this.completed[id]?.stars || 0, stars) };
        this.save();
    }
    reset() {
        const previous = this.completed;
        this.completed = {};
        if (!this.save()) { this.completed = previous; return false; }
        return true;
    }
    // Portable, deliberately not secret. The checksum catches transcription errors.
    static checksum(digits) {
        return [...digits].reduce((sum, digit, i) => sum + Number(digit) * (i + 7), 17).toString(36).toUpperCase().padStart(2, '0');
    }
    exportCode() {
        const digits = CAMPAIGN_MISSIONS.map(m => this.completed[m.id]?.stars || 0).join('');
        return `RR4-${digits}-${CampaignState.checksum(digits)}`;
    }
    static get passwords() { return ['PALISADE-LANDUNG', 'PALISADE-WURZEL', 'PALISADE-PASS', 'PALISADE-WASSER', 'PALISADE-GRENZE', 'PALISADE-WASSERSTROM', 'PALISADE-SCHLEUSEN', 'PALISADE-FAEHRE', 'PALISADE-ARCHIVE', 'PALISADE-INSELN', 'PALISADE-SCHLUESSEL', 'PALISADE-STILLE', 'PALISADE-RUECKWEG', 'PALISADE-SIEGEL', 'PALISADE-NETZ', 'PALISADE-WAFFENRUHE', 'PALISADE-ZANGE', 'PALISADE-FRONTEN', 'PALISADE-GEGENSTOSS', 'PALISADE-STURMAUGE']; }
    importCode(input) {
        const code = input.trim().toUpperCase();
        const checkpoint = CampaignState.passwords.indexOf(code);
        let ratings;
        if (checkpoint >= 0) {
            ratings = CAMPAIGN_MISSIONS.map((m, i) => i < checkpoint ? 1 : 0);
        } else {
            const legacy = /^RR1-([0-3]{5})-([0-9A-Z]{2})$/.exec(code);
            const match = legacy || /^RR2-([0-3]{10})-([0-9A-Z]{2})$/.exec(code) || /^RR3-([0-3]{15})-([0-9A-Z]{2})$/.exec(code) || /^RR4-([0-3]{20})-([0-9A-Z]{2})$/.exec(code);
            if (!match || CampaignState.checksum(match[1]) !== match[2]) return false;
            ratings = [...match[1]].map(Number);
        }
        // Merge instead of replacing: a transferred code never reduces earned stars.
        ratings.forEach((stars, i) => {
            if (stars) this.completed[CAMPAIGN_MISSIONS[i].id] = { stars: Math.max(stars, this.completed[CAMPAIGN_MISSIONS[i].id]?.stars || 0) };
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
        this.hud.className = 'mission-hud'; this.hud.hidden = true;
        document.querySelector('#app > main').prepend(this.hud);
        document.getElementById('btnCampaign').onclick = () => this.showMap();
        // A page transition disposes all simulation timers, canvas listeners and AI work.
        const params = new URLSearchParams(location.search);
        const selected = CAMPAIGN_MISSIONS.findIndex(m => m.id === params.get('sector'));
        if (selected >= 0 && this.progress.available(selected)) this.selected = selected;
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
    navigateToMap(index) { location.href = `${location.pathname}?campaign&sector=${CAMPAIGN_MISSIONS[index].id}`; }
    navigate(index) { location.href = `${location.pathname}?mission=${CAMPAIGN_MISSIONS[index].id}`; }
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
            <header class="expedition-header"><a class="expedition-brand" href="${location.pathname}">RED<span>ROOTS</span><small>EXPEDITION COMMAND</small></a><span class="mission-eyebrow">KAMPAGNE / AKT ${chapter}</span><button class="quiet-button" id="campaignClose">Zurück zum Gefecht ↗</button>${this.ui.audio.controls()}</header>
            <div class="expedition-intro"><div><div class="mission-eyebrow">PROJECT REDROOTS · ${act.name.toUpperCase()}</div><h1>${act.headline}<br><em>${act.subtitle}</em></h1><p>Das Gedächtnis des roten Bodens · Vier Akte · zwanzig Missionen.</p></div><div class="expedition-progress"><strong>${String(completed).padStart(2,'0')}<span> / ${CAMPAIGN_MISSIONS.length}</span></strong><small>SEKTOREN GESICHERT</small><div>★ <span>${stars} / ${CAMPAIGN_MISSIONS.length * 3}</span></div></div></div>
            <nav class="act-tabs" aria-label="Akt auswählen">${CAMPAIGN_ACTS.map(a => { const first = CAMPAIGN_MISSIONS.findIndex(n => n.act === a.id); return `<button data-act="${a.id}" aria-pressed="${m.act === a.id}" ${this.progress.available(first) ? '' : 'disabled'}>Akt ${a.roman} · ${a.name}${this.progress.available(first) ? '' : ' · Gesperrt'}</button>`; }).join('')}</nav>
            ${actComplete ? `<section class="campaign-completion"><h2>Akt ${chapter} abgeschlossen</h2><p>${nextAct ? `Die Reise geht weiter: Akt ${nextAct.roman} · ${nextAct.name} ist jetzt spielbar.` : 'Der Sturmspeicher ist gesichert. Alle zwanzig aktuellen Missionen sind geschafft. Die Entscheidung über die gemeinsame Zukunft folgt in einem späteren Akt.'}</p>${nextAct ? `<button class="launch-button" data-act="${nextAct.id}">Weiter zu Akt ${nextAct.roman} →</button>` : ''}</section>` : ''}<div class="expedition-layout"><div class="mars-chart"><div class="chart-caption">MARS / EXPEDITIONSROUTE </div>
                <div class="mars-globe"><div class="mars-surface"></div><div class="mars-grid"></div>
                    <svg class="route-lines" viewBox="0 0 100 100" aria-hidden="true">${visible.filter(n => this.progress.completed[n.id]).map(n => `<circle cx="${n.point[0]}" cy="${n.point[1]}" r="7" fill="#62ffd52b" stroke="#9bffe044" stroke-width=".2"/>`).join('')}${visible.slice(1).map((n,i) => `<line x1="${visible[i].point[0]}" y1="${visible[i].point[1]}" x2="${n.point[0]}" y2="${n.point[1]}" class="${this.progress.completed[visible[i].id] ? 'explored' : ''}"/>`).join('')}</svg>
                    <span class="planet-label label-tharsis">THARSIS<small>VULKANPLATEAU</small></span><span class="planet-label label-chryse">${m.act === 1 ? 'CHRYSE · LANDEEBENE' : m.act === 2 ? 'HELLAS · WASSERSIEDLUNGEN' : m.act === 3 ? 'OLYMPUS · SCHUTZANLAGE' : 'UTOPIA · STURMFRONT'}</span><span class="planet-label label-valles">${m.act === 1 ? 'VALLES · SCHLUCHTEN' : m.act === 2 ? 'SCHUTZGÜRTEL' : m.act === 3 ? 'UNTER DEM VULKAN' : 'WASSERADERN'}</span>
                    ${visible.map(n => { const i = CAMPAIGN_MISSIONS.indexOf(n); return `<button style="left:${n.point[0]}%;top:${n.point[1]}%" class="sector-node ${this.progress.completed[n.id] ? 'conquered' : ''} ${i === this.selected ? 'selected' : ''}" data-sector="${i}" ${this.progress.available(i) ? '' : 'disabled'} aria-label="${this.progress.available(i) ? n.title : 'Unbekannter Sektor'}" aria-pressed="${i === this.selected}">${i === this.selected ? '▶' : this.progress.completed[n.id] ? '✓' : this.progress.available(i) ? String(i+1).padStart(2,'0') : '·'}</button>`; }).join('')}
                </div><nav class="sector-list" aria-label="Missionsauswahl">${visible.map(n => { const i = CAMPAIGN_MISSIONS.indexOf(n); return `<button type="button" data-sector="${i}" aria-pressed="${i === this.selected}" ${this.progress.available(i) ? '' : 'disabled'}><span>${String(i+1).padStart(2,'0')}</span> ${this.progress.available(i) ? n.title : 'Unbekannter Sektor'} <span>${i === this.selected ? '▶ AUSGEWÄHLT' : this.progress.completed[n.id] ? '✓' : this.progress.available(i) ? '→' : '🔒'}</span></button>`; }).join('')}</nav><div class="chart-legend"><span>● Gesichert</span><span>◎ Expeditionsziel</span><span>◌ Unbekannt</span></div><div class="chart-transmission"><span class="signal-dot"></span> LANDEFÄHRE / VERBINDUNG STABIL <span>HAUS MARINERIS</span></div></div>
                <article class="mission-briefing"><a class="mission-art" href="assets/missions/${m.image || m.id}.webp" target="_blank" rel="noopener" aria-label="Missionsbild ${m.title} in voller Größe öffnen"><img src="assets/missions/${m.image || m.id}.webp" alt="${m.title} – Illustration des Missionsschauplatzes" width="1672" height="941" decoding="async"><span>Bild vergrößern ↗</span></a><div class="selected-mission-label">▶ AUSGEWÄHLTE MISSION</div><div class="mission-eyebrow">SEKTOR ${String(this.selected+1).padStart(2,'0')} <span>${m.kind}</span></div><h2>${m.title}</h2><div class="mission-location">${m.region}</div><blockquote>„${m.quote}“</blockquote><div class="briefing-voice">${m.voice}</div><p>${m.briefing}</p>${this.ui.audio.narrationButton(m, 'briefing')}${this.progress.completed[m.id] ? `<div class="sector-report"><div class="mission-eyebrow">SEKTOR GESICHERT</div><p>${m.debriefing}</p></div>` : ''}<div class="brief-objective"><small>PRIMÄRZIEL</small><strong>${m.objective.label}</strong>${m.objective.type === 'captureCamps' ? `<p>Je Camp mindestens 3 eigene Zellen und mehr eigene als fremde Flora: ${m.objective.hold} Generationen ohne Unterbrechung halten.</p>` : ''}</div><ul class="bonus-list">${m.bonuses.map(b => `<li>☆ ${b.label}</li>`).join('')}</ul><div class="mission-meta"><span>${m.rounds} RUNDEN</span><span>${m.budget} GENMATERIAL</span></div>${m.reward ? `<div class="genome-reward"><span>GENOM-ENTDECKUNG</span><strong>+ ${[m.reward, ...(m.additionalRewards || [])].filter(Boolean).map(key => CONSTANTS.PATTERNS[key].name).join(' + ')}</strong></div>` : ''}<button class="launch-button" id="launchMission">${this.progress.completed[m.id] ? 'Sektor erneut betreten' : 'Expedition starten'} <span>→</span></button></article></div>
            <section class="genome-archive"><div><div class="mission-eyebrow">FORSCHUNG / GENARCHIV</div><h3>Aus einfachen Regeln entsteht Leben.</h3></div><div class="genome-cards">${Object.keys(CONSTANTS.PATTERNS).map(key => {
                const p = CONSTANTS.PATTERNS[key], unlocked = this.progress.genomes.includes(key);
                return `<div class="genome-card ${unlocked ? '' : 'locked'}"><svg viewBox="-1 -1 10 6" aria-hidden="true">${p.pattern.map(([r,c]) => `<rect x="${c}" y="${r}" width=".8" height=".8"/>`).join('')}</svg><strong>${unlocked ? p.name : 'Verschlüsselt'}</strong><small>${unlocked ? p.cost+' Material' : 'Forschung ausstehend'}</small></div>`;
            }).join('')}</div></section><section class="story-archive progress-tools"><div class="mission-eyebrow">EXPEDITION / SPIELSTAND</div><h3>Deine Reise mitnehmen.</h3><p>Dieser Browser speichert abgeschlossene Missionen, Sterne und Forschung. Mit dem Expeditionscode kannst du sie auf einem anderen Gerät übernehmen. Eine laufende Mission wird nicht gespeichert.</p><label for="expeditionCode">Dein Expeditionscode · inklusive Sterne</label><div class="code-controls"><input id="expeditionCode" readonly value="${this.progress.exportCode()}" spellcheck="false"><button id="copyExpeditionCode" class="quiet-button">Code kopieren</button></div><form id="importExpedition"><label for="importCode">Expeditionscode oder Sektorpasswort eingeben</label><div class="code-controls"><input id="importCode" maxlength="80" placeholder="RR4-… oder PALISADE-…" required autocomplete="off" spellcheck="false"><button class="quiet-button" type="submit">Übernehmen</button></div></form><p>Vorhandene Sterne bleiben erhalten. Sektorpasswörter werten frühere Missionen mit einem Stern und öffnen ihre Forschung und Sektorberichte.</p><button id="resetCampaign" class="quiet-button">Kampagne zurücksetzen</button><div id="resetConfirmation" hidden><p>Alle Kampagnensterne, Sektoren und Sektorberichte auf diesem Gerät zurücksetzen? Sichere zuvor deinen Expeditionscode. Gefecht-Einstellungen bleiben erhalten.</p><button id="confirmReset" class="quiet-button">Ja, Kampagne zurücksetzen</button> <button id="cancelReset" class="quiet-button">Abbrechen</button></div><p id="progressMessage" role="status" aria-live="polite"></p></section><footer class="campaign-footer">${!this.progress.storageAvailable ? 'Speichern nicht verfügbar. Fortschritt bleibt nur bis zum Verlassen dieser Seite erhalten.' : 'Fortschritt wird auf diesem Gerät gespeichert.'}<span>VIER AKTE · 20 handgebaute Missionen</span></footer>`;
        this.overlay.querySelectorAll('[data-act]').forEach(button => button.onclick = () => {
            const act = Number(button.dataset.act);
            const index = CAMPAIGN_MISSIONS.findIndex((n, i) => n.act === act && this.progress.available(i) && !this.progress.completed[n.id]);
            this.selected = index >= 0 ? index : CAMPAIGN_MISSIONS.findIndex(n => n.act === act);
            this.showMap();
        });
        this.ui.audio.enterScene(m, 'briefing');
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
        this.overlay.querySelectorAll('[data-sector]').forEach(btn => btn.onclick = () => { this.selected = Number(btn.dataset.sector); this.showMap(); this.overlay.querySelector(`[data-sector="${this.selected}"]`).focus(); });
    }
    start(index) {
        this.selected = index;
        document.body.classList.add('in-mission');
        this.ui.startGame(MissionManager.config(CAMPAIGN_MISSIONS[index]));
        this.hud.hidden = false;
        this.ui.elBtnFinishTurn.textContent = 'Evolution starten →';
        this.updateHUD();
        this.ui.elPatternList.querySelector('[data-pattern="cell"]').click();
        this.ui.audio.enterScene(CAMPAIGN_MISSIONS[index], 'briefing');
    }
    updateHUD() {
        const s = this.ui.gameState;
        if (!s?.objectiveSystem) return;
        const o = s.objectiveSystem, m = s.scenario;
        this.hintOpen = this.hud.querySelector('details')?.open ?? this.hintOpen;
        this.hud.innerHTML = `<div class="mission-eyebrow">AKT ${CAMPAIGN_ACTS.find(a => a.id === m.act).roman} / SEKTOR ${String(this.selected+1).padStart(2,'0')}<a href="${location.pathname}?campaign">Marskarte ↗</a></div><h2>${m.title}</h2><p>${m.objective.label}</p>${o.progressText ? `<p class="objective-progress">${o.progressText}</p>` : ''}<div class="hud-telemetry"><span>GEN ${String(o.generations).padStart(3,'0')}</span><span>${o.spent} MATERIAL EINGESETZT</span></div><details><summary>Ziel & taktischer Hinweis</summary><p><strong>${m.objective.label}</strong></p><p>${m.hint}</p>${m.objective.type === 'captureCamps' ? `<p>Je Camp mindestens 3 eigene Zellen und Pflanzenmehrheit für ${m.objective.hold} Generationen halten.</p>` : ''}</details>`;
        // Preserve an opened hint across frequent simulation renders.
        if (this.hintOpen) this.hud.querySelector('details').open = true;

    }
    showResult() {
        this.ui.audio.stopNarration();
        const s = this.ui.gameState, result = s.objectiveSystem.result, m = s.scenario;
        const newlyUnlocked = result.success && !this.progress.completed[m.id];
        if (result.success) this.progress.record(m.id, result.stars);
        this.overlay.hidden = false;
        this.overlay.innerHTML = `<div class="mission-result"><div class="mission-eyebrow">LANDEFÄHRE / MISSIONSBERICHT</div><div class="result-stars">${'★'.repeat(result.stars)}${'☆'.repeat(3-result.stars)}</div><h1>${result.success ? 'Wurzeln geschlagen.' : 'Signal verloren.'}</h1><h2>${m.title}</h2><p>${result.reason}</p>${this.ui.audio.narrationButton(m, result.success ? 'debriefing' : 'failure')}${this.ui.audio.controls()}<ul class="result-objectives"><li>${result.success ? '✓' : '○'} ${m.objective.label}</li>${m.bonuses.map((b,i) => `<li>${result.bonuses[i] ? '★' : '☆'} ${b.label}</li>`).join('')}</ul>${result.success && m.reward ? `<div class="genome-reward"><span>${newlyUnlocked ? 'NEUE GENOMSTRUKTUR ENTDECKT' : 'GENOM ARCHIVIERT'}</span><strong>${[m.reward, ...(m.additionalRewards || [])].filter(Boolean).map(key => CONSTANTS.PATTERNS[key].name).join(' + ')}</strong></div>` : !result.success ? `<p class="result-hint">${m.hint}</p>` : ''}${!this.progress.storageAvailable ? '<p>Fortschritt konnte nicht gespeichert werden.</p>' : ''}${result.success ? `<div class="result-code"><label for="resultCode">Expeditionscode zum Mitnehmen</label><input id="resultCode" readonly value="${this.progress.exportCode()}" onclick="this.select()"><small>Sektorpasswort: ${CampaignState.passwords[Math.min(this.selected + 1, CAMPAIGN_MISSIONS.length - 1)]}</small></div>` : ''}<div class="result-actions"><a class="quiet-button" href="${location.pathname}?campaign">Zur Marskarte</a><button class="launch-button" id="resultContinue">${result.success && this.selected < CAMPAIGN_MISSIONS.length - 1 ? 'Nächster Sektor · Marskarte →' : result.success ? 'Expedition auf der Marskarte ansehen →' : 'Erneut versuchen ↻'}</button></div>${result.success && this.selected === CAMPAIGN_MISSIONS.length - 1 ? '<p class="mission-eyebrow">AKT IV ABGESCHLOSSEN · DER STURM IST GEBROCHEN</p>' : ''}</div>`;
        this.overlay.querySelector('#resultContinue').onclick = () => result.success ? this.navigateToMap(Math.min(this.selected+1, CAMPAIGN_MISSIONS.length-1)) : this.navigate(this.selected);
        if (result.success) this.ui.audio.enterScene(m, 'debriefing');
        else this.ui.audio.failureReport(m, result.reason);
        this.overlay.querySelector('#resultContinue').focus();
    }
}
