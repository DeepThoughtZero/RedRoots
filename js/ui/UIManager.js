// js/ui/UIManager.js

// Inline icon from the sprite in index.html.
const uiIcon = (name, extra = '') => `<svg class="icon${extra ? ` ${extra}` : ''}" aria-hidden="true"><use href="#i-${name}"/></svg>`;

const PHASE_LABELS = { SETUP: ['setup', 'Setup'], PLATZIERUNG: ['placement', 'Planung'], EVOLUTION: ['simulation', 'Evolution'], BEENDET: ['gameover', 'Beendet'] };

class UIManager {
    constructor(canvas, config) {
        this.canvas = canvas;
        this.gameState = null; // Set later
        this.renderer = null; // Set later
        this.inputHandler = null; // Set later
        this.ai = null; // Set later
        this.campIndicator = { pId: null, startTime: 0, opacity: 0 };

        // DOM Elements
        this.elStartMenu = document.getElementById('startMenu');
        this.elTopStats = document.getElementById('topStats');
        this.elGamePhaseDisplay = document.getElementById('gamePhaseDisplay');
        this.elRoundDisplay = document.getElementById('roundDisplay');
        this.elCurrentPlayerDisplay = document.getElementById('currentPlayerDisplay');

        this.elRightPanel = document.getElementById('rightPanel');
        this.elPanelContent = document.getElementById('panelContent');
        this.elPanelExtras = document.getElementById('panelExtras');
        this.elPanelPlayerHeader = document.getElementById('panelPlayerHeader');
        this.elPanelPlayerName = document.getElementById('panelPlayerName');
        this.elPanelPlayerRole = document.getElementById('panelPlayerRole');
        this.elPanelPlayerEmblem = document.getElementById('panelPlayerEmblem');
        this.elBudgetDisplay = document.getElementById('budgetDisplay');

        this.elBtnFinishTurn = document.getElementById('btnFinishTurn');
        this.elBtnRotate = document.getElementById('btnRotate');
        this.elBtnEraser = document.getElementById('btnEraser');
        this.elBtnUndo = document.getElementById('btnUndo');
        this.elPatternList = document.getElementById('patternList');

        this.elBtnSettings = document.getElementById('btnSettings');
        this.elSettingsExtras = document.getElementById('settingsExtras');

        this.elEventLog = document.getElementById('eventLog');

        // Alert Box
        this.elAlertOverlay = document.getElementById('alertOverlay');
        this.elAlertBox = document.getElementById('alertBox');
        this.elAlertTitle = document.getElementById('alertTitle');
        this.elAlertImage = document.getElementById('alertImage');
        this.elAlertMessage = document.getElementById('alertMessage');
        this.elBtnRestartGame = document.getElementById('btnRestartGame');

        this.elEvolutionStatus = document.getElementById('evolutionStatus');
        this.elEvoBar = document.getElementById('evoBar');
        this.elEvoCount = document.getElementById('evoCount');
        this.elSimSpeedContainer = document.getElementById('simSpeedContainer');
        this.elSimSpeed = document.getElementById('simSpeed');
        this.elTerritoryBarContainer = document.getElementById('territoryBarContainer');
        this.elTerritoryBars = document.getElementById('territoryBars');

        // Settings Dialog
        this.elSettingsOverlay = document.getElementById('settingsOverlay');
        this.elSettingsBox = document.getElementById('settingsBox');
        this.elBtnSettingsCancel = document.getElementById('btnSettingsCancel');
        this.elBtnSettingsConfirm = document.getElementById('btnSettingsConfirm');

        // Randomize Setup Header Image
        const setupHeaderImage = document.getElementById('setupHeaderImage');
        if (setupHeaderImage && Math.random() > 0.5) setupHeaderImage.src = 'assets/ui/mars-overview-02.webp';

        this.openDialogs = [];
        this.lastBudget = null;
        this.initStartMenu();
        this.initPanelControls();
    }

    // Dialogs: focus moves into the dialog and returns afterwards; Escape and the backdrop close it.
    openDialog(overlay, focusTarget = null) {
        if (!overlay || this.openDialogs.includes(overlay)) return;
        overlay.returnFocus = document.activeElement;
        overlay.classList.remove('hidden');
        this.openDialogs.push(overlay);
        requestAnimationFrame(() => {
            overlay.classList.add('is-open');
            (focusTarget || overlay.querySelector('.btn-primary') || overlay.querySelector('button'))?.focus({ preventScroll: true });
        });
    }

    closeDialog(overlay) {
        if (!overlay || !this.openDialogs.includes(overlay)) return;
        this.openDialogs = this.openDialogs.filter(o => o !== overlay);
        overlay.classList.remove('is-open');
        if (overlay === this.helpOverlay) this.stopHelpVoice();
        setTimeout(() => {
            if (!this.openDialogs.includes(overlay)) overlay.classList.add('hidden');
            if (this.audio) this.audio.updateAmbience?.();
        }, 220);
        const back = overlay.returnFocus;
        if (back && document.contains(back)) back.focus();
    }

    initStartMenu() {
        // Load saved config
        let saved = null;
        try { saved = localStorage.getItem('redroots_config'); } catch { /* Private browsing: use defaults. */ }
        if (saved) {
            try {
                const c = JSON.parse(saved);
                if (c.raw_mapSize) document.getElementById('cfgMapSize').value = c.raw_mapSize;
                if (c.rounds) document.getElementById('cfgRounds').value = c.rounds;
                if (c.budgetFactor) document.getElementById('cfgBudgetFactor').value = c.budgetFactor;
                if (c.steps) document.getElementById('cfgSteps').value = c.steps;
                if (c.radius) document.getElementById('cfgRadius').value = c.radius;
                if (Array.isArray(c.humanFlags) && c.humanFlags.length === 4) this.humanFlags = c.humanFlags.map(Boolean);
            } catch (e) { console.error('Failed to parse saved config', e); }
        }
        if (!this.humanFlags) this.humanFlags = [true, false, false, false]; // Default: P1 human

        // Randomize Rocks (Mountains) for each mission
        const cfgRocks = document.getElementById('cfgRocks');
        const valRocks = document.getElementById('valRocks');
        if (cfgRocks && valRocks) {
            const randomRocks = Math.floor(Math.random() * 1001);
            cfgRocks.value = randomRocks;
            valRocks.textContent = randomRocks;
            cfgRocks.addEventListener('input', () => { valRocks.textContent = cfgRocks.value; });
        }

        // House selection: every house is explicitly "Mensch" or "Computer" (hot seat on one device).
        const humanHousesContainer = document.getElementById('humanHousesContainer');
        const houseSummary = document.getElementById('houseSummary');
        const updateSummary = () => {
            if (!houseSummary) return;
            const humans = this.humanFlags.filter(Boolean).length, ai = 4 - humans;
            houseSummary.textContent = humans === 0
                ? 'Nur Computer: Du schaust den vier Häusern zu.'
                : `${humans} ${humans === 1 ? 'Mensch' : 'Menschen'} · ${ai} Computer${humans > 1 ? ' · Die Menschen wechseln sich an diesem Gerät ab.' : ''}`;
        };
        if (humanHousesContainer) {
            humanHousesContainer.innerHTML = '';
            CONSTANTS.PLAYER_COLORS.forEach((player, i) => {
                const card = document.createElement('div');
                card.className = `house-card${this.humanFlags[i] ? ' is-human' : ''}`;
                card.style.setProperty('--house', player.main);
                card.innerHTML = `<img src="${player.asset}" alt="" width="704" height="384" loading="lazy" decoding="async"><strong>${player.name}</strong><div class="segmented" role="radiogroup" aria-label="Steuerung für ${player.name}"><label><input type="radio" name="houseControl${i}" value="human"${this.humanFlags[i] ? ' checked' : ''}><span>Mensch</span></label><label><input type="radio" name="houseControl${i}" value="ai"${this.humanFlags[i] ? '' : ' checked'}><span>Computer</span></label></div>`;
                card.querySelectorAll('input').forEach(input => input.addEventListener('change', () => {
                    this.humanFlags[i] = input.value === 'human';
                    card.classList.toggle('is-human', this.humanFlags[i]);
                    updateSummary();
                }));
                humanHousesContainer.appendChild(card);
            });
            updateSummary();
        }

        document.getElementById('btnChooseSkirmish').onclick = () => {
            document.getElementById('modeSelection').hidden = true;
            document.getElementById('skirmishSetup').hidden = false;
            this.elStartMenu.scrollTop = 0;
            document.getElementById('btnBackModes').focus();
        };
        document.getElementById('btnBackModes').onclick = () => {
            document.getElementById('skirmishSetup').hidden = true;
            document.getElementById('modeSelection').hidden = false;
            document.getElementById('btnChooseSkirmish').focus();
        };

        // Developer Mode (5 clicks on title)
        const setupTitle = document.getElementById('setupTitle');
        const devSettings = document.getElementById('devSettings');
        let setupClickCount = 0;
        if (setupTitle && devSettings) {
            setupTitle.addEventListener('click', () => {
                setupClickCount++;
                if (setupClickCount >= 5) {
                    const isHidden = devSettings.classList.contains('hidden');
                    devSettings.classList.toggle('hidden', !isHidden);
                    setupTitle.classList.toggle('is-dev', isHidden);
                    setupTitle.textContent = isHidden ? 'Developer Setup' : 'Freies Gefecht';
                    this.logEvent(isHidden ? 'Entwicklermodus aktiviert.' : 'Entwicklermodus deaktiviert.');
                    setupClickCount = 0;
                }
            });
        }

        const cfgDojoMode = document.getElementById('cfgDojoMode');
        const batchModeContainer = document.getElementById('batchModeContainer');
        if (cfgDojoMode && batchModeContainer) {
            const cfgSteps = document.getElementById('cfgSteps');
            cfgDojoMode.addEventListener('change', () => {
                batchModeContainer.classList.toggle('hidden', !cfgDojoMode.checked);
                if (cfgSteps) cfgSteps.value = cfgDojoMode.checked ? 150 : 2000;
            });
        }

        document.getElementById('btnStartGame').addEventListener('click', () => {
            const isDevMode = devSettings && !devSettings.classList.contains('hidden');

            let mapSize, rounds, budgetFactor, steps, radius, rocks, isDojoMode, isBatchMode;

            if (isDevMode) {
                mapSize = document.getElementById('cfgMapSize').value;
                rounds = parseInt(document.getElementById('cfgRounds').value);
                budgetFactor = parseInt(document.getElementById('cfgBudgetFactor').value);
                steps = parseInt(document.getElementById('cfgSteps').value);
                radius = parseInt(document.getElementById('cfgRadius').value);
                rocks = parseInt(document.getElementById('cfgRocks').value);
                isDojoMode = document.getElementById('cfgDojoMode').checked;
                isBatchMode = document.getElementById('cfgBatchMode').checked;
            } else {
                // Non-Developer Mode Defaults
                mapSize = 'xlarge';
                rounds = 7;
                budgetFactor = 100;
                steps = 1000;
                radius = 5;
                rocks = Math.floor(Math.random() * 1001); // Random mountains for variety
                isDojoMode = false;
                isBatchMode = false;
            }

            let rows = 60, cols = 100;
            if (mapSize === 'small') { rows = 40; cols = 60; }
            if (mapSize === 'medium') { rows = 60; cols = 100; }
            if (mapSize === 'large') { rows = 80; cols = 140; }
            if (mapSize === 'xlarge') { rows = 100; cols = 180; }
            if (mapSize === 'xxlarge') { rows = 140; cols = 240; }

            const config = {
                raw_mapSize: mapSize,
                rows: rows,
                cols: cols,
                rounds: rounds,
                budgetFactor: budgetFactor,
                steps: steps,
                playerCount: 4,
                radius: radius,
                collisionRule: 'majority',
                rocks: rocks,
                isDojoMode: isDojoMode,
                isBatchMode: isBatchMode,
                humanFlags: [...this.humanFlags] // Spread to clone the array
            };

            if (config.isDojoMode) {
                config.humanFlags = [false, false, false, false];
                config.steps = 150;
                config.rounds = 7;
            }

            try { localStorage.setItem('redroots_config', JSON.stringify(config)); } catch { /* Gameplay remains available. */ }
            this.startGame(config);
        });

        // Help dialog with the recorded rules briefing.
        this.helpOverlay = document.getElementById('helpOverlay');
        const btnHelpVoice = document.getElementById('btnHelpVoice');
        this.audioBriefing = new Audio('assets/Intro_Rules.mp3');
        this.audioBriefing.loop = false;
        this.audioBriefing.preload = 'none';
        const syncHelpVoice = () => {
            if (!btnHelpVoice) return;
            const playing = !this.audioBriefing.paused;
            btnHelpVoice.setAttribute('aria-pressed', String(playing));
            btnHelpVoice.innerHTML = `${uiIcon(playing ? 'pause' : 'play')}<span>${playing ? 'Vorlesen anhalten' : 'Vorlesen'}</span>`;
        };
        for (const event of ['play', 'pause', 'ended']) this.audioBriefing.addEventListener(event, syncHelpVoice);
        this.stopHelpVoice = () => { this.audioBriefing.pause(); this.audioBriefing.currentTime = 0; };
        if (btnHelpVoice) btnHelpVoice.onclick = () => {
            if (this.audioBriefing.paused) this.audioBriefing.play().catch(e => console.warn('Audio playback failed:', e));
            else this.audioBriefing.pause();
        };
        const showHelp = () => {
            if (this.audio) { this.audio.stopNarration(); this.audio.ambience.pause(); }
            this.openDialog(this.helpOverlay, document.getElementById('btnHelpClose'));
            this.audioBriefing.play().catch(e => console.warn('Audio playback failed:', e));
            syncHelpVoice();
        };
        document.getElementById('btnHelp')?.addEventListener('click', showHelp);
        document.getElementById('btnMenuHelp')?.addEventListener('click', () => { this.closeDialog(this.elSettingsOverlay); showHelp(); });
        const homeHint = document.getElementById('homeScreenHint');
        if (homeHint) homeHint.hidden = DisplayControls.fsSupported() || DisplayControls.isStandalone() || !matchMedia('(pointer: coarse)').matches;
        document.getElementById('btnShowBriefing')?.addEventListener('click', showHelp);
        document.getElementById('btnHelpClose')?.addEventListener('click', () => this.closeDialog(this.helpOverlay));

        // Generic close affordances: [data-dialog-close], backdrop click and Escape.
        for (const overlay of [this.helpOverlay, this.elSettingsOverlay]) {
            if (!overlay) continue;
            overlay.addEventListener('click', event => {
                if (event.target === overlay || event.target.closest('[data-dialog-close]')) this.closeDialog(overlay);
            });
        }
        window.addEventListener('keydown', event => {
            if (event.key === 'Escape' && this.openDialogs.length) this.closeDialog(this.openDialogs.at(-1));
        });

        if (this.elBtnRestartGame) this.elBtnRestartGame.addEventListener('click', () => location.reload());
        document.getElementById('btnViewBoard')?.addEventListener('click', () => this.closeDialog(this.elAlertOverlay));

        if (this.elBtnSettings) this.elBtnSettings.addEventListener('click', () => this.openDialog(this.elSettingsOverlay, this.elBtnSettingsCancel));
        if (this.elBtnSettingsCancel) this.elBtnSettingsCancel.addEventListener('click', () => this.closeDialog(this.elSettingsOverlay));
        if (this.elBtnSettingsConfirm) {
            this.elBtnSettingsConfirm.addEventListener('click', () => {
                if (this.audio) this.audio.stopNarration();
                DisplayControls.navigate(location.pathname + (this.gameState?.scenario ? '?campaign' : ''));
            });
        }

        const btnStartSandbox = document.getElementById('btnStartSandbox');
        if (btnStartSandbox) {
            btnStartSandbox.addEventListener('click', () => {
                const config = {
                    rows: 60,
                    cols: 100,
                    rounds: 99,
                    budgetFactor: 1,
                    steps: 1000,
                    playerCount: 1,
                    humanFlags: [true, false, false, false],
                    radius: 5,
                    collisionRule: 'majority',
                    rocks: 0,
                    isSandbox: true
                };
                this.startGame(config);
            });
        }
    }

    initPanelControls() {
        this.elBtnFinishTurn.addEventListener('click', () => {
            if (this.gameState && this.gameState.isSandbox) {
                if (this.gameState.phase === CONSTANTS.PHASE_PLACEMENT) {
                    this.gameState.nextPlayerTurn();
                } else if (this.gameState.phase === CONSTANTS.PHASE_SIMULATION) {
                    this.gameState.stopSimulation = true;
                }
                return;
            }
            if (this.gameState && this.gameState.phase === CONSTANTS.PHASE_PLACEMENT && this.gameState.isCurrentPlayerHuman()) {
                this.gameState.nextPlayerTurn();
            }
        });

        const btnResetSandbox = document.getElementById('btnResetSandbox');
        if (btnResetSandbox) {
            btnResetSandbox.addEventListener('click', () => {
                if (this.gameState && this.gameState.isSandbox && confirm('Spielfeld wirklich komplett leeren?')) this.gameState.resetSandbox();
            });
        }

        this.elBtnRotate.addEventListener('click', () => this.inputHandler?.rotatePattern());

        // The eraser toggles: a second press returns to the last pattern.
        this.elBtnEraser.addEventListener('click', () => {
            if (this.inputHandler?.isEraserMode) { this.elPatternList.querySelector(`[data-pattern="${this.inputHandler.activePatternKey}"]`)?.click(); return; }
            this.elPatternList.querySelectorAll('.pattern-btn').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); });
            this.elBtnEraser.classList.add('active');
            this.elBtnEraser.setAttribute('aria-pressed', 'true');
            this.inputHandler?.setEraserMode(true);
        });

        if (this.elBtnUndo) {
            this.elBtnUndo.addEventListener('click', () => {
                if (this.gameState && this.gameState.undoLastAction()) this.render();
            });
        }

        // Pattern cards with a silhouette, name and material cost.
        this.elPatternList.innerHTML = '';
        const sortedPatterns = Object.entries(CONSTANTS.PATTERNS).sort((a, b) => a[1].cost - b[1].cost);
        for (const [key, pData] of sortedPatterns) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.dataset.pattern = key;
            btn.className = `pattern-btn ${key === 'cell' ? 'active' : ''}`;
            btn.setAttribute('aria-pressed', String(key === 'cell'));
            btn.setAttribute('aria-label', `${pData.name}, ${pData.cost} Genmaterial`);
            btn.innerHTML = `<span class="pattern-preview">${patternPreviewSvg(pData.pattern)}</span><span class="pattern-row"><span class="pattern-name">${pData.name}</span><span class="pattern-cost">${pData.cost}</span></span>`;
            btn.addEventListener('click', () => {
                this.elPatternList.querySelectorAll('.pattern-btn').forEach(b => {
                    b.classList.remove('active'); b.setAttribute('aria-pressed', 'false');
                    b.querySelector('.pattern-preview').innerHTML = patternPreviewSvg(CONSTANTS.PATTERNS[b.dataset.pattern].pattern);
                });
                this.elBtnEraser.classList.remove('active');
                this.elBtnEraser.setAttribute('aria-pressed', 'false');
                btn.classList.add('active');
                btn.setAttribute('aria-pressed', 'true');
                if (this.inputHandler) {
                    this.inputHandler.setEraserMode(false);
                    this.inputHandler.setPattern(key);
                }
            });
            this.elPatternList.appendChild(btn);
        }
    }

    // Keeps the active card's silhouette in the orientation that will be placed.
    onPatternRotated() {
        const key = this.inputHandler?.activePatternKey;
        const preview = key && this.elPatternList.querySelector(`[data-pattern="${key}"] .pattern-preview`);
        if (preview) preview.innerHTML = patternPreviewSvg(this.inputHandler.currentPattern);
    }

    setPhaseLabel(text, phase) {
        this.elGamePhaseDisplay.textContent = text;
        if (phase) this.elGamePhaseDisplay.dataset.phase = phase;
    }

    startGame(config) {
        if (this.audio) {
            this.audio.stopNarration();
            if (config.scenario) this.elPanelExtras.insertAdjacentHTML('beforeend', this.audio.narrationButton(config.scenario, 'briefing'));
            this.elSettingsExtras.insertAdjacentHTML('beforeend', this.audio.controls());
            this.elSettingsExtras.querySelector('.audio-settings')?.setAttribute('open', '');
            this.audio.startGameAmbience(config.scenario);
        }
        // Hide start menu, reveal the game shell
        this.elStartMenu.classList.add('is-closed');
        this.elStartMenu.setAttribute('aria-hidden', 'true');
        this.elStartMenu.inert = true;
        this.elTopStats.hidden = false;
        this.elRightPanel.hidden = false;
        this.elBtnSettings.hidden = false;
        document.body.classList.add('in-game');

        // Initialize Core Systems
        this.gameState = new GameState(config);
        this.elPatternList.querySelectorAll('[data-pattern]').forEach(btn => {
            btn.hidden = !!config.scenario && !config.scenario.patterns.includes(btn.dataset.pattern);
        });
        this.renderer = new GameRenderer(this.canvas, this.gameState);
        let zoomControls = document.getElementById('boardZoomControls');
        if (!zoomControls) {
            zoomControls = document.createElement('div');
            zoomControls.id = 'boardZoomControls';
            zoomControls.setAttribute('role', 'toolbar');
            zoomControls.setAttribute('aria-label', 'Spielfeld-Zoom');
            zoomControls.innerHTML = `<button type="button" data-side aria-controls="rightPanel" aria-expanded="true" aria-label="Seitenleiste einklappen" title="Seitenleiste einklappen">${uiIcon('chevron-right')}</button><button type="button" data-zoom="1.25" aria-label="Spielfeld vergrößern" title="Vergrößern">${uiIcon('plus')}</button><button type="button" data-zoom="0.8" aria-label="Spielfeld verkleinern" title="Verkleinern">${uiIcon('minus')}</button><button type="button" data-zoom="fit" aria-label="Ganzes Spielfeld anzeigen" title="Einpassen">${uiIcon('fit')}</button>`;
            this.canvas.parentElement.append(zoomControls);
            zoomControls.addEventListener('click', event => {
                if (event.target.closest('[data-side]')) { this.display?.toggle(); return; }
                const factor = event.target.closest('[data-zoom]')?.dataset.zoom;
                if (!factor) return;
                if (factor === 'fit') { this.renderer.fit(); return; }
                this.renderer.zoomAt(this.canvas.width / 2, this.canvas.height / 2, Number(factor));
                this.render();
            });
        }
        this.inputHandler = new InputHandler(this.canvas, this.gameState, this);
        this.display = new DisplayControls(this);

        this.evolver = config.isDojoMode ? new AIEvolver(this.gameState) : null;
        this.ai = new AI(this.gameState); // Single instance, will swap genomes

        if (config.isDojoMode) {
            const playersGenomes = this.evolver.genomes; // Use current population
            this.aiGenomes = playersGenomes.slice(0, 4);
            // Assign IDs to genomes for tracking
            this.aiGenomes.forEach((g, i) => g.assignedToPlayer = i);
            this.logEvent(`Evolutions-Lauf gestartet (Gen: ${this.evolver.generation})`);
        } else {
            this.aiGenomes = null;
        }

        // Bind events
        this.gameState.onPhaseChange = this.handlePhaseChange.bind(this);
        this.gameState.onPlayerChange = this.handlePlayerChange.bind(this);
        this.gameState.onStateUpdate = this.handleStateUpdate.bind(this);
        this.gameState.onGameOver = this.handleGameOver.bind(this);
        this.gameState.onCycleUpdate = this.handleCycleUpdate.bind(this);

        // Bind speed slider
        const updateSimSpeed = () => {
            const speedVal = parseInt(this.elSimSpeed.value);
            // Cubic curve: 1→500ms, 50→~70ms, 100→16ms (~60fps, still visible to human eye)
            const x = speedVal / 100;
            const delay = Math.max(16, Math.round(500 * Math.pow(1 - x, 3)));

            this.gameState.simSpeedMs = config.scenario?.evolutionDelayMs ?? delay;
        };
        this.elSimSpeed.addEventListener('input', updateSimSpeed);
        updateSimSpeed(); // Initial read
        if (config.scenario) this.setupMissionControls(config.scenario);

        this.logEvent('Mission gestartet. Initialisiere Landezonen …');

        // Start Game State Machine
        this.gameState.start();

        // Render initial state
        this.render();
    }

    // Campaign-only controls: simulation bar on the board, simulation options in the menu, forecast in the panel.
    setupMissionControls(mission) {
        const state = this.gameState;
        let options = { slowMotion: true, pauseOnAlarm: false };
        try { options = { ...options, ...JSON.parse(localStorage.getItem('redroots_simulation_v1') || '{}') }; } catch { /* defaults */ }
        state.slowMotion = options.slowMotion === true; state.pauseOnAlarm = options.pauseOnAlarm === true;
        const fixedTempo = !!mission.evolutionDelayMs;
        let bar = document.getElementById('simControls');
        if (!bar) {
            bar = document.createElement('div');
            bar.id = 'simControls';
            bar.setAttribute('role', 'toolbar');
            bar.setAttribute('aria-label', 'Evolution steuern');
            this.canvas.parentElement.append(bar);
        }
        bar.hidden = true;
        bar.innerHTML = `<button type="button" data-sim="pause" aria-pressed="false">${uiIcon('pause')}<span>Pause</span></button><button type="button" data-sim="step" disabled aria-label="Eine Generation weiter" title="Eine Generation weiter (.)">+1</button>${fixedTempo ? '' : '<button type="button" data-sim="tempo" aria-label="Tempo wechseln">◷ Normal</button><button type="button" data-sim="turbo" aria-pressed="false">» Turbo</button>'}`;
        const tempos = [['Langsam', 20], ['Normal', 50], ['Schnell', 85]];
        bar.onclick = event => {
            const action = event.target.closest('[data-sim]')?.dataset.sim;
            if (action === 'pause') state.setPaused(!state.paused);
            if (action === 'step') state.stepOnce();
            if (action === 'turbo') { state.turbo = !state.turbo; this.syncSimControls(); }
            if (action === 'tempo') {
                const current = tempos.findIndex(([, value]) => Number(this.elSimSpeed.value) <= value);
                this.elSimSpeed.value = tempos[(Math.max(0, current) + 1) % tempos.length][1];
                this.elSimSpeed.dispatchEvent(new Event('input'));
                this.syncSimControls();
            }
        };
        state.onSimControl = () => this.syncSimControls();
        window.addEventListener('keydown', event => {
            if (state.phase !== CONSTANTS.PHASE_SIMULATION || event.target.closest?.('input, textarea')) return;
            if (event.key === 'p' || event.key === 'P') state.setPaused(!state.paused);
            if (event.key === '.') state.stepOnce();
        });
        if (mission.forecast) {
            this.elBtnFinishTurn.parentElement.insertAdjacentHTML('afterend', '<div class="forecast-tools"><button type="button" id="btnForecast" class="forecast-button"></button><p id="forecastSummary" class="forecast-summary" role="status" aria-live="polite"></p></div>');
            document.getElementById('btnForecast').onclick = () => {
                const result = state.forecast();
                if (!result) return;
                const hits = result.hits.map(h => h.kind === 'reach' ? `✓ ${h.label} in Gen ${h.generation}` : `⚠ ${h.label}: Gefahr in Gen ${h.generation}`);
                document.getElementById('forecastSummary').textContent = `Prognose über ${result.horizon} Generationen, ohne neue Gegneraussaat und angekündigte Ereignisse: ${hits.length ? hits.join(' · ') : 'kein Ziel erreicht, keine Gefahr.'}`;
                this.syncSimControls(); this.render();
            };
        }
        this.elSettingsExtras.insertAdjacentHTML('beforeend', `<details class="sim-options" open><summary>Simulation</summary><label><input type="checkbox" data-sim-option="slowMotion" ${state.slowMotion ? 'checked' : ''}> Zeitlupe in entscheidenden Momenten</label><label><input type="checkbox" data-sim-option="pauseOnAlarm" ${state.pauseOnAlarm ? 'checked' : ''}> Bei Alarm automatisch anhalten</label><p>Tasten: P pausiert, Punkt rückt eine Generation weiter.</p></details>`);
        this.elSettingsExtras.querySelectorAll('[data-sim-option]').forEach(input => input.onchange = () => {
            state[input.dataset.simOption] = input.checked;
            try { localStorage.setItem('redroots_simulation_v1', JSON.stringify({ slowMotion: state.slowMotion, pauseOnAlarm: state.pauseOnAlarm })); } catch { /* optional */ }
        });
        this.syncSimControls();
    }

    syncSimControls() {
        const state = this.gameState, bar = document.getElementById('simControls');
        if (!state?.scenario || !bar) return;
        const simulating = state.phase === CONSTANTS.PHASE_SIMULATION;
        bar.hidden = !simulating;
        const pause = bar.querySelector('[data-sim="pause"]');
        pause.innerHTML = `${uiIcon(state.paused ? 'play' : 'pause')}<span>${state.paused ? 'Weiter' : 'Pause'}</span>`;
        pause.setAttribute('aria-pressed', String(state.paused));
        bar.querySelector('[data-sim="step"]').disabled = !state.paused;
        const turbo = bar.querySelector('[data-sim="turbo"]');
        if (turbo) turbo.setAttribute('aria-pressed', String(state.turbo));
        const tempo = bar.querySelector('[data-sim="tempo"]');
        if (tempo) { const v = Number(this.elSimSpeed.value); tempo.textContent = `◷ ${v <= 20 ? 'Langsam' : v <= 50 ? 'Normal' : 'Schnell'}`; }
        if (simulating) this.elGamePhaseDisplay.dataset.phase = state.paused ? 'paused' : 'simulation';
        if (simulating && state.paused) this.elGamePhaseDisplay.textContent = 'Evolution · Pause';
        const forecast = document.getElementById('btnForecast');
        if (forecast) {
            forecast.textContent = `Prognose · ${state.forecastCharges} übrig`;
            forecast.disabled = !(state.forecastCharges > 0) || state.phase !== CONSTANTS.PHASE_PLACEMENT || state.currentPlayer !== 0;
            // A forecast is only valid for the board it was computed on.
            if (state.phase !== CONSTANTS.PHASE_PLACEMENT || state.forecastResult?.version !== state.boardVersion) document.getElementById('forecastSummary').textContent = '';
        }
    }

    // Primary action reflects the phase: end the turn, start the evolution, or (sandbox) stop it.
    updateFinishButton() {
        this.renderFinishButton();
        this.display?.syncRail();
    }

    renderFinishButton() {
        const s = this.gameState, btn = this.elBtnFinishTurn;
        if (!s) return;
        btn.classList.remove('btn-stop');
        if (s.isSandbox) {
            const running = s.phase === CONSTANTS.PHASE_SIMULATION;
            btn.innerHTML = running ? 'Simulation stoppen' : 'Simulation starten';
            btn.classList.toggle('btn-stop', running);
            btn.disabled = false;
            return;
        }
        if (s.phase === CONSTANTS.PHASE_SIMULATION) { btn.innerHTML = 'Evolution läuft …'; btn.disabled = true; return; }
        if (s.phase === CONSTANTS.PHASE_GAMEOVER) { btn.innerHTML = 'Spiel beendet'; btn.disabled = true; return; }
        if (s.objectiveSystem) btn.innerHTML = `Evolution starten<br><span class="btn-sub">${s.stepsPerRound} Generationen →</span>`;
        else btn.innerHTML = s.humanFlags?.filter(Boolean).length > 1 ? 'Zug beenden<br><span class="btn-sub">Nächstes Haus ist dran →</span>' : 'Zug beenden';
        btn.disabled = !s.isCurrentPlayerHuman();
    }

    handlePhaseChange(phase) {
        const [key, label] = PHASE_LABELS[phase] || ['setup', phase];
        this.setPhaseLabel(label, key);
        document.body.dataset.phase = key;
        this.display?.apply();
        if (this.gameState.objectiveSystem) { this.campaign?.onPhaseChange(phase); this.syncSimControls(); }

        if (phase === CONSTANTS.PHASE_SIMULATION) {
            if (this.audio) this.audio.setSituation('simulation');
            this.logEvent('Evolutionsphase läuft …');
            this.elEvolutionStatus.hidden = false;
            this.elEvoBar.style.width = '0%';
            this.elEvoCount.textContent = `0 / ${this.gameState.stepsPerRound}`;
            this.elSimSpeedContainer.hidden = !!this.gameState.scenario?.evolutionDelayMs;
            this.elTerritoryBarContainer.hidden = false;
            this.elCurrentPlayerDisplay.textContent = 'Evolution läuft …';
            document.body.dataset.turn = 'none';
            // During the evolution nobody is on turn: the panel shows the (first) human house.
            const shown = Math.max(0, this.gameState.humanFlags.indexOf(true));
            this.setHouseAccent(shown);
            this.showPlayerCard(shown, 'Evolution läuft');
            this.updateTerritoryBars();
        } else if (phase === CONSTANTS.PHASE_PLACEMENT) {
            if (this.audio) {
                const isTense = this.gameState.scenario?.act >= 4 || (this.gameState.scenario?.enemies?.length > 1);
                this.audio.setSituation(isTense ? 'tension' : 'planning');
            }
            this.elRoundDisplay.textContent = `${this.gameState.currentRound} / ${this.gameState.maxRounds}`;
            this.elEvolutionStatus.hidden = true;
            if (this.gameState.isSandbox) document.getElementById('btnResetSandbox').classList.remove('hidden');
            this.elSimSpeedContainer.hidden = true;
            this.elTerritoryBarContainer.hidden = false;
            this.logEvent(`Runde ${this.gameState.currentRound} beginnt.`);
            this.updateTerritoryBars();
        } else if (phase === CONSTANTS.PHASE_GAMEOVER) {
            this.elEvolutionStatus.hidden = true;
        }
        this.updateFinishButton();

        if (this.gameState.isSandbox) {
            this.elBudgetDisplay.textContent = '∞';
            this.elRoundDisplay.closest('.stat')?.classList.add('hidden');
            this.elTerritoryBarContainer.hidden = true;
        } else {
            this.elRoundDisplay.closest('.stat')?.classList.remove('hidden');
        }
    }

    handleCycleUpdate(step, maxSteps) {
        if (!this.gameState.paused) this.setPhaseLabel(`Evolution · ${step}/${maxSteps}`, 'simulation');
        this.elEvoCount.textContent = `${step} / ${maxSteps}`;
        this.elEvoBar.style.width = `${Math.min(100, step / maxSteps * 100)}%`;
    }

    setHouseAccent(pId) {
        const color = pId === null || pId < 0 ? null : CONSTANTS.PLAYER_COLORS[pId].main;
        for (const el of [this.elRightPanel, this.elTopStats]) {
            if (!el) continue;
            if (color) el.style.setProperty('--house', color); else el.style.removeProperty('--house');
        }
    }

    // Player card in the tool panel: emblem, house name, role and budget of the shown house.
    showPlayerCard(pId, role) {
        const player = CONSTANTS.PLAYER_COLORS[pId];
        this.elPanelPlayerName.textContent = player.name;
        this.elPanelPlayerRole.textContent = role;
        if (this.elPanelPlayerEmblem.getAttribute('src') !== player.asset) this.elPanelPlayerEmblem.src = player.asset;
        if (this.gameState.isSandbox) { this.elBudgetDisplay.textContent = '∞'; return; }
        this.lastBudget = null;
        this.updateBudgetDisplay(pId);
    }

    handlePlayerChange(pId) {
        if (pId < 0) return;

        const isHuman = this.gameState.isCurrentPlayerHuman();
        const scenario = this.gameState.scenario;
        // Houses without a role in this mission pass silently, without flashing their name in the panel.
        if (!isHuman && this.gameState.phase === CONSTANTS.PHASE_PLACEMENT && scenario && (this.gameState.defeatedPlayers?.has(pId) || (scenario.enemies ? !scenario.enemies.some(e => e.house === pId) : !scenario.enemy))) {
            this.gameState.nextPlayerTurn();
            return;
        }

        // Show camp indicator
        this.showCampIndicator(pId);

        const player = CONSTANTS.PLAYER_COLORS[pId];
        this.setHouseAccent(pId);
        document.body.dataset.turn = isHuman ? 'human' : 'ai';

        if (this.gameState.isSandbox) {
            this.elCurrentPlayerDisplay.textContent = 'Sandbox · Platziere nach Belieben';
        } else {
            this.elCurrentPlayerDisplay.textContent = isHuman ? `${player.name} ist am Zug` : `${player.name} (Computer) plant …`;
        }
        this.showPlayerCard(pId, this.gameState.isSandbox ? 'Sandbox' : isHuman ? 'Am Zug · Mensch' : 'Computer plant …');
        if (!scenario) this.display?.setStatus(this.gameState.isSandbox ? 'Sandbox' : `Am Zug: ${player.name} · ${isHuman ? 'Mensch' : 'Computer'}`);
        this.display?.syncRail();

        if (!isHuman && this.gameState.phase === CONSTANTS.PHASE_PLACEMENT) {
            this.elBtnFinishTurn.disabled = true;

            // Swap genome if in Dojo/Evolution mode
            if (this.aiGenomes) {
                this.ai.genome = this.aiGenomes[pId].params;
            }

            if (scenario) this.ai.genome = this.ai.getDefaultGenome(this.gameState.playerStrengths[pId], this.gameState.aiProfiles?.[pId]?.doctrine);
            this.ai.takeTurn();
        } else {
            this.updateFinishButton();
        }
    }

    handleStateUpdate() {
        this.updateBudgetDisplay();
        if (this.gameState.objectiveSystem && this.gameState.phase === CONSTANTS.PHASE_PLACEMENT) this.syncSimControls();
        if (this.campaign) this.campaign.updateHUD();
        if (this.gameState.phase === CONSTANTS.PHASE_SIMULATION || this.gameState.phase === CONSTANTS.PHASE_SETUP) {
            this.updateTerritoryBars();
        }
        this.render();
    }

    handleGameOver(winnerId) {
        document.body.dataset.phase = 'gameover';
        this.updateFinishButton();
        if (this.gameState.objectiveSystem) { this.campaign.showResult(); return; }
        let title = 'Gefecht beendet';
        let msg = '';
        let color = '';

        if (winnerId === -1) {
            title = 'Unentschieden';
            msg = 'Es ist ein Unentschieden. Keine Überlebenden.';
            this.elAlertImage.classList.add('hidden');
        } else {
            const winner = CONSTANTS.PLAYER_COLORS[winnerId];
            title = `${winner.name} siegt`;
            msg = `${winner.name} hat die Vorherrschaft errungen!`;
            color = winner.main;
            this.elAlertImage.src = winner.asset;
            this.elAlertImage.alt = winner.name;
            this.elAlertImage.classList.remove('hidden');
            this.elAlertImage.style.borderColor = color;
            this.elAlertImage.style.boxShadow = `0 0 40px ${winner.shadow}`;
        }

        this.elAlertTitle.textContent = title;
        this.elAlertMessage.textContent = msg;
        this.elAlertMessage.style.color = color;

        if (!this.gameState.isBatchMode) this.openDialog(this.elAlertOverlay, this.elBtnRestartGame);

        this.logEvent('Evolution beendet.');

        // Evolution Mode Result Recording
        if (this.gameState.isDojoMode && this.aiGenomes) {
            const stats = [];
            for (let i = 0; i < 4; i++) {
                stats.push({
                    pId: i,
                    territoryCount: this.getTerritoryCount(i),
                    minDistanceToEnemyCamp: this.getMinDistanceToEnemyCamp(i),
                    won: (winnerId === i)
                });
            }
            this.evolver.recordResult(stats);

            if (this.gameState.isBatchMode) {
                this.logEvent('Nächster Evolutions-Lauf in 1s …');
                setTimeout(() => {
                    location.reload();
                }, 1000);
            }
        }
    }

    getTerritoryCount(pId) {
        let count = 0;
        for (let r = 0; r < this.gameState.rows; r++) {
            for (let c = 0; c < this.gameState.cols; c++) {
                if (this.gameState.territory.getOwnerAt(r, c) === pId) count++;
            }
        }
        return count;
    }

    getMinDistanceToEnemyCamp(pId) {
        let minDist = 1000;
        const enemyCamps = this.gameState.territory.camps.filter(c => c.id !== pId);

        for (let r = 0; r < this.gameState.rows; r++) {
            for (let c = 0; c < this.gameState.cols; c++) {
                if (this.gameState.grid.getOwner(r, c) === pId + 1) {
                    for (const camp of enemyCamps) {
                        const centerR = (camp.rMin + camp.rMax) / 2;
                        const centerC = (camp.cMin + camp.cMax) / 2;
                        const dist = Math.sqrt(Math.pow(r - centerR, 2) + Math.pow(c - centerC, 2));
                        if (dist < minDist) minDist = dist;
                    }
                }
            }
        }
        return minDist;
    }

    updateBudgetDisplay(pId = null) {
        if (!this.gameState) return;
        if (pId === null) pId = this.gameState.currentPlayer >= 0 ? this.gameState.currentPlayer : this.shownPlayer;
        if (pId === undefined || pId < 0) return;
        this.shownPlayer = pId;
        if (this.gameState.isSandbox) { this.elBudgetDisplay.textContent = '∞'; return; }
        const budget = this.gameState.budgets[pId];
        if (String(budget) !== this.elBudgetDisplay.textContent) {
            this.elBudgetDisplay.textContent = budget;
            // A visible pulse when material is added (new round, supply cache), not when it is spent.
            if (this.lastBudget !== null && budget > this.lastBudget) {
                this.elBudgetDisplay.classList.remove('is-bump');
                void this.elBudgetDisplay.offsetWidth;
                this.elBudgetDisplay.classList.add('is-bump');
            }
        }
        this.lastBudget = budget;
        this.display?.syncRail();
        this.elPatternList.querySelectorAll('[data-pattern]').forEach(btn => {
            const tooExpensive = CONSTANTS.PATTERNS[btn.dataset.pattern].cost > budget;
            btn.classList.toggle('is-unaffordable', tooExpensive);
            btn.title = tooExpensive ? 'Zu wenig Genmaterial' : '';
        });
    }

    updateTerritoryBars() {
        if (!this.gameState || !this.elTerritoryBars) return;

        const counts = Array(this.gameState.playerCount).fill(0);
        let totalOwned = 0;

        for (let r = 0; r < this.gameState.rows; r++) {
            for (let c = 0; c < this.gameState.cols; c++) {
                const owner = this.gameState.territory.getOwnerAt(r, c);
                if (owner !== null && owner !== CONSTANTS.OWNER_NEUTRAL) {
                    counts[owner]++;
                    totalOwned++;
                }
            }
        }

        this.elTerritoryBars.innerHTML = '';
        if (totalOwned === 0) return;

        const summary = [];
        for (let i = 0; i < this.gameState.playerCount; i++) {
            if (counts[i] > 0) {
                const pct = (counts[i] / totalOwned) * 100;
                const bar = document.createElement('div');
                bar.style.width = `${pct}%`;
                bar.style.backgroundColor = CONSTANTS.PLAYER_COLORS[i].main;
                bar.className = 'territory-seg';
                bar.title = `${CONSTANTS.PLAYER_COLORS[i].name}: ${counts[i]} Felder (${Math.round(pct)} %)`;
                if (pct > 9) bar.textContent = counts[i];
                this.elTerritoryBars.appendChild(bar);
                summary.push(`${CONSTANTS.PLAYER_COLORS[i].name} ${Math.round(pct)} %`);
            }
        }
        this.elTerritoryBars.setAttribute('aria-label', `Gebietskontrolle: ${summary.join(', ')}`);
    }

    logEvent(msg) {
        this.elEventLog.textContent = msg;
    }

    showCampIndicator(pId) {
        if (this.campAnimFrame) {
            cancelAnimationFrame(this.campAnimFrame);
        }

        this.campIndicator = {
            pId: pId,
            startTime: Date.now(),
            opacity: 1
        };

        const animate = () => {
            const elapsed = Date.now() - this.campIndicator.startTime;
            if (elapsed < 3000) {
                this.campIndicator.opacity = 1;
                this.render();
                this.campAnimFrame = requestAnimationFrame(animate);
            } else if (elapsed < 4000) {
                this.campIndicator.opacity = 1 - (elapsed - 3000) / 1000;
                this.render();
                this.campAnimFrame = requestAnimationFrame(animate);
            } else {
                this.campIndicator.opacity = 0;
                this.campIndicator.pId = null;
                this.campAnimFrame = null;
                this.render();
            }
        };
        this.campAnimFrame = requestAnimationFrame(animate);
    }

    render() {
        if (this.renderer) {
            this.renderer.render(this.inputHandler, this.campIndicator);
        }
    }
}
