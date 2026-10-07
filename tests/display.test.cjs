// tests/display.test.cjs
// Ebene 5c: Vollbild-Wunsch und einklappbare Seitenspalte (ohne Browser)
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const store = new Map();
let blocked = false;
const localStorage = {
    getItem: k => { if (blocked) throw new Error('blocked'); return store.has(k) ? store.get(k) : null; },
    setItem: (k, v) => { if (blocked) throw new Error('blocked'); store.set(k, String(v)); }
};
const ctx = vm.createContext({ console, localStorage, document: {}, location: {}, navigator: {}, matchMedia: () => ({ matches: false }) });
vm.runInContext(fs.readFileSync('js/ui/DisplayControls.js', 'utf8') + '\nthis.DisplayControls = DisplayControls;', ctx);
const D = ctx.DisplayControls;

// Folding: 'closed' always, 'auto' only during the evolution and only with the option on.
for (const phase of ['placement', 'simulation', 'gameover']) {
    for (const autoRail of [true, false]) {
        assert.equal(D.effective('closed', phase, autoRail), true);
        assert.equal(D.effective('open', phase, autoRail), false);
        assert.equal(D.effective('auto', phase, autoRail), autoRail && phase === 'simulation');
    }
}
// Opening during the evolution keeps the column open for later evolutions; opening while planning returns to auto.
assert.equal(D.nextPref(true, 'simulation'), 'open');
assert.equal(D.effective(D.nextPref(true, 'simulation'), 'simulation', true), false);
assert.equal(D.nextPref(true, 'placement'), 'auto');
assert.equal(D.nextPref(false, 'placement'), 'closed');
assert.equal(D.nextPref(false, 'simulation'), 'closed');

// Persistence: defaults, validation of unknown values, blocked storage never throws.
assert.deepEqual({ ...D.readLayout() }, { side: 'auto', autoRail: true });
assert.equal(D.writeLayout({ side: 'closed' }), true);
assert.equal(D.readLayout().side, 'closed');
assert.equal(D.writeLayout({ autoRail: false }), true);
assert.deepEqual({ ...D.readLayout() }, { side: 'closed', autoRail: false });
store.set(D.LAYOUT_KEY, JSON.stringify({ side: 'sideways', autoRail: 'yes' }));
assert.deepEqual({ ...D.readLayout() }, { side: 'auto', autoRail: true });
store.set(D.LAYOUT_KEY, '{broken');
assert.deepEqual({ ...D.readLayout() }, { side: 'auto', autoRail: true });
blocked = true;
assert.deepEqual({ ...D.readLayout() }, { side: 'auto', autoRail: true });
assert.equal(D.writeLayout({ side: 'open' }), false);
blocked = false;

console.log('PASS: Seitenspalte faltet nur bei Bedarf, manuelle Wahl bleibt, Speicherfehler werden abgefangen');
