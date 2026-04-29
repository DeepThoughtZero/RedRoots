// js/ui/UIManager.js

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
        this.elBtnTogglePanel = document.getElementById('btnTogglePanel');
        this.elPanelIcon = document.getElementById('panelIcon');
        
        this.elPanelPlayerHeader = document.getElementById('panelPlayerHeader');
        this.elPanelPlayerName = document.getElementById('panelPlayerName');
        this.elBudgetDisplay = document.getElementById('budgetDisplay');
        
        this.elBtnFinishTurn = document.getElementById('btnFinishTurn');
        this.elBtnRotate = document.getElementById('btnRotate');
        this.elBtnEraser = document.getElementById('btnEraser');
        this.elBtnUndo = document.getElementById('btnUndo');
        this.elPatternList = document.getElementById('patternList');
        
        this.elBtnSettings = document.getElementById('btnSettings');
        
        this.elEventLog = document.getElementById('eventLog');
        
        // Alert Box
        this.elAlertOverlay = document.getElementById('alertOverlay');
        this.elAlertBox = document.getElementById('alertBox');
        this.elAlertTitle = document.getElementById('alertTitle');
        this.elAlertImage = document.getElementById('alertImage');
        this.elAlertMessage = document.getElementById('alertMessage');
        this.elBtnRestartGame = document.getElementById('btnRestartGame');

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
        if (setupHeaderImage) {
            setupHeaderImage.src = Math.random() > 0.5 ? 'assets/Mars_Overview01.png' : 'assets/Mars_Overview02.png';
        }

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
                if (c.steps) document.getElementById('cfgSteps').value = c.steps;
                if (c.radius) document.getElementById('cfgRadius').value = c.radius;
                if (c.humanFlags) this.humanFlags = c.humanFlags;
            } catch(e) { console.error('Failed to parse saved config', e); }
        } else {
            this.humanFlags = [true, false, false, false]; // Default: P1 human
        }

        // Randomize Rocks (Mountains) for each mission
        const cfgRocks = document.getElementById('cfgRocks');
        const valRocks = document.getElementById('valRocks');
        if (cfgRocks && valRocks) {
            const randomRocks = Math.floor(Math.random() * 1001);
            cfgRocks.value = randomRocks;
            valRocks.textContent = randomRocks;
            
            cfgRocks.addEventListener('input', () => {
                valRocks.textContent = cfgRocks.value;
            });
        }

        // Interactive House Selection
        const humanHousesContainer = document.getElementById('humanHousesContainer');
        if (!this.humanFlags) this.humanFlags = [true, false, false, false]; // Fallback if not loaded

        if (humanHousesContainer) {
            const updateHouseUI = () => {
                humanHousesContainer.innerHTML = '';
                CONSTANTS.PLAYER_COLORS.forEach((player, i) => {
                    const isSelected = this.humanFlags[i];
                    
                    const wrapper = document.createElement('div');
                    wrapper.className = `relative cursor-pointer rounded-2xl border-2 transition-all p-4 flex flex-col items-center justify-center gap-3 ${
                        isSelected ? 'border-mars-500 bg-mars-900/40 shadow-[0_0_20px_rgba(239,68,68,0.4)]' : 'border-white/5 bg-black/40 opacity-30 hover:opacity-70 hover:border-white/10'
                    }`;
                    
                    wrapper.innerHTML = `
                        <div class="relative w-full aspect-video overflow-hidden rounded-lg">
                            <img src="${player.asset}" alt="${player.name}" class="w-full h-full object-contain ${isSelected ? 'drop-shadow-[0_0_12px_rgba(255,255,255,0.5)] scale-110' : 'grayscale'} transition-all duration-500">
                        </div>
                        <span class="text-xs font-black uppercase tracking-widest ${isSelected ? 'text-mars-300' : 'text-gray-500'}">${player.name.split(' ')[1]}</span>
                        <div class="absolute top-2 right-2 text-sm drop-shadow-md">
                            ${isSelected ? '👤' : '🤖'}
                        </div>
                    `;
                    
                    wrapper.addEventListener('click', () => {
                        this.humanFlags[i] = !this.humanFlags[i];
                        // Ensure at least one human or at least keep it flexible (AI vs AI is also cool)
                        updateHouseUI();
                    });
                    
                    humanHousesContainer.appendChild(wrapper);
                });
            };
            updateHouseUI();
        }

        // Developer Mode (5 clicks on title)
        const setupTitle = document.getElementById('setupTitle');
        const devSettings = document.getElementById('devSettings');
        let setupClickCount = 0;
        if (setupTitle && devSettings) {
            setupTitle.addEventListener('click', () => {
                setupClickCount++;
                if (setupClickCount >= 5) {
                    devSettings.classList.remove('hidden');
                    setupTitle.classList.add('text-orange-500');
                    setupTitle.textContent = "Developer Setup";
                    this.logEvent("Entwicklermodus aktiviert.");
                }
            });
        }

        const cfgDojoMode = document.getElementById('cfgDojoMode');
        const batchModeContainer = document.getElementById('batchModeContainer');
        if (cfgDojoMode && batchModeContainer) {
            const cfgSteps = document.getElementById('cfgSteps');
            cfgDojoMode.addEventListener('change', () => {
                if (cfgDojoMode.checked) {
                    batchModeContainer.classList.remove('hidden');
                    if (cfgSteps) cfgSteps.value = 150;
                } else {
                    batchModeContainer.classList.add('hidden');
                    if (cfgSteps) cfgSteps.value = 2000;
                }
            });
        }

        document.getElementById('btnStartGame').addEventListener('click', () => {
            const devSettings = document.getElementById('devSettings');
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
                steps = 2000;
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

            localStorage.setItem('redroots_config', JSON.stringify(config));
            this.startGame(config);
        });

        // Help Modal Events
        const btnHelp = document.getElementById('btnHelp');
        const btnShowBriefing = document.getElementById('btnShowBriefing'); // Question mark in setup
        const btnHelpClose = document.getElementById('btnHelpClose');
        const helpOverlay = document.getElementById('helpOverlay');
        const helpBox = document.getElementById('helpBox');

        // Audio for Briefing
        this.audioBriefing = new Audio('assets/Intro_Rules.mp3');
        this.audioBriefing.loop = true;

        const showHelp = () => {
            helpOverlay.classList.remove('hidden');
            this.audioBriefing.play().catch(e => console.warn("Audio playback failed:", e));
            
            setTimeout(() => {
                helpOverlay.classList.remove('opacity-0', 'pointer-events-none');
                helpBox.classList.remove('scale-95');
            }, 10);
        };

        if (btnHelp) btnHelp.addEventListener('click', showHelp);
        if (btnShowBriefing) btnShowBriefing.addEventListener('click', showHelp);

        if (btnHelpClose && helpOverlay && helpBox) {
            btnHelpClose.addEventListener('click', () => {
                helpOverlay.classList.add('opacity-0', 'pointer-events-none');
                helpBox.classList.add('scale-95');
                
                // Stop audio
                this.audioBriefing.pause();
                this.audioBriefing.currentTime = 0;

                setTimeout(() => {
                    helpOverlay.classList.add('hidden');

                    // If first time, show start menu now
                    if (!localStorage.getItem('redroots_briefing_shown')) {
                        localStorage.setItem('redroots_briefing_shown', 'true');
                        this.elStartMenu.classList.remove('hidden', 'opacity-0');
                    }
                }, 300);
            });
        }

        // Check first start
        const briefingShown = localStorage.getItem('redroots_briefing_shown');
        if (!briefingShown) {
            // Hide start menu initially
            this.elStartMenu.classList.add('hidden');
            // Trigger help overlay
            setTimeout(() => {
                if (btnHelp) btnHelp.click();
            }, 500);
        }

        if (this.elBtnRestartGame) {
            this.elBtnRestartGame.addEventListener('click', () => {
                location.reload();
            });
        }
        if (this.elBtnSettings) {
            this.elBtnSettings.addEventListener('click', () => {
                // Randomize Cancel Header Image
                const cancelHeaderImage = document.getElementById('cancelHeaderImage');
                if (cancelHeaderImage) {
                    cancelHeaderImage.src = Math.random() > 0.5 ? 'assets/Mars_Terraforming01.png' : 'assets/Mars_Terraforming02.png';
                }

                this.elSettingsOverlay.classList.remove('hidden');
                setTimeout(() => {
                    this.elSettingsOverlay.classList.remove('opacity-0', 'pointer-events-none');
                    this.elSettingsBox.classList.remove('scale-95');
                }, 10);
            });
        }

        if (this.elBtnSettingsCancel) {
            this.elBtnSettingsCancel.addEventListener('click', () => {
                this.elSettingsOverlay.classList.add('opacity-0', 'pointer-events-none');
                this.elSettingsBox.classList.add('scale-95');
                setTimeout(() => {
                    this.elSettingsOverlay.classList.add('hidden');
                }, 300);
            });
        }

        if (this.elBtnSettingsConfirm) {
            this.elBtnSettingsConfirm.addEventListener('click', () => {
                location.reload();
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
                if (this.gameState && this.gameState.isSandbox) {
                    if (confirm("Spielfeld wirklich komplett leeren?")) {
                        this.gameState.resetSandbox();
                    }
                }
            });
        }

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

        if (this.elBtnUndo) {
            this.elBtnUndo.addEventListener('click', () => {
                if (this.gameState && this.gameState.undoLastAction()) {
                    this.render();
                }
            });
        }
        
        // Populate patterns
        this.elPatternList.innerHTML = '';
        const sortedPatterns = Object.entries(CONSTANTS.PATTERNS).sort((a, b) => a[1].cost - b[1].cost);
        for (const [key, pData] of sortedPatterns) {
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
        
        this.evolver = new AIEvolver(this.gameState);
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
            // Cubic curve to map 1-100 to 500ms-0ms. Makes the middle position much faster (e.g., 50 -> ~62ms)
            const x = speedVal / 100;
            const delay = Math.round(500 * Math.pow(1 - x, 3));
            
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
            this.logEvent("Evolutionsphase läuft...");
            
            if (this.gameState.isSandbox) {
                this.elBtnFinishTurn.innerHTML = `<span>Simulation stoppen</span> <span class="ml-1 text-sm">⏹️</span>`;
                this.elBtnFinishTurn.className = 'flex-1 text-white font-bold py-2 px-4 rounded transition btn-sandbox-stop';
            } else {
                this.elRightPanel.classList.add('translate-x-full');
            }
            
            this.elSimSpeedContainer.classList.remove('hidden');
            this.elTerritoryBarContainer.classList.remove('hidden');
            this.elCurrentPlayerDisplay.textContent = 'Evolution läuft...';
            this.elCurrentPlayerDisplay.style.color = '#fff';
            this.updateTerritoryBars();
        } else if (phase === CONSTANTS.PHASE_PLACEMENT) {
            this.elGamePhaseDisplay.classList.replace('text-neon-cyan', 'text-mars-300');
            this.elRoundDisplay.textContent = `${this.gameState.currentRound} / ${this.gameState.maxRounds}`;
            this.elRightPanel.classList.remove('translate-x-full');
            
            if (this.gameState.isSandbox) {
                this.elBtnFinishTurn.innerHTML = `<span>Simulation starten</span> <span class="ml-1 text-sm">▶️</span>`;
                this.elBtnFinishTurn.className = 'flex-1 text-white font-bold py-2 px-4 rounded transition btn-sandbox-start';
                document.getElementById('btnResetSandbox').classList.remove('hidden');
            }
            
            this.elSimSpeedContainer.classList.add('hidden');
            this.elTerritoryBarContainer.classList.remove('hidden');
            this.logEvent(`Runde ${this.gameState.currentRound} beginnt.`);
            this.updateTerritoryBars();
        }

        if (this.gameState.isSandbox) {
            this.elBudgetDisplay.textContent = "∞";
            this.elRoundDisplay.parentElement.classList.add('hidden');
            this.elTerritoryBarContainer.classList.add('hidden');
        }
    }

    handleCycleUpdate(step, maxSteps) {
        this.elGamePhaseDisplay.textContent = `EVOLUTION (${step}/${maxSteps})`;
    }

    handlePlayerChange(pId) {
        if (pId < 0) return;
        
        // Show camp indicator
        this.showCampIndicator(pId);
        
        const isHuman = this.gameState.isCurrentPlayerHuman();
        const pName = CONSTANTS.PLAYER_COLORS[pId].name;
        const pColor = CONSTANTS.PLAYER_COLORS[pId].main;
        
        if (this.gameState.isSandbox) {
            this.elCurrentPlayerDisplay.textContent = "Sandbox Modus - Platziere nach Belieben";
            this.elCurrentPlayerDisplay.style.color = "#fff";
        } else {
            this.elCurrentPlayerDisplay.textContent = isHuman ? `${pName} ist am Zug...` : `${pName} (KI) berechnet...`;
            this.elCurrentPlayerDisplay.style.color = pColor;
        }

        this.elPanelPlayerName.textContent = pName;
        this.elPanelPlayerHeader.style.borderColor = pColor;
        this.elPanelPlayerHeader.style.boxShadow = `0 0 15px ${CONSTANTS.PLAYER_COLORS[pId].bg}`;
        
        if (this.gameState.isSandbox) {
            this.elBudgetDisplay.textContent = "∞";
        } else {
            this.updateBudgetDisplay();
        }
        
        if (!isHuman && this.gameState.phase === CONSTANTS.PHASE_PLACEMENT) {
            this.elBtnFinishTurn.disabled = true;
            this.elBtnFinishTurn.classList.add('opacity-50');
            
            // Swap genome if in Dojo/Evolution mode
            if (this.aiGenomes) {
                this.ai.genome = this.aiGenomes[pId].params;
            }
            
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
        let title = "MISSION BEENDET";
        let msg = "";
        let color = "white";
        let asset = "";

        if (winnerId === -1) {
            msg = "Es ist ein Unentschieden. Keine Überlebenden.";
            this.elAlertImage.classList.add('hidden');
        } else {
            const winner = CONSTANTS.PLAYER_COLORS[winnerId];
            msg = `${winner.name} hat die Vorherrschaft errungen!`;
            color = winner.main;
            this.elAlertImage.src = winner.asset;
            this.elAlertImage.classList.remove('hidden');
            this.elAlertImage.style.borderColor = color;
            this.elAlertImage.style.boxShadow = `0 0 30px ${winner.shadow}`;
        }

        this.elAlertTitle.textContent = title;
        this.elAlertMessage.textContent = msg;
        this.elAlertMessage.style.color = color;

        if (!this.gameState.isBatchMode) {
            this.elAlertOverlay.classList.remove('opacity-0', 'pointer-events-none');
            this.elAlertBox.classList.remove('scale-95');
            this.elAlertBox.classList.add('scale-100');
        }
        
        this.logEvent("Evolution beendet.");

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
                this.logEvent("Nächster Evolutions-Lauf in 1s...");
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
                if (this.gameState.grid.getCell(r, c).owner === pId) {
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
