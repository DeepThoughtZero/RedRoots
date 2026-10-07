// js/ui/DisplayControls.js
// Full screen (sticky across page loads) and the collapsible side column on short landscape screens.

class DisplayControls {
    static get LAYOUT_KEY() { return 'redroots_layout_v1'; }
    static get FS_KEY() { return 'redroots_fullscreen'; }
    // Must match the compact landscape block in css/style.css.
    static get COMPACT_QUERY() { return '(orientation: landscape) and (max-height: 520px)'; }

    // Side column preference: 'auto' folds it during the evolution, 'open' and 'closed' are manual choices.
    static readLayout() {
        const layout = { side: 'auto', autoRail: true };
        try {
            const saved = JSON.parse(localStorage.getItem(DisplayControls.LAYOUT_KEY) || 'null');
            if (saved && ['auto', 'open', 'closed'].includes(saved.side)) layout.side = saved.side;
            if (saved && typeof saved.autoRail === 'boolean') layout.autoRail = saved.autoRail;
        } catch { /* defaults */ }
        return layout;
    }

    static writeLayout(patch) {
        try {
            localStorage.setItem(DisplayControls.LAYOUT_KEY, JSON.stringify({ ...DisplayControls.readLayout(), ...patch }));
            return true;
        } catch { return false; }
    }

    static effective(pref, phaseKey, autoRail) {
        return pref === 'closed' || (pref === 'auto' && autoRail && phaseKey === 'simulation');
    }

    // Opening during the evolution keeps the column open; opening while planning returns to automatic folding.
    static nextPref(collapsedNow, phaseKey) {
        return collapsedNow ? (phaseKey === 'simulation' ? 'open' : 'auto') : 'closed';
    }

    static fsSupported() {
        const root = document.documentElement;
        return !!(document.fullscreenEnabled || document.webkitFullscreenEnabled) && !!(root.requestFullscreen || root.webkitRequestFullscreen);
    }

    static isStandalone() {
        try {
            return matchMedia('(display-mode: fullscreen)').matches || matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
        } catch { return false; }
    }

    static isFullscreen() { return !!(document.fullscreenElement || document.webkitFullscreenElement); }

    static enter() {
        const root = document.documentElement;
        let request;
        try { request = root.requestFullscreen ? root.requestFullscreen({ navigationUI: 'hide' }) : root.webkitRequestFullscreen(); }
        catch { return Promise.resolve(false); }
        return Promise.resolve(request).then(() => DisplayControls.isFullscreen(), () => false);
    }

    static exit() {
        try { return Promise.resolve(document.exitFullscreen ? document.exitFullscreen() : document.webkitExitFullscreen()).catch(() => {}); }
        catch { return Promise.resolve(); }
    }

    static toggleFullscreen() {
        if (DisplayControls.isFullscreen()) {
            try { sessionStorage.removeItem(DisplayControls.FS_KEY); } catch { /* optional */ }
            return DisplayControls.exit();
        }
        try { sessionStorage.setItem(DisplayControls.FS_KEY, '1'); } catch { /* optional */ }
        return DisplayControls.enter();
    }

    // Own page changes end full screen too, but must keep the player's wish.
    static navigate(url) {
        DisplayControls.leaving = true;
        location.href = url;
    }

    static syncButtons() {
        const on = DisplayControls.isFullscreen(), available = DisplayControls.fsSupported() && !DisplayControls.isStandalone();
        document.documentElement.classList.toggle('is-fullscreen', on);
        document.querySelectorAll('[data-fs]').forEach(button => {
            button.hidden = !available;
            const label = on ? 'Vollbild beenden' : 'Vollbild';
            button.setAttribute('aria-pressed', String(on));
            button.setAttribute('aria-label', label);
            button.title = label;
            button.querySelector('use')?.setAttribute('href', `#i-${on ? 'fullscreen-exit' : 'fullscreen'}`);
            const text = button.querySelector('span');
            if (text) text.textContent = label;
        });
    }

    // Runs on every page (start, map, mission, result).
    static initPage() {
        DisplayControls.leaving = false;
        DisplayControls.syncButtons();
        document.addEventListener('click', event => {
            if (event.target.closest?.('[data-fs]')) DisplayControls.toggleFullscreen();
        });
        const onChange = () => {
            // Leaving with Esc, the back gesture or the button is a decision: do not come back on the next tap.
            if (!DisplayControls.isFullscreen() && !DisplayControls.leaving && document.visibilityState === 'visible') {
                try { sessionStorage.removeItem(DisplayControls.FS_KEY); } catch { /* optional */ }
            }
            DisplayControls.syncButtons();
        };
        document.addEventListener('fullscreenchange', onChange);
        document.addEventListener('webkitfullscreenchange', onChange);
        for (const type of ['pagehide', 'beforeunload']) window.addEventListener(type, () => { DisplayControls.leaving = true; });

        let wanted = false;
        try { wanted = sessionStorage.getItem(DisplayControls.FS_KEY) === '1'; } catch { /* optional */ }
        if (!wanted || !DisplayControls.fsSupported() || DisplayControls.isStandalone() || DisplayControls.isFullscreen()) return;
        // A page load ended full screen: the next tap or key brings it back. Touch grants activation on
        // pointerup/touchend (the canvas cancels touch defaults, so no click follows there).
        const types = ['pointerup', 'touchend', 'mousedown', 'keydown'];
        const stop = () => types.forEach(type => document.removeEventListener(type, handler, true));
        const handler = event => {
            if (!event.isTrusted) return;
            if (event.type === 'pointerup' && event.pointerType === 'mouse') return;
            if (event.type === 'keydown' && event.key === 'Escape') return;
            stop();
            // A tap on a Vollbild button toggles on its own.
            if (event.target.closest?.('[data-fs]')) return;
            DisplayControls.enter();
        };
        types.forEach(type => document.addEventListener(type, handler, true));
    }

    constructor(ui) {
        this.ui = ui;
        this.layout = DisplayControls.readLayout();
        this.collapsed = false;
        this.rail = document.getElementById('sideRail');
        this.status = document.createElement('button');
        this.status.type = 'button';
        this.status.className = 'board-status';
        this.status.hidden = true;
        ui.canvas.parentElement.append(this.status);
        this.status.addEventListener('click', () => this.toggle());
        this.media = matchMedia(DisplayControls.COMPACT_QUERY);
        this.media.addEventListener?.('change', () => this.apply());
        document.getElementById('btnRailExpand')?.addEventListener('click', () => this.toggle());
        document.getElementById('btnRailPrimary')?.addEventListener('click', () => ui.elBtnFinishTurn.click());
        document.getElementById('btnRailMenu')?.addEventListener('click', () => ui.elBtnSettings.click());
        const auto = document.getElementById('optAutoRail');
        if (auto) {
            auto.checked = this.layout.autoRail;
            auto.addEventListener('change', () => { this.layout.autoRail = auto.checked; DisplayControls.writeLayout({ autoRail: auto.checked }); this.apply(); });
        }
        DisplayControls.syncButtons();
        this.apply();
    }

    get compact() { return this.media.matches; }

    phaseKey() { return document.body.dataset.phase || 'placement'; }

    apply() {
        const phase = this.phaseKey();
        this.setCollapsed(this.compact && phase !== 'gameover' && DisplayControls.effective(this.layout.side, phase, this.layout.autoRail));
    }

    toggle() {
        this.layout.side = DisplayControls.nextPref(this.collapsed, this.phaseKey());
        DisplayControls.writeLayout({ side: this.layout.side });
        this.apply();
        // Keep the keyboard focus on the toggle that is visible now.
        (this.collapsed ? document.getElementById('btnRailExpand') : document.querySelector('[data-side]'))?.focus({ preventScroll: true });
    }

    setCollapsed(collapsed) {
        const changed = collapsed !== this.collapsed;
        this.collapsed = collapsed;
        document.body.classList.toggle('side-collapsed', collapsed);
        if (this.rail) this.rail.hidden = !collapsed;
        for (const el of document.querySelectorAll('[data-side], #btnRailExpand')) {
            el.setAttribute('aria-expanded', String(!collapsed));
            const label = collapsed ? 'Seitenleiste einblenden' : 'Seitenleiste einklappen';
            el.setAttribute('aria-label', label);
            el.title = label;
        }
        this.status.hidden = !collapsed || !this.status.textContent;
        if (changed) this.syncRail();
    }

    // The rail mirrors the primary action, the budget and the round of the folded column.
    syncRail() {
        if (!this.rail) return;
        const source = this.ui.elBtnFinishTurn, primary = document.getElementById('btnRailPrimary');
        if (primary) {
            const label = source.textContent.replace(/→/g, '').replace(/\s+/g, ' ').trim();
            primary.disabled = source.disabled;
            primary.classList.toggle('btn-stop', source.classList.contains('btn-stop'));
            primary.setAttribute('aria-label', label);
            primary.title = label;
            primary.querySelector('use')?.setAttribute('href', `#i-${source.classList.contains('btn-stop') ? 'stop' : 'play'}`);
        }
        const budget = document.querySelector('#railBudget b'), round = document.querySelector('#railRound b');
        if (budget) budget.textContent = this.ui.elBudgetDisplay.textContent;
        if (round) round.textContent = this.ui.gameState?.isSandbox ? '–' : this.ui.elRoundDisplay.textContent.replace(/\s+/g, '');
    }

    // Most urgent mission line, shown on the board while the column is folded.
    setStatus(text, level = '') {
        this.status.textContent = text || '';
        this.status.className = `board-status${level ? ` ${level}` : ''}`;
        this.status.setAttribute('aria-label', text ? `Seitenleiste einblenden: ${text}` : 'Seitenleiste einblenden');
        this.status.hidden = !this.collapsed || !text;
    }
}

