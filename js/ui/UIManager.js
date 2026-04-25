// js/ui/UIManager.js

class UIManager {
    constructor(canvas, config) {
        this.canvas = canvas;
        this.gameState = null; // Set later
        this.renderer = null; // Set later
        this.inputHandler = null; // Set later
        this.ai = null; // Set later

        // DOM Elements
        this.elStartMenu = document.getElementById('startMenu');
        this.elTopStats = document.getElementById('topStats');
        this.elGamePhaseDisplay = document.getElementById('gamePhaseDisplay');
        this.elRoundDisplay = document.getElementById('roundDisplay');
        this.elCurrentPlayerDisplay = document.getElementById('currentPlayerDisplay');
        
        this.elRightPanel = document.getElementById('rightPanel');
        this.elBtnTogglePanel = document.getElementById('btnTogglePanel');
        this.elPanelIcon = document.getElementById('panelIcon');
        
        this.elPanelPlayerHeader = document.getElementById('panelPlayerHeader');
        this.elPanelPlayerName = document.getElementById('panelPlayerName');
        this.elBudgetDisplay = document.getElementById('budgetDisplay');
        
        this.elBtnFinishTurn = document.getElementById('btnFinishTurn');
        this.elBtnRotate = document.getElementById('btnRotate');
        this.elBtnEraser = document.getElementById('btnEraser');
        this.elPatternList = document.getElementById('patternList');
        
        this.elBtnSettings = document.getElementById('btnSettings');
        
        this.elEventLog = document.getElementById('eventLog');
        
        // Alert Box
        this.elAlertOverlay = document.getElementById('alertOverlay');
        this.elAlertBox = document.getElementById('alertBox');
        this.elAlertTitle = document.getElementById('alertTitle');
        this.elAlertMessage = document.getElementById('alertMessage');
        this.elBtnRestartGame = document.getElementById('btnRestartGame');

        this.elSimSpeedContainer = document.getElementById('simSpeedContainer');
        this.elSimSpeed = document.getElementById('simSpeed');
        this.elTerritoryBarContainer = document.getElementById('territoryBarContainer');
        this.elTerritoryBars = document.getElementById('territoryBars');

        this.initStartMenu();
        this.initPanelControls();
    }

    initStartMenu() {
        // Load saved config
        const saved = localStorage.getItem('redroots_config');
        if (saved) {
            try {
                const c = JSON.parse(saved);
                if (c.raw_mapSize) document.getElementById('cfgMapSize').value = c.raw_mapSize;
                if (c.rounds) document.getElementById('cfgRounds').value = c.rounds;
                if (c.budgetFactor) document.getElementById('cfgBudgetFactor').value = c.budgetFactor;
                if (c.aiStrength) document.getElementById('cfgAiStrength').value = c.aiStrength;
                if (c.steps) document.getElementById('cfgSteps').value = c.steps;
                if (c.playerCount) document.getElementById('cfgPlayerCount').value = c.playerCount;
                if (c.humansCount) document.getElementById('cfgHumans').value = c.humansCount;
                if (c.radius) document.getElementById('cfgRadius').value = c.radius;
                if (c.collisionRule) document.getElementById('cfgCollision').value = c.collisionRule;
            } catch(e) { console.error('Failed to parse saved config', e); }
        }

        document.getElementById('btnStartGame').addEventListener('click', () => {
            // Read config
            const mapSize = document.getElementById('cfgMapSize').value;
            let rows = 60, cols = 100;
            if (mapSize === 'small') { rows = 40; cols = 60; }
            if (mapSize === 'large') { rows = 80; cols = 140; }
            if (mapSize === 'xlarge') { rows = 100; cols = 180; }
            if (mapSize === 'xxlarge') { rows = 140; cols = 240; }

            const config = {
                raw_mapSize: mapSize, // store to restore dropdown
                rows: rows,
                cols: cols,
                rounds: parseInt(document.getElementById('cfgRounds').value),
                budgetFactor: parseInt(document.getElementById('cfgBudgetFactor').value),
                aiStrength: document.getElementById('cfgAiStrength').value,
                steps: parseInt(document.getElementById('cfgSteps').value),
                playerCount: parseInt(document.getElementById('cfgPlayerCount').value),
                humansCount: parseInt(document.getElementById('cfgHumans').value),
                radius: parseInt(document.getElementById('cfgRadius').value),
                collisionRule: document.getElementById('cfgCollision').value
            };

            localStorage.setItem('redroots_config', JSON.stringify(config));
            this.startGame(config);
        });

        if (this.elBtnRestartGame) {
            this.elBtnRestartGame.addEventListener('click', () => {
                location.reload();
            });
        }
        if (this.elBtnSettings) {
            this.elBtnSettings.addEventListener('click', () => {
                if (confirm("Möchtest du das aktuelle Spiel abbrechen und neu starten?")) {
                    location.reload();
                }
            });
        }
    }

    initPanelControls() {
        let isPanelOpen = false;
        this.elBtnTogglePanel.addEventListener('click', () => {
            isPanelOpen = !isPanelOpen;
            if (isPanelOpen) {
                this.elRightPanel.classList.remove('translate-x-full');
                this.elPanelIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />`;
            } else {
                this.elRightPanel.classList.add('translate-x-full');
                this.elPanelIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />`;
            }
        });

        this.elBtnFinishTurn.addEventListener('click', () => {
            if (this.gameState && this.gameState.phase === CONSTANTS.PHASE_PLACEMENT && this.gameState.isCurrentPlayerHuman()) {
                this.gameState.nextPlayerTurn();
            }
        });

        this.elBtnRotate.addEventListener('click', () => {
            if (this.inputHandler) {
                this.inputHandler.rotatePattern();
            }
        });

        this.elBtnEraser.addEventListener('click', () => {
            this.elPatternList.querySelectorAll('.pattern-btn').forEach(b => b.classList.remove('active'));
            this.elBtnEraser.classList.add('active');
            if (this.inputHandler) {
                this.inputHandler.setEraserMode(true);
            }
        });
        
        // Populate patterns
        this.elPatternList.innerHTML = '';
        for (const [key, pData] of Object.entries(CONSTANTS.PATTERNS)) {
            const btn = document.createElement('button');
            btn.className = `pattern-btn ${key === 'cell' ? 'active' : ''}`;
            btn.innerHTML = `
                <span>${pData.name}</span>
                <span class="pattern-cost">${pData.cost}</span>
            `;
            btn.addEventListener('click', () => {
                // Remove active class from all
                this.elPatternList.querySelectorAll('.pattern-btn').forEach(b => b.classList.remove('active'));
                this.elBtnEraser.classList.remove('active');
                btn.classList.add('active');
                if (this.inputHandler) {
                    this.inputHandler.setEraserMode(false);
                    this.inputHandler.setPattern(key);
                }
            });
            this.elPatternList.appendChild(btn);
        }
    }

    startGame(config) {
        // Hide start menu
        this.elStartMenu.classList.add('opacity-0', 'pointer-events-none');
        this.elTopStats.classList.remove('hidden');
        
        // Initialize Core Systems
        this.gameState = new GameState(config);
        this.renderer = new GameRenderer(this.canvas, this.gameState);
        this.inputHandler = new InputHandler(this.canvas, this.gameState, this);
        this.ai = new AI(this.gameState);

        // Bind events
        this.gameState.onPhaseChange = this.handlePhaseChange.bind(this);
        this.gameState.onPlayerChange = this.handlePlayerChange.bind(this);
        this.gameState.onStateUpdate = this.handleStateUpdate.bind(this);
        this.gameState.onGameOver = this.handleGameOver.bind(this);
        this.gameState.onCycleUpdate = this.handleCycleUpdate.bind(this);

        // Bind speed slider
        const updateSimSpeed = () => {
            const speedVal = parseInt(this.elSimSpeed.value);
            // 1 to 100 map to 500ms to 0ms
            // Exponential-like feel:
            let delay;
            if (speedVal === 100) delay = 0;
            else if (speedVal > 80) delay = Math.max(1, 100 - speedVal);
            else delay = 500 - (speedVal * 5);

            this.gameState.simSpeedMs = delay;
        };
        this.elSimSpeed.addEventListener('input', updateSimSpeed);
        updateSimSpeed(); // Initial read

        this.logEvent("Mission gestartet. Initialisiere Landezonen...");
        
        // Open right panel automatically
        this.elBtnTogglePanel.click();

        // Start Game State Machine
        this.gameState.start();
        
        // Render initial state
        this.render();
    }

    handlePhaseChange(phase) {
        this.elGamePhaseDisplay.textContent = phase;
        
        if (phase === CONSTANTS.PHASE_SIMULATION) {
            this.elGamePhaseDisplay.classList.replace('text-mars-300', 'text-neon-cyan');
            this.logEvent("Simulationsphase läuft...");
            this.elRightPanel.classList.add('translate-x-full');
            this.elSimSpeedContainer.classList.remove('hidden');
            this.elTerritoryBarContainer.classList.remove('hidden');
            this.elCurrentPlayerDisplay.textContent = 'Simulation läuft...';
            this.elCurrentPlayerDisplay.style.color = '#fff';
            this.updateTerritoryBars();
        } else if (phase === CONSTANTS.PHASE_PLACEMENT) {
            this.elGamePhaseDisplay.classList.replace('text-neon-cyan', 'text-mars-300');
            this.elRoundDisplay.textContent = `${this.gameState.currentRound} / ${this.gameState.maxRounds}`;
            this.elRightPanel.classList.remove('translate-x-full');
            this.elSimSpeedContainer.classList.add('hidden');
            this.elTerritoryBarContainer.classList.add('hidden');
            this.logEvent(`Runde ${this.gameState.currentRound} beginnt.`);
            this.updateTerritoryBars();
        }
    }

    handleCycleUpdate(step, maxSteps) {
        this.elGamePhaseDisplay.textContent = `SIMULATION (${step}/${maxSteps})`;
    }

    handlePlayerChange(pId) {
        if (pId < 0) return;
        
        const isHuman = this.gameState.isCurrentPlayerHuman();
        const pName = isHuman ? `Spieler ${pId + 1}` : `Computer ${pId + 1}`;
        const pColor = CONSTANTS.PLAYER_COLORS[pId].main;
        
        this.elCurrentPlayerDisplay.textContent = isHuman ? `${pName} platziert...` : `${pName} rechnet...`;
        this.elCurrentPlayerDisplay.style.color = pColor;

        this.elPanelPlayerName.textContent = pName;
        this.elPanelPlayerHeader.style.borderColor = pColor;
        this.elPanelPlayerHeader.style.boxShadow = `0 0 15px ${CONSTANTS.PLAYER_COLORS[pId].bg}`;
        
        this.updateBudgetDisplay();
        
        if (!isHuman && this.gameState.phase === CONSTANTS.PHASE_PLACEMENT) {
            this.elBtnFinishTurn.disabled = true;
            this.elBtnFinishTurn.classList.add('opacity-50');
            this.ai.takeTurn();
        } else {
            this.elBtnFinishTurn.disabled = false;
            this.elBtnFinishTurn.classList.remove('opacity-50');
        }
    }

    handleStateUpdate() {
        this.updateBudgetDisplay();
        if (this.gameState.phase === CONSTANTS.PHASE_SIMULATION || this.gameState.phase === CONSTANTS.PHASE_SETUP) {
            this.updateTerritoryBars();
        }
        this.render();
    }

    handleGameOver(winnerId) {
        this.elRightPanel.classList.add('translate-x-full');
        let title = "SPIEL BEENDET";
        let msg = winnerId === -1 ? "Es ist ein Unentschieden. Keine Überlebenden." : `Spieler ${winnerId + 1} hat gesiegt!`;
        let color = winnerId === -1 ? 'white' : CONSTANTS.PLAYER_COLORS[winnerId].main;

        this.elAlertTitle.textContent = title;
        this.elAlertMessage.textContent = msg;
        this.elAlertMessage.style.color = color;

        this.elAlertOverlay.classList.remove('opacity-0', 'pointer-events-none');
        this.elAlertBox.classList.remove('scale-95');
        this.elAlertBox.classList.add('scale-100');
        
        this.logEvent("Simulation beendet.");
    }

    updateBudgetDisplay() {
        if (!this.gameState || this.gameState.currentPlayer < 0) return;
        const budget = this.gameState.budgets[this.gameState.currentPlayer];
        this.elBudgetDisplay.textContent = budget;
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

        for (let i = 0; i < this.gameState.playerCount; i++) {
            if (counts[i] > 0) {
                const pct = (counts[i] / totalOwned) * 100;
                const bar = document.createElement('div');
                bar.style.width = `${pct}%`;
                bar.style.backgroundColor = CONSTANTS.PLAYER_COLORS[i].main;
                bar.className = 'h-full flex items-center justify-center text-[10px] text-black font-bold truncate transition-all duration-300';
                if (pct > 5) bar.textContent = counts[i];
                this.elTerritoryBars.appendChild(bar);
            }
        }
    }

    logEvent(msg) {
        this.elEventLog.textContent = `> ${msg}`;
    }

    render() {
        if (this.renderer) {
            this.renderer.render(this.inputHandler);
        }
    }
}
