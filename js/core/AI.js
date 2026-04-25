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
                if (budget >= 5 && Math.random() > 0.5) chosenKey = 'r_pentomino';
                else if (budget >= 5 && Math.random() > 0.3) chosenKey = 'glider';
                else if (budget >= 7 && Math.random() > 0.8) chosenKey = 'herschel';
                else if (budget >= 4) chosenKey = 'block';
            } else if (this.gameState.aiStrength === 'hard') {
                if (budget >= 36 && Math.random() > 0.5) chosenKey = 'glider_gun';
                else if (budget >= 5 && Math.random() > 0.3) chosenKey = 'r_pentomino';
                else if (budget >= 7 && Math.random() > 0.4) chosenKey = 'herschel';
                else if (budget >= 5 && Math.random() > 0.1) chosenKey = 'glider';
                else if (budget >= 4) chosenKey = 'block';
            }
            
            let pattern = CONSTANTS.PATTERNS[chosenKey].pattern;
            
            // Find all valid placement spots in own territory
            const validSpots = [];
            for (let r = 0; r < this.gameState.rows; r++) {
                for (let c = 0; c < this.gameState.cols; c++) {
                    if (this.gameState.territory.getOwnerAt(r, c) === pId) {
                        
                        // Calculate desired rotation to shoot towards center
                        // Default shoots +row, +col (Bottom-Right)
                        let rotations = 0;
                        const centerR = this.gameState.rows / 2;
                        const centerC = this.gameState.cols / 2;
                        
                        if (r < centerR && c < centerC) rotations = 0; // Top-Left -> shoot BR
                        else if (r >= centerR && c >= centerC) rotations = 2; // Bottom-Right -> shoot TL
                        else if (r >= centerR && c < centerC) rotations = 3; // Bottom-Left -> shoot TR
                        else if (r < centerR && c >= centerC) rotations = 1; // Top-Right -> shoot BL
                        
                        // Add some randomness on easy/medium so it's not strictly robotic
                        if (this.gameState.aiStrength === 'easy') {
                            rotations = Math.floor(Math.random() * 4);
                        } else if (this.gameState.aiStrength === 'medium' && Math.random() > 0.5) {
                            rotations = Math.floor(Math.random() * 4);
                        }
                        
                        let currentPattern = pattern;
                        for (let i = 0; i < rotations; i++) {
                            currentPattern = currentPattern.map(([pr, pc]) => [pc, -pr]);
                        }

                        if (this.gameState.canPlacePattern(currentPattern, r, c)) {
                            let weight = 1;

                            // Line of sight check to avoid shooting into mountains
                            if (chosenKey === 'glider_gun' || chosenKey === 'glider') {
                                let dr = 1, dc = 1;
                                if (rotations === 1) { dr = 1; dc = -1; }
                                else if (rotations === 2) { dr = -1; dc = -1; }
                                else if (rotations === 3) { dr = -1; dc = 1; }
                                
                                let hitRock = false;
                                let checkR = r + (dr * 5); // Start slightly ahead
                                let checkC = c + (dc * 5);
                                
                                // Check next 25 cells in trajectory
                                for (let dist = 0; dist < 25; dist++) {
                                    if (checkR < 0 || checkR >= this.gameState.rows || checkC < 0 || checkC >= this.gameState.cols) break;
                                    const cellOwner = this.gameState.grid.getCell(checkR, checkC).owner;
                                    if (cellOwner === -3) { // CONSTANTS.OWNER_ROCK
                                        hitRock = true;
                                        break;
                                    }
                                    checkR += dr;
                                    checkC += dc;
                                }
                                
                                if (hitRock) weight = 0;
                            }

                            if (this.gameState.aiStrength === 'hard' && chosenKey === 'glider') {
                                // Prefer edges of territory to shoot out
                                if (weight > 0) weight = 10;
                            }
                            
                            if (weight > 0) {
                                for (let w = 0; w < weight; w++) validSpots.push({r, c, pattern: currentPattern});
                            }
                        }
                    }
                }
            }

            if (validSpots.length > 0) {
                const spot = validSpots[Math.floor(Math.random() * validSpots.length)];
                this.gameState.placePattern(spot.pattern, spot.r, spot.c);
                budget = this.gameState.budgets[pId];
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        }
        
        console.log(`AI Player ${pId} finished turn.`);
        this.gameState.nextPlayerTurn();
    }
}
