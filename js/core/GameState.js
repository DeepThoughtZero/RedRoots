// js/core/GameState.js

class GameState {
    constructor(config) {
        this.rows = config.rows;
        this.cols = config.cols;
        this.maxRounds = config.rounds;
        this.stepsPerRound = config.steps;
        this.playerCount = config.playerCount;
        this.humansCount = config.humansCount;
        this.radius = config.radius;
        this.budgetFactor = config.budgetFactor || 10;
        this.aiStrength = config.aiStrength || 'medium';
        
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
        this.changePhase(CONSTANTS.PHASE_PLACEMENT);
        this.notifyPlayerChange();
    }

    changePhase(newPhase) {
        this.phase = newPhase;
        if (this.onPhaseChange) this.onPhaseChange(this.phase);

        if (this.phase === CONSTANTS.PHASE_SIMULATION) {
            this.runSimulation();
        }
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
        return this.currentPlayer < this.humansCount;
    }

    canPlacePattern(pattern, baseR, baseC) {
        if (this.phase !== CONSTANTS.PHASE_PLACEMENT) return false;

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

        this.budgets[this.currentPlayer] -= pattern.length;
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
            this.budgets[this.currentPlayer] += 1;
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
        const history = [];

        // Run Conway steps
        for (let step = 0; step < this.stepsPerRound; step++) {
            this.grid.calculateNextGeneration();
            this.notifyStateUpdate();
            if (this.onCycleUpdate) this.onCycleUpdate(step + 1, this.stepsPerRound);
            
            // Check win condition instantly after each step
            if (this.checkWinCondition()) {
                this.changePhase(CONSTANTS.PHASE_GAMEOVER);
                if (this.onGameOver) this.onGameOver(this.winner);
                return;
            }

            // Detect periodic states (period <= 10)
            let hash = '';
            let aliveCount = 0;
            for (let r = 0; r < this.rows; r++) {
                for (let c = 0; c < this.cols; c++) {
                    const owner = this.grid.cells[r][c].owner;
                    if (owner !== CONSTANTS.OWNER_NONE) {
                        hash += `${r},${c},${owner}|`;
                        aliveCount++;
                    }
                }
            }

            if (aliveCount === 0) {
                // Everyone dead, skip to end of round
                break;
            }

            if (history.includes(hash)) {
                console.log(`Periodic state detected at step ${step}. Ending simulation phase early.`);
                break;
            }
            history.push(hash);
            if (history.length > 10) history.shift();

            // Dynamic delay for visualization
            if (this.simSpeedMs > 0) {
                await new Promise(resolve => setTimeout(resolve, this.simSpeedMs)); 
            } else if (step % 5 === 0) {
                // Yield to main thread every few steps when running at max speed
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }

        // End of round
        this.grid.markAllOld();
        this.territory.updateTerritories(this.grid.cells, this.radius);
        
        // Reset budgets dynamically
        this.calculateBudgets();

        this.currentRound++;
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
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const cellOwner = this.grid.cells[r][c].owner;
                if (cellOwner !== CONSTANTS.OWNER_NONE && cellOwner !== CONSTANTS.OWNER_NEUTRAL) {
                    const campId = this.territory.isCamp(r, c);
                    // If player reached an enemy camp
                    if (campId !== null && campId !== cellOwner) {
                        this.winner = cellOwner;
                        return true;
                    }
                }
            }
        }
        return false;
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
            this.budgets[i] = Math.max(1, Math.floor(counts[i] / this.budgetFactor));
        }
    }
}
