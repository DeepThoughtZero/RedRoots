// js/core/AI.js

class AI {
    constructor(gameState, genome = null) {
        this.gameState = gameState;
        this.genome = genome || this.getDefaultGenome(gameState.playerStrengths[gameState.currentPlayer] || 'medium');
    }

    getDefaultGenome(strength) {
        if (strength === 'easy') {
            return {
                r_pentomino_weight: 0.4,
                glider_weight: 0.5,
                lwss_weight: 0.1,
                glider_gun_weight: 0.05,
                block_weight: 1.0,
                random_rotation_chance: 0.3
            };
        } else if (strength === 'hard') {
            return {
                r_pentomino_weight: 0.8,
                lwss_weight: 0.3,
                glider_gun_weight: 0.2,
                glider_weight: 0.1,
                block_weight: 0.5,
                random_rotation_chance: 0.0
            };
        }
        // Medium
        return {
            glider_gun_weight: 0.6,
            glider_weight: 0.6,
            r_pentomino_weight: 0.3,
            lwss_weight: 0.1,
            block_weight: 0.5,
            random_rotation_chance: 0.1
        };
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

    getNearestEnemyCamp(r, c, pId) {
        let nearestCamp = null;
        let minDist = Infinity;

        for (let i = 0; i < this.gameState.playerCount; i++) {
            if (i === pId) continue;
            const dist = this.getDistanceToCamp(r, c, i);
            if (dist < minDist) {
                minDist = dist;
                nearestCamp = this.gameState.territory.camps.find(base => base.id === i);
            }
        }
        return nearestCamp;
    }

    getOptimalRotation(r, c, patternKey, pId) {
        const camp = this.getNearestEnemyCamp(r, c, pId);
        if (!camp) return 0;

        const targetR = (camp.rMin + camp.rMax) / 2;
        const targetC = (camp.cMin + camp.cMax) / 2;
        
        const dr = targetR - r;
        const dc = targetC - c;

        if (patternKey === 'glider' || patternKey === 'glider_gun') {
            // Gliders move diagonally: SE, SW, NW, NE
            if (dr >= 0 && dc >= 0) return 0; // SE
            if (dr >= 0 && dc < 0) return 1;  // SW
            if (dr < 0 && dc < 0) return 2;   // NW
            if (dr < 0 && dc >= 0) return 3;  // NE
        } else if (patternKey === 'lwss') {
            // LWSS moves orthogonally: R, D, L, U
            if (Math.abs(dc) > Math.abs(dr)) {
                return dc >= 0 ? 0 : 2; // Right or Left
            } else {
                return dr >= 0 ? 1 : 3; // Down or Up
            }
        } else if (patternKey === 'r_pentomino') {
            // R-pentomino expands. Let's orient it so it's "pointing" towards target.
            // Quadrant based is usually fine for its general growth.
            if (dr >= 0 && dc >= 0) return 0;
            if (dr >= 0 && dc < 0) return 1;
            if (dr < 0 && dc < 0) return 2;
            if (dr < 0 && dc >= 0) return 3;
        }

        return 0;
    }

    isNearOwnCamp(r, c, pId) {
        return this.getDistanceToCamp(r, c, pId) < 25;
    }

    async takeTurn() {
        const pId = this.gameState.currentPlayer;
        if (pId < 0) return;

        const strength = this.gameState.playerStrengths[pId];
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
            const g = this.genome;

            // DYNAMIC GENOME-BASED SELECTION (for Hard AI or Evolver)
            if (g && (strength === 'hard' || this.evolver)) {
                const candidates = [
                    { key: 'r_pentomino', weight: g.r_pentomino_weight || 0, cost: 5 },
                    { key: 'h_heptomino', weight: g.h_heptomino_weight || 0, cost: 7 },
                    { key: 'diehard', weight: g.diehard_weight || 0, cost: 7 },
                    { key: 'acorn', weight: g.acorn_weight || 0, cost: 7 },
                    { key: 'b_heptomino', weight: g.b_heptomino_weight || 0, cost: 7 },
                    { key: 'switch_engine', weight: g.switch_engine_weight || 0, cost: 8 },
                    { key: 'rabbits', weight: g.rabbits_weight || 0, cost: 9 },
                    { key: 'lidka', weight: g.lidka_weight || 0, cost: 13 },
                    { key: 'lwss', weight: g.lwss_weight || 0, cost: 9 },
                    { key: 'glider_gun', weight: g.glider_gun_weight || 0, cost: 36 },
                    { key: 'glider', weight: g.glider_weight || 0.1, cost: 5 }
                ];

                const affordable = candidates.filter(c => budget >= c.cost && c.weight > 0);
                if (affordable.length > 0) {
                    const totalWeight = affordable.reduce((sum, c) => sum + c.weight, 0);
                    let r = Math.random() * totalWeight;
                    for (const cand of affordable) {
                        r -= cand.weight;
                        if (r <= 0) {
                            chosenKey = cand.key;
                            break;
                        }
                    }
                } else if (budget >= 4) {
                    chosenKey = 'block';
                }
            } else {
                // FALLBACK TO LEGACY LOGIC
                if (strength === 'easy') {
                    if (budget >= 5 && Math.random() < 0.3) chosenKey = 'r_pentomino';
                    else if (budget >= 5 && Math.random() < 0.1) chosenKey = 'glider';
                    else if (budget >= 4) chosenKey = 'block';
                } else if (strength === 'medium') {
                    if (budget >= 36 && Math.random() < 0.2) chosenKey = 'glider_gun';
                    else if (budget >= 5 && Math.random() < 0.2) chosenKey = 'glider';
                    else if (budget >= 4) chosenKey = 'block';
                } else {
                    if (budget >= 5 && Math.random() < 0.8) chosenKey = 'r_pentomino';
                    else if (budget >= 9 && Math.random() < 0.3) chosenKey = 'lwss';
                    else if (budget >= 36 && Math.random() < 0.2) chosenKey = 'glider_gun';
                    else if (budget >= 4) chosenKey = 'block';
                }
            }
            
            // 2. FIND BEST SPOT (with fallback)
            let result = this.findBestSpotForPattern(chosenKey, pId, strength);
            
            // FALLBACK: if Glider Gun fails, try R-Pentomino
            if (!result && chosenKey === 'glider_gun' && budget >= CONSTANTS.PATTERNS.r_pentomino.cost) {
                console.log(`AI Player ${pId} could not place Glider Gun. Falling back to R-Pentomino.`);
                result = this.findBestSpotForPattern('r_pentomino', pId, strength);
                if (result) chosenKey = 'r_pentomino';
            }

            if (result) {
                this.gameState.placePattern(result.pattern, result.r, result.c);
                console.log(`AI placed ${chosenKey} at ${result.r},${result.c} (Weight: ${result.weight.toFixed(1)})`);
                
                budget = this.gameState.budgets[pId];
                await new Promise(resolve => setTimeout(resolve, 200));
            } else {
                // If even fallback fails or no spot found for simple pattern, we might be stuck
                break;
            }
        }
        
        console.log(`AI Player ${pId} finished turn.`);
        this.gameState.nextPlayerTurn();
    }

    findBestSpotForPattern(chosenKey, pId, strength) {
        const pattern = CONSTANTS.PATTERNS[chosenKey].pattern;
        const validSpots = [];

        for (let r = 0; r < this.gameState.rows; r += 2) { // Step 2 to speed up search
            for (let c = 0; c < this.gameState.cols; c += 2) {
                if (this.gameState.territory.getOwnerAt(r, c) === pId) {
                    
                    // Improved rotation: target nearest enemy camp
                    let rotations = this.getOptimalRotation(r, c, chosenKey, pId);
                    
                    // Difficulty specific rotation overrides
                    if (Math.random() < this.genome.random_rotation_chance) {
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

                        // STRATEGY: HARD (or Genome-based)
                        if (strength === 'hard' || this.genome) {
                            const expWeight = this.genome ? (this.genome.expansion_weight || 0.5) : 0.5;
                            
                            if (chosenKey === 'r_pentomino') {
                                if (neighborhoodCells === 0) weight = 30 + (expWeight * 100); 
                                else if (this.isNearEnemyCamp(r, c, pId)) weight = 60 * (1 - expWeight); 
                                else if (this.isNearOwnCamp(r, c, pId)) weight = 50 * (1 - expWeight); 
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
                                const buffer = (chosenKey === 'glider_gun') ? 6 : 3;
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
                                else {
                                    const pathScore = this.getLoSScore(r, c, rotations, pId);
                                    if (pathScore > 0) {
                                        weight = 40 + (pathScore * 3); 
                                    } else {
                                        weight = 0;
                                    }
                                }


                            } else if (chosenKey === 'glider') {
                                // NEW: Tactical Glider Path Scoring
                                const pathScore = this.getLoSScore(r, c, rotations, pId);
                                if (pathScore > 0) {
                                    weight = 10 + (pathScore * 2);
                                } else {
                                    weight = 0; // No valid path
                                }
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
            for (const spot of validSpots) {
                random -= spot.weight;
                if (random <= 0) return spot;
            }
            return validSpots[0];
        }
        return null;
    }

    getLoSScore(r, c, rotations, pId) {
        let dr = 1, dc = 1;
        if (rotations === 1) { dr = 1; dc = -1; }
        else if (rotations === 2) { dr = -1; dc = -1; }
        else if (rotations === 3) { dr = -1; dc = 1; }
        
        let checkR = r + (dr * 8); // Start further out for large patterns
        let checkC = c + (dc * 8);
        
        let score = 0;
        let foundEnemyCamp = false;

        for (let dist = 0; dist < 60; dist++) {
            if (checkR < 0 || checkR >= this.gameState.rows || checkC < 0 || checkC >= this.gameState.cols) break;
            
            const cellOwner = this.gameState.grid.getCell(checkR, checkC).owner;
            const territoryOwner = this.gameState.territory.getOwnerAt(checkR, checkC);

            if (cellOwner === CONSTANTS.OWNER_ROCK) break; // Path blocked
            
            // NEW: Width Check for Rocks (first 10 units)
            // Ensure no rocks are immediately to the left/right of the path
            if (dist < 10) {
                const s1r = checkR + dc, s1c = checkC - dr;
                const s2r = checkR - dc, s2c = checkC + dr;
                
                const side1 = (s1r >= 0 && s1r < this.gameState.rows && s1c >= 0 && s1c < this.gameState.cols) 
                    ? this.gameState.grid.getCell(s1r, s1c).owner : null;
                const side2 = (s2r >= 0 && s2r < this.gameState.rows && s2c >= 0 && s2c < this.gameState.cols) 
                    ? this.gameState.grid.getCell(s2r, s2c).owner : null;
                
                if (side1 === CONSTANTS.OWNER_ROCK || side2 === CONSTANTS.OWNER_ROCK) {
                    score = 0;
                    break;
                }
            }
            
            // Path through enemy territory is good
            if (territoryOwner !== CONSTANTS.OWNER_NONE && territoryOwner !== pId) {
                score += 2;
            } else {
                score += 1; // Open space is okay
            }

            // Path blocked by existing cells (collision)
            if (dist < 15 && cellOwner !== CONSTANTS.OWNER_NONE) return 0;
            
            const campId = this.gameState.territory.isCamp(checkR, checkC);
            if (campId !== null && campId !== pId) {
                score += 100; // HUGE bonus for hitting enemy camp
                foundEnemyCamp = true;
                break;
            }

            checkR += dr;
            checkC += dc;
        }

        return score;
    }

    hasClearLoS(r, c, rotations, pId) {
        return this.getLoSScore(r, c, rotations, pId) > 0;
    }

}
