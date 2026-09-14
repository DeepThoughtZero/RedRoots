// Act III: timing, deliberate extinction and containment. No changes to Conway rules.
const ACT3_PATTERNS = ['cell','block','blinker','glider','r_pentomino','lwss','diehard','acorn','b_heptomino'];
const CAMPAIGN_ACTS = [
    {id:1,roman:'I',name:'Landung',headline:'Ein roter Planet.',subtitle:'Deine ersten Wurzeln.'},
    {id:2,roman:'II',name:'Die Häuser',headline:'Zwei Häuser. Ein Schicksal.',subtitle:'Rette die Wassersiedlungen.'},
    {id:3,roman:'III',name:'Das stille Netz',headline:'Unter dem Vulkan wartet die Wahrheit.',subtitle:'Leben braucht Grenzen.'}
];
CAMPAIGN_MISSIONS.push(
    {
        id:'A3_M01',act:3,title:'Drei Schlüssel im Staub',region:'Olympus · Zugang zur alten Anlage',kind:'Reihenfolge',point:[59,30],ambience:'research',image:'A2_M04',voice:'UNSERE BIOLOGIN',quote:'Die Anlage wartet nicht auf ein Passwort. Sie wartet auf Leben.',
        briefing:'Unter Olympus, dem großen Vulkan, finden wir drei biologische Zugangsschalter. Sie akzeptieren nur die Reihenfolge eins, zwei, drei. Ein falscher Kontakt verriegelt die Anlage. Plane die Ankunft deiner Kolonien: Wir haben nur ein kurzes Zeitfenster, bevor der Zugang wieder verschüttet wird.',
        debriefing:'Die Türen öffnen sich. Hinter ihnen laufen seit Jahrzehnten dieselben Versuche. Kessler hat das Netz nicht abgeschaltet. Sie ließ es lernen, welche Kolonien sich sicher voneinander trennen lassen. Ein Test läuft noch: Er verlangt, dass unser Leben wieder verschwindet.',
        hint:'Die nummerierten Zielbereiche müssen in Reihenfolge erreicht werden. Mehrere Gleiter auf getrennten Bahnen können zu verschiedenen Zeiten ankommen. Ihre Entfernung zu den Schaltern bestimmt die Reihenfolge. Zu frühe Kontakte sind endgültig.',
        patterns:ACT3_PATTERNS,reward:null,rounds:2,steps:48,budget:15,
        objective:{type:'orderedZones',zones:['one','two','three'],label:'Schalter 1 → 2 → 3 in dieser Reihenfolge mit lebender Flora erreichen'},
        bonuses:[{type:'rounds',value:2,label:'Alle Schalter im ersten Zeitfenster öffnen'},{type:'spent',value:15,label:'Höchstens 15 Genmaterial einsetzen'}],
        map:{rows:36,cols:60,territory:[[0,3,3,9,33]],rocks:[[0,38,12,39],[28,10,35,11]],zones:[{id:'one',label:'1 · ZUGANG',rMin:12,rMax:15,cMin:12,cMax:15},{id:'two',label:'2 · FREIGABE',rMin:18,rMax:21,cMin:30,cMax:33},{id:'three',label:'3 · TOR',rMin:24,rMax:27,cMin:48,cMax:51}]}
    },
    {
        id:'A3_M02',act:3,title:'Die Kunst zu verschwinden',region:'Olympus · Sterile Versuchskammer',kind:'Vergänglichkeit',point:[48,40],ambience:'research',image:'A1_M02',voice:'UNSERE BIOLOGIN',quote:'Eine Kolonie, die rechtzeitig stirbt, kann eine Stadt retten.',
        briefing:'Die Kammer prüft ein kurzlebiges Versorgungssystem. Unsere Flora muss nach hundert Generationen noch leben und anschließend vollständig verschwinden. Spätestens nach Generation hundertvierzig muss die Kammer leer sein. Kein Radieren während der Evolution. Hier helfen weder ein ewiger Block noch grenzenloses Wachstum.',
        debriefing:'Die Kammer wird leer. Das ist kein Fehlschlag, sondern die Sicherung: Ein zeitlich begrenzter Organismus kann Energie liefern, ohne eine dauerhafte Verbindung zu hinterlassen. Dann zeigt die Außenkamera zwei Wildwuchsfronten. Beide steuern auf unsere Rückkehrroute zu.',
        hint:'Diehard ist eine vergängliche Formation. Prüfe, wie lange sie ohne Störung lebt. Ausreichend Abstand zu Wänden und anderen Zellen ist entscheidend: Eine Kollision kann einen dauerhaften Rest erzeugen. Der Test zählt ab der ersten Evolution.',
        patterns:['cell','block','blinker','diehard'],reward:'rabbits',rounds:1,steps:140,budget:7,
        objective:{type:'pulse',aliveAt:100,emptyAfter:130,label:'Bei Generation 100 leben; zwischen Generation 130 und 140 vollständig aussterben'},
        bonuses:[{type:'generations',value:130,label:'Bis Generation 130 rückstandsfrei verschwinden'},{type:'spent',value:7,label:'Höchstens 7 Genmaterial einsetzen'}],
        map:{rows:40,cols:64,territory:[[0,8,12,27,47]],rocks:[],zones:[]}
    },
    {
        id:'A3_M03',act:3,title:'Zwei Fronten, kein Rückweg',region:'Olympus · Versorgungsstollen',kind:'Doppelte Evakuierung',point:[60,53],ambience:'outpost',image:'A2_M03',voice:'DIE HELLAS-KOMMANDANTIN',quote:'Wir lassen niemanden auf der falschen Seite zurück.',
        briefing:'Zwei unmarkierte Gleiter bedrohen getrennte Rettungsplätze. Voss hält die Fähren bereit, doch die Stollen brauchen sechsundneunzig Generationen zum Druckausgleich. Fange beide Fronten ab und bewahre eigene Flora. Ein einziger Durchbruch an einem der Plätze schneidet die Rückkehr ab.',
        debriefing:'Beide Rückwege bleiben offen. Voss will die Anlage sprengen, bevor weitere Fronten austreten. Unsere Biologin widerspricht: Die gleichen Systeme halten die Wassersiedlungen am Leben. Wir brauchen die vollständige Abschaltfolge – und Tharsis bewacht ihren letzten Speicher.',
        hint:'Beide grauen Gleiter bewegen sich nach links unten. Jede Front benötigt eine eigene Kollision. Platziere sparsam und halte eine Reservekolonie abseits der Flugbahnen am Leben. Eine einzige abgefangene Front reicht diesmal nicht.',
        patterns:[...ACT3_PATTERNS,'rabbits'],reward:null,rounds:2,steps:48,budget:16,
        objective:{type:'evacuate',value:96,protect:['west','east'],label:'Beide Rettungsplätze 96 Generationen schützen und eigene Flora erhalten'},
        bonuses:[{type:'generations',value:96,label:'Beide Fähren beim ersten Druckausgleich retten'},{type:'spent',value:12,label:'Höchstens 12 Genmaterial einsetzen'}],
        map:{rows:50,cols:64,territory:[[0,10,16,19,28],[0,26,40,35,52]],rocks:[[0,3,7,6],[42,49,49,52]],camps:[{id:0,rMin:18,rMax:19,cMin:26,cMax:28}],seeds:[{pattern:'glider',r:1,c:34,owner:-1,mirror:true},{pattern:'glider',r:17,c:58,owner:-1,mirror:true}],zones:[{id:'west',label:'RETTUNG WEST',rMin:22,rMax:27,cMin:6,cMax:13},{id:'east',label:'RETTUNG OST',rMin:38,rMax:43,cMin:30,cMax:37}]}
    },
    {
        id:'A3_M04',act:3,title:'Die versiegelte Wahrheit',region:'Olympus · Kontrollarchiv von Tharsis',kind:'Bergung unter Quarantäne',point:[40,62],ambience:'research',image:'A2_M04',voice:'UNSERE BIOLOGIN',quote:'Die Wahrheit darf heraus. Die Pflanzen nicht.',
        briefing:'Tharsis verteidigt drei Speicher mit der Abschaltfolge. Erreiche alle mit lebender Flora, ohne den roten Quarantänestreifen zu berühren – auch unsere eigenen Pflanzen sind dort verboten. Die Wache setzt starke Muster. Großflächiges Wachstum könnte uns den Zugang für immer versperren.',
        debriefing:'Die Speicher enthüllen den Preis der Abschaltung: Sie würde auch Hellas das Wasser nehmen. Kesslers letzte Notiz bietet einen anderen Weg – unabhängige Relais statt einer einzigen Zentrale. Tharsis sendet seine Schaltpläne. Zum ersten Mal trägt auch dieses Haus zur Rettung bei.',
        hint:'Die drei Archive behalten ihre Daten nach einem kurzen Kontakt. Plane getrennte mobile Kolonien. Der rote Streifen am Südrand darf von keiner lebenden Zelle berührt werden. Eine Lücke im nördlichen Felsriegel lässt die Wache in Richtung deiner Landefläche wachsen. Berge die Daten, bevor sie durchbricht.',
        patterns:[...ACT3_PATTERNS,'rabbits'],reward:'switch_engine',rounds:3,steps:48,budget:18,enemy:true,enemyStrength:'hard',enemyBudget:14,
        objective:{type:'collectZones',zones:['north','middle','south'],sterile:['seal'],label:'Drei Archive bergen; den roten Quarantänestreifen vollständig frei halten'},
        bonuses:[{type:'rounds',value:2,label:'Vor Ende von Runde 2 bergen'},{type:'spent',value:15,label:'Höchstens 15 Genmaterial einsetzen'}],
        map:{territory:[[0,3,4,12,26],[1,22,2,27,11]],rocks:[[0,31,6,32],[20,0,20,6],[20,12,29,15]],camps:[{id:0,rMin:3,rMax:5,cMin:4,cMax:6},{id:1,rMin:24,rMax:26,cMin:3,cMax:7}],zones:[{id:'north',label:'ARCHIV 1',rMin:9,rMax:13,cMin:27,cMax:31},{id:'middle',label:'ARCHIV 2',rMin:20,rMax:24,cMin:25,cMax:29},{id:'south',label:'ARCHIV 3',rMin:22,rMax:27,cMin:38,cMax:43},{id:'seal',label:'QUARANTÄNE · FREI HALTEN',rMin:28,rMax:29,cMin:16,cMax:47}]}
    },
    {
        id:'A3_M05',act:3,title:'Das stille Netz',region:'Olympus · Herz der Schutzanlage',kind:'Aktfinale · Isolation',point:[48,75],ambience:'canyon',image:'A2_M05',voice:'GEMEINSAMER FUNKKANAL',quote:'Nicht mehr Leben. Das richtige Leben am richtigen Ort.',
        briefing:'Drei unabhängige Relais können die Zentrale ersetzen. Halte alle sechzehn Generationen gleichzeitig besetzt. Der rote Trennstreifen muss völlig leer bleiben. Jetzt zählt alles: Flugwege, Ankunft und begrenztes Wachstum. Scheitern wir, müssen wir zwischen der Anlage und dem Wasser der Siedlungen wählen.',
        debriefing:'Die Relais übernehmen. Die Zentrale verstummt, doch in Hellas laufen die Pumpen weiter. Voss legt den Sprengzünder weg. Wir haben das Netz gerettet, indem wir es getrennt haben. Dann trifft eine Meldung aus dem Norden ein: Ein Sturm legt weitere alte Wurzelkanäle frei.',
        hint:'Drei getrennte Gleiterbahnen können die Relais zeitgleich erreichen. Plane den Durchgang durch die Felsfenster und genügend Aufenthaltszeit in allen drei Zielbereichen. Kontakt zum roten Südrand bedeutet Niederlage. Stabile Inseln helfen mehr als eine ungebremste Front.',
        patterns:[...ACT3_PATTERNS,'rabbits','switch_engine'],reward:'lidka',rounds:3,steps:48,budget:18,
        objective:{type:'holdZones',zones:['west','center','east'],value:16,sterile:['gap'],label:'Alle drei Relais 16 Generationen gleichzeitig halten; Trennstreifen leer lassen'},
        bonuses:[{type:'rounds',value:2,label:'Die Zentrale bis Runde 2 ersetzen'},{type:'spent',value:15,label:'Höchstens 15 Genmaterial einsetzen'}],
        map:{rows:40,cols:72,territory:[[0,3,3,10,41]],rocks:[[0,18,12,19],[24,18,32,19],[0,50,12,51],[24,50,32,51]],zones:[{id:'west',label:'RELAIS WEST',rMin:23,rMax:31,cMin:23,cMax:31},{id:'center',label:'RELAIS MITTE',rMin:23,rMax:31,cMin:39,cMax:47},{id:'east',label:'RELAIS OST',rMin:23,rMax:31,cMin:55,cMax:63},{id:'gap',label:'TRENNSTREIFEN · FREI HALTEN',rMin:34,rMax:39,cMin:0,cMax:71}]}
    }
);
CAMPAIGN_MISSIONS.forEach(m => { m.narration = 'recorded'; m.audioRevision = '20260914-v1'; });
