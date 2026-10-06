// js/core/GameState.js

class GameState {
    constructor(config) {
        this.rows = config.rows;
        this.cols = config.cols;
        this.maxRounds = config.rounds;
        this.stepsPerRound = config.steps;
        this.playerCount = config.playerCount;
        this.humanFlags = config.humanFlags || [true, false, false, false]; // Default: P1 is human
        this.radius = config.radius;
        this.budgetFactor = config.budgetFactor || 10;
        this.isDojoMode = config.isDojoMode || false;
        this.isBatchMode = config.isBatchMode || false;
        this.isSandbox = config.isSandbox || false;
        this.stopSimulation = false;
        this.rocksCount = config.rocks || 0;
        this._simDirty = false;
        this._rafId = null;

        // Zobrist hash table for fast periodicity detection
        this._zobristTable = this._initZobristTable();
        
        this.phase = CONSTANTS.PHASE_SETUP;
        this.currentRound = 1;
        this.currentPlayer = 0; // 0 to playerCount-1
        
        this.grid = new Grid(this.rows, this.cols, config.collisionRule);
        this.territory = new Territory(this.rows, this.cols, this.playerCount);
        
        // Budgets: Array of integers
        this.budgets = Array(this.playerCount).fill(0);
        
        // Initial setup
        this.generateRocks(config.rocks);
        this.territory.setInitialTerritories();
        this.calculateBudgets();

        // Assign AI Strengths dynamically
        this.playerStrengths = Array(this.playerCount).fill('medium'); // default
        const aiIndices = [];
        for (let i = 0; i < this.playerCount; i++) {
            if (!this.humanFlags[i]) aiIndices.push(i);
        }

        if (aiIndices.length === 1) {
            this.playerStrengths[aiIndices[0]] = 'hard';
        } else if (aiIndices.length === 2) {
            this.playerStrengths[aiIndices[0]] = 'medium';
            this.playerStrengths[aiIndices[1]] = 'hard';
        } else if (aiIndices.length === 3) {
            this.playerStrengths[aiIndices[0]] = 'easy';
            this.playerStrengths[aiIndices[1]] = 'medium';
            this.playerStrengths[aiIndices[2]] = 'hard';
        } else if (aiIndices.length === 4) {
            this.playerStrengths[0] = 'easy';
            this.playerStrengths[1] = 'medium';
            this.playerStrengths[2] = 'medium';
            this.playerStrengths[3] = 'hard';
        }

        this.history = []; // for periodicity detection
        this.undoStack = []; // for undoing placements
        this.simSpeedMs = 250; // default speed 

        // Callbacks for UI updates
        this.onPhaseChange = null;
        this.onPlayerChange = null;
        this.onStateUpdate = null; // Grid or territory updated
        this.onGameOver = null;
        this.onCycleUpdate = null; // Called each simulation step
        
        this.simSpeedMs = 100; // Updated by UI slider
        // Simulation controls. Every generation is still evaluated; only the waiting time changes.
        this.paused = false; this.turbo = false; this.slowMotion = false; this.pauseOnAlarm = false;
        this._pauseResolve = null; this._stepPending = false; this._slowUntil = -1; this._wasCritical = false;
        this.boardVersion = 0; this.checkpoints = {}; this.appliedEvents = new Set(); this.announcedEvents = new Set();
        if (config.scenario) MissionManager.apply(this, config.scenario);
    }

    start() {
        this.currentRound = 1;
        this.currentPlayer = 0;
        
        if (this.isSandbox) {
            this.budgets[0] = 999999;
        }

        this.changePhase(CONSTANTS.PHASE_PLACEMENT);
        this.notifyPlayerChange();
    }

    changePhase(newPhase) {
        this.phase = newPhase;
        // Placements of the current round, so the board can highlight fresh enemy colonies.
        if (newPhase === CONSTANTS.PHASE_PLACEMENT) this.roundPlacements = Array.from({ length: this.playerCount }, () => []);
        this.boardVersion++;
        if (newPhase === CONSTANTS.PHASE_PLACEMENT) this.applyScenarioEvents('round');
        // Round checkpoints live in memory only; they allow re-planning a round after a defeat.
        if (newPhase === CONSTANTS.PHASE_PLACEMENT && this.objectiveSystem) {
            this.checkpoints[this.currentRound] = this.snapshot();
            if (this.scenario.objective.type === 'race') this.objectiveSystem.raceArrival = this.raceClock();
        }
        if (newPhase === CONSTANTS.PHASE_SIMULATION) this.simulationStartedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
        if (this.onPhaseChange) this.onPhaseChange(this.phase);

        if (this.phase === CONSTANTS.PHASE_SIMULATION) {
            this.stopSimulation = false;
            this.runSimulation();
        }
    }

    clearGrid() {
        this.grid.resetGrid();
        this.generateRocks(this.rocksCount); 
        this.notifyStateUpdate();
    }
    
    resetSandbox() {
        this.clearGrid();
        this.currentRound = 1;
        this.budgets[0] = 999999;
        this.changePhase(CONSTANTS.PHASE_PLACEMENT);
    }

    nextPlayerTurn() {
        // The human plan of the round can be replayed after a rewind.
        if (this.currentPlayer === 0 && this.checkpoints[this.currentRound]) {
            this.checkpoints[this.currentRound].plan = (this.undoStack || []).map(d => d.type === 'placement'
                ? { type: 'placement', r: d.cells[0].r, c: d.cells[0].c, pattern: d.cells.map(cell => [cell.r - d.cells[0].r, cell.c - d.cells[0].c]) }
                : { type: 'erase', r: d.cells[0].r, c: d.cells[0].c });
        }
        this.undoStack = []; // Clear undo stack at the end of turn
        this.currentPlayer++;
        
        // Skip dead players / handle end of rotation
        if (this.currentPlayer >= this.playerCount) {
            // All players placed, run simulation
            this.currentPlayer = -1; // No active player during sim
            this.changePhase(CONSTANTS.PHASE_SIMULATION);
        } else {
            this.notifyPlayerChange();
        }
    }

    isCurrentPlayerHuman() {
        if (this.currentPlayer < 0) return false;
        return this.humanFlags[this.currentPlayer];
    }

    canPlacePattern(pattern, baseR, baseC) {
        if (this.phase !== CONSTANTS.PHASE_PLACEMENT) return false;

        if (this.isSandbox) {
             // Basic bounds check only
             for (const [dr, dc] of pattern) {
                const r = baseR + dr;
                const c = baseC + dc;
                if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) return false;
            }
            return true;
        }

        const cost = pattern.length;
        if (this.budgets[this.currentPlayer] < cost) return false;

        // Check if all cells fall in player's territory and not occupied
        for (const [dr, dc] of pattern) {
            const r = baseR + dr;
            const c = baseC + dc;
            
            // Bounds check
            if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) return false;
            
            // Occupancy check
            if (this.grid.getOwner(r, c) !== CONSTANTS.OWNER_NONE) return false;
            
            // Territory check
            if (this.territory.getOwnerAt(r, c) !== this.currentPlayer) return false;
        }

        return true;
    }

    placePattern(pattern, baseR, baseC) {
        if (!this.canPlacePattern(pattern, baseR, baseC)) return false;

        const delta = {
            type: 'placement',
            cost: pattern.length,
            cells: []
        };

        for (const [dr, dc] of pattern) {
            const r = baseR + dr;
            const c = baseC + dc;
            delta.cells.push({ r, c, owner: this.grid.getOwner(r, c), isOld: this.grid.getIsOld(r, c) });
            
            // Player index (0-3) → grid owner (1-4)
            this.grid.setCell(r, c, this.currentPlayer + 1);
        }

        if (!this.undoStack) this.undoStack = [];
        this.undoStack.push(delta);
        this.roundPlacements?.[this.currentPlayer]?.push(delta.cells.map(({ r, c }) => ({ r, c })));
        this.boardVersion++;

        if (!this.isSandbox) {
            this.budgets[this.currentPlayer] -= pattern.length;
            if (this.objectiveSystem && this.currentPlayer === 0) this.objectiveSystem.spent += pattern.length;
        }
        this.notifyStateUpdate();
        return true;
    }

    eraseCell(r, c) {
        if (this.phase !== CONSTANTS.PHASE_PLACEMENT) return false;
        const gridOwner = this.grid.getOwner(r, c);
        const isOld = this.grid.getIsOld(r, c);
        // Compare with grid owner value: player index + 1
        if (gridOwner === this.currentPlayer + 1 && !isOld) {
            const delta = {
                type: 'erase',
                cost: -1,
                cells: [{ r, c, owner: gridOwner, isOld: isOld }]
            };
            if (!this.undoStack) this.undoStack = [];
            this.undoStack.push(delta);
            
            this.grid.setCell(r, c, CONSTANTS.OWNER_NONE, false);
            this.boardVersion++;
            if (!this.isSandbox) {
                this.budgets[this.currentPlayer] += 1;
                if (this.objectiveSystem && this.currentPlayer === 0) this.objectiveSystem.spent -= 1;
            }
            this.notifyStateUpdate();
            return true;
        }
        return false;
    }

    undoLastAction() {
        if (this.phase !== CONSTANTS.PHASE_PLACEMENT) return false;
        if (!this.undoStack || this.undoStack.length === 0) return false;

        const delta = this.undoStack.pop();
        if (delta.type === 'placement') this.roundPlacements?.[this.currentPlayer]?.pop();
        this.boardVersion++;
        
        // Restore cells
        for (const cellData of delta.cells) {
            this.grid.setCell(cellData.r, cellData.c, cellData.owner, cellData.isOld);
        }
        
        // Restore budget
        this.budgets[this.currentPlayer] += delta.cost;
        if (this.objectiveSystem && this.currentPlayer === 0) this.objectiveSystem.spent -= delta.cost;
        
        this.notifyStateUpdate();
        return true;
    }

    async runSimulation() {
        const hashHistory = [];

        // Start decoupled render loop (renders at ~60fps independent of sim speed)
        this._simDirty = true;
        this._startRenderLoop();

        // Run Conway steps
        for (let step = 0; step < this.stepsPerRound; step++) {
            if (this.paused) await this._waitWhilePaused();
            if (this.stopSimulation) break;
            if (this.scenario?.events) this.applyScenarioEvents('generation');
            
            this.grid.calculateNextGeneration();
            this._simDirty = true; // Mark for next RAF render
            if (this.onCycleUpdate) this.onCycleUpdate(step + 1, this.stepsPerRound);
            
            // Check win condition only in camp regions (much faster than full scan)
            if (this.objectiveSystem ? this.objectiveSystem.evaluate(this, 'generation') : this.checkWinCondition()) {
                this._stopRenderLoop();
                this.notifyStateUpdate(); // Final render
                if (this.scenario?.resultHoldMs) {
                    await new Promise(resolve => setTimeout(resolve, this.scenario.resultHoldMs));
                }
                this.changePhase(CONSTANTS.PHASE_GAMEOVER);
                if (this.onGameOver) this.onGameOver(this.winner);
                return;
            }

            // Detect periodic states using Zobrist hash (zero string allocation)
            const { hash, aliveCount } = this._computeZobristHash();

            if (aliveCount === 0) {
                // Everyone dead, skip to end of round
                break;
            }

            if (!this.objectiveSystem && hashHistory.includes(hash)) {
                console.log(`Periodic state detected at step ${step}. Ending simulation phase early.`);
                break;
            }
            hashHistory.push(hash);
            if (hashHistory.length > 10) hashHistory.shift();

            // Decisive moments slow down (or pause on request) so they can be watched.
            const critical = !!this.objectiveSystem?.isCritical();
            if (critical && !this._wasCritical) {
                if (this.pauseOnAlarm) this.setPaused(true);
                else if (this.slowMotion) this._slowUntil = step + 12;
            }
            this._wasCritical = critical;
            const delay = this.turbo ? 0 : step < this._slowUntil ? Math.max(this.simSpeedMs, 150) : this.simSpeedMs;

            // Dynamic delay for visualization
            if (delay > 0) {
                await new Promise(resolve => setTimeout(resolve, delay));
            } else if (step % 50 === 0) {
                // Yield less often at max speed for better throughput
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }

        // Stop decoupled render loop
        this._stopRenderLoop();
        this.notifyStateUpdate(); // Final render of end state

        // End of round
        this.grid.markAllOld();
        this.territory.updateTerritories(this.grid, this.radius);
        
        if (this.objectiveSystem && this.objectiveSystem.evaluate(this, 'round')) {
            this.notifyStateUpdate();
            this.changePhase(CONSTANTS.PHASE_GAMEOVER);
            if (this.onGameOver) this.onGameOver(this.winner);
            return;
        }

        // Reset budgets dynamically
        this.calculateBudgets();
        // Supply caches reached during the evolution pay out between rounds, on top of the regular income.
        if (this.objectiveSystem?.pendingMaterial) { this.budgets[0] += this.objectiveSystem.pendingMaterial; this.objectiveSystem.pendingMaterial = 0; }

        this.currentRound++;
        if (this.isSandbox) {
            this.changePhase(CONSTANTS.PHASE_PLACEMENT);
            this.notifyStateUpdate();
            return;
        }

        if (this.currentRound > this.maxRounds) {
            // Draw or highest score? For now, just game over draw.
            this.winner = -1; // Draw
            this.changePhase(CONSTANTS.PHASE_GAMEOVER);
            if (this.onGameOver) this.onGameOver(this.winner);
        } else {
            this.currentPlayer = 0;
            this.changePhase(CONSTANTS.PHASE_PLACEMENT);
            this.notifyPlayerChange();
            this.notifyStateUpdate();
        }
    }

    // Applies due scenario events once: round events at the start of a planning phase, generation events
    // right before that generation is computed. Announcements are queued for the HUD.
    applyScenarioEvents(kind) {
        const events = this.scenario?.events;
        if (!events || !this.objectiveSystem) return;
        for (const e of events) {
            if (kind === 'round' && !this.announcedEvents.has(e.id) && this.currentRound >= e.announceRound && !this.appliedEvents.has(e.id)) {
                this.announcedEvents.add(e.id);
                this.objectiveSystem.events.push({ type: 'announce', eventId: e.id, text: e.text });
            }
            if (this.appliedEvents.has(e.id)) continue;
            const due = kind === 'round' ? e.round !== undefined && this.currentRound >= e.round : e.generation !== undefined && this.objectiveSystem.generations >= e.generation - 1;
            if (!due) continue;
            this.appliedEvents.add(e.id);
            MissionManager.applyAction(this, e.action);
            this.objectiveSystem.events.push({ type: 'scenario', eventId: e.id, text: e.text });
            this.boardVersion++;
        }
    }

    // Announced events that have not happened yet, with the time left.
    upcomingEvents() {
        return (this.scenario?.events || []).filter(e => !this.appliedEvents.has(e.id) && this.currentRound >= e.announceRound)
            .map(e => ({ ...e, areas: MissionManager.eventAreas(e), when: e.round !== undefined ? `Runde ${e.round}` : `Generation ${e.generation}` }));
    }

    setPaused(paused) {
        this.paused = paused;
        if (!paused) this._wake();
        if (this.onSimControl) this.onSimControl();
    }

    // Advances exactly one generation while paused.
    stepOnce() {
        if (!this.paused || this.phase !== CONSTANTS.PHASE_SIMULATION) return false;
        this._stepPending = true;
        this._wake();
        return true;
    }

    _wake() { const resolve = this._pauseResolve; this._pauseResolve = null; if (resolve) resolve(); }

    async _waitWhilePaused() {
        while (this.paused && !this._stepPending && !this.stopSimulation) await new Promise(resolve => { this._pauseResolve = resolve; });
        this._stepPending = false;
    }

    snapshot() {
        return { round: this.currentRound, owners: this.grid.owners.slice(), isOld: this.grid.isOldFlags.slice(), territory: this.territory.territoryMap.map(row => row.slice()), budgets: this.budgets.slice(), defeated: [...(this.defeatedPlayers || [])], aiRandomSeed: this.aiRandomSeed, objective: this.objectiveSystem.snapshot(), applied: [...this.appliedEvents], announced: [...this.announcedEvents], plan: [] };
    }

    // Rewinds a finished mission to the start of a round and replays the plan placed there.
    restoreCheckpoint(round, replay = true) {
        const checkpoint = this.checkpoints[round];
        if (!checkpoint || this.phase !== CONSTANTS.PHASE_GAMEOVER) return false;
        this._stopRenderLoop();
        this.stopSimulation = false; this.paused = false; this._stepPending = false; this._slowUntil = -1; this._wasCritical = false;
        this.grid.owners.set(checkpoint.owners); this.grid.isOldFlags.set(checkpoint.isOld);
        this.territory.territoryMap = checkpoint.territory.map(row => row.slice());
        this.budgets = checkpoint.budgets.slice();
        this.defeatedPlayers = new Set(checkpoint.defeated);
        this.aiRandomSeed = checkpoint.aiRandomSeed;
        this.objectiveSystem.restore(checkpoint.objective);
        this.appliedEvents = new Set(checkpoint.applied); this.announcedEvents = new Set(checkpoint.announced);
        for (const key of Object.keys(this.checkpoints)) if (Number(key) > round) delete this.checkpoints[key];
        this.currentRound = round; this.winner = undefined; this.undoStack = []; this.currentPlayer = 0;
        this.changePhase(CONSTANTS.PHASE_PLACEMENT);
        this.checkpoints[round] = checkpoint;
        this.notifyPlayerChange();
        if (replay) for (const action of checkpoint.plan) action.type === 'placement' ? this.placePattern(action.pattern, action.r, action.c) : this.eraseCell(action.r, action.c);
        this.notifyStateUpdate();
        return true;
    }

    _cloneGrid() {
        const grid = new Grid(this.rows, this.cols, this.grid.collisionRule);
        grid.owners.set(this.grid.owners); grid.isOldFlags.set(this.grid.isOldFlags);
        return grid;
    }

    // Looks ahead on a copy of the board without future enemy placements. Consumes one charge.
    forecast() {
        const config = this.scenario?.forecast;
        if (!config || this.phase !== CONSTANTS.PHASE_PLACEMENT || !(this.forecastCharges > 0)) return null;
        this.forecastCharges--;
        const grid = this._cloneGrid(), probe = { grid, rows: this.rows, cols: this.cols, playerCount: this.playerCount, territory: this.territory };
        const os = this.objectiveSystem, o = this.scenario.objective, trail = new Uint8Array(grid.size), hits = [];
        const targets = new Set([...(o.zones || []), o.zone].filter(Boolean));
        const watched = os.watchList(probe).filter(w => w.kind !== 'locked');
        const reached = new Set();
        for (let generation = 1; generation <= config.horizon; generation++) {
            grid.calculateNextGeneration();
            for (let i = 0; i < grid.size; i++) if (grid.owners[i] === 1) trail[i] = 1;
            for (const id of targets) if (!reached.has(id) && os.inZone(probe, os.zone(id), 1)) { reached.add(id); hits.push({ zoneId: id, label: os.zone(id).label, generation, kind: 'reach' }); }
            for (const w of watched) if (!reached.has(w.id) && w.owners.some(owner => os.inZone(probe, w.zone, owner))) { reached.add(w.id); hits.push({ zoneId: w.id, label: w.label, generation, kind: 'breach' }); }
        }
        this.forecastResult = { owners: grid.owners.slice(), trail, horizon: config.horizon, hits, version: this.boardVersion };
        return this.forecastResult;
    }

    // Generation at which Hellas would reach the race target if nobody intervenes (enemy flora only).
    raceClock(limit = 3 * this.stepsPerRound) {
        const zone = this.objectiveSystem.zone(this.scenario.objective.zone), grid = this._cloneGrid();
        for (let i = 0; i < grid.size; i++) if (grid.owners[i] === 1) grid.owners[i] = 0;
        const probe = { grid };
        for (let generation = 1; generation <= limit; generation++) {
            grid.calculateNextGeneration();
            if (this.objectiveSystem.inZone(probe, zone, 2)) return this.objectiveSystem.generations + generation;
        }
        return null;
    }

    checkWinCondition() {
        // Optimized: Only scan camp regions instead of the full grid (~900 cells vs ~18,000)
        const camps = this.territory.camps;
        const owners = this.grid.owners;
        const cols = this.cols;
        for (let ci = 0; ci < camps.length; ci++) {
            const camp = camps[ci];
            const campGridOwner = camp.id + 1; // Camp ID (0-3) → grid owner (1-4)
            for (let r = camp.rMin; r <= camp.rMax; r++) {
                for (let c = camp.cMin; c <= camp.cMax; c++) {
                    const cellOwner = owners[r * cols + c];
                    // A player cell (>0) that doesn't belong to this camp's owner
                    if (cellOwner > 0 && cellOwner !== campGridOwner) {
                        this.winner = cellOwner - 1; // Convert grid owner (1-4) → player index (0-3)
                        return true;
                    }
                }
            }
        }
        return false;
    }

    // --- Performance: Zobrist Hash ---
    _initZobristTable() {
        // Pre-compute random 32-bit values for each cell position × possible owner value.
        // Owner values we care about: player IDs (0-3), neutral (-1), rock (-3).
        // We use 6 slots per cell to cover owners: -3, -1, 0, 1, 2, 3
        const size = this.rows * this.cols * 6;
        const table = new Uint32Array(size);
        for (let i = 0; i < size; i++) {
            table[i] = (Math.random() * 0xFFFFFFFF) >>> 0;
        }
        return table;
    }

    _ownerToSlot(owner) {
        // Map owner values to table slots: 0(empty)→skip, -3→0, -1→1, 1→2, 2→3, 3→4, 4→5
        if (owner === 0) return -1; // skip empty (OWNER_NONE)
        if (owner === CONSTANTS.OWNER_ROCK) return 0;
        if (owner === CONSTANTS.OWNER_NEUTRAL) return 1;
        return owner + 1; // 1→2, 2→3, 3→4, 4→5
    }

    _computeZobristHash() {
        let hash = 0;
        let aliveCount = 0;
        const owners = this.grid.owners; // Direct flat array access
        const size = this.grid.size;
        const table = this._zobristTable;

        for (let i = 0; i < size; i++) {
            const owner = owners[i];
            if (owner !== 0) { // Not empty
                aliveCount++;
                const slot = this._ownerToSlot(owner);
                if (slot >= 0) {
                    hash ^= table[i * 6 + slot];
                }
            }
        }
        return { hash, aliveCount };
    }

    // --- Performance: Decoupled Render Loop ---
    _startRenderLoop() {
        const loop = () => {
            if (this._simDirty) {
                this._simDirty = false;
                this.notifyStateUpdate();
            }
            if (this.phase === CONSTANTS.PHASE_SIMULATION) {
                this._rafId = requestAnimationFrame(loop);
            }
        };
        this._rafId = requestAnimationFrame(loop);
    }

    _stopRenderLoop() {
        if (this._rafId) {
            cancelAnimationFrame(this._rafId);
            this._rafId = null;
        }
    }

    generateRocks(count) {
        if (!count || count <= 0) return;
        
        let rocksPlaced = 0;
        let attempts = 0;
        const maxAttempts = count * 20;
        
        while (rocksPlaced < count && attempts < maxAttempts) {
            attempts++;
            // Pick random start for cluster
            let r = Math.floor(Math.random() * this.rows);
            let c = Math.floor(Math.random() * this.cols);
            
            // Random cluster size
            const clusterSize = Math.min(count - rocksPlaced, Math.floor(Math.random() * 20) + 5);
            let clusterPlaced = 0;
            
            while (clusterPlaced < clusterSize && attempts < maxAttempts) {
                attempts++;
                // Check if valid to place rock here (not in a camp, not already a rock)
                if (this.grid.getOwner(r, c) !== CONSTANTS.OWNER_ROCK) {
                    if (this.territory.isCamp(r, c) === null) {
                        this.grid.setCell(r, c, CONSTANTS.OWNER_ROCK, true);
                        rocksPlaced++;
                        clusterPlaced++;
                    }
                }
                
                // Random walk
                const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]];
                const dir = dirs[Math.floor(Math.random() * dirs.length)];
                r += dir[0];
                c += dir[1];
                
                r = Math.max(0, Math.min(this.rows - 1, r));
                c = Math.max(0, Math.min(this.cols - 1, c));
            }
        }
    }

    notifyPlayerChange() {
        if (this.onPlayerChange) this.onPlayerChange(this.currentPlayer);
    }

    notifyStateUpdate() {
        if (this.onStateUpdate) this.onStateUpdate();
    }

    calculateBudgets() {
        const counts = Array(this.playerCount).fill(0);
        
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const owner = this.territory.getOwnerAt(r, c);
                if (owner !== null && owner >= 0) {
                    counts[owner]++;
                }
            }
        }

        for (let i = 0; i < this.playerCount; i++) {
            // Give 1 budget per 'budgetFactor' territory tiles, min budget of 1 to avoid soft locks completely
            if (this.scenario && (this.defeatedPlayers?.has(i) || (i > 0 && this.scenario.enemies && !this.scenario.enemies.some(e => e.house === i)))) {
                this.budgets[i] = 0;
            } else if (this.isSandbox && i === 0) {
                this.budgets[i] = 999999;
            } else {
                this.budgets[i] += Math.max(1, Math.floor(counts[i] / this.budgetFactor));
            }
        }
    }
}
