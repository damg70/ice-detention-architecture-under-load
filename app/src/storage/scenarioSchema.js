// User-authored scenario state (§17). Kept separate from model metadata.
// Load values are stored raw (hours, ratio) — never normalized D or P.

import { MODEL_VERSION } from '../model/processCell.js';
import { MODEL_FIELDS, META_FIELDS } from '../model/processGrid.js';

export const SCHEMA_VERSION = 2;


const newId = () => `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

export function createScenario({ name = 'Untitled Form', preset = null, metadataVersion }) {
  const cells = {};
  if (preset) {
    for (const [key, baseline] of Object.entries(preset.cells)) cells[key] = { marked: true, baseline };
  }
  return {
    id: newId(),
    schemaVersion: SCHEMA_VERSION,
    modelVersion: MODEL_VERSION,
    metadataVersion,
    name,
    archetype: preset ? preset.id : 'blank',
    archetypeEdited: false,
    durationHours: preset ? preset.suggestedLoad.durationHours : 24,
    loadRatio: preset ? preset.suggestedLoad.loadRatio : 1,
    designCapacity: null,
    currentPopulation: null,
    note: '',
    cells,
  };
}

export function duplicateScenario(s) {
  return { ...structuredClone(s), id: newId(), name: `${s.name} (copy)` };
}

const num = (x, lo, hi, fallback) => (typeof x === 'number' && isFinite(x) ? Math.min(hi, Math.max(lo, x)) : fallback);
const optNum = (x) => (typeof x === 'number' && isFinite(x) && x > 0 ? x : null);

const level = (x) => (Number.isInteger(x) && x >= 0 && x <= 4 ? x : null);

// Schema 1 → 2: program-to-building fit and capacity elasticity were rows.
// Both are dropped: the baselines already record what a program provided,
// and how a form absorbs crowding (model v3 has no form-wide modifier).
function migrateV1(raw, notes) {
  const cells = Object.entries(raw.cells ?? {});
  const dropped = (row) => cells.filter(([k, c]) => k.startsWith(`${row}:`) && c?.marked).length;
  const elastic = dropped('capacity_elasticity'), fit = dropped('program_fit');
  if (elastic) notes.push(`${elastic} capacity-elasticity cell${elastic === 1 ? '' : 's'} dropped`);
  if (fit) notes.push(`${fit} program-fit cell${fit === 1 ? '' : 's'} dropped`);
  return { ...raw, schemaVersion: 2 };
}

// Numbers within their ranges; null when none are present.
function pickNums(obj, fields) {
  if (!obj || typeof obj !== 'object') return null;
  const out = {};
  for (const [k, [lo, hi]] of Object.entries(fields)) {
    const v = obj[k];
    if (typeof v === 'number' && Number.isFinite(v)) out[k] = Math.min(hi, Math.max(lo, v));
  }
  return Object.keys(out).length ? out : null;
}

// Validate untrusted input (imports, old localStorage) into a clean scenario.
// Migration notes, if any, are pushed onto `notes`.
export function sanitizeScenario(raw, { validKeys, metadataVersion, notes = [] }) {
  if (!raw || typeof raw !== 'object') throw new Error('Not a scenario object.');
  if (raw.schemaVersion === 1) raw = migrateV1(raw, notes);
  if (raw.schemaVersion !== SCHEMA_VERSION) throw new Error(`Unsupported schemaVersion: ${raw.schemaVersion}`);
  const cells = {};
  for (const [key, c] of Object.entries(raw.cells ?? {})) {
    if (!validKeys.has(key) || !c || typeof c !== 'object') continue;
    const marked = c.marked === true && Number.isInteger(c.baseline) && c.baseline >= 0 && c.baseline <= 4;
    const note = typeof c.note === 'string' ? c.note.slice(0, 2000) : '';
    const meta = pickNums(c.meta, META_FIELDS);
    if (!marked && !note && !meta) continue;
    cells[key] = { marked, ...(marked && { baseline: c.baseline }), ...(note && { note }), ...(meta && { meta }) };
  }
  const model = pickNums(raw.model, MODEL_FIELDS);
  return {
    id: typeof raw.id === 'string' ? raw.id : newId(),
    schemaVersion: SCHEMA_VERSION,
    modelVersion: Number.isInteger(raw.modelVersion) ? raw.modelVersion : MODEL_VERSION,
    metadataVersion: typeof raw.metadataVersion === 'string' ? raw.metadataVersion : metadataVersion,
    name: typeof raw.name === 'string' && raw.name.trim() ? raw.name.slice(0, 120) : 'Untitled Form',
    archetype: typeof raw.archetype === 'string' ? raw.archetype : 'custom',
    archetypeEdited: raw.archetypeEdited === true,
    durationHours: num(raw.durationHours, 1, 100000, 24),
    loadRatio: num(raw.loadRatio, 0.05, 10, 1),
    designCapacity: optNum(raw.designCapacity),
    currentPopulation: optNum(raw.currentPopulation),
    note: typeof raw.note === 'string' ? raw.note.slice(0, 10000) : '',
    ...(model && { model }),
    cells,
  };
}
