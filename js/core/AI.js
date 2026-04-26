// js/core/AI.js

class AI {
    constructor(gameState) {
        this.gameState = gameState;
    }

    getDistanceToCamp(r, c, campId) {
        const camp = this.gameState.territory.camps.find(base => base.id === campId);
        if (!camp) return Infinity;
        
        // Distance to center of camp
        const centerR = (camp.rMin + camp.rMax) / 2;
        const centerC = (camp.cMin + camp.cMax) / 2;
        return Math.sqrt(Math.pow(r - centerR, 2) + Math.pow(c - centerC, 2));
    }

    isNearEnemyCamp(r, c, pId) {
        for (let i = 0; i < this.gameState.playerCount; i++) {
            if (i === pId) continue;
            // Check if within 30 units of any enemy camp
            if (this.getDistanceToCamp(r, c, i) < 30) return true;
        }
        return false;
    }

    isNearOwnCamp(r, c, pId) {
        return this.getDistanceToCamp(r, c, pId) < 25;
    }

    async takeTurn() {
        const pId = this.gameState.currentPlayer;
        if (pId < 0) return;

        const strength = CONSTANTS.PLAYER_COLORS[pId].strength;
        console.log(`AI Player ${pId} (${strength}) taking turn...`);
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
            
            // 1. SELECT PATTERN BASED ON STRENGTH
            if (strength === 'easy') {
                // Easy: R-Pentaminos randomly, Gliders for open space
                if (budget >= 5 && Math.random() > 0.6) chosenKey = 'r_pentomino';
                else if (budget >= 5 && Math.random() > 0.5) chosenKey = 'glider';
                else if (budget >= 4) chosenKey = 'block';
            } else if (strength === 'medium') {
                // Medium: Glider Guns, Blinkers, Gliders near enemy camps
                if (budget >= 36 && Math.random() > 0.4) chosenKey = 'glider_gun';
                else if (budget >= 5 && Math.random() > 0.4) chosenKey = 'glider';
                else if (budget >= 3 && Math.random() > 0.5) chosenKey = 'blinker';
                else if (budget >= 4) chosenKey = 'block';
            } else if (strength === 'hard') {
                // Hard: Focus on R-Pentaminos
                if (budget >= 5 && Math.random() > 0.2) chosenKey = 'r_pentomino';
                else if (budget >= 9 && Math.random() > 0.7) chosenKey = 'lwss';
                else if (budget >= 36 && Math.random() > 0.9) chosenKey = 'glider_gun'; // Occasional gun
                else if (budget >= 4) chosenKey = 'block';
            }
            
            let pattern = CONSTANTS.PATTERNS[chosenKey].pattern;
            
            // 2. FIND BEST SPOT
            const validSpots = [];
            for (let r = 0; r < this.gameState.rows; r += 2) { // Step 2 to speed up search
                for (let c = 0; c < this.gameState.cols; c += 2) {
                    if (this.gameState.territory.getOwnerAt(r, c) === pId) {
                        
                        // Default rotations: toward center or enemy
                        let rotations = 0;
                        const centerR = this.gameState.rows / 2;
                        const centerC = this.gameState.cols / 2;
                        
                        if (r < centerR && c < centerC) rotations = 0; // Top-Left -> shoot BR
                        else if (r >= centerR && c >= centerC) rotations = 2; // Bottom-Right -> shoot TL
                        else if (r >= centerR && c < centerC) rotations = 3; // Bottom-Left -> shoot TR
                        else if (r < centerR && c >= centerC) rotations = 1; // Top-Right -> shoot BL
                        
                        // Difficulty specific rotation overrides
                        if (strength === 'easy') {
                            rotations = Math.floor(Math.random() * 4);
                        }
                        
                        let currentPattern = pattern;
                        for (let i = 0; i < rotations; i++) {
                            currentPattern = currentPattern.map(([pr, pc]) => [pc, -pr]);
                        }

                        if (this.gameState.canPlacePattern(currentPattern, r, c)) {
                            let weight = 1;

                            // Density check
                            let neighborhoodCells = 0;
                            for (let nr = r - 4; nr <= r + 4; nr += 2) {
                                for (let nc = c - 4; nc <= c + 4; nc += 2) {
                                    if (nr >= 0 && nr < this.gameState.rows && nc >= 0 && nc < this.gameState.cols) {
                                        if (this.gameState.grid.getCell(nr, nc).owner !== CONSTANTS.OWNER_NONE) {
                                            neighborhoodCells++;
                                        }
                                    }
                                }
                            }

                            // STRATEGY: HARD
                            if (strength === 'hard') {
                                if (chosenKey === 'r_pentomino') {
                                    if (this.isNearEnemyCamp(r, c, pId)) weight = 60; // Offensive reinforcement
                                    else if (this.isNearOwnCamp(r, c, pId)) weight = 50; // Defensive reinforcement
                                    else if (neighborhoodCells === 0) weight = 30; // Expansion into open space
                                }
                                if (neighborhoodCells > 2) weight *= 0.1; // Avoid overclumping
                            }

                            // STRATEGY: MEDIUM
                            if (strength === 'medium') {
                                if (chosenKey === 'glider_gun') {
                                    // Calculate bounding box of pattern to ensure buffer
                                    let minR = 1000, maxR = -1000, minC = 1000, maxC = -1000;
                                    currentPattern.forEach(([pr, pc]) => {
                                        const rr = r + pr;
                                        const cc = c + pc;
                                        if (rr < minR) minR = rr; if (rr > maxR) maxR = rr;
                                        if (cc < minC) minC = cc; if (cc > maxC) maxC = cc;
                                    });

                                    let blocked = false;
                                    const buffer = 3;
                                    for (let br = minR - buffer; br <= maxR + buffer; br++) {
                                        for (let bc = minC - buffer; bc <= maxC + buffer; bc++) {
                                            if (br >= 0 && br < this.gameState.rows && bc >= 0 && bc < this.gameState.cols) {
                                                if (this.gameState.grid.getCell(br, bc).owner !== CONSTANTS.OWNER_NONE) {
                                                    blocked = true;
                                                    break;
                                                }
                                            }
                                        }
                                        if (blocked) break;
                                    }
                                    
                                    if (blocked) weight = 0;
                                    else weight = 40;

                                    // LoS check for Gun
                                    if (weight > 0) {
                                        if (!this.hasClearLoS(r, c, rotations, pId)) weight = 0;
                                    }
                                } else if (chosenKey === 'glider') {
                                    if (this.isNearEnemyCamp(r, c, pId)) weight = 30; // Incursion
                                    if (!this.hasClearLoS(r, c, rotations, pId)) weight = 0;
                                } else if (chosenKey === 'blinker') {
                                    // Protect nearby guns?
                                    let nearGun = false;
                                    // (Simplified: high weight if moderately crowded, meaning near structures)
                                    if (neighborhoodCells > 0 && neighborhoodCells < 5) weight = 20;
                                }
                            }

                            // STRATEGY: EASY
                            if (strength === 'easy') {
                                if (chosenKey === 'glider' && neighborhoodCells === 0) {
                                    weight = 20; // Favor open space for gliders
                                }
                            }
                            
                            if (weight > 0) {
                                validSpots.push({r, c, pattern: currentPattern, weight});
                            }
                        }
                    }
                }
            }

            if (validSpots.length > 0) {
                // Weighted selection
                const totalWeight = validSpots.reduce((sum, spot) => sum + spot.weight, 0);
                let random = Math.random() * totalWeight;
                let chosenSpot = validSpots[0];
                for (const spot of validSpots) {
                    random -= spot.weight;
                    if (random <= 0) {
                        chosenSpot = spot;
                        break;
                    }
                }

                this.gameState.placePattern(chosenSpot.pattern, chosenSpot.r, chosenSpot.c);
                console.log(`AI placed ${chosenKey} at ${chosenSpot.r},${chosenSpot.c} (Weight: ${chosenSpot.weight.toFixed(1)})`);
                
                budget = this.gameState.budgets[pId];
                await new Promise(resolve => setTimeout(resolve, 200));
            } else {
                break;
            }
        }
        
        console.log(`AI Player ${pId} finished turn.`);
        this.gameState.nextPlayerTurn();
    }

    hasClearLoS(r, c, rotations, pId) {
        let dr = 1, dc = 1;
        if (rotations === 1) { dr = 1; dc = -1; }
        else if (rotations === 2) { dr = -1; dc = -1; }
        else if (rotations === 3) { dr = -1; dc = 1; }
        
        let checkR = r + (dr * 4);
        let checkC = c + (dc * 4);
        
        for (let dist = 0; dist < 40; dist++) {
            if (checkR < 0 || checkR >= this.gameState.rows || checkC < 0 || checkC >= this.gameState.cols) break;
            
            const cellOwner = this.gameState.grid.getCell(checkR, checkC).owner;
            if (cellOwner === CONSTANTS.OWNER_ROCK) return false;
            
            // NEW: Also block if there are ANY units in the immediate flight path (first 15 units)
            // This prevents the gun from shooting directly into friendly or enemy cells.
            if (dist < 15 && cellOwner !== CONSTANTS.OWNER_NONE) return false;
            
            const campId = this.gameState.territory.isCamp(checkR, checkC);
            if (campId !== null && campId !== pId) return true; // Found enemy camp!

            checkR += dr;
            checkC += dc;
        }
        return true; // Clear path anyway
    }

}
