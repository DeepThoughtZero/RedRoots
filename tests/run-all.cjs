#!/usr/bin/env node
// tests/run-all.cjs
// Zentraler Testläufer für RedRoots
// Führt alle Testebenen hermetisch aus und liefert aggregierte Metriken.

const { spawnSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

// ANSI-Farbcodes für ansprechende Terminalausgabe
const colors = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

const suites = [
    {
        name: 'Ebene 1: Statische Integrität & Hygiene',
        file: 'tests/integrity.test.cjs',
        desc: 'Syntax (node --check), Script-Reihenfolge, Manifeste, Git-Diff'
    },
    {
        name: 'Ebene 2: Kern-Engine & Conway-Simulation',
        file: 'tests/core.test.cjs',
        desc: 'B3/S23, Majority/Neutrality, Felsen, Territorium-BFS, Budget, Undo'
    },
    {
        name: 'Ebene 3: KI-Verhalten & Disziplin',
        file: 'tests/ai.test.cjs',
        desc: 'Budgeteinhaltung, Territoriumsgrenzen, Grenzfälle (Budget 0)'
    },
    {
        name: 'Ebene 4a: Kampagne Akt I (Missionen 1–5)',
        file: 'tests/campaign.test.cjs',
        desc: 'Fünf Szenariolösungen, Extinktion, Zeitfenster, Codes & Persistenz'
    },
    {
        name: 'Ebene 4b: Kampagne Akt II (Missionen 6–10)',
        file: 'tests/act2.test.cjs',
        desc: 'Versorgungsketten, Schleusen, Hold-Zonen, Archive, RR2-Transfer'
    },
    {
        name: 'Ebene 4c: Kampagne Akt III (Missionen 11–15)',
        file: 'tests/act3.test.cjs',
        desc: 'Reihenfolge-Schalter, Pulse-Aussterben, Quarantäne, RR3-Codes'
    },
    {
        name: 'Ebene 4d: Kampagne Akt IV (Missionen 16–20)',
        file: 'tests/act4.test.cjs',
        desc: 'Belagerungen und Schutz gegen tatsächliche schwere KI'
    },
    {
        name: 'Ebene 5a: Audio-Steuerung & Sprachausgabe',
        file: 'tests/audio.test.cjs',
        desc: 'GameAudio, Ambience-Ducking, Tab-Pause, Browser-TTS Fallback'
    },
    {
        name: 'Ebene 5b: Audio-Aufnahmen & Story-Integrität',
        file: 'tests/audio-assets.test.cjs',
        desc: '40 Qwen3-Aufnahmen gegen Storytexte & SHA-256 Prüfsummen'
    }
];

console.log(`\n${colors.bold}${colors.cyan}======================================================${colors.reset}`);
console.log(`${colors.bold}${colors.cyan}   🔴 RedRoots Test-Runner (Qualitätsprüfung)        ${colors.reset}`);
console.log(`${colors.bold}${colors.cyan}======================================================${colors.reset}\n`);

let passedCount = 0;
let failedCount = 0;
const results = [];
const overallStartTime = Date.now();

for (const suite of suites) {
    if (!fs.existsSync(suite.file)) {
        console.log(`${colors.yellow}⚠️  Überspringe ${suite.file} (Datei nicht gefunden)${colors.reset}`);
        continue;
    }

    process.stdout.write(`${colors.bold}▶ ${suite.name}${colors.reset}\n  ${colors.dim}${suite.desc}${colors.reset}\n`);
    const startTime = Date.now();

    const proc = spawnSync(process.execPath, [suite.file], {
        cwd: process.cwd(),
        env: { ...process.env },
        stdio: ['ignore', 'pipe', 'pipe']
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    const stdout = proc.stdout ? proc.stdout.toString() : '';
    const stderr = proc.stderr ? proc.stderr.toString() : '';

    if (proc.status === 0) {
        passedCount++;
        console.log(`  ${colors.green}✔ BESTANDEN${colors.reset} ${colors.dim}(${duration}s)${colors.reset}\n`);
        results.push({ suite: suite.name, status: 'pass', duration });
    } else {
        failedCount++;
        console.log(`  ${colors.red}✖ FEHLGESCHLAGEN${colors.reset} ${colors.dim}(${duration}s)${colors.reset}`);
        if (stdout.trim()) {
            console.log(`${colors.dim}${stdout.trim()}${colors.reset}`);
        }
        if (stderr.trim()) {
            console.log(`${colors.red}${stderr.trim()}${colors.reset}`);
        }
        console.log('');
        results.push({ suite: suite.name, status: 'fail', duration, error: stderr || stdout });
    }
}

const totalDuration = ((Date.now() - overallStartTime) / 1000).toFixed(2);

console.log(`${colors.bold}${colors.cyan}------------------------------------------------------${colors.reset}`);
console.log(`${colors.bold}Testergebnis Zusammenfassung:${colors.reset}`);
console.log(`  Suiten gesamt:       ${suites.length}`);
console.log(`  Erfolgreich:         ${colors.green}${passedCount}${colors.reset}`);
console.log(`  Fehlgeschlagen:      ${failedCount > 0 ? colors.red + failedCount + colors.reset : colors.green + '0' + colors.reset}`);
console.log(`  Gesamtdauer:         ${totalDuration}s`);
console.log(`${colors.bold}${colors.cyan}------------------------------------------------------${colors.reset}\n`);

if (failedCount > 0) {
    console.log(`${colors.bold}${colors.red}❌ QUALITÄTSPRÜFUNG FEHLGESCHLAGEN!${colors.reset}`);
    console.log(`${colors.red}Bitte behebe die obigen Fehler vor dem Push.${colors.reset}\n`);
    process.exit(1);
} else {
    console.log(`${colors.bold}${colors.green}✅ ALLE TESTS ERFOLGREICH BESTANDEN!${colors.reset}`);
    console.log(`${colors.dim}Bereit für den Push auf origin/main.${colors.reset}\n`);
    process.exit(0);
}
