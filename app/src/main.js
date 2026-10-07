import { el } from './ui/dom.js';
import { processGrid, indexIntersections, cellKey } from './model/processGrid.js';
import { MODEL_VERSION } from './model/processCell.js';
import { createGrid } from './ui/grid.js';
import { createStressControls } from './ui/stressControls.js';
import { createInspector } from './ui/cellInspector.js';
import { createAppMenu } from './ui/appMenu.js';
import { createNetworkView } from './ui/networkView.js';
import { createNodePanel } from './ui/nodePanel.js';
import { createEquationMode } from './equation/equationMode.js';
import { buildNetwork } from './model/network.js';
import { gradientCss } from './ui/colorScale.js';
import { createScenario, duplicateScenario, sanitizeScenario } from './storage/scenarioSchema.js';
import { loadLibrary, saveLibrary } from './storage/localStorage.js';
import { exportScenario, readScenarioFile } from './storage/importExport.js';

const PREFS_KEY = 'architecture-under-load.prefs.v1';
// An edited archetype is named after it: "Custom (County-jail insertion)".
const customName = (p) => `Custom (${p.name})`;
function renameIfArchetype(s) {
  const p = s.archetype !== 'blank' && presetById.get(s.archetype);
  // 'Custom form' was the default name in earlier 2026-10-05 builds.
  if (p && [p.name, 'Custom form', `Custom form (${p.name})`].includes(s.name)) s.name = customName(p);
}
const loadJSON = (f) => fetch(new URL(`./data/${f}`, import.meta.url), { cache: 'no-cache' }).then((r) => r.json());

const [rows, columns, intersections, presetsFile, config] = await Promise.all(
  ['rows.json', 'columns.json', 'intersections.json', 'presets.json', 'model-config.json'].map(loadJSON));
const presets = presetsFile.presets;
const presetById = new Map(presets.map((p) => [p.id, p]));
const index = indexIntersections(intersections);
const ctx = { rows, columns, index, config };
const validKeys = new Set(rows.flatMap((r) => columns.map((c) => cellKey(r.id, c.id))));
const metadataVersion = intersections.metadataVersion;

// ── State ────────────────────────────────────────────────────────────────
let prefs = { palette: 'standard', showValues: false };
try { prefs = { ...prefs, ...JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') }; } catch {}
const savePrefs = () => { try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch {} };

let lib = { currentId: null, scenarios: {} };
const stored = loadLibrary();
if (stored) {
  for (const raw of Object.values(stored.scenarios)) {
    try {
      const s = sanitizeScenario(raw, { validKeys, metadataVersion });
      s.name = s.name.replace(/ — form$/, ''); // older default names carried this suffix
      if (s.archetypeEdited) renameIfArchetype(s);
      lib.scenarios[s.id] = s;
    } catch {}
  }
  lib.currentId = lib.scenarios[stored.currentId] ? stored.currentId : Object.keys(lib.scenarios)[0] ?? null;
}
if (!lib.currentId) {
  const s = createScenario({ name: presetById.get('short_term_holding').name, preset: presetById.get('short_term_holding'), metadataVersion });
  lib.scenarios[s.id] = s;
  lib.currentId = s.id;
}
let selected = null;      // cell key (grid cell or network edge)
let selectedNode = null;  // 'capacity:id' | 'domain:id' (network view)
const personHash = (h) => { const m = /^#person\/(\w+)$/.exec(h); return m && rows.some((r) => r.id === m[1]) ? m[1] : null; };
// #equation/<row>:<col>, for an applicable cell only.
const equationHash = (h) => { const m = /^#equation\/(\w+:\w+)$/.exec(h); return m && validKeys.has(m[1]) && index.get(m[1])?.applicable !== false ? m[1] : null; };
let view = location.hash === '#network' || personHash(location.hash) ? 'network' : 'grid';
const current = () => lib.scenarios[lib.currentId];

let saveTimer = null;
function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    if (!saveLibrary(lib)) setStatus('Local storage unavailable — use Export to keep this scenario', { sticky: true });
  }, 250);
}

// ── Mutations ────────────────────────────────────────────────────────────
// The first edit to a form's cells makes it Custom. A title
// still carrying the archetype's name takes a custom one.
function markCustom(s) {
  if (s.archetypeEdited) return;
  s.archetypeEdited = true;
  renameIfArchetype(s);
}
const isCustom = (s) => s.archetypeEdited || !presetById.has(s.archetype);

function setBaseline(key, baseline) {
  if (index.get(key)?.applicable === false) return;
  const s = current();
  const prev = s.cells[key] ?? {};
  if (baseline == null) {
    const { note, meta } = prev;   // a note or this tile's own sensitivities outlive the baseline
    if (note || meta) s.cells[key] = { marked: false, ...(note && { note }), ...(meta && { meta }) };
    else delete s.cells[key];
  } else {
    s.cells[key] = { ...prev, marked: true, baseline };
  }
  markCustom(s);
  selected = key;
  update();
  persist();
}

function cycle(key) {
  const cell = current().cells[key];
  const b = cell?.marked ? cell.baseline : null;
  setBaseline(key, b == null ? 0 : b === 4 ? null : b + 1);
}

function setNote(key, text) {
  const s = current();
  const prev = s.cells[key] ?? { marked: false };
  const next = { ...prev, note: text };
  if (!text) delete next.note;
  if (!next.marked && !next.note && !next.meta) delete s.cells[key];
  else s.cells[key] = next;
  grid.update(processGrid(ctx, s), s, { selected, ...prefs });
  persist();
}

function patchLoad(patch) {
  const s = current();
  if ('durationHours' in patch) s.durationHours = patch.durationHours;
  if ('designCapacity' in patch) s.designCapacity = patch.designCapacity;
  if ('currentPopulation' in patch) s.currentPopulation = patch.currentPopulation;
  if ('loadRatio' in patch) {
    s.loadRatio = patch.loadRatio;
    if (patch.fromSlider && s.designCapacity) s.currentPopulation = Math.round(s.loadRatio * s.designCapacity);
  }
  update();
  persist();
}

function addScenario(s) {
  lib.scenarios[s.id] = s;
  lib.currentId = s.id;
  selected = null;
  update();
  persist();
}

const isEmpty = (s) => !Object.keys(s.cells).length && !s.note;

// "Name", or "Name (2)", "Name (3)"… when the name is already in the library.
function uniqueName(name) {
  const taken = new Set(Object.values(lib.scenarios).map((x) => x.name));
  if (!taken.has(name)) return name;
  let n = 2;
  while (taken.has(`${name} (${n})`)) n += 1;
  return `${name} (${n})`;
}

// Transient messages beside the app menu (import results, new scenarios).
const statusEl = document.getElementById('status');
let statusTimer = null;
function setStatus(text, { sticky = false } = {}) {
  clearTimeout(statusTimer);
  statusEl.textContent = text;
  if (!sticky) statusTimer = setTimeout(() => { statusEl.textContent = ''; }, 5000);
}

function loadPreset(id) {
  const p = presetById.get(id);
  const s = current();
  const fresh = createScenario({ name: p.name, preset: p, metadataVersion });
  if (isEmpty(s)) {
    // Replace an empty scenario in place rather than accumulating copies.
    Object.assign(s, { ...fresh, id: s.id });
    selected = null;
    update();
    persist();
  } else {
    fresh.name = uniqueName(fresh.name);
    addScenario(fresh);
    setStatus(`Opened as a new scenario; “${s.name}” is kept in the Scenario menu`);
  }
}

// ── Components ───────────────────────────────────────────────────────────
const grid = createGrid(document.getElementById('grid'), {
  rows, columns, config,
  onSelect: (key) => { selected = key; update(); },
  onCycle: cycle,
  onSetBaseline: setBaseline,
  onClear: () => { selected = null; update(); },
});
const networkView = createNetworkView(document.getElementById('network'), {
  rows, columns, config,
  onSelectNode: (kind, id) => { selectedNode = kind ? `${kind}:${id}` : null; selected = null; update(); },
  onOpenNode: (kind, id) => openFromNetwork(id),
  onSelectEdge: (key) => { selected = key; selectedNode = null; update(); },
});
const nodePanel = createNodePanel(document.getElementById('node-panel'), {
  rows, columns, config,
  onSelectEdge: (key) => { selected = key; selectedNode = null; update(); },
  onOpenNode: (id) => openFromNetwork(id),
});
const stress = createStressControls(document.getElementById('stress'), { config, onChange: patchLoad });
const inspector = createInspector(document.getElementById('inspector'), {
  rows, columns, config, onSetBaseline: setBaseline, onNote: setNote,
  onOpenEquation: (key) => openFromInspector(key),
});
const appMenu = createAppMenu(document.getElementById('app-menu'), {
  onSwitch: (id) => { lib.currentId = id; selected = null; update(); persist(); },
  onNew: () => addScenario(createScenario({ name: 'Untitled Form', metadataVersion })),
  onDuplicate: () => addScenario(duplicateScenario(current())),
  onReset: () => {
    const s = current();
    const p = presetById.get(s.archetype);
    const what = p && p.id !== 'blank' ? `the “${p.name}” archetype` : 'a blank model';
    if (!confirm(`Reset “${s.name}” to ${what}? Cell baselines and cell notes will be replaced. The scenario note is kept.`)) return;
    const name = p && p.id !== 'blank' && s.name === customName(p) ? p.name : s.name;
    const fresh = createScenario({ name, preset: p && p.id !== 'blank' ? p : null, metadataVersion });
    Object.assign(s, { ...fresh, id: s.id, note: s.note });
    update();
    persist();
  },
  onDelete: () => {
    const s = current();
    if (!confirm(`Delete “${s.name}” from this browser? Export it first if you want to keep it.`)) return;
    delete lib.scenarios[s.id];
    const next = Object.keys(lib.scenarios)[0];
    if (next) { lib.currentId = next; selected = null; update(); persist(); }
    else addScenario(createScenario({ name: 'Untitled Form', metadataVersion }));
  },
  onExport: () => exportScenario({ ...current(), modelVersion: MODEL_VERSION, metadataVersion }),
  onImport: async (file) => {
    try {
      const notes = [];
      const s = sanitizeScenario(await readScenarioFile(file), { validKeys, metadataVersion, notes });
      s.id = createScenario({ metadataVersion }).id; // never overwrite an existing scenario
      s.name = uniqueName(s.name);
      addScenario(s);
      if (s.modelVersion !== MODEL_VERSION) notes.push(`made with model v${s.modelVersion}; now processed by v${MODEL_VERSION}`);
      if (s.metadataVersion !== metadataVersion) notes.push(`metadata ${s.metadataVersion} differs from current ${metadataVersion}`);
      setStatus(`Imported “${s.name}”${notes.length ? ` — ${notes.join('; ')}` : ''}`);
    } catch (err) {
      setStatus(`Import failed: ${err.message}`);
    }
  },
});

// Title: the scenario name. An untouched archetype keeps its own name; once
// the form is custom (or blank) the name is editable in place.
const nameInput = document.getElementById('scenario-name');
const sizeName = () => { nameInput.size = Math.max(8, nameInput.value.length + 1); };
nameInput.addEventListener('input', sizeName);
nameInput.addEventListener('change', () => { current().name = nameInput.value.trim() || 'Untitled Form'; update(); persist(); });
nameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === 'Escape') nameInput.blur(); });

const archetypeSelect = document.getElementById('archetype-select');
archetypeSelect.addEventListener('change', () => loadPreset(archetypeSelect.value));
function renderArchetypeSelect(s) {
  const custom = isCustom(s);
  archetypeSelect.replaceChildren(
    ...(custom ? [el('option', { value: '', text: 'Custom', disabled: true })] : []),
    ...presets.map((p) => el('option', { value: p.id, text: p.name })));
  archetypeSelect.value = custom ? '' : s.archetype;
}

// Scenario note (§18)
const scenarioNote = el('textarea', { id: 'scenario-note-text', rows: 3, placeholder: 'e.g. “Testing a soft-sided form with unusually good outdoor access.”' });
scenarioNote.addEventListener('input', () => { current().note = scenarioNote.value; persist(); });
document.getElementById('scenario-note').replaceChildren(
  el('h2', { class: 'panel-title' }, el('label', { for: 'scenario-note-text', text: 'Scenario note' })), scenarioNote);

// Display options + legend
const valuesToggle = document.getElementById('opt-values');
const paletteToggle = document.getElementById('opt-palette');
valuesToggle.checked = prefs.showValues;
paletteToggle.checked = prefs.palette === 'colorblind';
valuesToggle.addEventListener('change', () => { prefs.showValues = valuesToggle.checked; savePrefs(); update(); });
paletteToggle.addEventListener('change', () => { prefs.palette = paletteToggle.checked ? 'colorblind' : 'standard'; savePrefs(); update(); });

// Grid → network → person: one horizontal track; inactive views are inert.
// The Person tab appears once a person has been opened. It opens from the
// network only (the selected capacity, else the last one opened), so it is
// disabled in the grid.
const views = document.getElementById('views');
const tabs = [...document.querySelectorAll('.view-switch [data-view]')];
const personTab = document.getElementById('tab-person');
const equationTab = document.getElementById('tab-equation');
let lastPerson = null;
const personTarget = () => (selectedNode?.startsWith('capacity:') ? selectedNode.slice('capacity:'.length) : lastPerson);
function renderTabs() {
  for (const t of tabs) {
    const on = t.dataset.view === view;
    t.setAttribute('aria-selected', on ? 'true' : 'false');
    t.classList.toggle('on', on);
  }
  personTab.hidden = !lastPerson;
  personTab.disabled = view === 'grid' || (view === 'network' && !personTarget());
  equationTab.hidden = !lastEquation;
  equationTab.disabled = view !== 'equation' && !equationTarget();
  const visible = tabs.filter((t) => !t.hidden);
  for (const t of tabs) t.classList.toggle('end', t === visible[visible.length - 1] && t !== tabs[tabs.length - 1]);
}
function setView(next, { push = true } = {}) {
  view = next;
  views.dataset.view = view;
  for (const v of ['grid', 'network', 'person', 'equation']) document.getElementById(`view-${v}`).inert = view !== v;
  if (view !== 'person') closePerson();
  if (view !== 'equation') equation.hide();
  if (view === 'grid' && refocusCell) {
    const key = refocusCell; refocusCell = null;
    requestAnimationFrame(() => document.querySelector(`#grid [data-key="${key}"]`)?.focus({ preventScroll: true }));
  }
  if (push) history.replaceState(null, '', view === 'network' ? '#network' : location.pathname + location.search);
  update();
}
for (const t of tabs) t.addEventListener('click', () => {
  if (t.dataset.view === view) return;
  if (t.dataset.view === 'person') { if (view === 'network' && personTarget()) openFromNetwork(personTarget()); return; }
  if (t.dataset.view === 'equation') { if (equationTarget()) openFromInspector(equationTarget()); return; }
  const go = () => { pushedPerson = false; pushedEquation = false; setView(t.dataset.view); };
  if (view === 'equation') leaveEquation(go); else go();
});

// ── Person view ──────────────────────────────────────────────────────────
// Opening a capacity node slides the person view in after the network, with
// its panel in the side column. The header and stress band stay live: their
// sliders set the person's load. three.js loads on first open.
const personRoot = document.getElementById('person-view');
const personPanel = document.getElementById('person-panel');
let person = null, personLoading = null, pushedPerson = false;
// The scene fills the window below the header and stress band.
const placePerson = () => document.documentElement.style.setProperty('--person-top', `${Math.round(views.getBoundingClientRect().top + scrollY)}px`);
new ResizeObserver(placePerson).observe(document.body);

function openFromNetwork(id) {
  pushedPerson = true;
  location.hash = `#person/${id}`;   // routes through hashchange; Back closes it
}

function requestClosePerson() {
  if (pushedPerson) { pushedPerson = false; history.back(); return; }
  setView('network');
}

async function openPerson(id) {
  selectedNode = `capacity:${id}`;
  selected = null;
  personLoading ??= import('./person/personMode.js')
    .then((m) => m.createPersonMode(personRoot, { ctx, palette: prefs.palette, onEscape: requestClosePerson }));
  person = await personLoading;
  if (personHash(location.hash) !== id) return;   // closed or switched while loading
  lastPerson = id;
  person.setPalette(prefs.palette);
  person.show(current(), id);
  personPanel.replaceChildren(
    el('button', { type: 'button', class: 'person-back', onclick: requestClosePerson }, '← Network'),
    el('h2', { class: 'panel-title', text: 'Architectural capacity' }),
    el('h3', { class: 'cell-title', text: rows.find((r) => r.id === id).label }),
    person.daybar,
    person.note);
  setView('person', { push: false });
  scrollTo(0, 0);
  person.stage.focus({ preventScroll: true });
}

// Called by setView whenever the view leaves the person.
function closePerson() {
  if (!person?.isOpen) return;
  const id = person.capacityId;
  person.hide();
  requestAnimationFrame(() => {
    if (view === 'network') document.querySelector(`#network [data-node="capacity:${id}"]`)?.focus({ preventScroll: true });
  });
}

// ── Equation mode ────────────────────────────────────────────────────────
// "See the math" on a selected cell opens its equation, the fourth view in
// the track, with its graph in the side column. Edits there are a sandbox;
// the header sliders and scenario stay live. Grid, Network or Escape leave.
let lastEquation = null, pushedEquation = false;
const isApplicable = (key) => key && index.get(key)?.applicable !== false;
const equationTarget = () => (isApplicable(selected) ? selected : lastEquation);
const equationPanel = document.getElementById('equation-panel');
const equation = createEquationMode(document.getElementById('equation-view'), { ctx, palette: prefs.palette, sideHost: equationPanel });

function openFromInspector(key) {
  pushedEquation = true;
  location.hash = `#equation/${key}`;   // routes through hashchange; Back closes it
}
let refocusCell = null;   // the cell to focus once the grid is back
function requestCloseEquation() {
  leaveEquation(() => {
    refocusCell = equation.key;
    if (pushedEquation) { pushedEquation = false; leavingByBack = true; history.back(); }
    else setView('grid');
  });
}

// Leaving equation mode saves its edits to the scenario. The tile's own
// baseline and sensitivities are saved as they are; a change to a
// model-wide constant affects every tile in the scenario, so it is
// confirmed first (Apply, Discard, or Stay).
function saveEquation({ applyModel }) {
  const p = equation.pending();
  if (!p) return;
  const s = current();
  let wrote = false;
  if (p.tileChanged) {
    const prev = s.cells[p.key] ?? {};
    const next = { ...prev };
    if (p.baselineChanged) {
      if (p.baseline == null) { next.marked = false; delete next.baseline; } else { next.marked = true; next.baseline = p.baseline; }
    }
    if (Object.keys(p.meta).length) next.meta = p.meta; else delete next.meta;
    if (!next.marked && !next.note && !next.meta) delete s.cells[p.key]; else s.cells[p.key] = { marked: !!next.marked, ...next };
    wrote = true;
  }
  if (applyModel && p.modelChanges.length) {
    const model = { ...(s.model ?? {}) };
    for (const c of p.modelChanges) { if (c.to === c.authored) delete model[c.field]; else model[c.field] = c.to; }
    if (Object.keys(model).length) s.model = model; else delete s.model;
    wrote = true;
  }
  equation.clearEdits();
  if (wrote) { markCustom(s); persist(); }
}

let leavingByBack = false;
const confirmDialog = el('dialog', { class: 'confirm-dialog', 'aria-labelledby': 'confirm-title' });
document.body.append(confirmDialog);
function leaveEquation(proceed, stay = () => {}) {
  const p = equation.pending();
  if (!p?.modelChanges.length) { saveEquation({ applyModel: false }); proceed(); return; }
  const list = p.modelChanges.map((c) => `${c.name.toLowerCase()} from ${c.from.toFixed(2)} to ${c.to.toFixed(2)}`).join(' and ');
  const finish = (choice) => {
    confirmDialog.close();
    if (choice === 'stay') { stay(); return; }
    if (choice === 'discard') equation.discardModelEdits();
    saveEquation({ applyModel: choice === 'apply' });
    proceed();
  };
  confirmDialog.replaceChildren(
    el('h2', { id: 'confirm-title', text: 'Change the model for this scenario?' }),
    el('p', { text: `You changed the ${list}. This affects all 130 tiles in “${current().name}”, not only this one.` }),
    el('div', { class: 'confirm-actions' },
      el('button', { type: 'button', class: 'primary', onclick: () => finish('apply') }, 'Apply to all tiles'),
      el('button', { type: 'button', onclick: () => finish('discard') }, 'Discard this change'),
      el('button', { type: 'button', onclick: () => finish('stay') }, 'Stay in equation mode')));
  confirmDialog.oncancel = (e) => { e.preventDefault(); finish('stay'); };   // Escape = stay
  confirmDialog.showModal();
}
// A reload or closed tab keeps the tile's edits; an unconfirmed model change is dropped.
addEventListener('pagehide', () => {
  if (view !== 'equation') return;
  equation.discardModelEdits();
  saveEquation({ applyModel: false });
  saveLibrary(lib);   // now, not after the usual short delay
});
function openEquation(key) {
  selected = key;
  lastEquation = key;
  equation.setPalette(prefs.palette);
  equation.show(current(), key);
  setView('equation', { push: false });
  scrollTo(0, 0);
}
addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && view === 'equation' && !confirmDialog.open && !e.defaultPrevented && !e.target.closest?.('input, textarea, select')) requestCloseEquation();
});

function route() {
  const eqKey = equationHash(location.hash);
  if (eqKey) { openEquation(eqKey); return; }
  if (view === 'equation' && !leavingByBack) {
    // Left with the browser's Back button: confirm first, and if the user
    // stays, put the equation's address back without reloading it.
    const key = equation.key;
    leaveEquation(() => { pushedEquation = false; routeAway(); },
      () => { history.pushState(null, '', `#equation/${key}`); pushedEquation = true; });
    return;
  }
  leavingByBack = false;
  routeAway();
}
function routeAway() {
  pushedEquation = false;
  const id = personHash(location.hash);
  if (id) { openPerson(id); return; }
  pushedPerson = false;
  setView(location.hash === '#network' ? 'network' : 'grid', { push: false });
}
window.addEventListener('hashchange', route);

// The stress band's height, for what sits below it when it sticks.
const band = document.querySelector('.stress-band');
new ResizeObserver(() => document.documentElement.style.setProperty('--band-h', `${Math.round(band.getBoundingClientRect().height)}px`)).observe(band);

// ── Render ───────────────────────────────────────────────────────────────
function update() {
  const s = current();
  const processed = processGrid(ctx, s);
  grid.update(processed, s, { selected, ...prefs });
  const network = buildNetwork(ctx, processed, s);
  networkView.update(network, { palette: prefs.palette, selectedNode });
  const showNode = view === 'network' && !selected;
  document.getElementById('node-panel').hidden = !showNode;
  document.getElementById('inspector').hidden = showNode || view === 'person' || view === 'equation';
  personPanel.hidden = view !== 'person';
  equationPanel.hidden = view !== 'equation';
  if (showNode) nodePanel.render(selectedNode, network, prefs.palette);
  for (const ul of document.querySelectorAll('#legend-panel [data-for]')) ul.hidden = ul.dataset.for !== view;
  // In the grid, the legend sits under the grid so the side column is only
  // the selected cell; the network and person views keep it in the column.
  const legend = document.getElementById('legend-panel');
  const legendHome = view === 'grid' ? document.getElementById('grid-legend-slot') : document.querySelector('.side');
  if (legend.parentElement !== legendHome) {
    if (view === 'grid') legendHome.append(legend);
    else legendHome.insertBefore(legend, document.getElementById('scenario-note'));
  }
  legend.hidden = view === 'equation';   // the equation colors its own numbers
  valuesToggle.closest('label').hidden = view !== 'grid'; // values print inside grid cells only
  stress.set(s);
  inspector.render(selected, processed, s, prefs.palette);
  appMenu.render(lib, s);
  if (document.activeElement !== nameInput) { nameInput.value = s.name; sizeName(); }
  const editable = isCustom(s) || s.archetype === 'blank' || s.name !== presetById.get(s.archetype)?.name;
  nameInput.readOnly = !editable;
  nameInput.title = editable ? 'Rename' : '';
  nameInput.classList.toggle('editable', editable);
  renderArchetypeSelect(s);
  if (document.activeElement !== scenarioNote) scenarioNote.value = s.note;
  for (const r of document.querySelectorAll('.legend-ramp')) r.style.background = gradientCss(prefs.palette);
  document.documentElement.dataset.palette = prefs.palette;
  if (person?.isOpen) { person.setPalette(prefs.palette); person.update(s); }
  if (view === 'equation') { equation.setPalette(prefs.palette); equation.update(s); }
  renderTabs();
}

setView(view, { push: false });
// From the landing page: #start/<archetype> opens that archetype in the grid.
const start = /^#start\/(\w+)$/.exec(location.hash);
if (start && presetById.has(start[1]) && start[1] !== 'blank') {
  history.replaceState(null, '', location.pathname + location.search);
  loadPreset(start[1]);
}
if (personHash(location.hash)) openPerson(personHash(location.hash));
if (equationHash(location.hash)) openEquation(equationHash(location.hash));
setTimeout(() => views.classList.remove('instant'), 50);
saveLibrary(lib); // persists any schema migrations performed on load
