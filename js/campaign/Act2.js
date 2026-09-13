// Act II: branching flight paths, simultaneous objectives and neutral threats.
const ACT2_PATTERNS = ['cell','block','blinker','glider','r_pentomino','acorn','lwss'];
CAMPAIGN_MISSIONS.push(
    {
        id:'A2_M01', act:2, title:'Zwei Städte, ein Wasserstrom', region:'Hellas · Siedlungen im großen Einschlagbecken', kind:'Doppelte Versorgung', point:[57,32], ambience:'ice',
        quote:'Zum ersten Mal bitten unsere Gegner um Hilfe.', voice:'DIE HELLAS-KOMMANDANTIN',
        briefing:'Die Kommandantin des Hauses Hellas heißt Sera Voss. Gestern hielt sie uns auf; heute zeigt sie uns zwei Siedlungen, deren Wasserleitungen versagen. Unsere Pflanzen können die Pumpen versorgen. Aber nur, wenn beide Anschlüsse gleichzeitig in unserem Einflussgebiet liegen. Erreiche beide, bevor die Vorräte aufgebraucht sind.',
        debriefing:'Beide Pumpen laufen. Die Hellas-Kommandantin öffnet die Schleusen für unsere Siedler. Dann kommt eine erschreckende Messung: Unter den Leitungen wächst fremde Flora. Unser Streit hat ihr Zeit verschafft. Wir müssen gemeinsam den Zufluss sichern.',
        hint:'Baue zwei Versorgungsketten aus stabilen Kolonien: eine nach rechts, eine nach unten. In diesem Sektor reicht Einfluss nur drei Felder weit. Kontrolliere nach jeder Runde beide gelben Anschlüsse. Bereits erreichte Gebiete müssen weiter von lebenden Kolonien versorgt werden.',
        archive:{title:'06 · Eine gemeinsame Leitung',text:'Die Kommandantin erklärt: Hellas ist das Haus der Siedlungen im großen südlichen Einschlagbecken. Sie verteidigte keine geheime Waffe, sondern das Wasser ihrer Familien. Zum ersten Mal teilen beide Häuser ihre Karten.'},
        patterns:ACT2_PATTERNS, reward:'diehard', rounds:5,steps:24,budget:18,radius:3,budgetFactor:35,
        objective:{type:'territoryZones',zones:['east','south'],label:'Beide Wasseranschlüsse gleichzeitig mit Einflussgebiet versorgen'},
        bonuses:[{type:'rounds',value:3,label:'Innerhalb von 3 Runden verbinden'},{type:'spent',value:24,label:'Höchstens 24 Genmaterial einsetzen'}],
        map:{territory:[[0,5,5,14,14]],rocks:[[0,20,6,21],[19,0,20,6],[18,20,23,25]],zones:[{id:'east',label:'OSTPUMPE',rMin:10,rMax:13,cMin:23,cMax:25},{id:'south',label:'SÜDPUMPE',rMin:23,rMax:25,cMin:10,cMax:13}]}
    },
    {
        id:'A2_M02',act:2,title:'Die geteilte Schlucht',region:'Hellas · Zwei Zugänge zur Wasserader',kind:'Synchronisation',point:[66,43],ambience:'canyon',
        quote:'Ein offenes Tor reicht nicht.',voice:'UNSERE BIOLOGIN',
        briefing:'Unsere Biologin hat zwei biologische Schlösser gefunden. Die alte Expedition legte sie an, um getrennte Wachstumsgebiete zu erhalten. Beide müssen gleichzeitig von unserer Flora erreicht werden. Ein einzelner Gleiter kann das nicht leisten. Teile deine Aussaat auf und beachte die unterschiedlichen Flugwege.',
        debriefing:'Die Schlösser öffnen sich gemeinsam. Hinter ihnen liegt keine Waffe, sondern ein Schutzsystem. Seine Erbauer wollten verhindern, dass alle Pflanzenkolonien zu einer einzigen unkontrollierbaren Front zusammenwachsen. Wir haben bisher genau das Gegenteil getan.',
        hint:'Plane zwei Gleiterbahnen nach rechts unten. Eine führt durch das Fenster in der Felswand, die andere bleibt links davon. Beide gelben Bereiche brauchen zur selben Zeit lebende Zellen. Startposition und Abstand entscheiden über die Ankunft.',
        archive:{title:'07 · Warum es Sperren gibt',text:'Unsere Biologin erklärt das Prinzip: Jede einzelne Kolonie folgt einfachen Regeln. Treffen viele Kolonien zusammen, ändern sich ihre Wachstumsrichtungen. Die Felslücken sind deshalb keine Hindernisse der Natur, sondern Teile einer alten Schutzanlage.'},
        patterns:[...ACT2_PATTERNS,'diehard'],reward:'b_heptomino',rounds:4,steps:64,budget:15,
        objective:{type:'allZones',zones:['east','south'],label:'In beiden Schleusenkammern gleichzeitig lebende Flora halten'},
        bonuses:[{type:'rounds',value:1,label:'Beide Schleusen in Runde 1 öffnen'},{type:'spent',value:10,label:'Höchstens 10 Genmaterial einsetzen'}],
        map:{territory:[[0,3,3,11,14]],rocks:[[0,20,14,21],[22,20,29,21]],zones:[{id:'east',label:'SCHLEUSE OST',rMin:18,rMax:25,cMin:24,cMax:30},{id:'south',label:'SCHLEUSE SÜD',rMin:21,rMax:28,cMin:16,cMax:19}]}
    },
    {
        id:'A2_M03',act:2,title:'Die letzte Fähre',region:'Hellas · Evakuierung der südlichen Kuppel',kind:'Abfangen & Evakuieren',point:[57,56],ambience:'outpost',
        quote:'Diesmal zählt, was nicht wächst.',voice:'DIE HELLAS-KOMMANDANTIN',
        briefing:'Die fremde Flora hat einen Schacht erreicht. Ein unmarkierter Gleiter treibt auf den Evakuierungsplatz zu. Die letzte Fähre kann erst nach 96 Generationen starten. Fange den Gleiter mit deiner Aussaat ab und erhalte eine eigene Kolonie. Eine einzige fremde Zelle auf dem Landeplatz beendet die Rettung.',
        debriefing:'Die Fähre hebt ab. An Bord sitzen Menschen beider Häuser. Die Kommandantin übergibt uns die vollständigen Forschungsdaten. Keine Bedingungen mehr. Darin entdecken wir, wer die Warnungen vor dieser Flora aus den verkauften Genomen entfernt hat: das Haus Tharsis, der Betreiber der großen Energieanlagen.',
        hint:'Beobachte die Flugbahn des grauen Gleiters: Er bewegt sich nach links unten. Platziere eine stabile kleine Kolonie in seinem Weg. Conway-Kollisionen können einen Gleiter zerstören oder umlenken. Sichere außerdem lebende eigene Flora abseits der Kollision.',
        archive:{title:'08 · Eine Rettung statt eines Sieges',text:'Die geretteten Familien wissen nicht, welches Haus ihren Landeplatz verteidigt hat. Es war ihnen auch egal. Im gemeinsamen Funkkanal wird aus „Ihr Gebiet“ zum ersten Mal „Unsere Leute“.'},
        patterns:[...ACT2_PATTERNS,'diehard','b_heptomino'],reward:'rabbits',rounds:3,steps:96,budget:12,
        objective:{type:'evacuate',value:96,protect:['landing'],label:'96 Generationen überstehen: fremde Flora vom Landeplatz fernhalten'},
        bonuses:[{type:'rounds',value:1,label:'Die erste Evakuierungsfrist einhalten'},{type:'spent',value:8,label:'Höchstens 8 Genmaterial einsetzen'}],
        map:{territory:[[0,10,16,19,28]],rocks:[[0,4,5,7],[25,36,29,38]],camps:[{id:0,rMin:10,rMax:12,cMin:26,cMax:28}],seeds:[{pattern:'glider',r:1,c:34,owner:-1,mirror:true}],zones:[{id:'landing',label:'EVAKUIERUNG',rMin:22,rMax:27,cMin:6,cMax:13}]}
    },
    {
        id:'A2_M04',act:2,title:'Die gestohlenen Warnungen',region:'Tharsis · Forschungsstation am Vulkanplateau',kind:'Archivbergung',point:[37,48],ambience:'research',
        quote:'Wir brauchen Beweise, keine neue Front.',voice:'UNSERE BIOLOGIN',
        briefing:'Tharsis verkauft Energie und Pflanzengenome an alle Häuser. In drei Außenstationen liegen die ursprünglichen Sicherheitsberichte. Eine örtliche Wachmannschaft will unseren Zugriff verhindern. Erreiche alle drei Archive mit lebender Flora. Ein kurzer Kontakt genügt zum Sichern; die Dateien bleiben auch erhalten, wenn die Kolonie weiterzieht.',
        debriefing:'Die Berichte stimmen überein. Die frühere Forschungsleiterin Ada Kessler warnte vor einer Verbindung aller Wachstumsnetze. Tharsis entfernte diese Warnung, um billiger zu verkaufen. Doch auch die alten Forscher machten einen Fehler: Ihr Schutzsystem hängt an einer einzigen Energiezentrale. Und genau diese Zentrale fällt jetzt aus.',
        hint:'Die drei Ziele liegen nicht auf einer gemeinsamen Flugbahn. Teile das Budget auf mehrere mobile Kolonien auf. Bereits gesicherte Archive bleiben im Missionszähler erhalten. Die Wache setzt neue Muster; blockiere dich nicht selbst mit zu dichter Aussaat.',
        archive:{title:'09 · Wer Kessler war',text:'Ada Kessler leitete die erste Terraforming-Expedition, lange vor unserer Landung. Ihre alten Aufzeichnungen sind keine Funksprüche aus der Gegenwart. Sie dokumentieren den Bau der Schutzanlage und die Folgen eines Stromausfalls.'},
        patterns:[...ACT2_PATTERNS,'diehard','b_heptomino','rabbits'],reward:'switch_engine',rounds:4,steps:64,budget:22,enemy:true,enemyStrength:'medium',enemyBudget:8,
        objective:{type:'collectZones',zones:['north','middle','south'],label:'Alle 3 Forschungsarchive mit lebenden Zellen erreichen'},
        bonuses:[{type:'rounds',value:2,label:'Alle Archive bis Runde 2 sichern'},{type:'spent',value:15,label:'Höchstens 15 Genmaterial einsetzen'}],
        map:{territory:[[0,3,4,12,26],[1,24,3,28,12]],rocks:[[0,31,6,32],[23,16,29,17]],camps:[{id:0,rMin:3,rMax:5,cMin:4,cMax:6},{id:1,rMin:26,rMax:28,cMin:3,cMax:7}],zones:[{id:'north',label:'ARCHIV 1',rMin:9,rMax:13,cMin:27,cMax:31},{id:'middle',label:'ARCHIV 2',rMin:20,rMax:24,cMin:25,cMax:29},{id:'south',label:'ARCHIV 3',rMin:22,rMax:27,cMin:38,cMax:43}]}
    },
    {
        id:'A2_M05',act:2,title:'Ein Netz aus Inseln',region:'Hellas · Der gemeinsame Schutzgürtel',kind:'Aktfinale · Halten',point:[45,72],ambience:'outpost',
        quote:'Wir retten die Siedlungen gemeinsam. Oder gar nicht.',voice:'GEMEINSAMER FUNKKANAL',
        briefing:'Die Energiezentrale ist ausgefallen. Unmarkierte Flora treibt auf die Siedlung zu. Zwei voneinander getrennte Notpumpen können den Schutzgürtel erhalten. Besetze beide gelben Pumpenbereiche gleichzeitig und halte sie zwölf Generationen lang. Der Landeplatz im Süden darf keine fremde Zelle berühren. Diesmal musst du Ankunft, Dauer und Sicherheit zugleich planen.',
        debriefing:'Die Pumpen halten. Zum ersten Mal versorgt ein gemeinsames Netz beide Häuser, ohne die Pflanzenkolonien miteinander zu verbinden. Die Siedlung ist gerettet. Dann öffnet sich Kesslers letzte Karte: Unter dem riesigen Vulkan Olympus liegt eine zweite, viel ältere Anlage. Sie reagiert bereits auf unseren Neustart. Die Rettung von Hellas war der Anfang – jetzt wissen wir, wonach wir suchen müssen.',
        hint:'Zwei Gleiter brauchen abgestimmte Flugbahnen. Einer muss durch das Fenster der mittleren Felswand. Die Pumpen zählen nur, solange beide gleichzeitig besetzt sind; ein unterbrochener Kontakt setzt den Haltezähler zurück. Behalte die graue Front rechts im Blick und nutze die nächste Platzierungsrunde für Korrekturen.',
        archive:{title:'10 · Was wir jetzt wissen',text:'Unsere Kolonien sind gerettet. Die fremde Flora stammt von einer alten menschlichen Expedition; sie ist weder ein denkender Gegner noch ein außerirdisches Wesen. Wir müssen das ursprüngliche Schutzsystem finden, bevor weitere Siedlungen ihre Wachstumsnetze verbinden. Das nächste Ziel ist Olympus, der große Vulkan.'},
        patterns:[...ACT2_PATTERNS,'diehard','b_heptomino','rabbits','switch_engine'],reward:'glider_gun',rounds:4,steps:48,budget:20,
        objective:{type:'holdZones',zones:['left','right'],value:12,protect:['settlement'],label:'Beide Notpumpen 12 Generationen gleichzeitig halten; Siedlung schützen'},
        bonuses:[{type:'rounds',value:2,label:'Den Schutzgürtel bis Runde 2 starten'},{type:'spent',value:14,label:'Höchstens 14 Genmaterial einsetzen'}],
        map:{rows:40,cols:64,territory:[[0,3,4,12,27]],rocks:[[0,34,9,35],[18,34,39,35]],camps:[{id:0,rMin:3,rMax:5,cMin:4,cMax:7}],seeds:[{pattern:'glider',r:0,c:62,owner:-1,mirror:true}],zones:[{id:'left',label:'PUMPE WEST',rMin:22,rMax:29,cMin:24,cMax:31},{id:'right',label:'PUMPE OST',rMin:22,rMax:29,cMin:42,cMax:49},{id:'settlement',label:'SIEDLUNG',rMin:32,rMax:38,cMin:25,cMax:32}]}
    }
);
CAMPAIGN_MISSIONS.forEach(m => { m.act ??= 1; m.narration = 'browser'; });
