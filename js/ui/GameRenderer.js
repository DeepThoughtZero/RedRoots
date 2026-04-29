// js/ui/GameRenderer.js

class GameRenderer {
    constructor(canvas, gameState) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.gameState = gameState;
        
        // Cache for player images
        this.playerImages = [];
        this.loadPlayerImages();

        // Calculate cell size to fit window nicely
        this.cellSize = 10; 
        this.camera = { x: 0, y: 0, zoom: 1 };
        this.resize();
        window.addEventListener('resize', this.resize.bind(this));
    }

    resize() {
        const container = this.canvas.parentElement;
        const rect = container.getBoundingClientRect();
        
        // Full viewport canvas
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        
        // Calculate cell size keeping aspect ratio, accounting for right panel (320px) on desktop
        const availableWidth = rect.width > 600 ? rect.width - 320 : rect.width;
        const aspectX = availableWidth / this.gameState.cols;
        const aspectY = rect.height / this.gameState.rows;
        
        this.cellSize = Math.max(5, Math.floor(Math.min(aspectX, aspectY) * 0.95));
        
        const gridPixelWidth = this.gameState.cols * this.cellSize;
        const gridPixelHeight = this.gameState.rows * this.cellSize;
        
        // Center the grid initially, shifted slightly left to accommodate the right panel (w-80 = 320px)
        if (this.camera.zoom === 1 && this.camera.x === 0 && this.camera.y === 0) {
            this.camera.x = (rect.width - 320 - gridPixelWidth) / 2;
            this.camera.y = (rect.height - gridPixelHeight) / 2;
            
            // Prevent shifting too far left on small screens
            if (this.camera.x < 10) this.camera.x = 10;
        }
        
        this.render();
    }

    loadPlayerImages() {
        CONSTANTS.PLAYER_COLORS.forEach((p, i) => {
            const img = new Image();
            img.src = p.asset;
            this.playerImages[i] = img;
        });
    }

    render(inputHandler = null, campIndicator = null) {
        // Clear background
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.save();
        this.ctx.translate(this.camera.x, this.camera.y);
        this.ctx.scale(this.camera.zoom, this.camera.zoom);

        // 1. Draw Territories (Background colors)
        this.drawTerritories();

        // 2. Draw Grid Lines
        this.drawGrid();

        // 3. Draw Camps (Bases)
        this.drawCamps();

        // 4. Draw Cells
        this.drawCells();

        // 5. Draw Hover/Preview (if in placement phase)
        if (inputHandler && this.gameState.phase === CONSTANTS.PHASE_PLACEMENT && this.gameState.isCurrentPlayerHuman()) {
            this.drawHoverPreview(inputHandler);
        }

        // 6. Draw Camp Indicator
        if (campIndicator && campIndicator.pId !== null) {
            this.drawCampIndicator(campIndicator);
        }

        this.ctx.restore();
    }

    drawTerritories() {
        for (let r = 0; r < this.gameState.rows; r++) {
            for (let c = 0; c < this.gameState.cols; c++) {
                const owner = this.gameState.territory.getOwnerAt(r, c);
                if (owner !== null && owner !== CONSTANTS.OWNER_NEUTRAL) {
                    this.ctx.fillStyle = CONSTANTS.PLAYER_COLORS[owner].bg;
                    this.ctx.fillRect(c * this.cellSize, r * this.cellSize, this.cellSize, this.cellSize);
                } else if (owner === CONSTANTS.OWNER_NEUTRAL) {
                    // Niemandsland
                    this.ctx.fillStyle = 'rgba(100, 100, 100, 0.1)';
                    this.ctx.fillRect(c * this.cellSize, r * this.cellSize, this.cellSize, this.cellSize);
                }
            }
        }
    }

    drawGrid() {
        this.ctx.strokeStyle = CONSTANTS.GRID_LINE_COLOR;
        this.ctx.lineWidth = 1;

        this.ctx.beginPath();
        for (let r = 0; r <= this.gameState.rows; r++) {
            this.ctx.moveTo(0, r * this.cellSize);
            this.ctx.lineTo(this.canvas.width, r * this.cellSize);
        }
        for (let c = 0; c <= this.gameState.cols; c++) {
            this.ctx.moveTo(c * this.cellSize, 0);
            this.ctx.lineTo(c * this.cellSize, this.canvas.height);
        }
        this.ctx.stroke();
    }

    drawCamps() {
        const camps = this.gameState.territory.camps;
        this.ctx.lineWidth = 2;

        for (const camp of camps) {
            const x = camp.cMin * this.cellSize;
            const y = camp.rMin * this.cellSize;
            const w = (camp.cMax - camp.cMin + 1) * this.cellSize;
            const h = (camp.rMax - camp.rMin + 1) * this.cellSize;

            // Highlight border and fill
            this.ctx.strokeStyle = CONSTANTS.PLAYER_COLORS[camp.id].main;
            this.ctx.fillStyle = `rgba(${this.hexToRgb(CONSTANTS.PLAYER_COLORS[camp.id].main)}, ${CONSTANTS.CAMP_BG_OPACITY})`;
            
            this.ctx.beginPath();
            this.ctx.rect(x, y, w, h);
            this.ctx.fill();
            this.ctx.stroke();

            // Draw crosshatch pattern for camps
            this.ctx.save();
            this.ctx.clip();
            this.ctx.strokeStyle = `rgba(${this.hexToRgb(CONSTANTS.PLAYER_COLORS[camp.id].main)}, 0.3)`;
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            for (let i = -w; i < w + h; i += 15) {
                this.ctx.moveTo(x + i, y);
                this.ctx.lineTo(x + i + h, y + h);
            }
            this.ctx.stroke();
            this.ctx.restore();
        }
    }

    drawCells() {
        // Performance: Disable expensive shadow blur during simulation phase
        const isSim = this.gameState.phase === CONSTANTS.PHASE_SIMULATION;

        for (let r = 0; r < this.gameState.rows; r++) {
            for (let c = 0; c < this.gameState.cols; c++) {
                const cell = this.gameState.grid.cells[r][c];
                const owner = cell.owner;
                if (owner !== CONSTANTS.OWNER_NONE) {
                    let color, shadowColor;
                    if (owner === CONSTANTS.OWNER_ROCK) {
                        color = '#6b7280'; // Tailwind gray-500
                        shadowColor = 'rgba(0,0,0,0.5)';
                    } else if (owner === CONSTANTS.OWNER_NEUTRAL) {
                        color = CONSTANTS.NEUTRAL_COLOR;
                        shadowColor = 'rgba(255,255,255,0.2)';
                    } else {
                        color = CONSTANTS.PLAYER_COLORS[owner].main;
                        shadowColor = CONSTANTS.PLAYER_COLORS[owner].shadow;
                    }
                    
                    this.ctx.fillStyle = color;
                    if (isSim) {
                        // No glow during simulation → ~5-10× faster canvas rendering
                        this.ctx.shadowBlur = 0;
                    } else {
                        this.ctx.shadowColor = shadowColor;
                        this.ctx.shadowBlur = owner === CONSTANTS.OWNER_ROCK ? 2 : 10;
                    }
                    
                    const margin = 1;
                    const x = c * this.cellSize + margin;
                    const y = r * this.cellSize + margin;
                    const s = this.cellSize - 2 * margin;

                    this.ctx.fillRect(x, y, s, s);

                    // Reset shadow for inner drawings
                    this.ctx.shadowBlur = 0;

                    if (owner === CONSTANTS.OWNER_ROCK) {
                        this.ctx.fillStyle = '#4b5563'; // gray-600
                        this.ctx.fillRect(c * this.cellSize + 3, r * this.cellSize + 3, this.cellSize - 6, this.cellSize - 6);
                    } else if (cell.isOld && !isSim) {
                        // Draw a thick border for old cells
                        this.ctx.strokeStyle = '#ffffff';
                        this.ctx.lineWidth = 2;
                        this.ctx.strokeRect(x, y, s, s);
                    }
                    
                    this.ctx.shadowBlur = 0; // Reset
                }
            }
        }
    }

    drawHoverPreview(inputHandler) {
        if (inputHandler.hoverRow === -1 || inputHandler.hoverCol === -1) return;

        const pId = this.gameState.currentPlayer;

        if (inputHandler.isEraserMode) {
            const r = inputHandler.hoverRow;
            const c = inputHandler.hoverCol;
            const cell = this.gameState.grid.getCell(r, c);
            const canErase = cell && cell.owner === pId && !cell.isOld;
            
            this.ctx.fillStyle = canErase ? 'rgba(239, 68, 68, 0.8)' : 'rgba(100, 100, 100, 0.4)';
            this.ctx.fillRect(c * this.cellSize, r * this.cellSize, this.cellSize, this.cellSize);
            return;
        }

        const pattern = inputHandler.currentPattern;
        const valid = this.gameState.canPlacePattern(pattern, inputHandler.hoverRow, inputHandler.hoverCol);
        
        this.ctx.fillStyle = valid 
            ? `rgba(${this.hexToRgb(CONSTANTS.PLAYER_COLORS[pId].main)}, 0.6)`
            : 'rgba(239, 68, 68, 0.6)'; // Red if invalid
            
        // Render each cell of the pattern
        for (const [dr, dc] of pattern) {
            const r = inputHandler.hoverRow + dr;
            const c = inputHandler.hoverCol + dc;
            
            // Only draw if within board bounds to avoid canvas crash
            if (r >= 0 && r < this.gameState.rows && c >= 0 && c < this.gameState.cols) {
                // Highlight anchor cell (0,0 offset) slightly differently
                if (dr === 0 && dc === 0) {
                    this.ctx.strokeStyle = '#FFFFFF';
                    this.ctx.lineWidth = 2;
                    this.ctx.strokeRect(c * this.cellSize, r * this.cellSize, this.cellSize, this.cellSize);
                }

                this.ctx.fillRect(
                    c * this.cellSize + 1, 
                    r * this.cellSize + 1, 
                    this.cellSize - 2, 
                    this.cellSize - 2
                );
            }
        }
    }

    drawCampIndicator(indicator) {
        const { pId, opacity } = indicator;
        const camp = this.gameState.territory.camps.find(c => c.id === pId);
        if (!camp) return;

        const x = camp.cMin * this.cellSize;
        const y = camp.rMin * this.cellSize;
        const w = (camp.cMax - camp.cMin + 1) * this.cellSize;
        const h = (camp.rMax - camp.rMin + 1) * this.cellSize;

        const img = this.playerImages[pId];
        if (!img || !img.complete || img.width === 0) return;

        // 1. Zoom into a square center section of the image (to get the emblem itself)
        const zoomFactor = 0.8; // Take center 80%
        const sourceBaseSize = Math.min(img.width, img.height) * zoomFactor;
        const sourceBaseX = (img.width - sourceBaseSize) / 2;
        const sourceBaseY = (img.height - sourceBaseSize) / 2;

        // 2. "Cover" logic: Adjust source rect to match destination aspect ratio (w/h)
        const destAR = w / h;
        let sw, sh, sx, sy;

        if (destAR > 1) {
            // Target is wider than square: take a wide strip from the square source center
            sw = sourceBaseSize;
            sh = sourceBaseSize / destAR;
            sx = sourceBaseX;
            sy = sourceBaseY + (sourceBaseSize - sh) / 2;
        } else {
            // Target is taller than square: take a tall strip from the square source center
            sh = sourceBaseSize;
            sw = sourceBaseSize * destAR;
            sy = sourceBaseY;
            sx = sourceBaseX + (sourceBaseSize - sw) / 2;
        }

        this.ctx.save();
        this.ctx.globalAlpha = opacity;
        
        // Subtle glow effect
        this.ctx.shadowColor = CONSTANTS.PLAYER_COLORS[pId].main;
        this.ctx.shadowBlur = 20;
        
        this.ctx.drawImage(
            img,
            sx, sy, sw, sh, // Source (cropped & zoomed)
            x, y, w, h     // Destination (fills entire camp)
        );
        this.ctx.restore();
    }

    // Helper: HEX to RGB string (e.g. "#FF00FF" -> "255, 0, 255")
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? 
            `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` 
            : '255, 255, 255';
    }
}
