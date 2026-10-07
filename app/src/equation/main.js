// Equation lab (equation.html): equation mode on its own, with a small lab
// bar for choosing the scenario and tile. The main app will open the same
// view for its selected tile.
import { el } from '../ui/dom.js';
import { indexIntersections, resolveMeta, cellKey } from '../model/processGrid.js';
import { createScenario, sanitizeScenario } from '../storage/scenarioSchema.js';
import { loadLibrary } from '../storage/localStorage.js';
import { createStressControls } from '../ui/stressControls.js';
import { gradientCss } from '../ui/colorScale.js';
import { createEquationMode } from './equationMode.js';

const loadJSON = (f) => fetch(new URL(`../data/${f}`, import.meta.url), { cache: 'no-cache' }).then((r) => r.json());
const [rows, columns, intersections, presetsFile, config] = await Promise.all(
  ['rows.json', 'columns.json', 'intersections.json', 'presets.json', 'model-config.json'].map(loadJSON));
const presets = presetsFile.presets.filter((p) => p.id !== 'blank');
const index = indexIntersections(intersections);
const ctx = { rows, columns, index, config };
const metadataVersion = intersections.metadataVersion;
const validKeys = new Set(rows.flatMap((r) => columns.map((c) => cellKey(r.id, c.id))));
let palette = 'standard';
try { palette = JSON.parse(localStorage.getItem('architecture-under-load.prefs.v1') || '{}').palette ?? 'standard'; } catch {}

// Sources: archetypes, plus scenarios saved by the main app (read-only here).
const saved = [];
const stored = loadLibrary();
if (stored) for (const raw of Object.values(stored.scenarios)) {
  try { saved.push(sanitizeScenario(raw, { validKeys, metadataVersion })); } catch {}
}
const sourceFor = (value) => {
  const [kind, id] = value.split(':');
  if (kind === 'preset') { const p = presets.find((x) => x.id === id); return createScenario({ name: p.name, preset: p, metadataVersion }); }
  return structuredClone(saved.find((s) => s.id === id));
};

let scenario = sourceFor('preset:county_jail');
let key = 'spatial_granularity:sleep_rest';
const eq = createEquationMode(document.getElementById('equation'), { ctx, palette });

// ── Lab bar ──────────────────────────────────────────────────────────────
const sourceSelect = el('select', { id: 'source', 'aria-label': 'Scenario' },
  el('optgroup', { label: 'Archetypes' }, presets.map((p) => el('option', { value: `preset:${p.id}`, text: p.name }))),
  saved.length ? el('optgroup', { label: 'Saved scenarios' }, saved.map((s) => el('option', { value: `saved:${s.id}`, text: s.name }))) : null);
sourceSelect.value = 'preset:county_jail';
const tileSelect = el('select', { id: 'tile', 'aria-label': 'Tile' },
  rows.map((r) => el('optgroup', { label: r.label },
    columns.filter((c) => resolveMeta(index, r.id, c.id, config).applicable)
      .map((c) => el('option', { value: cellKey(r.id, c.id), text: `${r.label} × ${c.label}` })))));
tileSelect.value = key;
sourceSelect.addEventListener('change', () => { scenario = sourceFor(sourceSelect.value); stress.set(scenario); eq.show(scenario, key); });
tileSelect.addEventListener('change', () => { key = tileSelect.value; eq.show(scenario, key); });
document.getElementById('labbar').replaceChildren(
  el('span', { class: 'lab-tag', text: 'Lab' }),
  el('label', { for: 'source', text: 'Scenario' }), sourceSelect,
  el('label', { for: 'tile', text: 'Tile' }), tileSelect);

// ── Header sliders (as in the app) ───────────────────────────────────────
const stress = createStressControls(document.getElementById('stress'), {
  config,
  onChange: (patch) => {
    if ('durationHours' in patch) scenario.durationHours = patch.durationHours;
    if ('loadRatio' in patch) scenario.loadRatio = patch.loadRatio;
    if ('designCapacity' in patch) scenario.designCapacity = patch.designCapacity;
    if ('currentPopulation' in patch) scenario.currentPopulation = patch.currentPopulation;
    stress.set(scenario);
    eq.update(scenario);
  },
});
for (const r of document.querySelectorAll('.legend-ramp')) r.style.background = gradientCss(palette);
const band = document.querySelector('.stress-band');
new ResizeObserver(() => document.documentElement.style.setProperty('--band-h', `${Math.round(band.getBoundingClientRect().height)}px`)).observe(band);

stress.set(scenario);
eq.show(scenario, key);
