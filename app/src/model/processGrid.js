// Resolves every row × column intersection to one of three states and
// processes the marked ones. Unmarked cells are never processed (§6).

import { processCell } from './processCell.js';
import { normalizeDuration } from './normalizeDuration.js';
import { normalizePopulation } from './normalizePopulation.js';

export const cellKey = (rowId, colId) => `${rowId}:${colId}`;

export function indexIntersections(intersections) {
  const index = new Map();
  for (const e of intersections.entries) index.set(cellKey(e.row, e.column), e);
  return index;
}

// Metadata for one intersection, falling back to provisional defaults.
export function resolveMeta(index, rowId, colId, config) {
  const e = index.get(cellKey(rowId, colId));
  if (e && e.applicable === false) return { applicable: false };
  if (!e) return { ...config.defaultIntersection, applicable: true, provisional: true };
  return { ...config.defaultIntersection, ...e, applicable: true, provisional: false };
}

// A scenario may adjust the model for itself (set in equation mode, kept
// with the scenario): model-wide constants in `scenario.model`, and a
// tile's sensitivities in `cell.meta`. Everything else uses the authored
// values. These helpers are the only place the two are merged.
export const MODEL_FIELDS = { demandCeiling: [0.5, 3], midpoint: [0, 1] };
export const META_FIELDS = { baseDemand: [0, 1], durationSensitivity: [0, 1.5], populationSensitivity: [0, 1.5], interactionSensitivity: [0, 1.5] };

export function modelConfig(config, scenario) {
  const m = scenario?.model;
  if (!m) return config;
  const out = { ...config };
  for (const k of Object.keys(MODEL_FIELDS)) if (typeof m[k] === 'number') out[k] = m[k];
  return out;
}

export function cellMeta(index, rowId, colId, config, cell) {
  const meta = resolveMeta(index, rowId, colId, config);
  if (!meta.applicable || !cell?.meta) return meta;
  return { ...meta, ...cell.meta, adjusted: true };
}

// Global stressors → D and P. How a form copes with them is carried by its
// cells' baselines alone; there are no form-wide modifiers (model v3).
export function loadFactors(durationHours, loadRatio, config) {
  return {
    D: normalizeDuration(durationHours, config),
    P: normalizePopulation(loadRatio, config),
  };
}

// Returns Map<key, {status: 'na'|'unmarked'|'marked', meta, result?}>.
export function processGrid({ rows, columns, index, config: base }, scenario) {
  const config = modelConfig(base, scenario);
  const { D, P } = loadFactors(scenario.durationHours, scenario.loadRatio, config);
  const out = new Map();
  for (const r of rows) {
    for (const c of columns) {
      const key = cellKey(r.id, c.id);
      const cell = scenario.cells[key];
      const meta = cellMeta(index, r.id, c.id, config, cell);
      if (!meta.applicable) out.set(key, { status: 'na', meta });
      else if (!cell || !cell.marked) out.set(key, { status: 'unmarked', meta });
      else out.set(key, { status: 'marked', meta, result: processCell(cell.baseline, meta, D, P, config) });
    }
  }
  return out;
}
