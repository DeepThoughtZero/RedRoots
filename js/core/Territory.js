// js/core/Territory.js

class Territory {
    constructor(rows, cols, playerCount) {
        this.rows = rows;
        this.cols = cols;
        this.playerCount = playerCount;
        this.territoryMap = this.createEmptyMap(); // 2D array storing owner ID of territory (-1 for Niemandsland, null for unowned)
        this.camps = this.defineCamps();
    }

    createEmptyMap() {
        return Array(this.rows).fill(null).map(() => Array(this.cols).fill(null));
    }

    // Define player camps/baselines
    defineCamps() {
        const camps = [];
        const campDepth = 3;

        if (this.playerCount === 2) {
            // P0: Top Baseline, P1: Bottom Baseline
            camps.push({ id: 0, rMin: 0, rMax: campDepth - 1, cMin: 0, cMax: this.cols - 1 });
            camps.push({ id: 1, rMin: this.rows - campDepth, rMax: this.rows - 1, cMin: 0, cMax: this.cols - 1 });
        } else if (this.playerCount >= 3) {
            // Corner Camps (e.g. 15x15 corners to ensure they don't overlap)
            const cw = Math.min(15, Math.floor(this.cols / 2) - 1);
            const ch = Math.min(15, Math.floor(this.rows / 2) - 1);
            
            // P0: Top-Left
            camps.push({ id: 0, rMin: 0, rMax: ch, cMin: 0, cMax: cw });
            // P1: Bottom-Right
            camps.push({ id: 1, rMin: this.rows - 1 - ch, rMax: this.rows - 1, cMin: this.cols - 1 - cw, cMax: this.cols - 1 });
            // P2: Bottom-Left
            camps.push({ id: 2, rMin: this.rows - 1 - ch, rMax: this.rows - 1, cMin: 0, cMax: cw });
            if (this.playerCount === 4) {
                // P3: Top-Right
                camps.push({ id: 3, rMin: 0, rMax: ch, cMin: this.cols - 1 - cw, cMax: this.cols - 1 });
            }
        }
        return camps;
    }

    isCamp(r, c) {
        for (const camp of this.camps) {
            if (r >= camp.rMin && r <= camp.rMax && c >= camp.cMin && c <= camp.cMax) {
                return camp.id;
            }
        }
        return null;
    }

    // Assign initial territory at start of game
    setInitialTerritories() {
        this.territoryMap = this.createEmptyMap();
        
        // Fairly divide board based on player count
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.playerCount === 2) {
                    if (r < this.rows / 2) this.territoryMap[r][c] = 0;
                    else this.territoryMap[r][c] = 1;
                } else if (this.playerCount >= 3) {
                    // Simplify: Quadrants
                    const top = r < this.rows / 2;
                    const left = c < this.cols / 2;
                    
                    if (top && left) this.territoryMap[r][c] = 0;
                    else if (!top && !left) this.territoryMap[r][c] = 1; // Diagonal opposite
                    else if (!top && left) this.territoryMap[r][c] = 2;
                    else if (top && !left) {
                        if (this.playerCount === 4) this.territoryMap[r][c] = 3;
                        else this.territoryMap[r][c] = null; // Unused quadrant
                    }
                }
            }
        }
    }

    // Calculate new territories based on cell proximity
    updateTerritories(gridCells, radius) {
        this.territoryMap = this.createEmptyMap();
        const influenceMap = this.createEmptyMap(); // Will store { distance: X, owners: Set }

        // Multi-source BFS to find shortest distance from any living cell to all map points
        const queue = [];

        // 1. Initialize queue with all living cells
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const owner = gridCells[r][c].owner;
                if (owner !== CONSTANTS.OWNER_NONE && owner !== CONSTANTS.OWNER_NEUTRAL && owner !== CONSTANTS.OWNER_ROCK) {
                    queue.push({ r, c, owner, dist: 0 });
                    influenceMap[r][c] = { dist: 0, owners: new Set([owner]) };
                }
            }
        }

        // 2. BFS expansion up to 'radius'
        let head = 0;
        while (head < queue.length) {
            const { r, c, owner, dist } = queue[head++];

            if (dist >= radius) continue;

            const neighbors = [
                [-1, -1], [-1, 0], [-1, 1],
                [0, -1],           [0, 1],
                [1, -1],  [1, 0],  [1, 1]
            ];

            for (const [dr, dc] of neighbors) {
                const nr = r + dr;
                const nc = c + dc;

                if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
                    const nextDist = dist + 1;
                    let cellInf = influenceMap[nr][nc];

                    if (!cellInf) {
                        // First time visiting
                        influenceMap[nr][nc] = { dist: nextDist, owners: new Set([owner]) };
                        queue.push({ r: nr, c: nc, owner, dist: nextDist });
                    } else if (nextDist === cellInf.dist) {
                        // Reached at same time, add owner to create tie
                        cellInf.owners.add(owner);
                    }
                }
            }
        }

        // 3. Resolve ownership based on influence map
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const inf = influenceMap[r][c];
                if (inf) {
                    if (inf.owners.size === 1) {
                        this.territoryMap[r][c] = [...inf.owners][0]; // Extract the single owner
                    } else {
                        // Tie -> Niemandsland
                        this.territoryMap[r][c] = -1;
                    }
                }
            }
        }
    }

    getOwnerAt(r, c) {
        if (r >= 0 && r < this.rows && c >= 0 && c < this.cols) {
            const campOwner = this.isCamp(r, c);
            if (campOwner !== null) return campOwner;
            return this.territoryMap[r][c];
        }
        return null;
    }
}
