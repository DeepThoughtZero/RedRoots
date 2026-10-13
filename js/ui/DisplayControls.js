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

    // Cached on page load: while the Fullscreen API is active the browser also reports display-mode: fullscreen.
    static isStandalone() {
        if (DisplayControls.standalone !== undefined) return DisplayControls.standalone;
        try {
            return matchMedia('(display-mode: fullscreen)').matches || matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
        } catch { return false; }
    }

    static isFullscreen() { return !!(document.fullscreenElement || document.webkitFullscreenElement); }

    // iPhone Safari offers no full screen for web pages; iPadOS reports itself as a Mac with touch.
    static isAppleMobile() {
        try {
            const ua = navigator.userAgent || '';
            return /iPhone|iPod|iPad/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        } catch { return false; }
    }

    // 'api': real full screen; 'standalone': already launched from the home screen (no button);
    // 'homescreen' / 'unsupported': the button stays visible and explains the alternative.
    static fsMode() {
        if (DisplayControls.isStandalone()) return 'standalone';
        if (DisplayControls.fsSupported()) return 'api';
        return DisplayControls.isAppleMobile() ? 'homescreen' : 'unsupported';
    }

    // F toggles full screen, except while typing (expedition codes) or with modifier keys.
    static isFsShortcut(event) {
        if (!event || event.repeat || event.ctrlKey || event.metaKey || event.altKey || !['f', 'F'].includes(event.key)) return false;
        const target = event.target;
        return !(target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName));
    }

    static fsHintText(mode) {
        return mode === 'homescreen'
            ? 'Auf dem iPhone erlaubt Safari kein Vollbild für Webseiten. Tippe auf Teilen → „Zum Home-Bildschirm“: Von dort startet RedRoots ohne Browserleiste.'
            : 'Dieser Browser erlaubt hier kein Vollbild. Am PC hilft F11, auf Tablet und Handy „Zum Startbildschirm hinzufügen“.';
    }

    // Short explanation beside the top right corner, for browsers without a full screen for web pages.
    static showFsHint(mode) {
        let hint = document.getElementById('fsHint');
        if (!hint) {
            hint = document.createElement('div');
            hint.id = 'fsHint';
            hint.className = 'fs-hint';
            hint.setAttribute('role', 'status');
            hint.innerHTML = '<p></p><button type="button" class="btn btn-icon btn-ghost" aria-label="Hinweis schließen"><svg class="icon" aria-hidden="true"><use href="#i-close"/></svg></button>';
            hint.querySelector('button').addEventListener('click', () => { hint.hidden = true; });
            document.body.append(hint);
        }
        hint.querySelector('p').textContent = DisplayControls.fsHintText(mode);
        hint.hidden = false;
        clearTimeout(DisplayControls.hintTimer);
        DisplayControls.hintTimer = setTimeout(() => { hint.hidden = true; }, 9000);
    }

    // One entry point for every Vollbild button and the F key.
    static requestToggle() {
        const mode = DisplayControls.fsMode();
        if (mode === 'api') return DisplayControls.toggleFullscreen();
        if (mode !== 'standalone') DisplayControls.showFsHint(mode);
        return Promise.resolve(false);
    }

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
        const on = DisplayControls.isFullscreen(), mode = DisplayControls.fsMode();
        document.documentElement.classList.toggle('is-fullscreen', on);
        document.querySelectorAll('[data-fs]').forEach(button => {
            button.hidden = mode === 'standalone';
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
        DisplayControls.standalone = undefined;
        DisplayControls.standalone = DisplayControls.isStandalone();
        DisplayControls.syncButtons();
        document.addEventListener('click', event => {
            if (event.target.closest?.('[data-fs]')) DisplayControls.requestToggle();
        });
        document.addEventListener('keydown', event => {
            if (!DisplayControls.isFsShortcut(event)) return;
            event.preventDefault();
            DisplayControls.requestToggle();
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
            if (event.type === 'keydown' && (event.key === 'Escape' || DisplayControls.isFsShortcut(event))) return;
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
        // Not interactive: taps on the board below it still place cells; the rail opens the column.
        this.status = document.createElement('div');
        this.status.className = 'board-status';
        this.status.setAttribute('aria-hidden', 'true');
        this.status.hidden = true;
        this.statusKey = '';
        this.statusUntil = 0;
        ui.canvas.parentElement.append(this.status);
        this.media = matchMedia(DisplayControls.COMPACT_QUERY);
        this.media.addEventListener?.('change', () => this.apply());
        document.getElementById('btnRailExpand')?.addEventListener('click', () => this.toggle());
        document.getElementById('btnRailPrimary')?.addEventListener('click', () => ui.elBtnFinishTurn.click());
        document.getElementById('btnRailMenu')?.addEventListener('click', () => ui.elBtnSettings.click());
        const auto = document.getElementById('optAutoRail');
        this.autoRow = auto?.closest('label');
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
        if (this.autoRow) this.autoRow.hidden = !this.compact;
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
        if (changed) {
            // Focus never stays inside a region that just disappeared.
            const active = document.activeElement;
            const hiddenRegion = collapsed ? active?.closest?.('.topbar, .mission-hud, #rightPanel') : active?.closest?.('#sideRail');
            if (hiddenRegion) (collapsed ? document.getElementById('btnRailExpand') : document.querySelector('[data-side]'))?.focus({ preventScroll: true });
            if (collapsed) this.statusUntil = performance.now() + 4000;
            this.syncRail();
        }
        this.updateStatusVisibility();
    }

    // The rail mirrors the primary action, the budget and the round of the folded column.
    syncRail() {
        if (!this.rail) return;
        const source = this.ui.elBtnFinishTurn, primary = document.getElementById('btnRailPrimary');
        if (primary) {
            const label = [...source.childNodes].map(n => n.textContent.replace(/→/g, '').trim()).filter(Boolean).join(' – ');
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
    // Shown for a few seconds when its meaning changes (numbers alone do not count); alarms stay visible.
    setStatus(text, level = '') {
        const key = `${level}|${(text || '').replace(/\d+/g, '#')}`;
        if (key !== this.statusKey) { this.statusKey = key; this.statusUntil = performance.now() + 4000; }
        this.status.textContent = text || '';
        this.status.className = `board-status${level ? ` ${level}` : ''}`;
        this.statusLevel = level;
        this.updateStatusVisibility();
    }

    updateStatusVisibility() {
        const show = this.collapsed && !!this.status.textContent && (this.statusLevel === 'alarm' || performance.now() < this.statusUntil);
        this.status.hidden = !show;
        clearTimeout(this.statusTimer);
        if (show && this.statusLevel !== 'alarm') this.statusTimer = setTimeout(() => this.updateStatusVisibility(), Math.max(50, this.statusUntil - performance.now()));
    }
}

