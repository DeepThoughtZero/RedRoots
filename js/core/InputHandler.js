// js/core/InputHandler.js

class InputHandler {
    constructor(canvas, gameState, uiManager) {
        this.canvas = canvas;
        this.gameState = gameState;
        this.uiManager = uiManager;
        
        this.activePatternKey = 'cell';
        this.currentPattern = CONSTANTS.PATTERNS['cell'].pattern;
        this.hoverRow = -1;
        this.hoverCol = -1;

        this.initEvents();
    }

    initEvents() {
        this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
        this.canvas.addEventListener('mouseleave', this.onMouseLeave.bind(this));
        this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
        this.canvas.addEventListener('contextmenu', this.onContextMenu.bind(this));
        
        // Keyboard mapping for rotation
        window.addEventListener('keydown', (e) => {
            if (e.key === 'r' || e.key === 'R') {
                this.rotatePattern();
            }
        });
    }

    setPattern(key) {
        this.activePatternKey = key;
        this.currentPattern = CONSTANTS.PATTERNS[key].pattern;
        this.uiManager.render(); // force update hover
    }

    rotatePattern() {
        if (this.gameState.phase !== CONSTANTS.PHASE_PLACEMENT) return;
        
        // Rotate 90 degrees clockwise
        // [r, c] -> [c, -r]
        const rotated = this.currentPattern.map(([r, c]) => [c, -r]);
        
        // Normalize so the top-leftmost cell of bounding box is near 0,0, but we want anchor to stay at 0,0
        // Wait, rotating around 0,0 is fine.
        this.currentPattern = rotated;
        this.uiManager.render();
    }

    getGridCoords(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;
        
        // Render cellSize calculation is handled by GameRenderer.
        // We need to fetch cellSize from uiManager.
        const cellSize = this.uiManager.renderer.cellSize;
        
        const c = Math.floor(x / cellSize);
        const r = Math.floor(y / cellSize);
        return { r, c };
    }

    onMouseMove(e) {
        if (this.gameState.phase !== CONSTANTS.PHASE_PLACEMENT) return;
        if (!this.gameState.isCurrentPlayerHuman()) return;

        const { r, c } = this.getGridCoords(e);
        if (this.hoverRow !== r || this.hoverCol !== c) {
            this.hoverRow = r;
            this.hoverCol = c;
            this.uiManager.render();
        }
    }

    onMouseLeave() {
        this.hoverRow = -1;
        this.hoverCol = -1;
        this.uiManager.render();
    }

    onMouseDown(e) {
        if (this.gameState.phase !== CONSTANTS.PHASE_PLACEMENT) return;
        if (!this.gameState.isCurrentPlayerHuman()) return;
        if (e.button !== 0) return; // Only left click

        const { r, c } = this.getGridCoords(e);
        
        const success = this.gameState.placePattern(this.currentPattern, r, c);
        if (success) {
            // Check if budget is 0, if so, we can auto-end turn or let them click end turn.
            // Let them click end turn to review, or auto end if budget < minimum cost.
            const minCost = Math.min(...Object.values(CONSTANTS.PATTERNS).map(p => p.cost));
            if (this.gameState.budgets[this.gameState.currentPlayer] < minCost) {
                // Not enough budget for anything, could auto-end turn
            }
        } else {
            // Show error flash or sound
        }
    }

    onContextMenu(e) {
        e.preventDefault();
        this.rotatePattern();
    }
}
