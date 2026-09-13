// The archive only exposes evidence already recovered by the expedition.
const CAMPAIGN_STORY = {
    title: 'Das Gedächtnis des roten Bodens',
    premise: 'Mars, 2148. Die Wasservorräte der Siedlungen reichen nur noch für einen Winter. Du leitest die Landefähre des Hauses Marineris. Eure Siedlung braucht Wasser. Eine Biologin begleitet dich: Sie untersucht die Pflanzen, die den Mars bewohnbar machen sollen. Schon bei der Landung findet ihr Spuren einer viel älteren Expedition.',
    chapters: [
        {
            voice: 'UNSERE BIOLOGIN',
            briefing: "Du führst die Landefähre des Hauses Marineris. Hier in Chryse, einer weiten Marsebene, soll eure erste Kolonie entstehen. „Ich untersuche unsere Pflanzen“, meldet sich die Biologin. „Unsere Wasservorräte reichen nur noch einen Winter. Finden wir heraus, wie wenige Zellen gemeinsam überleben können.“",
            debriefing: "Die Kolonie hält. Doch die Forschungsboje erkennt ihre Genomkennung. „Jemand hat dieses Experiment schon einmal durchgeführt“, sagt unsere Biologin. Die vermeintliche Neuentdeckung hat eine Vergangenheit.",

        },
        {
            voice: 'UNSERE BIOLOGIN',
            briefing: "Eine stillgelegte Forschungsboje hat unser angeblich neues Genom erkannt. Ihre Spur führt zu einer verlassenen Station. Erweitere dein Einflussgebiet bis dorthin und wecke das Archiv. Wer hat diese Pflanzen schon vor uns auf den Mars gebracht?",
            debriefing: "Das Archiv stammt von 2110: PALISADE, geleitet von der Forscherin Ada Kessler. Es beschreibt unser Genom bis ins Detail. Auftraggeber und Expeditionsende wurden geschwärzt. Eine Spur führt durch die Schlucht.",

        },
        {
            voice: 'DIE LANDEFÄHRE',
            briefing: "Ada Kessler, Leiterin der früheren Expedition PALISADE, hinterließ Koordinaten jenseits dieser Schlucht. Ihr Gleiter-Genom wandert alle vier Generationen ein Feld diagonal. Bringe lebende Flora durch den Pass. Dahinter wächst derselbe Stamm – obwohl dort niemand von uns ausgesät hat.",
            debriefing: "Eine alte Aufzeichnung warnt: „Die Sperren schützen Menschen vor der Forschung.“ Dann funkt Sera Voss, Kommandantin der südlichen Hellas-Siedlungen: „Beenden Sie die Aussaat.“ Was haben wir gerade geöffnet?",

        },
        {
            voice: 'DIE HELLAS-KOMMANDANTIN',
            briefing: "„Dieses Eis versorgt unsere Familien“, warnt Sera Voss, die Hellas-Kommandantin. Auch unsere Siedlung braucht das Wasser. Ein Hellas-Gleiter nähert sich bereits dem Reservoir. Erreiche es zuerst. Warum verteidigt Voss die Leitungen, als wäre unsere Flora eine Gefahr?",
            debriefing: "Das Wasser ist gesichert. Voss zeigt eine überwucherte Kuppel: „Wir halten eine Quarantäne.“ Die Pflanzen kamen durch alte Schächte zurück. Sie jagen niemanden – unsere Leitungen bieten ihnen ideale Wachstumswege.",

        },
        {
            voice: 'UNSERE BIOLOGIN',
            briefing: "Voss sperrt den Außenposten, doch darin liegt der Schlüssel zu den alten Forschungsdaten. Unser Wasser wird knapp. Überwuchere das Camp und sichere die Aufzeichnungen. Hinter der östlichen Felswand wächst unmarkierte Flora. Sie gehört keinem der Häuser.",
            debriefing: "Das Camp ist geräumt. Die Daten beweisen: Tharsis, Betreiber der Energieanlagen, verkaufte alte Genome und löschte ihre Warnungen. Unsere Aussaat hat eine biologische Sperre durchbrochen. Voss funkt: „Sie haben Ihren Durchgang. Helfen Sie uns jetzt.“",

        }
    ]
};
CAMPAIGN_STORY.chapters.forEach((chapter, i) => Object.assign(CAMPAIGN_MISSIONS[i], chapter));
