// js/core/AI.js

class AI {
    constructor(gameState) {
        this.gameState = gameState;
    }

    async takeTurn() {
        const pId = this.gameState.currentPlayer;
        if (pId < 0) return;

        console.log(`AI Player ${pId} (${this.gameState.aiStrength}) taking turn...`);
        await new Promise(resolve => setTimeout(resolve, 800));

        let budget = this.gameState.budgets[pId];
        let attempts = 0;
        const maxAttempts = 100;
        
        while (budget > 0 && attempts < maxAttempts) {
            attempts++;
            
            // Filter affordable patterns
            const affordablePatternKeys = Object.keys(CONSTANTS.PATTERNS).filter(key => CONSTANTS.PATTERNS[key].cost <= budget);
            if (affordablePatternKeys.length === 0) break;
            
            let chosenKey = 'cell';
            
            // Strength-based logic
            if (this.gameState.aiStrength === 'easy') {
                if (budget >= 5 && Math.random() > 0.5) chosenKey = 'glider';
                else if (budget >= 4 && Math.random() > 0.5) chosenKey = 'block';
            } else if (this.gameState.aiStrength === 'medium') {
                if (budget >= 5 && Math.random() > 0.3) chosenKey = 'glider';
                else if (budget >= 7 && Math.random() > 0.8) chosenKey = 'herschel';
                else if (budget >= 4) chosenKey = 'block';
            } else if (this.gameState.aiStrength === 'hard') {
                if (budget >= 36 && Math.random() > 0.5) chosenKey = 'glider_gun';
                else if (budget >= 7 && Math.random() > 0.4) chosenKey = 'herschel';
                else if (budget >= 5 && Math.random() > 0.1) chosenKey = 'glider';
                else if (budget >= 4) chosenKey = 'block';
            }
            
            let pattern = CONSTANTS.PATTERNS[chosenKey].pattern;
            
            // Rotate randomly
            const rotations = Math.floor(Math.random() * 4);
            for (let i = 0; i < rotations; i++) {
                pattern = pattern.map(([r, c]) => [c, -r]);
            }

            // Find all valid placement spots in own territory
            const validSpots = [];
            for (let r = 0; r < this.gameState.rows; r++) {
                for (let c = 0; c < this.gameState.cols; c++) {
                    if (this.gameState.territory.getOwnerAt(r, c) === pId) {
                        if (this.gameState.canPlacePattern(pattern, r, c)) {
                            // Weighting could be added here. For simplicity, we just collect them.
                            // In 'hard' mode, we could prefer spots closer to the enemy.
                            let weight = 1;
                            if (this.gameState.aiStrength === 'hard' && chosenKey === 'glider') {
                                // Prefer edges of territory to shoot out
                                weight = 10;
                            }
                            for (let w = 0; w < weight; w++) validSpots.push({r, c});
                        }
                    }
                }
            }

            if (validSpots.length > 0) {
                const spot = validSpots[Math.floor(Math.random() * validSpots.length)];
                this.gameState.placePattern(pattern, spot.r, spot.c);
                budget = this.gameState.budgets[pId];
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        }
        
        console.log(`AI Player ${pId} finished turn.`);
        this.gameState.nextPlayerTurn();
    }
}
