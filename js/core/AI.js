// js/core/AI.js

class AI {
    constructor(gameState) {
        this.gameState = gameState;
    }

    async takeTurn() {
        const pId = this.gameState.currentPlayer;
        if (pId < 0) return;

        console.log(`AI Player ${pId} taking turn...`);
        
        // Simple delay to make it look like the AI is "thinking"
        await new Promise(resolve => setTimeout(resolve, 800));

        let budget = this.gameState.budgets[pId];
        
        // Keep placing patterns until out of budget or no valid placements found
        let attempts = 0;
        const maxAttempts = 100; // prevent infinite loops
        
        while (budget > 0 && attempts < maxAttempts) {
            attempts++;
            
            // 1. Pick a pattern we can afford
            const affordablePatternKeys = Object.keys(CONSTANTS.PATTERNS).filter(key => CONSTANTS.PATTERNS[key].cost <= budget);
            if (affordablePatternKeys.length === 0) break;
            
            // Prefer gliders if we have enough budget (cost 5), else single cells
            let chosenKey = 'cell';
            if (budget >= 5 && Math.random() > 0.4) {
                chosenKey = 'glider';
            } else if (budget >= 4 && Math.random() > 0.5) {
                chosenKey = 'block';
            }
            
            let pattern = CONSTANTS.PATTERNS[chosenKey].pattern;
            
            // Rotate randomly
            const rotations = Math.floor(Math.random() * 4);
            for (let i = 0; i < rotations; i++) {
                pattern = pattern.map(([r, c]) => [c, -r]);
            }

            // 2. Find all valid placement spots in own territory
            const validSpots = [];
            for (let r = 0; r < this.gameState.rows; r++) {
                for (let c = 0; c < this.gameState.cols; c++) {
                    if (this.gameState.territory.getOwnerAt(r, c) === pId) {
                        if (this.gameState.canPlacePattern(pattern, r, c)) {
                            // Weight the spots based on distance to enemy camps
                            // For a simple AI, just random valid spot or slightly biased towards center
                            validSpots.push({r, c});
                        }
                    }
                }
            }

            if (validSpots.length > 0) {
                // Pick random spot
                const spot = validSpots[Math.floor(Math.random() * validSpots.length)];
                this.gameState.placePattern(pattern, spot.r, spot.c);
                budget = this.gameState.budgets[pId];
                
                // Small visual delay between placements
                await new Promise(resolve => setTimeout(resolve, 200));
            } else {
                // If we couldn't place the chosen pattern, try next iteration (might pick single cell)
            }
        }
        
        console.log(`AI Player ${pId} finished turn.`);
        this.gameState.nextPlayerTurn();
    }
}
