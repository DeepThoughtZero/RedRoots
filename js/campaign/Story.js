// The archive only exposes evidence already recovered by the expedition.
const CAMPAIGN_STORY = {
    title: 'Das Gedächtnis des roten Bodens',
    premise: 'Mars, 2148. Die Wasservorräte der Siedlungen reichen nur noch für einen Winter. Du leitest die Landefähre des Hauses Marineris. Eure Siedlung braucht Wasser. Eine Biologin begleitet dich: Sie untersucht die Pflanzen, die den Mars bewohnbar machen sollen. Schon bei der Landung findet ihr Spuren einer viel älteren Expedition.',
    chapters: [
        {
            voice: 'UNSERE BIOLOGIN',
            briefing: 'Commander, unsere Wasservorräte reichen bis zum nächsten Winter. Wir sind in Chryse gelandet, einer weiten Ebene auf dem Mars. Hier soll unsere erste Pflanzensiedlung entstehen. Beginnen wir klein. Vier Zellen können etwas, das eine einzelne nicht schafft.',
            debriefing: 'Die erste Kolonie hält. Unsere Biologin lacht zum ersten Mal seit der Landung. Dann empfängt die Landefähre ein Echo aus einer stillgelegten Forschungsboje: dieselbe Kennung wie unser frisch entwickeltes Genom.',
            archive: { title: '01 · Das Echo', text: 'UNSERE BIOLOGIN: „Keine Störung. Die Boje hat unsere Genomkennung erkannt. Jemand hat dieses Experiment schon einmal durchgeführt.“ Empfangsort: Chryse. Absender: unbekannt.' }
        },
        {
            voice: 'UNSERE BIOLOGIN',
            briefing: 'Das Echo führt zu einer Forschungsstation jenseits unserer Landezone. Ihre Batterie erwacht nur unter biologischer Aktivität. Erschließe den Standort mit lebenden Kolonien. Wir brauchen die Messdaten – und eine Erklärung.',
            debriefing: 'Die Station öffnet ein Archiv von 2110: Die frühere Expedition hieß PALISADE. Ada Kessler war ihre Forschungsleiterin. Unser Genom ist dort vollständig dokumentiert. Unsere Biologin flüstert: „Das ist keine neue Erfindung. Man hat uns eine alte gegeben.“',
            archive: { title: '02 · PALISADE, 2110', text: 'DIE FRÜHERE FORSCHUNGSLEITERIN: „B3/S23. Keine Ausnahmen. Wir verändern nicht die Regeln, sondern die Anfangsbedingungen.“ Die Datei enthält den ersten mobilen Stamm. Auftraggeber und Expeditionsende wurden geschwärzt.' }
        },
        {
            voice: 'DIE LANDEFÄHRE',
            briefing: 'Die Koordinaten der alten Forschungsleiterin führen durch einen schmalen Canyon. Das geborgene Gleiter-Genom bewegt sich alle vier Generationen ein Feld diagonal weiter. Bringe es durch den Pass. Auf der anderen Seite sendet ein zweiter, vollkommen identischer Stamm.',
            debriefing: 'Hinter dem Pass wächst derselbe Gleiter ohne unsere Hilfe. Unsere Biologin findet eine alte Warnung: „Nicht mit dem Tal verbinden.“ Noch bevor wir antworten, schaltet sich eine fremde Stimme ein: „An die Landefähre. Hier Sera Voss, Kommandantin des Hauses Hellas. Unsere Siedlungen liegen südlich von Ihnen. Beenden Sie die Aussaat.“',
            archive: { title: '03 · Die versiegelte Schlucht', text: 'DIE FRÜHERE FORSCHUNGSLEITERIN: „Ein einzelnes Muster ist berechenbar. Tausend kollidierende Kolonien sind es für unsere Rechner nicht mehr rechtzeitig. Die Sperrzonen schützen nicht die Forschung vor Menschen. Sie schützen Menschen vor der Forschung.“' }
        },
        {
            voice: 'DIE HELLAS-KOMMANDANTIN',
            briefing: '„Das Eis speist unsere südlichen Kuppeln“, sagt die Hellas-Kommandantin. „Ihre Aussaat bedroht die Leitungen.“ Doch auch Chryse braucht dieses Wasser. Ein Hellas-Gleiter ist bereits unterwegs. Erreiche das Reservoir zuerst, bevor der Streit zur Belagerung wird.',
            debriefing: 'die Landefähre sichert das Reservoir. Unter dem Eis liegen alte Wurzelkanäle. Die Hellas-Kommandantin übermittelt Bilder einer überwucherten Kuppel: „Wir kämpfen nicht um Ihr Patent. Wir halten eine Quarantäne.“ Ihr Außenposten blockiert dennoch unseren Weg zum Hauptarchiv.',
            archive: { title: '04 · Kein feindliches Haus', text: 'DIE HELLAS-KOMMANDANTIN: „Die Flora an unserer Kuppel hat keine Hauskennung. Wir haben sie verbrannt. Drei Wochen später kam sie aus einem anderen Schacht.“ UNSERE BIOLOGIN: „Sie verfolgt niemanden. Wir haben ihr bloß überall dieselben idealen Wachstumsbedingungen gebaut.“' }
        },
        {
            voice: 'UNSERE BIOLOGIN',
            briefing: 'Im Hellas-Außenposten liegt der Zugangsschlüssel zum PALISADE-Netz. Die Hellas-Kommandantin verweigert die Durchfahrt; unser Wasserfenster schließt sich. Nimm das Camp ein und sichere die Aufzeichnungen. Die unmarkierte Flora östlich der Felswand gehört keinem von uns.',
            debriefing: 'Das Camp fällt, seine Besatzung zieht ab. Das Archiv beweist: PALISADE wurde nie vernichtet. Das Haus Tharsis, Betreiber der großen Energieanlagen, kaufte die Daten, löschte die Warnungen und verkaufte die Genome an alle vier Häuser. Unsere Landung hat die biologische Sperre der alten Expedition unterbrochen. Die Hellas-Kommandantin funkt: „Sie haben Ihren Durchgang. Helfen Sie mir jetzt, die Kuppeln zu retten.“ Zum ersten Mal antworten wir auf derselben Frequenz.',
            archive: { title: '05 · Das Gedächtnis des Bodens', text: 'DIE FRÜHERE FORSCHUNGSLEITERIN / LETZTE NACHRICHT: „Die Flora erinnert sich an nichts. Aber jede Generation erbt die Folgen der vorherigen. Das ist genug.“ Anlage: Sperrnetz OLYMPUS. Status: durch neue Kolonien unterbrochen. Nächstes Ziel: die Wasseradern von Hellas.' }
        }
    ]
};
CAMPAIGN_STORY.chapters.forEach((chapter, i) => Object.assign(CAMPAIGN_MISSIONS[i], chapter));
