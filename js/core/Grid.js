// js/core/Grid.js

class Grid {
    constructor(rows, cols, collisionRule) {
        this.rows = rows;
        this.cols = cols;
        this.collisionRule = collisionRule; // 'majority' or 'neutral'
        this.cells = this.createEmptyGrid();
    }

    createEmptyGrid() {
        const grid = [];
        for (let r = 0; r < this.rows; r++) {
            const row = [];
            for (let c = 0; c < this.cols; c++) {
                row.push({ owner: CONSTANTS.OWNER_NONE, isOld: false });
            }
            grid.push(row);
        }
        return grid;
    }

    getCell(r, c) {
        if (r >= 0 && r < this.rows && c >= 0 && c < this.cols) {
            return this.cells[r][c];
        }
        return null;
    }

    setCell(r, c, ownerId, isOld = false) {
        if (r >= 0 && r < this.rows && c >= 0 && c < this.cols) {
            this.cells[r][c].owner = ownerId;
            this.cells[r][c].isOld = isOld;
        }
    }

    getNeighborsData(r, c) {
        let count = 0;
        const ownerCounts = {}; // Track how many neighbors each player has

        for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
                if (i === 0 && j === 0) continue;
                
                const nr = r + i;
                const nc = c + j;
                
                if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
                    const neighborOwner = this.cells[nr][nc].owner;
                    if (neighborOwner !== CONSTANTS.OWNER_NONE) {
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

    calculateNextGeneration() {
        const nextGrid = this.createEmptyGrid();

        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const currentCell = this.cells[r][c];
                const isAlive = currentCell.owner !== CONSTANTS.OWNER_NONE;
                const { count, ownerCounts } = this.getNeighborsData(r, c);

                if (isAlive) {
                    // Conway Rule 1 & 3: Underpopulation (<2) or Overpopulation (>3) -> Dies
                    if (count < 2 || count > 3) {
                        nextGrid[r][c].owner = CONSTANTS.OWNER_NONE;
                        nextGrid[r][c].isOld = false;
                    } else {
                        // Conway Rule 2: Survives
                        nextGrid[r][c].owner = currentCell.owner;
                        nextGrid[r][c].isOld = currentCell.isOld;
                    }
                } else {
                    // Conway Rule 4: Reproduction (=3)
                    if (count === 3) {
                        nextGrid[r][c].owner = this.determineNewCellOwner(ownerCounts);
                        nextGrid[r][c].isOld = false;
                    }
                }
            }
        }

        this.cells = nextGrid;
    }

    markAllOld() {
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.cells[r][c].owner !== CONSTANTS.OWNER_NONE) {
                    this.cells[r][c].isOld = true;
                }
            }
        }
    }

    determineNewCellOwner(ownerCounts) {
        if (this.collisionRule === 'neutral') {
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
