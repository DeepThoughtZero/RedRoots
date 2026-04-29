// js/core/Grid.js
// Performance: Flat typed arrays + double-buffer swap (Prio 1+4)
// Owner values: 0=empty, -3=rock, -1=neutral, 1-4=players

class Grid {
    constructor(rows, cols, collisionRule) {
        this.rows = rows;
        this.cols = cols;
        this.size = rows * cols;
        this.collisionRule = collisionRule;

        // Flat typed arrays: zero-GC, cache-friendly
        this.owners = new Int8Array(this.size);
        this.isOldFlags = new Uint8Array(this.size);

        // Double buffers for swap-based generation (Prio 4)
        this._nextOwners = new Int8Array(this.size);
        this._nextIsOld = new Uint8Array(this.size);
    }

    // --- Accessors ---

    getOwner(r, c) {
        if (r >= 0 && r < this.rows && c >= 0 && c < this.cols) {
            return this.owners[r * this.cols + c];
        }
        return CONSTANTS.OWNER_NONE;
    }

    getIsOld(r, c) {
        if (r >= 0 && r < this.rows && c >= 0 && c < this.cols) {
            return this.isOldFlags[r * this.cols + c] !== 0;
        }
        return false;
    }

    // Compatibility accessor (creates temp object — use only in non-hot paths like undo/erase)
    getCell(r, c) {
        if (r >= 0 && r < this.rows && c >= 0 && c < this.cols) {
            const i = r * this.cols + c;
            return { owner: this.owners[i], isOld: this.isOldFlags[i] !== 0 };
        }
        return null;
    }

    setCell(r, c, ownerId, isOld = false) {
        if (r >= 0 && r < this.rows && c >= 0 && c < this.cols) {
            const i = r * this.cols + c;
            this.owners[i] = ownerId;
            this.isOldFlags[i] = isOld ? 1 : 0;
        }
    }

    resetGrid() {
        this.owners.fill(0);
        this.isOldFlags.fill(0);
    }

    // --- Neighbor Analysis (hot path) ---

    getNeighborsData(r, c) {
        let count = 0;
        const ownerCounts = {};
        const cols = this.cols;
        const rows = this.rows;
        const owners = this.owners;

        for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
                if (i === 0 && j === 0) continue;

                const nr = r + i;
                const nc = c + j;

                if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
                    const neighborOwner = owners[nr * cols + nc];
                    if (neighborOwner !== 0 && neighborOwner !== CONSTANTS.OWNER_ROCK) {
                        count++;
                        if (neighborOwner !== CONSTANTS.OWNER_NEUTRAL) {
                            ownerCounts[neighborOwner] = (ownerCounts[neighborOwner] || 0) + 1;
                        }
                    }
                }
            }
        }
        return { count, ownerCounts };
    }

    // --- Core Simulation (hottest path) ---

    calculateNextGeneration() {
        const cols = this.cols;
        const rows = this.rows;
        const owners = this.owners;
        const nextOwners = this._nextOwners;
        const nextIsOld = this._nextIsOld;

        // Clear next-generation buffers (native fill — very fast)
        nextOwners.fill(0);
        nextIsOld.fill(0);

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const idx = r * cols + c;
                const currentOwner = owners[idx];

                if (currentOwner === CONSTANTS.OWNER_ROCK) {
                    nextOwners[idx] = CONSTANTS.OWNER_ROCK;
                    nextIsOld[idx] = 1;
                    continue;
                }

                const isAlive = currentOwner !== 0;
                const { count, ownerCounts } = this.getNeighborsData(r, c);

                if (isAlive) {
                    if (count < 2 || count > 3) {
                        // Dies (underpopulation or overpopulation)
                        nextOwners[idx] = 0;
                    } else {
                        // Survives
                        nextOwners[idx] = currentOwner;
                        nextIsOld[idx] = this.isOldFlags[idx];
                    }
                } else {
                    if (count === 3) {
                        // Birth
                        nextOwners[idx] = this.determineNewCellOwner(ownerCounts);
                    }
                }
            }
        }

        // Buffer swap — O(1) instead of O(n) allocation (Prio 4)
        const tmpOwners = this.owners;
        const tmpIsOld = this.isOldFlags;
        this.owners = this._nextOwners;
        this.isOldFlags = this._nextIsOld;
        this._nextOwners = tmpOwners;
        this._nextIsOld = tmpIsOld;
    }

    markAllOld() {
        const owners = this.owners;
        const isOld = this.isOldFlags;
        for (let i = 0; i < this.size; i++) {
            if (owners[i] !== 0) {
                isOld[i] = 1;
            }
        }
    }

    determineNewCellOwner(ownerCounts) {
        const owners = Object.keys(ownerCounts);

        if (this.collisionRule === 'neutral') {
            if (owners.length > 1) {
                return CONSTANTS.OWNER_NEUTRAL;
            } else if (owners.length === 1) {
                return parseInt(owners[0]);
            }
            return CONSTANTS.OWNER_NEUTRAL;
        }

        // 'majority' rule
        let maxCount = 0;
        let dominantOwner = CONSTANTS.OWNER_NEUTRAL;
        let tie = false;

        for (const [ownerId, count] of Object.entries(ownerCounts)) {
            if (count > maxCount) {
                maxCount = count;
                dominantOwner = parseInt(ownerId);
                tie = false;
            } else if (count === maxCount) {
                tie = true;
            }
        }

        if (tie || maxCount === 0) {
            return CONSTANTS.OWNER_NEUTRAL;
        }

        return dominantOwner;
    }
}
