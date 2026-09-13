// Act II: branching flight paths, simultaneous objectives and neutral threats.
const ACT2_PATTERNS = ['cell','block','blinker','glider'];
CAMPAIGN_MISSIONS.push(
    {
        id:'A2_M01', act:2, title:'Zwei Städte, ein Wasserstrom', region:'Hellas · Siedlungen im großen Einschlagbecken', kind:'Doppelte Versorgung', point:[57,32], ambience:'ice',
        quote:'Zum ersten Mal bitten unsere Gegner um Hilfe.', voice:'DIE HELLAS-KOMMANDANTIN',
        briefing:"Gestern hielt uns Voss auf. Heute zeigt uns die Hellas-Kommandantin zwei bedrohte Siedlungen im südlichen Marsbecken. Ihre Wasserpumpen versagen. Verbinde beide Anschlüsse gleichzeitig mit deinem Einflussgebiet. Zum ersten Mal geht es um die Familien beider Häuser.",
        debriefing:"Beide Pumpen laufen. Voss teilt erstmals ihre Karten mit uns. Doch unter den Leitungen wächst fremde Flora. Unser Streit hat ihr Zeit verschafft. Gemeinsam müssen wir jetzt die Schleusen sichern.",
        hint:'Baue zwei Versorgungsketten aus stabilen Kolonien: eine nach rechts, eine nach unten. In diesem Sektor reicht Einfluss nur drei Felder weit. Kontrolliere nach jeder Runde beide gelben Anschlüsse. Bereits erreichte Gebiete müssen weiter von lebenden Kolonien versorgt werden.',

        patterns:ACT2_PATTERNS, reward:'r_pentomino', rounds:5,steps:24,budget:18,radius:3,budgetFactor:35,
        objective:{type:'territoryZones',zones:['east','south'],label:'Beide Wasseranschlüsse gleichzeitig mit Einflussgebiet versorgen'},
        bonuses:[{type:'rounds',value:3,label:'Innerhalb von 3 Runden verbinden'},{type:'spent',value:24,label:'Höchstens 24 Genmaterial einsetzen'}],
        map:{territory:[[0,5,5,14,14]],rocks:[[0,20,6,21],[19,0,20,6],[18,20,23,25]],zones:[{id:'east',label:'OSTPUMPE',rMin:10,rMax:13,cMin:23,cMax:25},{id:'south',label:'SÜDPUMPE',rMin:23,rMax:25,cMin:10,cMax:13}]}
    },
    {
        id:'A2_M02',act:2,title:'Die geteilte Schlucht',region:'Hellas · Zwei Zugänge zur Wasserader',kind:'Synchronisation',point:[66,43],ambience:'canyon',
        quote:'Ein offenes Tor reicht nicht.',voice:'UNSERE BIOLOGIN',
        briefing:"Die alte Expedition trennte ihre Pflanzenkolonien durch Schutzschleusen. „Treffen zu viele Kolonien zusammen, kippen ihre Wachstumsbahnen“, erklärt unsere Biologin. Erreiche beide Kammern gleichzeitig mit lebender Flora. Zwei Wege, zwei Ankünfte – ein einzelner Gleiter reicht nicht.",
        debriefing:"Die Schleusen öffnen sich. Dahinter liegt ein Schutzsystem: Es hält Pflanzenkolonien auseinander, statt ihr Wachstum zu fördern. Wir haben bisher das Gegenteil getan. Aus der südlichen Kuppel trifft ein Notruf ein.",
        hint:'Plane zwei Gleiterbahnen nach rechts unten. Eine führt durch das Fenster in der Felswand, die andere bleibt links davon. Beide gelben Bereiche brauchen zur selben Zeit lebende Zellen. Startposition und Abstand entscheiden über die Ankunft.',

        patterns:[...ACT2_PATTERNS,'r_pentomino'],reward:'lwss',rounds:4,steps:64,budget:15,
        objective:{type:'allZones',zones:['east','south'],label:'In beiden Schleusenkammern gleichzeitig lebende Flora halten'},
        bonuses:[{type:'rounds',value:1,label:'Beide Schleusen in Runde 1 öffnen'},{type:'spent',value:10,label:'Höchstens 10 Genmaterial einsetzen'}],
        map:{territory:[[0,3,3,11,14]],rocks:[[0,20,14,21],[22,20,29,21]],zones:[{id:'east',label:'SCHLEUSE OST',rMin:18,rMax:25,cMin:24,cMax:30},{id:'south',label:'SCHLEUSE SÜD',rMin:21,rMax:28,cMin:16,cMax:19}]}
    },
    {
        id:'A2_M03',act:2,title:'Die letzte Fähre',region:'Hellas · Evakuierung der südlichen Kuppel',kind:'Abfangen & Evakuieren',point:[57,56],ambience:'outpost',
        quote:'Diesmal zählt, was nicht wächst.',voice:'DIE HELLAS-KOMMANDANTIN',
        briefing:"Ein unmarkierter Gleiter treibt auf den Evakuierungsplatz zu. Die letzte Fähre braucht noch 96 Generationen. Fange die fremde Flora ab und erhalte eine eigene Kolonie. Eine einzige fremde Zelle am Landeplatz gefährdet alle Wartenden – gleichgültig, zu welchem Haus sie gehören.",
        debriefing:"Die Fähre hebt ab – mit Menschen beider Häuser. Im Funk heißt es erstmals „unsere Leute“. Voss übergibt die Forschungsdaten ohne Bedingungen. Sie führen zu den verschwundenen Sicherheitsberichten von Tharsis.",
        hint:'Beobachte die Flugbahn des grauen Gleiters: Er bewegt sich nach links unten. Platziere eine stabile kleine Kolonie in seinem Weg. Conway-Kollisionen können einen Gleiter zerstören oder umlenken. Sichere außerdem lebende eigene Flora abseits der Kollision.',

        patterns:[...ACT2_PATTERNS,'r_pentomino','lwss'],reward:'diehard',rounds:3,steps:96,budget:12,
        objective:{type:'evacuate',value:96,protect:['landing'],label:'96 Generationen überstehen: fremde Flora vom Landeplatz fernhalten'},
        bonuses:[{type:'rounds',value:1,label:'Die erste Evakuierungsfrist einhalten'},{type:'spent',value:8,label:'Höchstens 8 Genmaterial einsetzen'}],
        map:{territory:[[0,10,16,19,28]],rocks:[[0,4,5,7],[25,36,29,38]],camps:[{id:0,rMin:10,rMax:12,cMin:26,cMax:28}],seeds:[{pattern:'glider',r:1,c:34,owner:-1,mirror:true}],zones:[{id:'landing',label:'EVAKUIERUNG',rMin:22,rMax:27,cMin:6,cMax:13}]}
    },
    {
        id:'A2_M04',act:2,title:'Die gestohlenen Warnungen',region:'Tharsis · Forschungsstation am Vulkanplateau',kind:'Archivbergung',point:[37,48],ambience:'research',
        quote:'Wir brauchen Beweise, keine neue Front.',voice:'UNSERE BIOLOGIN',
        briefing:"Das Energiehaus Tharsis verkaufte uns die alten Genome ohne Warnhinweise. Drei Forschungsarchive könnten das beweisen; eine Wache versperrt den Zugriff. Berühre jedes Archiv mit lebender Flora. Ein kurzer Kontakt genügt: Die Daten bleiben gesichert, auch wenn deine Kolonie weiterzieht.",
        debriefing:"Kesslers alte Berichte beweisen die Vertuschung. Die frühere Forschungsleiterin warnte vor verbundenen Wachstumsnetzen. Doch auch ihr Schutzsystem hat eine Schwäche: eine einzige Energiezentrale. Genau diese fällt jetzt aus.",
        hint:'Die drei Ziele liegen nicht auf einer gemeinsamen Flugbahn. Teile das Budget auf mehrere mobile Kolonien auf. Bereits gesicherte Archive bleiben im Missionszähler erhalten. Die Wache setzt neue Muster; blockiere dich nicht selbst mit zu dichter Aussaat.',

        patterns:[...ACT2_PATTERNS,'r_pentomino','lwss','diehard'],reward:'acorn',rounds:4,steps:64,budget:22,enemy:true,enemyStrength:'medium',enemyBudget:8,
        objective:{type:'collectZones',zones:['north','middle','south'],label:'Alle 3 Forschungsarchive mit lebenden Zellen erreichen'},
        bonuses:[{type:'rounds',value:2,label:'Alle Archive bis Runde 2 sichern'},{type:'spent',value:15,label:'Höchstens 15 Genmaterial einsetzen'}],
        map:{territory:[[0,3,4,12,26],[1,24,3,28,12]],rocks:[[0,31,6,32],[23,16,29,17]],camps:[{id:0,rMin:3,rMax:5,cMin:4,cMax:6},{id:1,rMin:26,rMax:28,cMin:3,cMax:7}],zones:[{id:'north',label:'ARCHIV 1',rMin:9,rMax:13,cMin:27,cMax:31},{id:'middle',label:'ARCHIV 2',rMin:20,rMax:24,cMin:25,cMax:29},{id:'south',label:'ARCHIV 3',rMin:22,rMax:27,cMin:38,cMax:43}]}
    },
    {
        id:'A2_M05',act:2,title:'Ein Netz aus Inseln',region:'Hellas · Der gemeinsame Schutzgürtel',kind:'Aktfinale · Halten',point:[45,72],ambience:'outpost',
        quote:'Wir retten die Siedlungen gemeinsam. Oder gar nicht.',voice:'GEMEINSAMER FUNKKANAL',
        briefing:"Die Energiezentrale ist ausgefallen. Fremde Flora rückt auf die Siedlung vor. Nur zwei getrennte Notpumpen können den Schutzgürtel erhalten. Halte beide Bereiche zwölf Generationen gleichzeitig mit lebender Flora besetzt. Keine fremde Zelle darf die Siedlung im Süden erreichen.",
        debriefing:"Die Pumpen halten. Beide Häuser sind gerettet, ihre Pflanzenkolonien bleiben getrennt. Kesslers letzte Karte weist unter den riesigen Vulkan Olympus: Dort liegt das ursprüngliche Schutzsystem. Wir müssen es finden, bevor weitere Siedlungen ihre Wachstumsnetze verbinden.",
        hint:'Zwei Gleiter brauchen abgestimmte Flugbahnen. Einer muss durch das Fenster der mittleren Felswand. Die Pumpen zählen nur, solange beide gleichzeitig besetzt sind; ein unterbrochener Kontakt setzt den Haltezähler zurück. Behalte die graue Front rechts im Blick und nutze die nächste Platzierungsrunde für Korrekturen.',

        patterns:[...ACT2_PATTERNS,'r_pentomino','lwss','diehard','acorn'],reward:'b_heptomino',rounds:4,steps:48,budget:20,
        objective:{type:'holdZones',zones:['left','right'],value:12,protect:['settlement'],label:'Beide Notpumpen 12 Generationen gleichzeitig halten; Siedlung schützen'},
        bonuses:[{type:'rounds',value:2,label:'Den Schutzgürtel bis Runde 2 starten'},{type:'spent',value:14,label:'Höchstens 14 Genmaterial einsetzen'}],
        map:{rows:40,cols:64,territory:[[0,3,4,12,27]],rocks:[[0,34,9,35],[18,34,39,35]],camps:[{id:0,rMin:3,rMax:5,cMin:4,cMax:7}],seeds:[{pattern:'glider',r:0,c:62,owner:-1,mirror:true}],zones:[{id:'left',label:'PUMPE WEST',rMin:22,rMax:29,cMin:24,cMax:31},{id:'right',label:'PUMPE OST',rMin:22,rMax:29,cMin:42,cMax:49},{id:'settlement',label:'SIEDLUNG',rMin:32,rMax:38,cMin:25,cMax:32}]}
    }
);
CAMPAIGN_MISSIONS.forEach(m => { m.act ??= 1; m.narration = 'recorded'; });
