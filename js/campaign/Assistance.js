// Mission aids: graded hints and forecast charges. Load after the last act.
// Hint stages run from a nudge to the concrete tactical hint (mission.hint).
// Stage 1 is open from the start, each failed attempt (or "Mehr Hilfe") opens the next one.
const MISSION_HINT_STAGES = {
    A1_M02: ['Lebende Kolonien beanspruchen nach jeder Runde den Boden in ihrer Umgebung. Wachse Schritt für Schritt in Richtung der gelben Station. Der Vorrat im Norden ist freiwillig: Er bringt Material, kostet aber einen Umweg.'],
    A1_M03: ['Der Gleiter wandert diagonal. Überlege, in welche Richtung er zeigen muss, damit seine Bahn durch die Öffnung der Felswand führt.',
        'Ein ungedrehter Gleiter fliegt nach rechts unten. Setze ihn im oberen Teil deines Gebiets so, dass seine gedachte Diagonale die gelbe Öffnung trifft. R oder Rechtsklick dreht das Muster.'],
    A1_M04: ['Der pinke Pfeil zeigt die Flugbahn des Hellas-Gleiters, die Rennuhr seine Ankunft. Dein Weg zum Eis muss kürzer sein als seiner.',
        'Das Eis liegt diagonal rechts unter deiner Landezone. Ein Gleiter vom unteren rechten Rand deines Gebiets ist am schnellsten dort.'],
    A1_M05: ['Ein Angriff und eine Verteidigung: Ein mobiles Muster erreicht das Hellas-Camp, stabile Kolonien schützen dein Habitat.',
        'Ein Gleiter aus der Mitte deines Gebiets, der nach rechts unten fliegt, trifft das Hellas-Camp. Hellas setzt jede Runde neue Muster: Reagiere in der nächsten Runde.'],
    A2_M01: ['Zwei Ziele, zwei Richtungen: Verteile deine Kolonien entlang zweier Wege, statt alles an einer Stelle auszugeben. Der Vorrat zwischen beiden Wegen lohnt sich nur, wenn Material knapp wird.'],
    A2_M02: ['Beide Kammern müssen im selben Moment lebende Zellen enthalten. Die Ankunftszeit hängt vom Startabstand ab.'],
    A2_M03: ['Der graue Pfeil zeigt, wohin der fremde Gleiter fliegt. Eine stabile Form in seinem Weg kann ihn aufhalten.'],
    A2_M04: ['Drei Ziele, die nicht auf einer Linie liegen: Jedes braucht einen eigenen Weg. Ein kurzer Kontakt genügt.'],
    A2_M05: ['Beide Pumpen müssen zwölf Generationen ohne Unterbrechung gleichzeitig Leben enthalten. Achte auf Ankunftszeit und Verweildauer.'],
    A3_M01: ['Die Reihenfolge entsteht durch Entfernung: Was näher an seinem Schalter startet, kommt früher an.'],
    A3_M02: ['Gesucht ist eine Formation, die von selbst lange lebt und danach vollständig verschwindet.'],
    A3_M03: ['Zwei Fronten, zwei Abfangpunkte. Halte außerdem eigene Flora abseits der Kollisionen am Leben.'],
    A3_M04: ['Drei Archive und ein roter Streifen: Plane Bahnen, die den Streifen nie berühren, auch nicht durch Trümmer nach Kollisionen.'],
    A3_M05: ['Drei Relais gleichzeitig, sechzehn Generationen lang. Gleich lange Wege sorgen für gleichzeitige Ankunft.'],
    A4_M01: ['Verteidigen und angreifen zugleich: Ein Teil deines Materials fängt den gelben Gleiter ab, ein anderer erobert das Camp.'],
    A4_M02: ['Erst wenn beide Camps fallen, endet die gelbe Nachsaat. Teile deinen Angriff auf. Ab Runde 5 flutet Wildwuchs die Wasserader unter beiden Camps – erobere sie möglichst vorher.'],
    A4_M03: ['Beide Gegner zielen diesmal direkt auf die Rettungsplätze: Viridion auf den Osten, Tharsis auf den Westen. Baue vor jedem Platz eine eigene Abwehr und behalte Material für spätere Runden.'],
    A4_M04: ['Zwei Angriffe, ein Schutzauftrag: Viridion schickt seine Gleiter aus der Ferne auf die Zivilstation. Sie muss auch nach dem Fall der Posten geschützt bleiben.'],
    A4_M05: ['Drei Camps und eine graue Front: Verteile dein Material auf unabhängige Angriffe und halte eine Reserve für den Rettungsplatz. Ab Runde 6 treibt ein Sturmstoß weiteren Wildwuchs von Norden heran.'],
    A5_M01: ['Lange Phasen belohnen stabile Fronten: Sichere zuerst das Habitat und greife die Relais dann auf getrennten Wegen an. Der Notvorrat im mittleren Korridor liefert zusätzliches Material für spätere Phasen.'],
    A5_M02: ['Jedes Habitat braucht eine eigene Abfangzone. Nach jeder Phase bestimmt das neue Einflussgebiet, wo du säen kannst.'],
    A5_M03: ['Rote Korridore dürfen nie berührt werden. Kämpfe auf ihrer jeweils sicheren Seite.'],
    A5_M04: ['Vier Fronten: Teile Angriff und Verteidigung auf und spare Material für spätere Phasen.'],
    A5_M05: ['Verteile Angriff, Schutz und Reserve auf drei Fronten. Der rote Ring bleibt immer leer.']
};
// In mission 1 the regular hint explains the rules; the extra stage follows it and still names no pattern.
const MISSION_HINT_FOLLOWUPS = {
    A1_M01: ['Prüfe jede Zelle einzeln: Auch nach jeder Generation braucht sie wieder zwei oder drei lebende Nachbarn. Kompakte Formen, in denen sich alle Zellen gegenseitig berühren, stützen sich am längsten.']
};
// Missions about discovering a pattern by oneself get no forecast.
const FORECAST_DISABLED = ['A1_M01', 'A3_M02'];
CAMPAIGN_MISSIONS.forEach(m => {
    m.hints = [...(MISSION_HINT_STAGES[m.id] || []), m.hint, ...(MISSION_HINT_FOLLOWUPS[m.id] || [])];
    if (m.forecast === undefined) m.forecast = FORECAST_DISABLED.includes(m.id) ? null : { charges: 2, horizon: m.steps >= 1000 ? 120 : 32 };
});

// Expert protocols (after three stars): less own material, stronger opponents, no hints and no forecast.
// Own material never drops below the spend of the original material bonus, so the known solutions stay affordable.
const EXPERT_BUDGET_FLOOR = {A1_M01:4,A1_M02:8,A1_M03:5,A1_M04:10,A1_M05:15,A2_M01:24,A2_M02:10,A2_M03:8,A2_M04:15,A2_M05:14,A3_M01:15,A3_M02:7,A3_M03:12,A3_M04:15,A3_M05:15,A4_M01:18,A4_M02:22,A4_M03:20,A4_M04:24,A4_M05:36,A5_M01:72,A5_M02:90,A5_M03:82,A5_M04:108,A5_M05:124};
function expertMission(m) {
    const factors = { budget: .8, enemy: 1.5, ...(m.expert || {}) };
    return {
        ...m, expertMode: true,
        budget: Math.max(EXPERT_BUDGET_FLOOR[m.id] || 0, Math.round(m.budget * factors.budget)),
        enemyBudget: m.enemy && !m.enemies ? Math.round((m.enemyBudget ?? 8) * factors.enemy) : m.enemyBudget,
        enemies: m.enemies?.map(e => ({ ...e, budget: Math.round(e.budget * factors.enemy) })),
        hints: [], forecast: null,
        events: [...(m.events || []), ...(factors.events || [])]
    };
}

// Short radio lines during the evolution (text only, at most twelve words, role names instead of new names).
// Triggers: <eventType>[:<zone|house|event id>], plus alarm:<zone> for alarms and holdHalf/holdLost.
const MISSION_RADIO = {
    A1_M02: [{ on: 'cache:depot', voice: 'UNSERE BIOLOGIN', text: 'Vorrat geborgen. Das Material steht nächste Runde bereit.' }],
    A2_M01: [{ on: 'cache:depot', voice: 'DIE HELLAS-KOMMANDANTIN', text: 'Gut. Mit dem Vorrat reichen die Mittel für beide Leitungen.' }],
    A2_M03: [{ on: 'alarm:landing', voice: 'DIE HELLAS-KOMMANDANTIN', text: 'Der Gleiter ist zu nah! Haltet ihn vom Landeplatz fern!' }],
    A2_M04: [{ on: 'collect', voice: 'UNSERE BIOLOGIN', text: 'Erstes Archiv gesichert. Weiter zu den anderen Speichern!' }],
    A2_M05: [{ on: 'holdHalf', voice: 'GEMEINSAMER FUNKKANAL', text: 'Halbzeit an den Pumpen. Haltet die Verbindung!' }, { on: 'holdLost', voice: 'GEMEINSAMER FUNKKANAL', text: 'Kontakt verloren! Beide Pumpen müssen neu besetzt werden.' }],
    A3_M01: [{ on: 'switch:one', voice: 'UNSERE BIOLOGIN', text: 'Erster Schalter offen. Jetzt bloß nicht zu früh weiter.' }, { on: 'alarm:three', voice: 'UNSERE BIOLOGIN', text: 'Vorsicht, das Tor ist noch gesperrt!' }],
    A3_M03: [{ on: 'alarm:west', voice: 'DIE HELLAS-KOMMANDANTIN', text: 'Die Front ist fast am westlichen Rettungsplatz!' }, { on: 'alarm:east', voice: 'DIE HELLAS-KOMMANDANTIN', text: 'Die Front ist fast am östlichen Rettungsplatz!' }],
    A3_M04: [{ on: 'collect', voice: 'UNSERE BIOLOGIN', text: 'Erster Speicher geborgen. Achtet auf den roten Streifen.' }, { on: 'alarm:seal', voice: 'UNSERE BIOLOGIN', text: 'Zu nah an der Quarantäne!' }],
    A3_M05: [{ on: 'holdHalf', voice: 'GEMEINSAMER FUNKKANAL', text: 'Acht Generationen. Die Relais halten.' }],
    A4_M01: [{ on: 'captured:fort', voice: 'DIE HELLAS-KOMMANDANTIN', text: 'Das Sperrcamp ist gefallen. Jetzt den Rückweg halten.' }],
    A4_M02: [{ on: 'houseDefeated:3', voice: 'UNSERE BIOLOGIN', text: 'Beide Camps gesichert. Die gelbe Nachsaat ist gestoppt.' }, { on: 'scenario:flood', voice: 'UNSERE BIOLOGIN', text: 'Die Flutung beginnt. Wildwuchs dringt in die Wasserader!' }],
    A4_M03: [{ on: 'alarm:west', voice: 'DIE HELLAS-KOMMANDANTIN', text: 'Gleiter halten auf den westlichen Rettungsplatz zu!' }, { on: 'alarm:east', voice: 'DIE HELLAS-KOMMANDANTIN', text: 'Gleiter halten auf den östlichen Rettungsplatz zu!' }],
    A4_M04: [{ on: 'alarm:civilians', voice: 'UNSERE BIOLOGIN', text: 'Viridion zielt auf die Zivilstation!' }, { on: 'houseDefeated:2', voice: 'UNSERE BIOLOGIN', text: 'Viridion sät nicht mehr nach.' }],
    A4_M05: [{ on: 'scenario:storm', voice: 'GEMEINSAMER FUNKKANAL', text: 'Der Sturmstoß ist da. Schützt den Rettungsplatz!' }],
    A5_M01: [{ on: 'cache:depot', voice: 'DIE HELLAS-KOMMANDANTIN', text: 'Notvorrat geborgen. Das hilft in der nächsten Phase.' }]
};
CAMPAIGN_MISSIONS.forEach(m => { m.radio = MISSION_RADIO[m.id] || []; });
