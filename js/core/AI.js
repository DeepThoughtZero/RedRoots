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
                if (budget >= 9 && Math.random() > 0.7) chosenKey = 'lwss';
                else if (budget >= 5 && Math.random() > 0.5) chosenKey = 'r_pentomino';
                else if (budget >= 5 && Math.random() > 0.3) chosenKey = 'glider';
                else if (budget >= 7 && Math.random() > 0.8) chosenKey = 'herschel';
                else if (budget >= 4) chosenKey = 'block';
            } else if (this.gameState.aiStrength === 'hard') {
                if (budget >= 36 && Math.random() > 0.5) chosenKey = 'glider_gun';
                else if (budget >= 9 && Math.random() > 0.6) chosenKey = 'lwss';
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
                        
                        let rotations = 0;
                        const centerR = this.gameState.rows / 2;
                        const centerC = this.gameState.cols / 2;
                        
                        if (r < centerR && c < centerC) rotations = 0; // Top-Left -> shoot BR
                        else if (r >= centerR && c >= centerC) rotations = 2; // Bottom-Right -> shoot TL
                        else if (r >= centerR && c < centerC) rotations = 3; // Bottom-Left -> shoot TR
                        else if (r < centerR && c >= centerC) rotations = 1; // Top-Right -> shoot BL
                        
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

                            // Density check (don't cramp patterns together)
                            let neighborhoodCells = 0;
                            for (let nr = r - 4; nr <= r + 4; nr++) {
                                for (let nc = c - 4; nc <= c + 4; nc++) {
                                    if (nr >= 0 && nr < this.gameState.rows && nc >= 0 && nc < this.gameState.cols) {
                                        if (this.gameState.grid.getCell(nr, nc).owner !== CONSTANTS.OWNER_NONE) {
                                            neighborhoodCells++;
                                        }
                                    }
                                }
                            }

                            if (neighborhoodCells > 0) {
                                weight = 0.1; // heavily discourage clumping
                            }

                            if (chosenKey === 'glider_gun') {
                                // Ensure massive empty space around gun so it doesn't break
                                let blocked = false;
                                for (let nr = r - 8; nr <= r + 8; nr++) {
                                    for (let nc = c - 8; nc <= c + 8; nc++) {
                                        if (nr >= 0 && nr < this.gameState.rows && nc >= 0 && nc < this.gameState.cols) {
                                            const owner = this.gameState.grid.getCell(nr, nc).owner;
                                            if (owner !== CONSTANTS.OWNER_NONE && owner !== pId) blocked = true;
                                        }
                                    }
                                }
                                if (blocked) weight = 0;
                            }

                            // Line of sight check to avoid shooting into mountains & snipe enemy camps!
                            if (chosenKey === 'glider_gun' || chosenKey === 'glider' || chosenKey === 'lwss') {
                                let dr = 1, dc = 1;
                                if (rotations === 1) { dr = 1; dc = -1; }
                                else if (rotations === 2) { dr = -1; dc = -1; }
                                else if (rotations === 3) { dr = -1; dc = 1; }
                                
                                let hitRock = false;
                                let campSnipe = false;

                                let checkR = r + (dr * 4);
                                let checkC = c + (dc * 4);
                                
                                // Check next 30 cells in trajectory
                                for (let dist = 0; dist < 30; dist++) {
                                    if (checkR < 0 || checkR >= this.gameState.rows || checkC < 0 || checkC >= this.gameState.cols) break;
                                    
                                    const cellOwner = this.gameState.grid.getCell(checkR, checkC).owner;
                                    if (cellOwner === CONSTANTS.OWNER_ROCK) {
                                        hitRock = true;
                                        break;
                                    }
                                    
                                    const campId = this.gameState.territory.isCamp(checkR, checkC);
                                    if (campId !== null && campId !== pId) {
                                        campSnipe = true;
                                        break;
                                    }

                                    checkR += dr;
                                    checkC += dc;
                                }
                                
                                if (hitRock) {
                                    weight = 0;
                                } else if (campSnipe) {
                                    weight = 50; // MASSIVE priority to win the game!
                                }
                            }

                            if (chosenKey === 'r_pentomino' && this.gameState.aiStrength === 'hard') {
                                // Prefer completely empty back-space to aggressively claim territory
                                if (neighborhoodCells === 0) {
                                    weight = 20; 
                                }
                            }
                            
                            if (weight > 0) {
                                // Add weighted spots
                                const instances = Math.ceil(weight);
                                for (let w = 0; w < instances; w++) {
                                    validSpots.push({r, c, pattern: currentPattern});
                                }
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
            } else {
                // If we couldn't place anything, exit loop to save remaining budget for next turn
                break;
            }
        }
        
        console.log(`AI Player ${pId} finished turn.`);
        this.gameState.nextPlayerTurn();
    }
}
