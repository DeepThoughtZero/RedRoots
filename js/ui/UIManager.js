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
        this.elPatternList = document.getElementById('patternList');
        
        this.elEventLog = document.getElementById('eventLog');
        
        // Alert Box
        this.elAlertOverlay = document.getElementById('alertOverlay');
        this.elAlertBox = document.getElementById('alertBox');
        this.elAlertTitle = document.getElementById('alertTitle');
        this.elAlertMessage = document.getElementById('alertMessage');
        this.elBtnRestartGame = document.getElementById('btnRestartGame');

        this.elSimSpeedContainer = document.getElementById('simSpeedContainer');
        this.elSimSpeed = document.getElementById('simSpeed');

        this.initStartMenu();
        this.initPanelControls();
    }

    initStartMenu() {
        document.getElementById('btnStartGame').addEventListener('click', () => {
            // Read config
            const mapSize = document.getElementById('cfgMapSize').value;
            let rows = 60, cols = 100;
            if (mapSize === 'small') { rows = 40; cols = 60; }
            if (mapSize === 'large') { rows = 80; cols = 140; }

            const config = {
                rows: rows,
                cols: cols,
                rounds: parseInt(document.getElementById('cfgRounds').value),
                budget: parseInt(document.getElementById('cfgBudget').value),
                steps: parseInt(document.getElementById('cfgSteps').value),
                playerCount: parseInt(document.getElementById('cfgPlayerCount').value),
                humansCount: parseInt(document.getElementById('cfgHumans').value),
                radius: parseInt(document.getElementById('cfgRadius').value),
                collisionRule: document.getElementById('cfgCollision').value
            };

            this.startGame(config);
        });

        if (this.elBtnRestartGame) {
            this.elBtnRestartGame.addEventListener('click', () => {
                location.reload();
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
                btn.classList.add('active');
                if (this.inputHandler) {
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
            // 1 to 60 -> map to delay. High speed = low delay. e.g. 60 -> 10ms, 1 -> 500ms
            const delay = Math.max(10, 500 - (speedVal * 8)); 
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
            this.elRightPanel.classList.add('opacity-50', 'pointer-events-none');
            this.elSimSpeedContainer.classList.remove('hidden');
        } else if (phase === CONSTANTS.PHASE_PLACEMENT) {
            this.elGamePhaseDisplay.classList.replace('text-neon-cyan', 'text-mars-300');
            this.elRoundDisplay.textContent = `${this.gameState.currentRound} / ${this.gameState.maxRounds}`;
            this.elRightPanel.classList.remove('opacity-50', 'pointer-events-none');
            this.elSimSpeedContainer.classList.add('hidden');
            this.logEvent(`Runde ${this.gameState.currentRound} beginnt.`);
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
        
        this.elCurrentPlayerDisplay.textContent = pName;
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

    logEvent(msg) {
        this.elEventLog.textContent = `> ${msg}`;
    }

    render() {
        if (this.renderer) {
            this.renderer.render(this.inputHandler);
        }
    }
}
