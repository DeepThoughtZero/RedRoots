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
        this.baseBudget = config.budget || 300;
        
        this.phase = CONSTANTS.PHASE_SETUP;
        this.currentRound = 1;
        this.currentPlayer = 0; // 0 to playerCount-1
        
        this.grid = new Grid(this.rows, this.cols, config.collisionRule);
        this.territory = new Territory(this.rows, this.cols, this.playerCount);
        
        // Budgets: Array of integers
        this.budgets = Array(this.playerCount).fill(this.baseBudget);
        
        // Initial setup
        this.territory.setInitialTerritories();
        this.winner = null;

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
        this.currentPlayer++;
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

        for (const [dr, dc] of pattern) {
            const r = baseR + dr;
            const c = baseC + dc;
            this.grid.setCell(r, c, this.currentPlayer);
        }

        this.budgets[this.currentPlayer] -= pattern.length;
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
            }
        }

        // End of round
        this.territory.updateTerritories(this.grid.cells, this.radius);
        
        // Reset budgets
        this.budgets.fill(this.baseBudget);

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

    notifyPlayerChange() {
        if (this.onPlayerChange) this.onPlayerChange(this.currentPlayer);
    }

    notifyStateUpdate() {
        if (this.onStateUpdate) this.onStateUpdate();
    }
}
