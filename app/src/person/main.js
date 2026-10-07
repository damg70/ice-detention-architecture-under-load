// Standalone person view (person.html): the shared person mode with its own
// scenario and capacity pickers. The main app opens the same view from a
// Network capacity node.
import { el } from '../ui/dom.js';
import { indexIntersections, cellKey } from '../model/processGrid.js';
import { createScenario, sanitizeScenario } from '../storage/scenarioSchema.js';
import { loadLibrary } from '../storage/localStorage.js';
import { createStressControls } from '../ui/stressControls.js';
import { createPersonMode } from './personMode.js';

const loadJSON = (f) => fetch(new URL(`../data/${f}`, import.meta.url), { cache: 'no-cache' }).then((r) => r.json());
const [rows, columns, intersections, presetsFile, config] = await Promise.all(
  ['rows.json', 'columns.json', 'intersections.json', 'presets.json', 'model-config.json'].map(loadJSON));
const presets = presetsFile.presets.filter((p) => p.id !== 'blank');
const ctx = { rows, columns, index: indexIntersections(intersections), config };
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
  if (kind === 'preset') return createScenario({ name: presets.find((p) => p.id === id).name, preset: presets.find((p) => p.id === id), metadataVersion });
  return structuredClone(saved.find((s) => s.id === id));
};

let scenario = sourceFor('preset:purpose_built');
let capacityId = 'wet_core';
const person = await createPersonMode(document.getElementById('person'), { ctx, palette });

const sourceSelect = el('select', { id: 'source', 'aria-label': 'Scenario' },
  el('optgroup', { label: 'Archetypes' }, presets.map((p) => el('option', { value: `preset:${p.id}`, text: p.name }))),
  saved.length ? el('optgroup', { label: 'Saved scenarios' }, saved.map((s) => el('option', { value: `saved:${s.id}`, text: s.name }))) : null);
sourceSelect.value = 'preset:purpose_built';
sourceSelect.addEventListener('change', () => { scenario = sourceFor(sourceSelect.value); stress.set(scenario); person.show(scenario, capacityId); });

const capSelect = el('select', { id: 'capacity', 'aria-label': 'Architectural capacity' },
  rows.map((r) => el('option', { value: r.id, text: r.label })));
capSelect.value = capacityId;
capSelect.addEventListener('change', () => { capacityId = capSelect.value; person.show(scenario, capacityId); });

const stressHost = el('div', { class: 'stress person-stress' });
const stress = createStressControls(stressHost, {
  config,
  onChange: (patch) => {
    if ('durationHours' in patch) scenario.durationHours = patch.durationHours;
    if ('loadRatio' in patch) scenario.loadRatio = patch.loadRatio;
    stress.set(scenario);
    person.update(scenario);
  },
});

const panel = el('aside', { class: 'panel overlay controls' });
document.getElementById('person').append(panel);
panel.replaceChildren(
  el('h1', { text: 'Person view' }),
  el('label', { class: 'field-label', for: 'source', text: 'Scenario' }), sourceSelect,
  el('label', { class: 'field-label', for: 'capacity', text: 'Architectural capacity' }), capSelect,
  stressHost, person.note);
stress.set(scenario);
person.show(scenario, capacityId);
