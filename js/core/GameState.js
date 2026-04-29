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
        if (this.onPhaseChange) this.onPhaseChange(this.phase);

        if (this.phase === CONSTANTS.PHASE_SIMULATION) {
            this.stopSimulation = false;
            this.runSimulation();
        }
    }

    clearGrid() {
        this.grid.cells = this.grid.createEmptyGrid();
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
            if (this.grid.getCell(r, c).owner !== CONSTANTS.OWNER_NONE) return false;
            
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
            const existingCell = this.grid.getCell(r, c);
            delta.cells.push({ r, c, owner: existingCell.owner, isOld: existingCell.isOld });
            
            this.grid.setCell(r, c, this.currentPlayer);
        }

        if (!this.undoStack) this.undoStack = [];
        this.undoStack.push(delta);

        if (!this.isSandbox) {
            this.budgets[this.currentPlayer] -= pattern.length;
        }
        this.notifyStateUpdate();
        return true;
    }

    eraseCell(r, c) {
        if (this.phase !== CONSTANTS.PHASE_PLACEMENT) return false;
        const cell = this.grid.getCell(r, c);
        if (cell && cell.owner === this.currentPlayer && !cell.isOld) {
            const delta = {
                type: 'erase',
                cost: -1, // since we add 1 to budget when erasing, undoing it costs 1
                cells: [{ r, c, owner: cell.owner, isOld: cell.isOld }]
            };
            if (!this.undoStack) this.undoStack = [];
            this.undoStack.push(delta);
            
            this.grid.setCell(r, c, CONSTANTS.OWNER_NONE, false);
            if (!this.isSandbox) {
                this.budgets[this.currentPlayer] += 1;
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
        
        // Restore cells
        for (const cellData of delta.cells) {
            this.grid.setCell(cellData.r, cellData.c, cellData.owner, cellData.isOld);
        }
        
        // Restore budget
        this.budgets[this.currentPlayer] += delta.cost;
        
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
            if (this.stopSimulation) break;
            
            this.grid.calculateNextGeneration();
            this._simDirty = true; // Mark for next RAF render
            if (this.onCycleUpdate) this.onCycleUpdate(step + 1, this.stepsPerRound);
            
            // Check win condition only in camp regions (much faster than full scan)
            if (this.checkWinCondition()) {
                this._stopRenderLoop();
                this.notifyStateUpdate(); // Final render
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

            if (hashHistory.includes(hash)) {
                console.log(`Periodic state detected at step ${step}. Ending simulation phase early.`);
                break;
            }
            hashHistory.push(hash);
            if (hashHistory.length > 10) hashHistory.shift();

            // Dynamic delay for visualization
            if (this.simSpeedMs > 0) {
                await new Promise(resolve => setTimeout(resolve, this.simSpeedMs)); 
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
        this.territory.updateTerritories(this.grid.cells, this.radius);
        
        // Reset budgets dynamically
        this.calculateBudgets();

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

    checkWinCondition() {
        // Optimized: Only scan camp regions instead of the full grid (~900 cells vs ~18,000)
        const camps = this.territory.camps;
        for (let ci = 0; ci < camps.length; ci++) {
            const camp = camps[ci];
            for (let r = camp.rMin; r <= camp.rMax; r++) {
                for (let c = camp.cMin; c <= camp.cMax; c++) {
                    const cellOwner = this.grid.cells[r][c].owner;
                    if (cellOwner !== CONSTANTS.OWNER_NONE && cellOwner !== CONSTANTS.OWNER_NEUTRAL && cellOwner !== CONSTANTS.OWNER_ROCK && cellOwner !== camp.id) {
                        this.winner = cellOwner;
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
        // Map owner values to table slots: null→skip, -3→0, -1→1, 0→2, 1→3, 2→4, 3→5
        if (owner === null || owner === CONSTANTS.OWNER_NONE) return -1; // skip empty
        if (owner === CONSTANTS.OWNER_ROCK) return 0;
        if (owner === CONSTANTS.OWNER_NEUTRAL) return 1;
        return owner + 2; // 0→2, 1→3, 2→4, 3→5
    }

    _computeZobristHash() {
        let hash = 0;
        let aliveCount = 0;
        const cells = this.grid.cells;
        const cols = this.cols;
        const table = this._zobristTable;

        for (let r = 0; r < this.rows; r++) {
            const row = cells[r];
            const rowOffset = r * cols;
            for (let c = 0; c < cols; c++) {
                const owner = row[c].owner;
                if (owner !== CONSTANTS.OWNER_NONE) {
                    aliveCount++;
                    const slot = this._ownerToSlot(owner);
                    if (slot >= 0) {
                        hash ^= table[(rowOffset + c) * 6 + slot];
                    }
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
                if (this.grid.getCell(r, c).owner !== CONSTANTS.OWNER_ROCK) {
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
                if (owner !== null && owner !== CONSTANTS.OWNER_NEUTRAL) {
                    counts[owner]++;
                }
            }
        }

        for (let i = 0; i < this.playerCount; i++) {
            // Give 1 budget per 'budgetFactor' territory tiles, min budget of 1 to avoid soft locks completely
            if (this.isSandbox && i === 0) {
                this.budgets[i] = 999999;
            } else {
                this.budgets[i] += Math.max(1, Math.floor(counts[i] / this.budgetFactor));
            }
        }
    }
}
