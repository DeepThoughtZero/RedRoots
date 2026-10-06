// Mission outcomes are evaluated independently of the skirmish camp victory rule.
// Besides deciding victory, the system exposes read-only status for the board, threat distances,
// a short event queue for the HUD and a failure analysis. None of this changes the outcome rules.
const THREAT_WARNING = 8, THREAT_ALARM = 3;
class ObjectiveSystem {
    constructor(mission) {
        this.mission = mission; this.generations = 0; this.streak = 0; this.spent = 0; this.result = null; this.collected = new Set(); this.hold = 0; this.progressText = ''; this.captureTicks = new Map(); this.maxPopulation = 0;
        this.events = []; this.threats = new Map(); this.closestBy = new Map(); this.occupied = new Set(); this.supplied = new Set();
        this.bestStreak = 0; this.bestHold = 0; this.bestSimultaneous = 0; this.bestCapture = 0; this.lastAlive = 0; this.closestToTarget = Infinity; this.defeatedSeen = new Set();
        this.caches = new Set(); this.pendingMaterial = 0; this.cleared = new Set(); this.bestCleared = 0; this.zoneHistory = []; this.beacon = 0; this.bestBeacon = 0; this.measured = null;
        // Mastery data: placed pattern kinds, erasures, a population timeline and every event for the result screen.
        this.placements = []; this.erased = 0; this.log = []; this.halfAnnounced = false;
        this.timeline = { stride: 1, generation: [], own: [], foreign: [] };
    }
    zone(id) { return this.mission.map.zones.find(z => z.id === id); }
    emit(event) { this.events.push(event); this.log.push(event); }
    // Identifies a placed pattern by its shape in any rotation.
    static patternKey(cells) {
        const norm = list => { const r0 = Math.min(...list.map(p => p[0])), c0 = Math.min(...list.map(p => p[1])); return list.map(([r, c]) => `${r - r0},${c - c0}`).sort().join(';'); };
        if (!ObjectiveSystem.shapes) {
            ObjectiveSystem.shapes = new Map();
            for (const [key, p] of Object.entries(CONSTANTS.PATTERNS)) { let cur = p.pattern; for (let i = 0; i < 4; i++) { if (!ObjectiveSystem.shapes.has(norm(cur))) ObjectiveSystem.shapes.set(norm(cur), key); cur = cur.map(([r, c]) => [c, -r]); } }
        }
        return ObjectiveSystem.shapes.get(norm(cells)) || 'custom';
    }
    recordPlacement(cells) { this.placements.push(ObjectiveSystem.patternKey(cells)); }
    // Keeps at most ~1200 samples; long missions are thinned evenly.
    sample(own, foreign) {
        const t = this.timeline;
        if (this.generations % t.stride) return;
        t.generation.push(this.generations); t.own.push(own); t.foreign.push(foreign);
        if (t.generation.length > 1200) { for (const key of ['generation', 'own', 'foreign']) t[key] = t[key].filter((_, i) => i % 2 === 0); t.stride *= 2; }
    }
    bonusMet(b, state) {
        switch (b.type) {
            case 'rounds': return state.currentRound <= b.value;
            case 'generations': return this.generations <= b.value;
            case 'population': return this.maxPopulation <= b.value;
            case 'margin': return this.closestMargin(b.zones) >= b.value;
            case 'patterns': return new Set(this.placements).size <= b.value;
            case 'onlyPatterns': return this.placements.every(key => b.patterns.includes(key));
            case 'noErase': return this.erased === 0;
            case 'noForecast': return !(state.forecastsUsed > 0);
            case 'caches': return this.mission.map.zones.filter(z => z.cache).every(z => this.caches.has(z.id));
            case 'territory': { let n = 0; for (let r = 0; r < state.rows; r++) for (let c = 0; c < state.cols; c++) if (state.territory.getOwnerAt(r, c) === 0) n++; return n >= b.value; }
            default: return this.spent <= b.value;
        }
    }
    static clone(value) {
        if (value instanceof Set) return new Set(value);
        if (value instanceof Map) return new Map([...value].map(([k, v]) => [k, ObjectiveSystem.clone(v)]));
        if (Array.isArray(value)) return value.map(ObjectiveSystem.clone);
        if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, ObjectiveSystem.clone(v)]));
        return value;
    }
    // Complete evaluation state for round checkpoints; the mission definition is shared.
    snapshot() {
        const copy = {};
        for (const [key, value] of Object.entries(this)) if (key !== 'mission') copy[key] = ObjectiveSystem.clone(value);
        copy.result = null; copy.events = [];
        return copy;
    }
    restore(snapshot) {
        for (const key of Object.keys(this)) if (key !== 'mission' && !(key in snapshot)) delete this[key];
        for (const [key, value] of Object.entries(snapshot)) this[key] = ObjectiveSystem.clone(value);
    }
    // A decisive moment: alarm at a watched zone, a goal at 75 % or a target within three cells.
    isCritical() {
        if (this.result) return false;
        if (this.worstThreat()?.level === 'alarm') return true;
        if ((this.mission.objective.zones || []).some(id => (this.zoneStatus(id).progress || 0) >= .75)) return true;
        return this.currentTargetDistance <= 3;
    }
    inZone(state, zone, owner, territory = false) {
        for (let r = zone.rMin; r <= zone.rMax; r++) for (let c = zone.cMin; c <= zone.cMax; c++) {
            if ((territory ? state.territory.getOwnerAt(r, c) : state.grid.getOwner(r, c)) === owner) return true;
        }
        return false;
    }
    cellsInZone(state, zone, owners, limit = 12) {
        const cells = [];
        for (let r = zone.rMin; r <= zone.rMax && cells.length < limit; r++) for (let c = zone.cMin; c <= zone.cMax && cells.length < limit; c++) {
            const owner = state.grid.getOwner(r, c);
            if (owners.includes(owner)) cells.push({ r, c, owner });
        }
        return cells;
    }
    // Chebyshev distance from the nearest matching cell to the zone rectangle (0 = inside).
    distanceToZone(state, zone, owners, margin = THREAT_WARNING) {
        const rows = state.rows ?? state.grid.rows, cols = state.cols ?? state.grid.cols;
        const r0 = Math.max(0, zone.rMin - margin), r1 = Math.min(rows - 1, zone.rMax + margin);
        const c0 = Math.max(0, zone.cMin - margin), c1 = Math.min(cols - 1, zone.cMax + margin);
        const owned = state.grid.owners;
        let best = Infinity;
        for (let r = r0; r <= r1; r++) {
            const dr = r < zone.rMin ? zone.rMin - r : r > zone.rMax ? r - zone.rMax : 0;
            if (dr >= best) continue;
            for (let c = c0; c <= c1; c++) {
                const v = owned[r * cols + c];
                if (v === 0 || !owners.includes(v)) continue;
                const dc = c < zone.cMin ? zone.cMin - c : c > zone.cMax ? c - zone.cMax : 0;
                const d = Math.max(dr, dc);
                if (d < best) { best = d; if (!best) return 0; }
            }
        }
        return best;
    }
    // Houses whose flora threatens us; an escorted convoy is allied, not hostile.
    hostiles(state) {
        const ally = this.mission.objective.type === 'escort' ? this.mission.objective.owner : null;
        return Array.from({length: state.playerCount - 1}, (_, i) => i + 2).filter(owner => owner !== ally);
    }
    // Own cells of a zone as a compact key, to recognise oscillation.
    zoneKey(state, zone) {
        const cells = [];
        for (let r = zone.rMin; r <= zone.rMax; r++) for (let c = zone.cMin; c <= zone.cMax; c++) if (state.grid.getOwner(r, c) === 1) cells.push(r * 1000 + c);
        return cells.join(',');
    }
    // Zones whose approach is dangerous: own habitat, protected and sterile zones, and switches that must still wait.
    watchList(state) {
        const o = this.mission.objective, hostiles = this.hostiles(state), list = [];
        const camp = state.territory.camps.find(c => c.id === 0);
        if (camp && hostiles.length) list.push({ id: 'camp', label: 'HABITAT', zone: camp, owners: hostiles, kind: 'camp' });
        (o.protect || []).forEach(id => list.push({ id, label: this.zone(id).label, zone: this.zone(id), owners: [...hostiles, CONSTANTS.OWNER_NEUTRAL], kind: 'protect' }));
        (o.sterile || []).forEach(id => list.push({ id, label: this.zone(id).label, zone: this.zone(id), owners: [1, 2, 3, 4, CONSTANTS.OWNER_NEUTRAL], kind: 'sterile' }));
        if (o.type === 'orderedZones') o.zones.slice(this.collected.size + 1).forEach(id => list.push({ id, label: this.zone(id).label, zone: this.zone(id), owners: [1], kind: 'locked' }));
        return list;
    }
    updateThreats(state) {
        const rank = { calm: 0, warning: 1, alarm: 2 }, watched = new Set();
        for (const w of this.watchList(state)) {
            watched.add(w.id);
            const distance = this.distanceToZone(state, w.zone, w.owners);
            const level = distance <= THREAT_ALARM ? 'alarm' : distance <= THREAT_WARNING ? 'warning' : 'calm';
            const previous = this.threats.get(w.id), announced = { ...(previous?.announced || {}) };
            // Escalations are announced once; flicker at a threshold stays quiet for twelve generations.
            if (rank[level] > rank[previous?.level || 'calm'] && !(this.generations - (announced[level] ?? -Infinity) <= 12)) {
                this.emit({ type: 'threat', level, zoneId: w.id, label: w.label, kind: w.kind, distance, generation: this.generations });
                announced[level] = this.generations;
            }
            this.threats.set(w.id, { level, distance, label: w.label, kind: w.kind, announced });
            this.closestBy.set(w.id, Math.min(this.closestBy.get(w.id) ?? Infinity, distance));
        }
        // Switches become safe once they are next in line.
        for (const id of [...this.threats.keys()]) if (!watched.has(id)) this.threats.delete(id);
    }
    worstThreat() {
        let worst = null;
        for (const [id, t] of this.threats) if (t.level !== 'calm' && (!worst || t.distance < worst.distance)) worst = { id, ...t };
        return worst;
    }
    zoneStatus(id) {
        const o = this.mission.objective, targets = o.zones || [];
        const status = { state: 'open', progress: null, threat: this.threats.get(id)?.level || 'calm', distance: this.threats.get(id)?.distance ?? Infinity };
        if (o.sterile?.includes(id)) status.state = 'sterile';
        else if (o.protect?.includes(id)) status.state = 'protect';
        const zone = this.zone(id);
        if (zone?.cache) { status.state = this.caches.has(id) ? 'done' : 'cache'; return status; }
        if (!targets.includes(id) && o.zone !== id) return status;
        if (o.type === 'clearZones' && this.cleared.has(id)) status.state = 'done';
        if (o.type === 'oscillate') { status.progress = Math.min(1, this.beacon / o.value); status.progressLabel = `${Math.min(this.beacon, o.value)}/${o.value}`; }
        if (o.type === 'orderedZones') status.state = this.collected.has(id) ? 'done' : targets.indexOf(id) === this.collected.size ? 'next' : 'locked';
        if (['collectZones', 'captureCamps'].includes(o.type) && this.collected.has(id)) status.state = 'done';
        if (['territoryZones', 'territoryZone'].includes(o.type) && this.supplied.has(id)) status.state = 'done';
        if (['holdZones', 'allZones'].includes(o.type) && this.occupied.has(id)) status.state = 'active';
        if (o.type === 'holdZones') { status.progress = Math.min(1, this.hold / o.value); status.progressLabel = `${Math.min(this.hold, o.value)}/${o.value}`; }
        if (o.type === 'captureCamps' && !this.collected.has(id)) { const ticks = this.captureTicks.get(id) || 0; status.progress = Math.min(1, ticks / o.hold); status.progressLabel = `${Math.min(ticks, o.hold)}/${o.hold}`; }
        return status;
    }
    // Remaining generations of the current deadline, or null when the objective has none.
    countdown() {
        const o = this.mission.objective, g = this.generations;
        if (o.type === 'evacuate') return { label: 'Evakuierung in', remaining: Math.max(0, o.value - g) };
        if (o.type === 'survive') return { label: 'Überleben noch', remaining: Math.max(0, o.value - this.streak) };
        if (o.type === 'pulse') return g < o.aliveAt ? { label: 'Lebensnachweis in', remaining: o.aliveAt - g } : g < o.emptyAfter ? { label: 'Kammer leer ab', remaining: o.emptyAfter - g } : { label: 'Testende in', remaining: Math.max(0, this.mission.steps - g) };
        if (o.type === 'holdZones' && this.hold > 0) return { label: 'Halten noch', remaining: Math.max(0, o.value - this.hold) };
        if (o.type === 'captureCamps' && o.minGenerations > g) return { label: 'Rückweg schützen noch', remaining: o.minGenerations - g };
        if (o.type === 'exactCount' && g < o.at) return { label: 'Messung in', remaining: o.at - g };
        if (o.type === 'oscillate' && this.beacon > 0) return { label: 'Takt halten noch', remaining: Math.max(0, o.value - this.beacon) };
        if (o.type === 'race' && this.raceArrival > g) return { label: 'Hellas am Ziel in ca.', remaining: this.raceArrival - g };
        return null;
    }
    ownerName(owner) {
        if (owner === 1) return 'Eigene Flora';
        if (owner === CONSTANTS.OWNER_NEUTRAL) return 'Wildwuchs';
        return `Flora von ${CONSTANTS.PLAYER_COLORS[owner - 1]?.name || 'unbekannter Herkunft'}`;
    }
    evaluate(state, event) {
        if (this.result) return true;
        const o = this.mission.objective;
        let population = 0, foreign = 0;
        for (const v of state.grid.owners) { if (v === 1) population++; else if (v > 1 || v === CONSTANTS.OWNER_NEUTRAL) foreign++; }
        this.maxPopulation = Math.max(this.maxPopulation, population);
        if (event === 'generation') {
            this.generations++;
            this.streak = population > 0 ? this.streak + 1 : 0;
            this.bestStreak = Math.max(this.bestStreak, this.streak);
            if (population > 0) this.lastAlive = this.generations;
            this.sample(population, foreign);
            // Supply caches: first contact of own living flora pays out at the start of the next round.
            for (const z of this.mission.map.zones) if (z.cache && !this.caches.has(z.id) && this.inZone(state, z, 1)) {
                this.caches.add(z.id); this.pendingMaterial += z.cache;
                this.emit({ type: 'cache', zoneId: z.id, label: z.label, amount: z.cache, generation: this.generations });
            }
        }
        const zone = this.zone(o.zone);
        const hostiles = this.hostiles(state);
        const ownCamp = state.territory.camps.find(c => c.id === 0 && hostiles.some(owner => this.inZone(state, c, owner)));
        const lostCamp = !!ownCamp;
        const protectedBreach = (o.protect || []).map(id => this.zone(id)).find(z => [...hostiles, CONSTANTS.OWNER_NEUTRAL].some(owner => this.inZone(state, z, owner)));
        const sterileBreach = (o.sterile || []).map(id => this.zone(id)).find(z => [1,2,3,4,CONSTANTS.OWNER_NEUTRAL].some(owner => this.inZone(state,z,owner)));
        const lostProtected = !!protectedBreach, lostSterile = !!sterileBreach;
        let wrongOrder = false, wrongZone = null;
        const lostRace = o.type === 'race' && this.inZone(state, zone, 2);
        let won = false;
        if (o.type === 'survive') { won = this.streak >= o.value; this.progressText = `${Math.min(this.streak, o.value)} / ${o.value} Generationen überlebt`; }
        if (o.type === 'reachZone' || o.type === 'race') {
            won = this.inZone(state, zone, 1);
            const own = this.distanceToZone(state, zone, [1], Infinity);
            this.closestToTarget = Math.min(this.closestToTarget, own);
            this.currentTargetDistance = own;
            const rival = o.type === 'race' ? this.distanceToZone(state, zone, [2], Infinity) : Infinity;
            this.progressText = `${Number.isFinite(own) ? `Eigene Flora: ${own} Felder bis ${zone.label}` : 'Keine eigene Flora unterwegs'}${Number.isFinite(rival) ? ` · Hellas: ${rival} Felder` : ''}`;
        }
        if (o.type === 'territoryZone') {
            if (event === 'round' && this.inZone(state, zone, 0, true)) this.supplied.add(zone.id);
            if (event === 'round') won = this.inZone(state, zone, 0, true);
            this.progressText = this.supplied.has(zone.id) ? `${zone.label} versorgt` : `${zone.label} noch ohne Einflussgebiet`;
        }
        const targets = (o.zones || []).map(id => this.zone(id));
        if (o.type === 'territoryZones' && event === 'round') {
            this.supplied = new Set(targets.filter(z => this.inZone(state, z, 0, true)).map(z => z.id));
            won = targets.every(z => this.supplied.has(z.id));
        }
        if (o.type === 'orderedZones') {
            const next = targets[this.collected.size];
            wrongZone = targets.slice(this.collected.size + 1).find(z => this.inZone(state,z,1)) || null;
            wrongOrder = !!wrongZone;
            if (!wrongOrder && next && this.inZone(state,next,1)) { this.collected.add(next.id); this.emit({ type: 'switch', zoneId: next.id, label: next.label, generation: this.generations }); }
            this.progressText = `${this.collected.size} / ${targets.length} Schalter in Reihenfolge`;
            won = this.collected.size === targets.length;
        }
        if (o.type === 'pulse') {
            if (event === 'generation' && this.generations === o.aliveAt) this.pulseAlive = population > 0;
            won = this.pulseAlive === true && this.generations >= o.emptyAfter && population === 0;
            this.progressText = this.generations < o.aliveAt ? `Leben bis Generation ${o.aliveAt} erhalten` : `${this.pulseAlive ? 'Lebensnachweis erbracht' : 'Lebensnachweis verfehlt'} · Kammer leeren bis ${this.mission.steps}`;
        }
        if (o.type === 'allZones' || o.type === 'holdZones') this.occupied = new Set(targets.filter(z => this.inZone(state, z, 1)).map(z => z.id));
        if (o.type === 'allZones') {
            const reached = this.occupied.size;
            this.bestSimultaneous = Math.max(this.bestSimultaneous, reached);
            this.progressText = `${reached} / ${targets.length} Schleusen gleichzeitig besetzt`;
            won = reached === targets.length;
        }
        if (o.type === 'collectZones') {
            targets.forEach(z => { if (!this.collected.has(z.id) && this.inZone(state, z, 1)) { this.collected.add(z.id); this.emit({ type: 'collect', zoneId: z.id, label: z.label, generation: this.generations }); } });
            this.progressText = `${this.collected.size} / ${targets.length} Archive gesichert`;
            won = this.collected.size === targets.length;
        }
        if (o.type === 'holdZones') {
            if (event === 'generation') {
                const held = this.occupied.size === targets.length;
                if (!held && this.hold >= 3) this.emit({ type: 'holdLost', held: this.hold, generation: this.generations });
                this.hold = held ? this.hold + 1 : 0;
                this.bestHold = Math.max(this.bestHold, this.hold);
                if (!this.halfAnnounced && this.hold >= Math.ceil(o.value / 2)) { this.halfAnnounced = true; this.emit({ type: 'holdHalf', generation: this.generations }); }
            }
            this.progressText = `${this.hold} / ${o.value} Generationen alle ${targets.length} Ziele besetzt`;
            won = this.hold >= o.value;
        }
        if (o.type === 'evacuate') {
            this.progressText = `${Math.min(this.generations, o.value)} / ${o.value} Generationen bis zur Evakuierung`;
            won = this.generations >= o.value && population > 0;
        }
        if (o.type === 'territoryZones') this.progressText = `${targets.filter(z => this.inZone(state, z, 0, true)).length} / ${targets.length} Pumpen versorgt`;
        if (o.type === 'captureCamps') {
            if (event === 'generation') for (const target of targets) {
                if (this.collected.has(target.id)) continue;
                let own=0, other=0;
                for(let r=target.rMin;r<=target.rMax;r++)for(let c=target.cMin;c<=target.cMax;c++){ const owner=state.grid.getOwner(r,c); if(owner===1)own++; else if(hostiles.includes(owner)||owner===CONSTANTS.OWNER_NEUTRAL)other++; }
                const hasMajority = own >= 3 && own > other;
                const previous = this.captureTicks.get(target.id) || 0;
                const ticks = hasMajority ? previous + 1 : 0;
                if (!hasMajority && previous >= Math.ceil(o.hold / 2)) this.emit({ type: 'captureLost', zoneId: target.id, label: target.label, generation: this.generations });
                this.captureTicks.set(target.id,ticks);
                this.bestCapture = Math.max(this.bestCapture, ticks);
                if (ticks >= o.hold) { this.collected.add(target.id); this.emit({ type: 'captured', zoneId: target.id, label: target.label, generation: this.generations }); }
            }
            for (const enemy of this.mission.enemies || []) {
                const bases = targets.filter(z => z.house === enemy.house);
                if (bases.length && bases.every(z => this.collected.has(z.id))) {
                    state.defeatedPlayers.add(enemy.house); state.budgets[enemy.house] = 0;
                    if (!this.defeatedSeen.has(enemy.house)) { this.defeatedSeen.add(enemy.house); this.emit({ type: 'houseDefeated', house: enemy.house, generation: this.generations }); }
                }
            }
            this.progressText = `${this.collected.size} / ${targets.length} Camps erobert`;
            if (this.collected.size === targets.length && this.generations < (o.minGenerations || 0)) this.progressText = `Camps gesichert · ${o.minGenerations-this.generations} Generationen Rückweg schützen`;
            won = this.collected.size === targets.length && this.generations >= (o.minGenerations || 0) && population > 0;
        }
        let lostObjective = null;
        if (o.type === 'clearZones') {
            const owners = o.owners || [CONSTANTS.OWNER_NEUTRAL];
            this.cleared = new Set(targets.filter(z => !owners.some(owner => this.inZone(state, z, owner))).map(z => z.id));
            this.bestCleared = Math.max(this.bestCleared, this.cleared.size);
            this.progressText = `${this.cleared.size} / ${targets.length} Herde beseitigt`;
            won = this.cleared.size === targets.length;
        }
        if (o.type === 'oscillate') {
            if (event === 'generation') {
                this.zoneHistory = [...this.zoneHistory, this.zoneKey(state, zone)].slice(-3);
                const [before, last, now] = this.zoneHistory;
                const beating = this.zoneHistory.length === 3 && now !== '' && now === before && now !== last;
                if (!beating && this.beacon >= 3) this.emit({ type: 'holdLost', held: this.beacon, generation: this.generations });
                this.beacon = beating ? this.beacon + 1 : 0;
                this.bestBeacon = Math.max(this.bestBeacon, this.beacon);
                if (!this.halfAnnounced && this.beacon >= Math.ceil(o.value / 2)) { this.halfAnnounced = true; this.emit({ type: 'holdHalf', generation: this.generations }); }
            }
            this.progressText = `${this.beacon} / ${o.value} Generationen Leuchtfeuer im Takt`;
            won = this.beacon >= o.value;
        }
        if (o.type === 'escort') {
            let convoy = 0;
            for (const v of state.grid.owners) if (v === o.owner) convoy++;
            const distance = this.distanceToZone(state, zone, [o.owner], Infinity);
            this.closestToTarget = Math.min(this.closestToTarget, distance); this.currentTargetDistance = distance;
            won = this.inZone(state, zone, o.owner);
            if (!convoy) lostObjective = 'Der Geleitzug wurde zerstört.';
            this.progressText = convoy ? `Geleitzug: ${distance} Felder bis ${zone.label}` : 'Geleitzug verloren';
        }
        if (o.type === 'exactCount') {
            let count = 0;
            for (let r = zone.rMin; r <= zone.rMax; r++) for (let c = zone.cMin; c <= zone.cMax; c++) if (state.grid.getOwner(r, c) === 1) count++;
            this.progressText = `${count} / ${o.value} eigene Zellen in ${zone.label} · Messung bei Generation ${o.at}`;
            if (event === 'generation' && this.generations === o.at) {
                this.measured = count;
                if (count === o.value) won = true; else lostObjective = 'Die Kalibrierung wurde verfehlt.';
            }
        }
        if (event === 'generation' || event === 'round') this.updateThreats(state);
        const expired = event === 'round' && state.currentRound >= state.maxRounds;
        if (!lostCamp && !lostRace && !lostProtected && !lostSterile && !wrongOrder && !lostObjective && !won && !expired) return false;
        const success = won && !lostCamp && !lostRace && !lostProtected && !lostSterile && !wrongOrder && !lostObjective;
        const bonuses = this.mission.bonuses.map(b => success && this.bonusMet(b, state));
        this.result = { success, stars: success ? 1 + bonuses.filter(Boolean).length : 0, bonuses, stats: { spent: this.spent, generations: this.generations, rounds: state.currentRound },
            reason: wrongOrder ? 'Die Schalter wurden in falscher Reihenfolge berührt.' : lostObjective ? lostObjective : lostSterile ? 'Die Quarantäne wurde durch lebende Flora verletzt.' : lostProtected ? 'Fremde Flora hat die geschützte Zone erreicht.' : lostCamp ? 'Unser Habitat wurde überwuchert.' : lostRace ? 'Hellas hat das Wasser zuerst erreicht.' : !success ? 'Das Zeitfenster ist geschlossen.' : this.mission.debriefing };
        if (!success) {
            const breach = wrongOrder ? { zone: wrongZone, owners: [1] } : lostSterile ? { zone: sterileBreach, owners: [1,2,3,4,CONSTANTS.OWNER_NEUTRAL] } : lostProtected ? { zone: protectedBreach, owners: [...hostiles, CONSTANTS.OWNER_NEUTRAL] } : lostCamp ? { zone: ownCamp, owners: hostiles, label: 'HABITAT' } : lostRace ? { zone, owners: [2] } : null;
            const cells = breach ? this.cellsInZone(state, breach.zone, breach.owners) : [];
            this.result.failure = breach ? { zoneId: breach.zone.id ?? 'camp', label: breach.label || breach.zone.label, cells, generation: this.generations } : { zoneId: null, label: null, cells: [], generation: this.generations };
            this.result.details = [breach && cells.length ? `Generation ${this.generations}: ${this.ownerName(cells[0].owner)} erreichte ${this.result.failure.label}.` : lostObjective ? `Generation ${this.generations}: ${lostObjective}` : null, this.nearMiss()].filter(Boolean);
        } else this.result.details = [];
        state.winner = success ? 0 : 1;
        return true;
    }
    closestMargin(zoneIds) {
        let closest = Infinity;
        for (const [id, d] of this.closestBy) if (!zoneIds || zoneIds.includes(id)) closest = Math.min(closest, d);
        return closest;
    }
    // A short statement of how close the attempt came, phrased per objective type.
    nearMiss() {
        const o = this.mission.objective, n = (o.zones || []).length;
        switch (o.type) {
            case 'survive': return `Längste Überlebensdauer: ${this.bestStreak} / ${o.value} Generationen.`;
            case 'reachZone': case 'race': return Number.isFinite(this.closestToTarget) ? `Geringster Abstand eigener Flora zum Ziel: ${this.closestToTarget} Felder.` : 'Keine eigene Flora hat sich dem Ziel genähert.';
            case 'territoryZone': return 'Das Ziel lag am Rundenende noch außerhalb des Einflussgebiets.';
            case 'territoryZones': return `${this.supplied.size} / ${n} Anschlüsse am Rundenende versorgt.`;
            case 'allZones': return `Höchstens ${this.bestSimultaneous} / ${n} Ziele gleichzeitig besetzt.`;
            case 'collectZones': return `${this.collected.size} / ${n} Ziele gesichert.`;
            case 'orderedZones': return `${this.collected.size} / ${n} Schalter in Reihenfolge geöffnet.`;
            case 'holdZones': return `Bester Haltewert: ${this.bestHold} / ${o.value} Generationen.`;
            case 'evacuate': return `Durchgehalten bis Generation ${Math.min(this.generations, o.value)} von ${o.value}.`;
            case 'pulse': return `Lebensnachweis bei Generation ${o.aliveAt}: ${this.pulseAlive ? 'erbracht' : 'verfehlt'}. Letzte eigene Zelle lebte bis Generation ${this.lastAlive}.`;
            case 'clearZones': return `Höchstens ${this.bestCleared} / ${n} Herde gleichzeitig beseitigt.`;
            case 'oscillate': return `Längster gleichmäßiger Takt: ${this.bestBeacon} / ${o.value} Generationen.`;
            case 'escort': return Number.isFinite(this.closestToTarget) ? `Der Geleitzug kam bis auf ${this.closestToTarget} Felder an das Ziel heran.` : null;
            case 'exactCount': return `Gemessen: ${this.measured ?? 'keine Messung'} statt ${o.value} eigener Zellen.`;
            case 'captureCamps': return `${this.collected.size} / ${n} Camps erobert${this.collected.size < n ? ` · beste Eroberung ${Math.min(this.bestCapture, o.hold)} / ${o.hold} Generationen gehalten` : ''}.`;
            default: return null;
        }
    }
}
