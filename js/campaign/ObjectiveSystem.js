// Mission outcomes are evaluated independently of the skirmish camp victory rule.
class ObjectiveSystem {
    constructor(mission) { this.mission = mission; this.generations = 0; this.streak = 0; this.spent = 0; this.result = null; this.collected = new Set(); this.hold = 0; this.progressText = ''; }
    inZone(state, zone, owner, territory = false) {
        for (let r = zone.rMin; r <= zone.rMax; r++) for (let c = zone.cMin; c <= zone.cMax; c++) {
            if ((territory ? state.territory.getOwnerAt(r, c) : state.grid.getOwner(r, c)) === owner) return true;
        }
        return false;
    }
    evaluate(state, event) {
        if (this.result) return true;
        const o = this.mission.objective;
        if (event === 'generation') {
            this.generations++;
            this.streak = state.grid.owners.some(v => v === 1) ? this.streak + 1 : 0;
        }
        const zone = this.mission.map.zones.find(z => z.id === o.zone);
        const lostCamp = state.territory.camps.some(c => c.id === 0 && this.inZone(state, c, 2));
        const lostProtected = (o.protect || []).some(id => {
            const z = this.mission.map.zones.find(zone => zone.id === id);
            return this.inZone(state, z, 2) || this.inZone(state, z, CONSTANTS.OWNER_NEUTRAL);
        });
        const lostSterile = (o.sterile || []).some(id => { const z = this.mission.map.zones.find(z => z.id === id); return [1,2,3,4,CONSTANTS.OWNER_NEUTRAL].some(owner => this.inZone(state,z,owner)); });
        let wrongOrder = false;
        const lostRace = o.type === 'race' && this.inZone(state, zone, 2);
        let won = false;
        if (o.type === 'survive') won = this.streak >= o.value;
        if (o.type === 'reachZone' || o.type === 'race') won = this.inZone(state, zone, 1);
        if (o.type === 'territoryZone' && event === 'round') won = this.inZone(state, zone, 0, true);
        const targets = (o.zones || []).map(id => this.mission.map.zones.find(z => z.id === id));
        if (o.type === 'territoryZones' && event === 'round') won = targets.every(z => this.inZone(state, z, 0, true));
        if (o.type === 'orderedZones') {
            const next = targets[this.collected.size];
            wrongOrder = targets.slice(this.collected.size + 1).some(z => this.inZone(state,z,1));
            if (!wrongOrder && next && this.inZone(state,next,1)) this.collected.add(next.id);
            this.progressText = `${this.collected.size} / ${targets.length} Schalter in Reihenfolge`;
            won = this.collected.size === targets.length;
        }
        if (o.type === 'pulse') {
            if (event === 'generation' && this.generations === o.aliveAt) this.pulseAlive = state.grid.owners.some(v => v === 1);
            won = this.pulseAlive === true && this.generations >= o.emptyAfter && !state.grid.owners.some(v => v === 1);
            this.progressText = this.generations < o.aliveAt ? `Leben bis Generation ${o.aliveAt} erhalten` : `${this.pulseAlive ? 'Lebensnachweis erbracht' : 'Lebensnachweis verfehlt'} · Kammer leeren bis ${this.mission.steps}`;
        }
        if (o.type === 'allZones') {
            const reached = targets.filter(z => this.inZone(state, z, 1)).length;
            this.progressText = `${reached} / ${targets.length} Schleusen gleichzeitig besetzt`;
            won = reached === targets.length;
        }
        if (o.type === 'collectZones') {
            targets.forEach(z => { if (this.inZone(state, z, 1)) this.collected.add(z.id); });
            this.progressText = `${this.collected.size} / ${targets.length} Archive gesichert`;
            won = this.collected.size === targets.length;
        }
        if (o.type === 'holdZones') {
            if (event === 'generation') this.hold = targets.every(z => this.inZone(state, z, 1)) ? this.hold + 1 : 0;
            this.progressText = `${this.hold} / ${o.value} Generationen alle ${targets.length} Ziele besetzt`;
            won = this.hold >= o.value;
        }
        if (o.type === 'evacuate') {
            this.progressText = `${Math.min(this.generations, o.value)} / ${o.value} Generationen bis zur Evakuierung`;
            won = this.generations >= o.value && state.grid.owners.some(v => v === 1);
        }
        if (o.type === 'territoryZones') this.progressText = `${targets.filter(z => this.inZone(state, z, 0, true)).length} / ${targets.length} Pumpen versorgt`;
        const expired = event === 'round' && state.currentRound >= state.maxRounds;
        if (!lostCamp && !lostRace && !lostProtected && !lostSterile && !wrongOrder && !won && !expired) return false;
        const success = won && !lostCamp && !lostRace && !lostProtected && !lostSterile && !wrongOrder;
        const bonuses = this.mission.bonuses.map(b => success && (b.type === 'rounds' ? state.currentRound <= b.value : b.type === 'generations' ? this.generations <= b.value : this.spent <= b.value));
        this.result = { success, stars: success ? 1 + bonuses.filter(Boolean).length : 0, bonuses,
            reason: wrongOrder ? 'Die Schalter wurden in falscher Reihenfolge berührt.' : lostSterile ? 'Die Quarantäne wurde durch lebende Flora verletzt.' : lostProtected ? 'Fremde Flora hat die geschützte Zone erreicht.' : lostCamp ? 'Unser Habitat wurde überwuchert.' : lostRace ? 'Hellas hat das Wasser zuerst erreicht.' : !success ? 'Das Zeitfenster ist geschlossen.' : this.mission.debriefing };
        state.winner = success ? 0 : 1;
        return true;
    }
}
