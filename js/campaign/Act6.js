// Act VI turns from conflict to care: holding a rhythm, clearing cleanly, drawing hedges and measuring exactly.
// It uses the declarative objectives oscillate, escort, clearZones and exactCount; the finale combines them.
const ACT6_PATTERNS = ['cell', 'block', 'blinker', 'glider', 'lwss'];
CAMPAIGN_ACTS.push({
    id: 6, roman: 'VI', name: 'Der erste Frühling', headline: 'Nach dem Sturm kommt die Saat.', subtitle: 'Pflege, was nach dir wächst.',
    // The decision at the end of Act V echoes on the map of this act (text only, no tactical difference).
    choiceLine: {
        consortium: 'Euer Beschluss wirkt nach: Das Mars-Konsortium wacht gemeinsam über Wasserquoten, Wartung und Sperrkorridore.',
        open_genomes: 'Euer Beschluss wirkt nach: Die PALISADE-Archive sind frei, ein gemeinsamer Vertrag schützt die Grenzen der lokalen Genome.',
        none: 'Noch offen: Wem Wartung, Archive und Genome anvertraut werden, entscheidest du am Ende von Akt V.'
    }
});
// A raised bed: rocks on the north, south and east side, open towards the west.
const act6Bed = (r0, r1, c0, c1) => [[r0 - 1, c0 - 1, r0 - 1, c1 + 1], [r1 + 1, c0 - 1, r1 + 1, c1 + 1], [r0, c1 + 1, r1, c1 + 1]];
CAMPAIGN_MISSIONS.push(
    {
        id: 'A6_M01', act: 6, title: 'Leuchtfeuer im Eissturm', region: 'Planum Boreum · Rand der Polkappe', kind: 'Takt halten · Sturmwacht', point: [52, 22], ambience: 'ice', voice: 'UNSERE BIOLOGIN',
        quote: 'Ein Licht, das im Takt atmet, findet man auch im Sturm.',
        briefing: 'Zwei Marsjahre nach dem Beschluss der Häuser lässt der Nordfrühling die Polkappe schrumpfen. Doch die gemeinsame Eisexpedition ist im Sturm erblindet; Funk und Ortung schweigen. Unsere Flora leuchtet, wenn sie sich erneuert. Halte im markierten Feld achtzig Generationen lang eine Kolonie im Zweitakt. Wildwuchs aus alten Versuchsfeldern treibt heran.',
        debriefing: 'Die Raupen der Expedition folgen dem Takt und erreichen das Lager. Unter dem Eis wartet eine Station von PALISADE. Kesslers Team setzte hier Leuchtfeuer aus zwei Blöcken, Ecke an Ecke, als Wegweiser für Menschen. Dann meldet die Hellas-Kommandantin: Das erste Schmelzwasser fließt nach Süden. Ihr Wasserzug steht bereit.',
        hint: 'Zwei Blöcke, die sich nur an einer Ecke berühren, blinken im Zweitakt, etwa bei Zeile 27, Spalte 31 und Zeile 29, Spalte 33 (Zählung ab 1). Blöcke bei Zeile 21, Spalte 24 und Zeile 21, Spalte 39 stoppen die ersten Gleiter. Die Böe kommt waagerecht: Blöcke bei Zeile 28, Spalte 21 und Zeile 28, Spalte 43 fangen sie ab.',
        patterns: [...ACT6_PATTERNS, 'r_pentomino'], reward: 'beacon', rounds: 3, steps: 40, budget: 24, radius: 5, budgetFactor: 20,
        objective: { type: 'oscillate', zone: 'beacon', value: 80, protect: ['beacon'], label: 'Leuchtfeuer 80 Generationen im Zweitakt halten; Wildwuchs fernhalten' },
        bonuses: [{ type: 'margin', value: 6, zones: ['beacon'], label: 'Wildwuchs kommt dem Leuchtfeuer nie näher als 5 Felder' }, { type: 'onlyPatterns', patterns: ['block'], label: 'Nur Blöcke setzen – auch für das Leuchtfeuer' }],
        events: [{ id: 'gust', round: 2, announceRound: 1, text: 'Sturmböe: Zu Beginn von Runde 2 treiben zwei Wildwuchs-Raumschiffe waagerecht von Westen und Osten auf das Leuchtfeuer zu.', action: [{ type: 'seed', pattern: 'lwss', r: 26, c: 8, owner: -1, mirror: true }, { type: 'seed', pattern: 'lwss', r: 27, c: 52, owner: -1 }] }],
        map: {
            rows: 40, cols: 64, territory: [[0, 20, 16, 37, 47]], rocks: [[0, 22, 9, 23], [0, 40, 9, 41], [3, 2, 4, 6], [5, 57, 6, 61]], camps: [{ id: 0, rMin: 34, rMax: 37, cMin: 30, cMax: 33 }],
            seeds: [{ pattern: 'glider', r: 12, c: 16, owner: -1 }, { pattern: 'glider', r: 12, c: 47, owner: -1, mirror: true }],
            zones: [{ id: 'beacon', label: 'LEUCHTFEUER', rMin: 25, rMax: 30, cMin: 29, cMax: 34 }]
        }
    },
    {
        id: 'A6_M02', act: 6, title: 'Der Wasserzug', region: 'Vastitas Borealis · Schmelzkanal', kind: 'Geleitschutz', point: [44, 33], ambience: 'canyon', voice: 'DIE HELLAS-KOMMANDANTIN',
        quote: 'Diesmal tragen wir Wasser – und niemand muss darum kämpfen.',
        briefing: 'Die Hellas-Kommandantin führt den ersten Wasserzug selbst durch den Schmelzkanal; auf der Karte zieht er als rosa Raumschiff nach Osten. Drei erstarrte Wildwuchsnester liegen in der Fahrrinne, jedes würde ihn zerreißen. Räume sie mit sauberen Treffern, bevor er sie erreicht, und triff niemals den Zug. In Runde drei bricht Eis ab.',
        debriefing: 'Der Wasserzug erreicht das Speicherbecken, kein Tropfen geht verloren. Zum Dank übergibt uns die Hellas-Kommandantin den Bauplan, mit dem ihre Wachen jahrzehntelang die Leitungen schützten: den Fresser. Er verschluckt anfliegende Gleiter und bleibt selbst bestehen. Im Süden feuern derweil zwei vergessene Saatkanonen von PALISADE.',
        hint: 'Bewährte Bahnen (Zählung ab 1): ein ungedrehter Gleiter bei Zeile 7, Spalte 22 gegen den Block, einer bei Zeile 7, Spalte 38 gegen den Bienenstock und ein dreimal gedrehter Gleiter (fliegt nach rechts oben) bei Zeile 26, Spalte 51 gegen das Boot. Ein Block bei Zeile 7, Spalte 51 wartet auf den Eisabbruch.',
        patterns: [...ACT6_PATTERNS, 'beacon'], reward: 'eater', rounds: 5, steps: 32, budget: 20, radius: 4, budgetFactor: 20,
        objective: { type: 'escort', zone: 'basin', owner: 2, label: 'Den Hellas-Wasserzug unversehrt ins Speicherbecken geleiten' },
        bonuses: [{ type: 'spent', value: 20, label: 'Höchstens 20 Genmaterial einsetzen' }, { type: 'noForecast', label: 'Ohne Prognose geleiten' }],
        events: [{ id: 'calving', round: 3, announceRound: 1, text: 'Eisabbruch: Zu Beginn von Runde 3 rutscht ein Wildwuchs-Gleiter vom Nordufer auf die dritte Schleuse zu.', action: { type: 'seed', pattern: 'glider', r: 3, c: 47, owner: -1 } }],
        map: {
            rows: 30, cols: 72, territory: [[0, 2, 4, 8, 62], [0, 21, 4, 27, 62]],
            // Both banks are walls with three locks each; gliders reach the channel only through them.
            rocks: [[10, 0, 10, 21], [10, 27, 10, 37], [10, 43, 10, 51], [10, 57, 10, 71], [19, 0, 19, 23], [19, 29, 19, 39], [19, 45, 19, 53], [19, 59, 19, 71]],
            camps: [{ id: 0, rMin: 24, rMax: 26, cMin: 4, cMax: 6 }],
            seeds: [{ pattern: 'lwss', r: 13, c: 7, owner: 2, mirror: true }, { pattern: 'block', r: 14, c: 30, owner: -1 }, { pattern: 'beehive', r: 13, c: 46, owner: -1 }, { pattern: 'boat', r: 14, c: 60, owner: -1 }],
            zones: [{ id: 'basin', label: 'SPEICHERBECKEN', rMin: 11, rMax: 18, cMin: 66, cMax: 71 }]
        }
    },
    {
        id: 'A6_M03', act: 6, title: 'Die verwaisten Saatkanonen', region: 'Acidalia · Alte Saatfelder', kind: 'Eindämmung · Hecken', point: [48, 46], ambience: 'outpost', voice: 'UNSERE BIOLOGIN',
        quote: 'Eine Maschine, die nie aufhört zu säen, ist kein Gärtner.',
        briefing: 'Zwei automatische Saatkanonen von PALISADE feuern seit Jahrzehnten Wildwuchs-Gleiter über Acidalia, eine Ebene im Norden. Jetzt zielen ihre Bahnen auf den neuen Trinkwasserkanal. Bring beide Kanonen mit gezielten Treffern zum Schweigen und halte den roten Kanal bis Generation hundertsechzig frei von jeder Flora. Der Fresser fängt Gleiterströme ab, ohne zu wachsen.',
        debriefing: 'Die Kanonen schweigen, der Kanal bleibt klar. In ihren Speichern liegt Kesslers Saatplan: Die Felder sollten sich in einem Jahrhundert langsam schließen, nicht in einem Jahrzehnt. Die beschleunigten Genome kamen erst später. Die Karte endet unter Chryse – genau unter unserer ersten Landestelle liegt ein versiegeltes Saatgutgewölbe.',
        hint: 'Fresser fangen beide Ströme (Zählung ab 1): ungedreht bei Zeile 22, Spalte 36 und einmal gedreht bei Zeile 22, Spalte 58. Zwei Gleiter nach links oben (zweimal gedreht) bei Zeile 25, Spalte 32 und Zeile 20, Spalte 78 bringen die Kanonen zum Schweigen.',
        patterns: [...ACT6_PATTERNS, 'beacon', 'eater'], reward: null, rounds: 5, steps: 40, budget: 24, radius: 5, budgetFactor: 20,
        objective: { type: 'clearZones', zones: ['gunWest', 'gunEast'], minGenerations: 160, sterile: ['canal'], terms: { unit: 'Kanonen', done: 'verstummt', guard: 'Kanal schützen' }, label: 'Beide Saatkanonen verstummen lassen; Trinkwasserkanal bis Generation 160 frei halten' },
        bonuses: [{ type: 'margin', value: 9, zones: ['canal'], label: 'Keine Flora kommt dem Kanal je näher als 8 Felder' }, { type: 'onlyPatterns', patterns: ['glider', 'eater'], label: 'Nur Gleiter und Fresser einsetzen' }],
        map: {
            rows: 44, cols: 88, territory: [[0, 17, 4, 27, 83]], rocks: [[0, 40, 2, 47], [33, 0, 35, 3], [33, 84, 35, 87]], camps: [{ id: 0, rMin: 24, rMax: 26, cMin: 42, cMax: 45 }],
            seeds: [{ pattern: 'glider_gun', r: 2, c: 2, owner: -1 }, { pattern: 'glider_gun', r: 6, c: 85, owner: -1, mirror: true }],
            zones: [{ id: 'gunWest', label: 'SAATKANONE WEST', rMin: 1, rMax: 11, cMin: 1, cMax: 38 }, { id: 'gunEast', label: 'SAATKANONE OST', rMin: 5, rMax: 15, cMin: 49, cMax: 86 }, { id: 'canal', label: 'TRINKWASSERKANAL', rMin: 38, rMax: 39, cMin: 0, cMax: 87 }]
        }
    },
    {
        id: 'A6_M04', act: 6, title: 'Das Saatgutgewölbe', region: 'Chryse · Unter der ersten Landestelle', kind: 'Kalibrierung', point: [58, 56], ambience: 'research', voice: 'DIE LANDEFÄHRE',
        quote: 'Nicht mehr, nicht weniger: genau so viel Leben, wie der Boden trägt.',
        briefing: 'Genau unter unserer ersten Landestelle liegt Kesslers Saatgutgewölbe. Sein Schloss ist biologisch: Bei Generation hundertzwanzig müssen genau zwölf eigene Zellen in der Keimkammer leben. Gleiter erstarren an der Kammerwand zu Blöcken; zwei auf derselben Bahn löschen sich aus. Die alten Saatkapseln verändern jede Rechnung.',
        debriefing: 'Zwölf Zellen – so viele Generationen hielt einst unsere erste Kolonie. Das Gewölbe öffnet sich. In langen Reihen lagern Kesslers langsame Saatlinien, beschriftet für die Generation nach uns. Sie brauchen Jahrzehnte statt Jahre, und genau das macht sie sicher. Die Häuser beschließen, mit ihnen in Chryse den ersten Garten unter offenem Himmel anzulegen.',
        hint: 'Drei Gleiter auf getrennten Bahnen ergeben zwölf (Zählung ab 1): ungedreht bei Zeile 9, Spalte 4 sowie dreimal gedreht (nach rechts oben) bei Zeile 12, Spalte 13 und Zeile 21, Spalte 13. Wer sparen will: Ein einziger Gleiter nach rechts oben trifft die obere Kapsel so, dass genau zwölf Zellen entstehen.',
        patterns: [...ACT6_PATTERNS, 'beacon', 'eater'], reward: null, rounds: 1, steps: 120, budget: 16, radius: 4,
        forecast: { charges: 2, horizon: 120 },
        objective: { type: 'exactCount', zone: 'chamber', value: 12, at: 120, label: 'Bei Generation 120 genau 12 eigene Zellen in der Keimkammer' },
        bonuses: [{ type: 'spent', value: 5, label: 'Mit einem einzigen Gleiter kalibrieren' }, { type: 'noForecast', label: 'Ohne Prognose kalibrieren' }],
        map: {
            rows: 31, cols: 48, territory: [[0, 3, 3, 27, 14]],
            // The vault: ceiling, floor, an east wall and a west wall with three slits.
            rocks: [[0, 0, 0, 47], [30, 0, 30, 47], [1, 18, 3, 18], [9, 18, 12, 18], [18, 18, 21, 18], [27, 18, 29, 18], [1, 45, 29, 45]],
            camps: [{ id: 0, rMin: 13, rMax: 17, cMin: 3, cMax: 5 }],
            seeds: [{ pattern: 'loaf', r: 2, c: 35, owner: -1 }, { pattern: 'beehive', r: 27, c: 32, owner: -1 }],
            zones: [{ id: 'chamber', label: 'KEIMKAMMER', rMin: 1, rMax: 29, cMin: 19, cMax: 44 }]
        }
    },
    {
        id: 'A6_M05', act: 6, title: 'Der erste Frühling', region: 'Chryse · Der erste Garten', kind: 'Finale · Garten unter offenem Himmel', point: [62, 68], ambience: 'ambient', voice: 'GEMEINSAMER FUNKKANAL',
        quote: 'Wir säen nicht mehr gegeneinander. Wir säen für die, die nach uns kommen.',
        briefing: 'In Chryse, wo alles begann, entsteht der erste Garten unter offenem Himmel. Lass Kesslers langsame Saat in drei Hochbeeten anwachsen, schütze das Kinderhaus vor Wildwuchs und halte das Trinkwasserbecken völlig frei. Schmelzflut und eine zweite Welle sind angekündigt. Alles, was dieser Frühling dich lehrte – Takt, Treffer, Hecken, Maß –, zählt jetzt.',
        debriefing: 'Hundertsechzig Generationen später blühen drei Beete. Kinder aus Marineris, Hellas, Viridion und Tharsis stehen am Rand und zählen die Zellen. Dem Saatgut lag eine Notiz Kesslers bei: „Pflegt, was nach euch wächst.“ Der Mars ist noch nicht grün. Aber zum ersten Mal hat er einen Frühling, den alle gemeinsam erhalten.',
        hint: 'Drei Schüsse, deren Bahnen sich nicht kreuzen (Zählung ab 1): ein Gleiter nach rechts oben bei Zeile 18, Spalte 21 ins Nordbeet und zwei Raumschiffe nach rechts (zweimal gedreht) bei Zeile 25, Spalte 23 und Zeile 32, Spalte 23. Die Saatkapsel erreicht ein Gleiter nach rechts oben bei Zeile 13, Spalte 17. Später fangen Blöcke bei Zeile 12, Spalte 31 und Zeile 36, Spalte 39 die beiden Wellen ab.',
        patterns: [...ACT6_PATTERNS, 'r_pentomino', 'beacon', 'eater'], reward: null, rounds: 5, steps: 40, budget: 30, radius: 5, budgetFactor: 18,
        objective: { type: 'captureCamps', zones: ['bedNorth', 'bedEast', 'bedSouth'], hold: 16, minGenerations: 160, protect: ['school'], sterile: ['basin'], terms: { unit: 'Beete', one: 'Beet', done: 'angewachsen', progress: 'Anwachsen', best: 'bestes Anwachsen', guard: 'Garten schützen' }, label: 'Drei Hochbeete anwachsen lassen; Kinderhaus und Trinkwasser bis Generation 160 schützen' },
        bonuses: [{ type: 'margin', value: 9, zones: ['school'], label: 'Wildwuchs kommt dem Kinderhaus nie näher als 8 Felder' }, { type: 'caches', label: 'Die Saatkapsel aus dem Gewölbe bergen' }],
        events: [
            { id: 'flood', round: 2, announceRound: 1, text: 'Schmelzflut: Zu Beginn von Runde 2 treibt ein Wildwuchs-Raumschiff von Osten zwischen den Beeten hindurch auf das Kinderhaus zu.', action: { type: 'seed', pattern: 'lwss', r: 12, c: 66, owner: -1 } },
            { id: 'surge', round: 3, announceRound: 2, text: 'Zweite Welle: Zu Beginn von Runde 3 treibt ein Wildwuchs-Raumschiff von Osten knapp über dem Boden auf das Trinkwasserbecken zu.', action: { type: 'seed', pattern: 'lwss', r: 36, c: 64, owner: -1 } }
        ],
        epilogue: {
            consortium: 'Das Mars-Konsortium übernimmt die Pflege der Hecken und teilt das Schmelzwasser nach gemeinsamen Quoten. Jede Siedlung schickt ein Kind in den Gartenrat.',
            open_genomes: 'Jede Siedlung nimmt Saat aus dem Gewölbe mit nach Hause. Der gemeinsame Vertrag schützt die Hecken zwischen ihren Gärten – die Kinder lernen ihn als Erstes.',
            none: 'Wem der Garten gehört, entscheiden die Häuser noch. Gepflegt wird er schon jetzt von allen.'
        },
        map: {
            rows: 42, cols: 72, territory: [[0, 8, 3, 32, 22]], rocks: [...act6Bed(4, 9, 32, 38), ...act6Bed(18, 24, 44, 50), ...act6Bed(28, 33, 32, 38)], camps: [{ id: 0, rMin: 28, rMax: 30, cMin: 5, cMax: 8 }],
            seeds: [{ pattern: 'beehive', r: 20, c: 47, owner: -1 }, { pattern: 'boat', r: 29, c: 35, owner: -1 }],
            zones: [{ id: 'bedNorth', label: 'NORDBEET', rMin: 4, rMax: 9, cMin: 32, cMax: 38 }, { id: 'bedEast', label: 'OSTBEET', rMin: 18, rMax: 24, cMin: 44, cMax: 50 }, { id: 'bedSouth', label: 'SÜDBEET', rMin: 28, rMax: 33, cMin: 32, cMax: 38 },
                { id: 'capsule', label: 'SAATKAPSEL', cache: 6, rMin: 0, rMax: 2, cMin: 23, cMax: 28 }, { id: 'school', label: 'KINDERHAUS', rMin: 11, rMax: 15, cMin: 4, cMax: 8 }, { id: 'basin', label: 'TRINKWASSER', rMin: 37, rMax: 40, cMin: 12, cMax: 36 }]
        }
    }
);
// The closing line of each act's last mission report.
CAMPAIGN_MISSIONS.find(m => m.id === 'A5_M05').actFinale = 'AKT V ABGESCHLOSSEN · DAS NETZ IST GETEILT UND VERBUNDEN';
CAMPAIGN_MISSIONS.find(m => m.id === 'A6_M05').actFinale = 'AKT VI ABGESCHLOSSEN · DER ERSTE FRÜHLING HAT BEGONNEN';
// No local speech services were available when Act VI was written: the browser voice reads it until recordings pass QA.
CAMPAIGN_MISSIONS.filter(m => m.act === 6).forEach(m => { m.narration = 'browser'; });
