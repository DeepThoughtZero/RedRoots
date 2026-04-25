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
        this.isEraserMode = false;
        
        this.isDragging = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;

        // Touch tracking
        this.initialPinchDist = 0;
        this.initialZoom = 1;
        this.lastTouchCenter = null;
        this.hasMovedWithTouch = false;

        this.initEvents();
    }

    initEvents() {
        this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
        this.canvas.addEventListener('mouseleave', this.onMouseLeave.bind(this));
        this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
        this.canvas.addEventListener('contextmenu', this.onContextMenu.bind(this));
        this.canvas.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
        window.addEventListener('mouseup', this.onMouseUp.bind(this));
        
        // Touch events
        this.canvas.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
        this.canvas.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
        this.canvas.addEventListener('touchend', this.onTouchEnd.bind(this), { passive: false });
        this.canvas.addEventListener('touchcancel', this.onTouchEnd.bind(this), { passive: false });
        
        // Keyboard mapping
        window.addEventListener('keydown', (e) => {
            if (e.key === 'r' || e.key === 'R') {
                this.rotatePattern();
            }
            if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
                if (this.gameState.undoLastAction()) {
                    this.uiManager.render();
                }
            }
        });
    }

    setPattern(key) {
        this.activePatternKey = key;
        this.currentPattern = CONSTANTS.PATTERNS[key].pattern;
        this.uiManager.render(); // force update hover
    }

    setEraserMode(enabled) {
        this.isEraserMode = enabled;
        this.uiManager.render();
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
        const rawX = (e.clientX - rect.left) * scaleX;
        const rawY = (e.clientY - rect.top) * scaleY;
        
        const renderer = this.uiManager.renderer;
        const cam = renderer.camera;
        const cellSize = renderer.cellSize;
        
        // Inverse transform: (raw - cam) / zoom
        const logicalX = (rawX - cam.x) / cam.zoom;
        const logicalY = (rawY - cam.y) / cam.zoom;
        
        const c = Math.floor(logicalX / cellSize);
        const r = Math.floor(logicalY / cellSize);
        return { r, c };
    }

    onWheel(e) {
        e.preventDefault();
        const renderer = this.uiManager.renderer;
        const cam = renderer.camera;
        
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const rawX = (e.clientX - rect.left) * scaleX;
        const rawY = (e.clientY - rect.top) * scaleY;
        
        const zoomDelta = e.deltaY < 0 ? 1.1 : 0.9;
        const newZoom = Math.max(0.2, Math.min(5, cam.zoom * zoomDelta));
        
        // Adjust camera position to zoom towards cursor
        const logicalX = (rawX - cam.x) / cam.zoom;
        const logicalY = (rawY - cam.y) / cam.zoom;
        
        cam.zoom = newZoom;
        cam.x = rawX - logicalX * cam.zoom;
        cam.y = rawY - logicalY * cam.zoom;
        
        this.uiManager.render();
    }

    onMouseMove(e) {
        if (this.isDragging) {
            const dx = e.clientX - this.lastMouseX;
            const dy = e.clientY - this.lastMouseY;
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
            
            const renderer = this.uiManager.renderer;
            const cam = renderer.camera;
            
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            
            cam.x += dx * scaleX;
            cam.y += dy * scaleY;
            
            this.uiManager.render();
            return;
        }

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
        if (e.button === 1) { // Middle click
            e.preventDefault();
            this.isDragging = true;
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
            return;
        }

        if (this.gameState.phase !== CONSTANTS.PHASE_PLACEMENT) return;
        if (!this.gameState.isCurrentPlayerHuman()) return;
        if (e.button !== 0) return; // Only left click

        const { r, c } = this.getGridCoords(e);
        this.placeCurrentPattern(r, c);
    }

    placeCurrentPattern(r, c) {
        if (this.gameState.phase !== CONSTANTS.PHASE_PLACEMENT) return;
        if (!this.gameState.isCurrentPlayerHuman()) return;

        if (this.isEraserMode) {
            this.gameState.eraseCell(r, c);
            return;
        }

        const success = this.gameState.placePattern(this.currentPattern, r, c);
        if (success) {
            const minCost = Math.min(...Object.values(CONSTANTS.PATTERNS).map(p => p.cost));
            if (this.gameState.budgets[this.gameState.currentPlayer] < minCost) {
                // Not enough budget for anything, could auto-end turn
            }
        }
    }

    onContextMenu(e) {
        e.preventDefault();
        this.rotatePattern();
    }

    onMouseUp(e) {
        if (e.button === 1) {
            this.isDragging = false;
        }
    }

    getTouchCenter(touches) {
        let x = 0, y = 0;
        for (let i = 0; i < touches.length; i++) {
            x += touches[i].clientX;
            y += touches[i].clientY;
        }
        return { x: x / touches.length, y: y / touches.length };
    }

    getTouchDistance(touches) {
        if (touches.length < 2) return 0;
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    onTouchStart(e) {
        e.preventDefault();
        this.hasMovedWithTouch = false;
        
        if (e.touches.length === 2) {
            this.initialPinchDist = this.getTouchDistance(e.touches);
            this.initialZoom = this.uiManager.renderer.camera.zoom;
            this.lastTouchCenter = this.getTouchCenter(e.touches);
        } else if (e.touches.length === 1) {
            this.lastTouchCenter = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            // Simulate mouse hover
            const { r, c } = this.getGridCoords(e.touches[0]);
            this.hoverRow = r;
            this.hoverCol = c;
            this.uiManager.render();
        }
    }

    onTouchMove(e) {
        e.preventDefault();
        
        if (e.touches.length === 2) {
            this.hasMovedWithTouch = true;
            const currentDist = this.getTouchDistance(e.touches);
            const currentCenter = this.getTouchCenter(e.touches);
            
            const renderer = this.uiManager.renderer;
            const cam = renderer.camera;
            
            // Handle Zoom
            if (this.initialPinchDist > 0) {
                const zoomFactor = currentDist / this.initialPinchDist;
                const newZoom = Math.max(0.2, Math.min(5, this.initialZoom * zoomFactor));
                
                const rect = this.canvas.getBoundingClientRect();
                const scaleX = this.canvas.width / rect.width;
                const scaleY = this.canvas.height / rect.height;
                const rawX = (currentCenter.x - rect.left) * scaleX;
                const rawY = (currentCenter.y - rect.top) * scaleY;
                
                const logicalX = (rawX - cam.x) / cam.zoom;
                const logicalY = (rawY - cam.y) / cam.zoom;
                
                cam.zoom = newZoom;
                cam.x = rawX - logicalX * cam.zoom;
                cam.y = rawY - logicalY * cam.zoom;
            }
            
            // Handle Pan
            if (this.lastTouchCenter) {
                const dx = currentCenter.x - this.lastTouchCenter.x;
                const dy = currentCenter.y - this.lastTouchCenter.y;
                
                const rect = this.canvas.getBoundingClientRect();
                const scaleX = this.canvas.width / rect.width;
                const scaleY = this.canvas.height / rect.height;
                
                cam.x += dx * scaleX;
                cam.y += dy * scaleY;
            }
            
            this.lastTouchCenter = currentCenter;
            this.uiManager.render();
            
        } else if (e.touches.length === 1) {
            const currentTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            
            // If moved more than 10px, count as move
            if (this.lastTouchCenter) {
                const dx = currentTouch.x - this.lastTouchCenter.x;
                const dy = currentTouch.y - this.lastTouchCenter.y;
                if (Math.sqrt(dx*dx + dy*dy) > 10) {
                    this.hasMovedWithTouch = true;
                }
            }
            
            // Update hover
            const { r, c } = this.getGridCoords(e.touches[0]);
            this.hoverRow = r;
            this.hoverCol = c;
            this.uiManager.render();
        }
    }

    onTouchEnd(e) {
        e.preventDefault();
        
        if (e.touches.length === 0) {
            if (!this.hasMovedWithTouch && this.lastTouchCenter) {
                // Simulate click
                this.placeCurrentPattern(this.hoverRow, this.hoverCol);
            }
            this.lastTouchCenter = null;
            this.initialPinchDist = 0;
            this.hoverRow = -1;
            this.hoverCol = -1;
            this.uiManager.render();
        } else if (e.touches.length === 1) {
            // Down to one finger, reset center to avoid jumping
            this.lastTouchCenter = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
    }
}
