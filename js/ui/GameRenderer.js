// js/ui/GameRenderer.js

class GameRenderer {
    constructor(canvas, gameState) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.gameState = gameState;
        
        // Cache for player images
        this.playerImages = [];
        this.loadPlayerImages();

        // World units: one cell is cellSize wide; the camera maps them to device pixels.
        this.cellSize = 10;
        this.camera = { x: 0, y: 0, zoom: 1 };
        this.dpr = 1;
        this.fitZoom = 1;
        // Until the player pans or zooms, a resize re-fits the whole board.
        this.userCamera = false;
        this.reducedMotion = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        // Spaceships among predefined foreign flora get a direction arrow in the first planning phase.
        this.seedArrows = (gameState.scenario?.map.seeds || []).filter(seed => seed.owner !== 1).map(seed => ({ seed, cells: MissionManager.seedCells(seed), motion: MissionManager.seedMotion(seed) })).filter(a => a.motion);
        this.resize();
        // The board also changes size when the mission HUD collapses or the device rotates.
        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(this.canvas.parentElement);
    }

    pulse() {
        return this.reducedMotion ? 1 : .55 + .45 * Math.sin(performance.now() / 160);
    }

    clampZoom(zoom) {
        return Math.max(Math.min(.2 * this.dpr, this.fitZoom * .8), Math.min(6 * this.dpr, zoom));
    }

    // Zooms around a point given in canvas (device) pixels.
    zoomAt(px, py, factor) {
        const cam = this.camera, next = this.clampZoom(cam.zoom * factor);
        cam.x = px - (px - cam.x) * next / cam.zoom;
        cam.y = py - (py - cam.y) * next / cam.zoom;
        cam.zoom = next;
        this.userCamera = true;
    }

    // Centers the camera on a cell and zooms in far enough to see individual cells.
    focusCell(r, c, minZoom = 1.4) {
        this.camera.zoom = this.clampZoom(Math.max(this.camera.zoom, minZoom * this.dpr));
        this.camera.x = this.canvas.width / 2 - (c + .5) * this.cellSize * this.camera.zoom;
        this.camera.y = this.canvas.height / 2 - (r + .5) * this.cellSize * this.camera.zoom;
        this.userCamera = true;
        this.render();
    }

    // Shows the whole board inside the measured container (header, HUD and panel are outside it).
    fit() {
        const w = this.canvas.width, h = this.canvas.height, pad = 12 * this.dpr;
        const boardW = this.gameState.cols * this.cellSize, boardH = this.gameState.rows * this.cellSize;
        this.fitZoom = Math.max(.01, Math.min((w - 2 * pad) / boardW, (h - 2 * pad) / boardH));
        this.camera.zoom = this.fitZoom;
        this.camera.x = (w - boardW * this.camera.zoom) / 2;
        this.camera.y = (h - boardH * this.camera.zoom) / 2;
        this.userCamera = false;
        this.render();
    }

    resize() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const dpr = Math.min(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1);
        const cam = this.camera, prevW = this.canvas.width, prevH = this.canvas.height, prevDpr = this.dpr;
        const w = Math.round(rect.width * dpr), h = Math.round(rect.height * dpr);
        if (w === prevW && h === prevH && dpr === prevDpr && this.fitted) return;
        // Keep the point in the middle of the view where it is when the player has moved the camera.
        const center = this.userCamera && prevW ? { x: (prevW / 2 - cam.x) / cam.zoom, y: (prevH / 2 - cam.y) / cam.zoom } : null;
        this.dpr = dpr;
        this.canvas.width = w;
        this.canvas.height = h;
        this.fitted = true;
        if (!center) { this.fit(); return; }
        const boardW = this.gameState.cols * this.cellSize, boardH = this.gameState.rows * this.cellSize, pad = 12 * dpr;
        this.fitZoom = Math.max(.01, Math.min((w - 2 * pad) / boardW, (h - 2 * pad) / boardH));
        cam.zoom = this.clampZoom(cam.zoom * dpr / prevDpr);
        cam.x = w / 2 - center.x * cam.zoom;
        cam.y = h / 2 - center.y * cam.zoom;
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

        this.drawForecast();
        this.drawMissionZones();
        this.drawSeedArrows();
        this.drawRecon();
        this.drawFailure();

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

    // Labels keep a readable on-screen size (10–13 px) at every zoom level.
    labelFont() {
        const screenPx = Math.max(10, Math.min(13, 11 * this.camera.zoom / this.dpr));
        const size = screenPx * this.dpr / this.camera.zoom;
        return { size, font: `600 ${size}px "Fira Code", ui-monospace, monospace` };
    }

    label(text, x, y, color) {
        const ctx = this.ctx, { size, font } = this.labelFont();
        ctx.font = font;
        const w = ctx.measureText(text).width, pad = size * .35;
        ctx.fillStyle = 'rgba(6,12,17,.82)';
        ctx.fillRect(x - pad, y - size * 1.05, w + 2 * pad, size * 1.4);
        ctx.fillStyle = color;
        ctx.fillText(text, x, y);
    }

    drawMissionZones() {
        const state = this.gameState, os = state.objectiveSystem;
        if (!state.scenario || !os) return;
        const ctx = this.ctx, size = this.cellSize, pulse = this.pulse();
        const palette = { done: ['#8bf5c7', 'rgba(92,255,174,.2)'], sterile: ['#ff6578', 'rgba(255,70,95,.18)'], locked: ['#8a9aa8', 'rgba(120,140,160,.08)'], next: ['#ffe08a', 'rgba(255,214,110,.24)'], active: ['#9ff3ff', 'rgba(120,240,255,.18)'], protect: ['#ffd48a', 'rgba(255,196,110,.12)'], open: ['#ffd48a', 'rgba(255,196,110,.12)'], cache: ['#7fe3ff', 'rgba(110,220,255,.14)'] };
        for (const z of state.scenario.map.zones) {
            const st = os.zoneStatus(z.id);
            let [stroke, fill] = palette[st.state];
            let lineWidth = 2, dash = [5, 4];
            if (st.state === 'next') { lineWidth = 2 + 2 * pulse; dash = []; }
            if (st.threat === 'warning') { stroke = '#ffb347'; lineWidth = 3; }
            if (st.threat === 'alarm') { stroke = '#ff4d5e'; lineWidth = 3 + 3 * pulse; dash = []; }
            const x = z.cMin * size, y = z.rMin * size, w = (z.cMax - z.cMin + 1) * size, h = (z.rMax - z.rMin + 1) * size;
            ctx.save();
            ctx.fillStyle = fill; ctx.fillRect(x, y, w, h);
            ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth; ctx.setLineDash(dash); ctx.strokeRect(x, y, w, h); ctx.setLineDash([]);
            if (st.progress !== null) {
                ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(x + 2, y + h - 8, w - 4, 6);
                ctx.fillStyle = st.progress >= .75 ? '#8bf5c7' : '#ffd48a'; ctx.fillRect(x + 2, y + h - 8, (w - 4) * st.progress, 6);
            }
            const prefix = st.state === 'done' ? '✓ ' : st.state === 'next' ? '▶ ' : st.state === 'protect' ? '⛨ ' : st.state === 'cache' ? '◆ ' : '';
            const suffix = st.state === 'locked' ? ' · WARTET' : st.state === 'cache' ? ` · +${z.cache} MATERIAL` : st.progressLabel && st.progress > 0 ? ` · ${st.progressLabel}` : '';
            const threat = st.threat !== 'calm' ? ` · ⚠ ${st.distance} F.` : '';
            this.label(prefix + z.label + suffix + threat, x, y - 4, st.threat === 'alarm' || st.state === 'sterile' ? '#ff9fab' : st.threat === 'warning' ? '#ffc98a' : st.state === 'done' ? '#b8ffe0' : st.state === 'locked' ? '#b6c2cc' : '#ffe0ab');
            ctx.restore();
        }
        // Announced scenario events: dashed outline of the affected area with the time of arrival.
        for (const e of state.upcomingEvents?.() || []) for (const area of e.areas) {
            const x = (area.cMin - 1) * size, y = (area.rMin - 1) * size, w = (area.cMax - area.cMin + 3) * size, h = (area.rMax - area.rMin + 3) * size;
            ctx.save();
            ctx.strokeStyle = '#ff9f43'; ctx.lineWidth = 2.5; ctx.setLineDash([3, 3]); ctx.strokeRect(x, y, w, h); ctx.setLineDash([]);
            this.label(`⚡ ${e.when}`, x, y - 4, '#ffc98a');
            ctx.restore();
        }
        // The own habitat is drawn as a camp; its threat gets the same border language.
        const campThreat = os.threats.get('camp'), camp = state.territory.camps.find(c => c.id === 0);
        if (camp && campThreat && campThreat.level !== 'calm') {
            const x = camp.cMin * size, y = camp.rMin * size, w = (camp.cMax - camp.cMin + 1) * size, h = (camp.rMax - camp.rMin + 1) * size;
            ctx.save();
            ctx.strokeStyle = campThreat.level === 'alarm' ? '#ff4d5e' : '#ffb347';
            ctx.lineWidth = campThreat.level === 'alarm' ? 3 + 3 * pulse : 3;
            ctx.strokeRect(x - 2, y - 2, w + 4, h + 4);
            this.label(`⚠ HABITAT · ${campThreat.distance} F.`, x, y - 4, campThreat.level === 'alarm' ? '#ff9fab' : '#ffc98a');
            ctx.restore();
        }
    }

    // Ghost of the forecast: the path of own flora faintly, its final position and foreign flora outlined.
    drawForecast() {
        const state = this.gameState, f = state.forecastResult;
        if (!f || f.version !== state.boardVersion || state.phase !== CONSTANTS.PHASE_PLACEMENT) return;
        const ctx = this.ctx, size = this.cellSize, cols = state.cols;
        ctx.save();
        ctx.fillStyle = 'rgba(0,255,255,.14)';
        for (let i = 0; i < f.trail.length; i++) if (f.trail[i]) ctx.fillRect((i % cols) * size, Math.floor(i / cols) * size, size, size);
        ctx.lineWidth = 1.5;
        for (let i = 0; i < f.owners.length; i++) {
            const owner = f.owners[i];
            if (owner === 0 || owner === CONSTANTS.OWNER_ROCK) continue;
            ctx.strokeStyle = owner === 1 ? 'rgba(0,255,255,.95)' : owner === CONSTANTS.OWNER_NEUTRAL ? 'rgba(229,231,235,.8)' : CONSTANTS.PLAYER_COLORS[owner - 1].main;
            ctx.setLineDash(owner === 1 ? [] : [2, 2]);
            ctx.strokeRect((i % cols) * size + 2, Math.floor(i / cols) * size + 2, size - 4, size - 4);
        }
        ctx.restore();
    }

    drawSeedArrows() {
        const state = this.gameState;
        if (!this.seedArrows.length || state.currentRound !== 1 || state.phase !== CONSTANTS.PHASE_PLACEMENT) return;
        const ctx = this.ctx, size = this.cellSize;
        const names = { '-1,-1': 'links oben', '-1,0': 'oben', '-1,1': 'rechts oben', '0,-1': 'links', '0,1': 'rechts', '1,-1': 'links unten', '1,0': 'unten', '1,1': 'rechts unten' };
        for (const { seed, cells, motion } of this.seedArrows) {
            const cr = cells.reduce((s, p) => s + p[0], 0) / cells.length, cc = cells.reduce((s, p) => s + p[1], 0) / cells.length;
            const len = Math.hypot(motion.dr, motion.dc), ur = motion.dr / len, uc = motion.dc / len;
            const x0 = (cc + .5) * size, y0 = (cr + .5) * size, x1 = x0 + uc * 7 * size, y1 = y0 + ur * 7 * size;
            const color = seed.owner === CONSTANTS.OWNER_NEUTRAL ? '#e5e7eb' : CONSTANTS.PLAYER_COLORS[seed.owner - 1].main;
            ctx.save();
            ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
            ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); ctx.setLineDash([]);
            const a = Math.atan2(y1 - y0, x1 - x0);
            ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 - 9 * Math.cos(a - .45), y1 - 9 * Math.sin(a - .45)); ctx.lineTo(x1 - 9 * Math.cos(a + .45), y1 - 9 * Math.sin(a + .45)); ctx.closePath(); ctx.fill();
            const speed = Math.max(Math.abs(motion.dr), Math.abs(motion.dc));
            const text = `zieht nach ${names[`${Math.sign(motion.dr)},${Math.sign(motion.dc)}`]} · ${speed} Feld${speed > 1 ? 'er' : ''} je ${motion.period} Gen.`;
            ctx.font = this.labelFont().font;
            const width = ctx.measureText(text).width;
            // The label sits beside the seed itself, on the side away from the arrow.
            const lx = Math.min(Math.max(4, x0 - width / 2), state.cols * size - width - 4);
            this.label(text, lx, ur > 0 ? Math.max(14, y0 - 2 * size) : y0 + 3 * size, color);
            ctx.restore();
        }
    }

    // Fresh enemy colonies are outlined while the AI places them and briefly after the evolution starts.
    drawRecon() {
        const state = this.gameState;
        if (!state.scenario || !state.roundPlacements) return;
        let alpha = 0;
        if (state.phase === CONSTANTS.PHASE_PLACEMENT && state.currentPlayer > 0) alpha = 1;
        if (state.phase === CONSTANTS.PHASE_SIMULATION) alpha = Math.max(0, 1 - (performance.now() - (state.simulationStartedAt || 0)) / 2500);
        if (!alpha) return;
        const ctx = this.ctx, size = this.cellSize;
        ctx.save();
        ctx.globalAlpha = alpha; ctx.lineWidth = 2; ctx.setLineDash([4, 3]);
        state.roundPlacements.forEach((placements, player) => {
            if (!player) return;
            ctx.strokeStyle = CONSTANTS.PLAYER_COLORS[player].main;
            for (const cells of placements) {
                const rs = cells.map(p => p.r), cs = cells.map(p => p.c);
                const r0 = Math.min(...rs) - 2, c0 = Math.min(...cs) - 2, r1 = Math.max(...rs) + 2, c1 = Math.max(...cs) + 2;
                ctx.strokeRect(c0 * size, r0 * size, (c1 - c0 + 1) * size, (r1 - r0 + 1) * size);
            }
        });
        ctx.restore();
    }

    drawFailure() {
        const failure = this.gameState.objectiveSystem?.result?.failure;
        if (!failure?.cells.length || this.gameState.phase !== CONSTANTS.PHASE_GAMEOVER) return;
        const ctx = this.ctx, size = this.cellSize;
        ctx.save();
        ctx.strokeStyle = '#ff4d5e'; ctx.lineWidth = 2.5;
        for (const { r, c } of failure.cells) { ctx.beginPath(); ctx.arc((c + .5) * size, (r + .5) * size, size * 1.6, 0, Math.PI * 2); ctx.stroke(); }
        const { r, c } = failure.cells[0];
        this.label(`Durchbruch · Gen ${failure.generation}`, (c + 2) * size, (r + 3) * size, '#ff9fab');
        ctx.restore();
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

    // Grid lines are one device pixel wide and fade out when cells get too small to tell apart.
    drawGrid() {
        const cellPx = this.cellSize * this.camera.zoom / this.dpr;
        if (cellPx < 3) return;
        const ctx = this.ctx, w = this.gameState.cols * this.cellSize, h = this.gameState.rows * this.cellSize;
        ctx.save();
        ctx.globalAlpha = Math.min(1, (cellPx - 3) / 6);
        ctx.strokeStyle = CONSTANTS.GRID_LINE_COLOR;
        ctx.lineWidth = 1 / this.camera.zoom;
        ctx.beginPath();
        for (let r = 0; r <= this.gameState.rows; r++) {
            ctx.moveTo(0, r * this.cellSize);
            ctx.lineTo(w, r * this.cellSize);
        }
        for (let c = 0; c <= this.gameState.cols; c++) {
            ctx.moveTo(c * this.cellSize, 0);
            ctx.lineTo(c * this.cellSize, h);
        }
        ctx.stroke();
        ctx.restore();
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
        const gridOwners = this.gameState.grid.owners;
        const gridIsOld = this.gameState.grid.isOldFlags;
        const cols = this.gameState.cols;

        for (let r = 0; r < this.gameState.rows; r++) {
            for (let c = 0; c < this.gameState.cols; c++) {
                const idx = r * cols + c;
                const owner = gridOwners[idx];
                if (owner !== 0) { // OWNER_NONE = 0
                    let color, shadowColor;
                    if (owner === CONSTANTS.OWNER_ROCK) {
                        color = '#6b7280';
                        shadowColor = 'rgba(0,0,0,0.5)';
                    } else if (owner === CONSTANTS.OWNER_NEUTRAL) {
                        color = CONSTANTS.NEUTRAL_COLOR;
                        shadowColor = 'rgba(255,255,255,0.2)';
                    } else {
                        // Player grid owner (1-4) → PLAYER_COLORS index (0-3)
                        const pIdx = owner - 1;
                        color = CONSTANTS.PLAYER_COLORS[pIdx].main;
                        shadowColor = CONSTANTS.PLAYER_COLORS[pIdx].shadow;
                    }
                    
                    this.ctx.fillStyle = color;
                    if (isSim) {
                        this.ctx.shadowBlur = 0;
                    } else {
                        this.ctx.shadowColor = shadowColor;
                        this.ctx.shadowBlur = (owner === CONSTANTS.OWNER_ROCK ? 2 : 10) * this.dpr;
                    }
                    
                    const margin = 1;
                    const x = c * this.cellSize + margin;
                    const y = r * this.cellSize + margin;
                    const s = this.cellSize - 2 * margin;

                    this.ctx.fillRect(x, y, s, s);

                    this.ctx.shadowBlur = 0;

                    if (owner === CONSTANTS.OWNER_ROCK) {
                        this.ctx.fillStyle = '#4b5563';
                        this.ctx.fillRect(c * this.cellSize + 3, r * this.cellSize + 3, this.cellSize - 6, this.cellSize - 6);
                    } else if (gridIsOld[idx] && !isSim) {
                        this.ctx.strokeStyle = '#ffffff';
                        this.ctx.lineWidth = 2;
                        this.ctx.strokeRect(x, y, s, s);
                    }
                    
                    this.ctx.shadowBlur = 0;
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
            // Compare grid owner (1-4) with player index + 1
            const gridOwner = this.gameState.grid.getOwner(r, c);
            const canErase = gridOwner === (pId + 1) && !this.gameState.grid.getIsOld(r, c);
            
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
