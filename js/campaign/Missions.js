// Coordinates use inclusive [row, column] rectangles. No random terrain in scenarios.
const CAMPAIGN_MISSIONS = [
    {
        id: 'A1_M01', ambience: 'ambient', title: 'Erstes Leben', region: 'Chryse Planitia', kind: 'Überleben', point: [57, 34],
        quote: 'Wir bringen Leben.',
        briefing: 'Command an Ares-1. Telemetrie stabil. Unter uns liegt ein Planet ohne Frühling. Beginnen Sie mit einer Kolonie, die zwölf Generationen übersteht.',
        hint: 'Setze einzelne Zellen im cyanfarbenen Landefeld. Eine Zelle überlebt mit zwei oder drei Nachbarn; diagonale Nachbarn zählen mit. Auf einem freien Feld mit genau drei Nachbarn entsteht neues Leben. Welche Anordnung hält sich gegenseitig am Leben? Starte dann die Evolution.',
        debriefing: 'Vier Zellen. Zwölf Generationen. Zum ersten Mal ist der rote Boden ein Zuhause. Im Norden antwortet eine alte Forschungsboje.',
        patterns: ['cell'], reward: 'block', rounds: 3, steps: 12, budget: 12, evolutionDelayMs: 800, resultHoldMs: 1000,
        objective: { type: 'survive', value: 12, label: 'Eine Kolonie 12 Generationen am Leben halten' },
        bonuses: [{ type: 'rounds', value: 1, label: 'In der ersten Runde abschließen' }, { type: 'spent', value: 4, label: 'Höchstens 4 Genmaterial einsetzen' }],
        map: { territory: [[0, 5, 5, 15, 19]], rocks: [[2, 25, 6, 27], [20, 7, 22, 20]], zones: [] }
    },
    {
        id: 'A1_M02', ambience: 'research', title: 'Die erste Wurzel', region: 'Chryse · Forschungsplateau', kind: 'Expansion', point: [64, 43],
        quote: 'Jede Wurzel ist ein Anspruch.',
        briefing: 'Die Forschungsboje schweigt seit 38 Jahren. Verbinden Sie ihren Standort mit unserem Einflussgebiet. Lebende Kolonien erschließen Boden; Boden finanziert die nächste Aussaat.',
        hint: 'Setze einen Block am rechten Rand des Startgebiets. Nach der Evolution reichen seine Wurzeln fünf Felder weit. Setze in der nächsten Runde einen weiteren Block weiter rechts bis zur gelben Station.',
        debriefing: 'Die Boje erwacht. Ihr Zeitstempel liegt vor unserer ersten Landung. Eine Datei ist erhalten: PROJECT REDROOTS. Der Absender wurde gelöscht.',
        patterns: ['cell', 'block'], reward: 'glider', additionalRewards: ['blinker'], rounds: 5, steps: 12, budget: 16,
        objective: { type: 'territoryZone', zone: 'station', label: 'Die Forschungsstation mit Einflussgebiet erreichen' },
        bonuses: [{ type: 'rounds', value: 2, label: 'In höchstens 2 Runden abschließen' }, { type: 'spent', value: 8, label: 'Höchstens 8 Genmaterial einsetzen' }],
        map: { territory: [[0, 7, 4, 17, 13]], rocks: [[2, 24, 5, 35], [21, 18, 23, 31]], zones: [{ id: 'station', label: 'FORSCHUNG', rMin: 10, rMax: 14, cMin: 21, cMax: 23 }] }
    },
    {
        id: 'A1_M03', ambience: 'canyon', title: 'Der Pass', region: 'Valles Marineris', kind: 'Conway-Rätsel', point: [45, 55],
        quote: 'Leben hat eine Richtung.',
        briefing: 'Eine Felswand trennt uns vom nächsten Tal. Das neue Genom bleibt nicht an seinem Ursprungsort: Nach vier Generationen hat sich ein Gleiter um ein Feld diagonal versetzt.',
        hint: 'Ein ungedrehter Gleiter fliegt nach rechts unten. Starte ungefähr bei Zeile 7, Spalte 9 (Zählung ab 1). Die gelbe Öffnung liegt auf seiner Flugbahn. Rechtsklick oder R dreht das Muster.',
        debriefing: 'Die Kolonie durchquert den Pass. Doch im Tal sehen wir dieselbe Formation. Niemand aus unserer Expedition hat sie dort ausgesät.',
        patterns: ['cell', 'block', 'blinker', 'glider'], reward: 'r_pentomino', rounds: 4, steps: 64, budget: 15,
        objective: { type: 'reachZone', zone: 'pass', label: 'Lebende Flora hinter die Felswand bringen' },
        bonuses: [{ type: 'rounds', value: 1, label: 'In der ersten Runde abschließen' }, { type: 'spent', value: 5, label: 'Mit einem einzigen Gleiter lösen (5 Material)' }],
        map: { territory: [[0, 3, 3, 11, 14]], rocks: [[0, 20, 14, 21], [22, 20, 29, 21]], zones: [{ id: 'pass', label: 'DURCHBRUCH', rMin: 18, rMax: 25, cMin: 24, cMax: 29 }] }
    },
    {
        id: 'A1_M04', ambience: 'ice', title: 'Erster Kontakt', region: 'Valles · Eiskammer', kind: 'Wettrennen', point: [38, 65],
        quote: 'Commander … das Signal stammt nicht von uns.',
        briefing: 'Haus Hellas hat das Eis ebenfalls entdeckt. Ein feindlicher Gleiter ist bereits unterwegs. Erreichen Sie das Reservoir zuerst. Bei gleichzeitiger Ankunft gilt der Sektor als verloren.',
        hint: 'Das Eis liegt diagonal rechts unter deiner Landezone. Ein Gleiter bei Zeile 11, Spalte 15 erreicht es schnell. Der pinke Gleiter ist real: Seine Flugbahn entscheidet das Rennen.',
        debriefing: 'Wasser gesichert. Hellas sendet keine Drohung, sondern eine Warnung: „Die Pflanzen im Süden gehören keinem Haus.“',
        patterns: ['cell', 'block', 'blinker', 'glider', 'r_pentomino'], reward: 'acorn', rounds: 3, steps: 64, budget: 20,
        objective: { type: 'race', zone: 'water', label: 'Das Wasserreservoir vor Hellas erreichen' },
        bonuses: [{ type: 'rounds', value: 1, label: 'In der ersten Runde abschließen' }, { type: 'spent', value: 10, label: 'Höchstens 10 Genmaterial einsetzen' }],
        map: { territory: [[0, 5, 6, 13, 17]], rocks: [[1, 26, 4, 34], [25, 4, 27, 15]], seeds: [{ pattern: 'glider', r: 1, c: 43, owner: 2, mirror: true }], zones: [{ id: 'water', label: 'WASSEREIS', rMin: 18, rMax: 23, cMin: 23, cMax: 28 }] }
    },
    {
        id: 'A1_M05', ambience: 'outpost', title: 'Die rote Grenze', region: 'Valles · Hellas-Außenposten', kind: 'Invasion', point: [52, 74],
        quote: 'Ein Garten. Zwei Flaggen.',
        briefing: 'Hellas versperrt den Ausgang aus dem Tal. Überwuchern Sie ihren Außenposten, bevor unser Habitat fällt. Hinter der östlichen Wand pulsiert Flora ohne Kennung. Sie war vor uns hier.',
        hint: 'Ein Gleiter bei Zeile 9, Spalte 11 fliegt direkt zum Hellas-Camp. Sichere zusätzlich dein Habitat mit stabilen Kolonien. Hellas erhält jede Runde frisches Material und setzt eigene Muster.',
        debriefing: 'Der Sektor gehört Marineris. Im Archiv des Außenpostens finden wir unsere eigene Genomsequenz – datiert auf vierzig Jahre vor ihrer Erfindung. Ende von Akt I. Das Signal wartet.',
        patterns: ['cell', 'block', 'blinker', 'glider', 'r_pentomino', 'acorn'], reward: 'lwss', rounds: 5, steps: 64, budget: 25, enemy: true,
        objective: { type: 'reachZone', zone: 'enemy', label: 'Den Außenposten von Hellas überwuchern' },
        bonuses: [{ type: 'rounds', value: 2, label: 'In höchstens 2 Runden abschließen' }, { type: 'spent', value: 15, label: 'Höchstens 15 Genmaterial einsetzen' }],
        map: { territory: [[0, 4, 4, 13, 16], [1, 20, 24, 27, 33]], rocks: [[0, 36, 23, 37]], camps: [{ id: 0, rMin: 4, rMax: 6, cMin: 4, cMax: 7 }, { id: 1, rMin: 22, rMax: 26, cMin: 24, cMax: 29 }], seeds: [{ pattern: 'r_pentomino', r: 12, c: 41, owner: -1 }], zones: [{ id: 'enemy', label: 'HELLAS', rMin: 22, rMax: 26, cMin: 24, cMax: 29 }] }
    }
];

class MissionManager {
    static config(mission) {
        return { rows: mission.map.rows || 30, cols: mission.map.cols || 48, rounds: mission.rounds, steps: mission.steps, playerCount: 2,
            humanFlags: [true, false], radius: mission.radius || 5, budgetFactor: mission.budgetFactor || 25, rocks: 0, collisionRule: 'majority', scenario: mission };
    }
    static apply(state, mission) {
        state.scenario = mission;
        state.territory.territoryMap = state.territory.createEmptyMap();
        state.territory.camps = mission.map.camps || [{ id: 0, rMin: 7, rMax: 9, cMin: 5, cMax: 7 }];
        const rect = (a, fn) => { for (let r = a[0]; r <= a[2]; r++) for (let c = a[1]; c <= a[3]; c++) fn(r, c); };
        mission.map.territory.forEach(([owner, ...a]) => rect(a, (r, c) => state.territory.territoryMap[r][c] = owner));
        mission.map.rocks.forEach(a => rect(a, (r, c) => state.grid.setCell(r, c, CONSTANTS.OWNER_ROCK, true)));
        (mission.map.seeds || []).forEach(s => CONSTANTS.PATTERNS[s.pattern].pattern.forEach(([r, c]) => state.grid.setCell(s.r + r, s.c + (s.mirror ? -c : c), s.owner, true)));
        state.budgets = [mission.budget, mission.enemy ? (mission.enemyBudget ?? 8) : 0];
        state.playerStrengths[1] = mission.enemyStrength || 'easy';
        state.objectiveSystem = new ObjectiveSystem(mission);
    }
}
