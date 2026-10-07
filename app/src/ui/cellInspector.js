// Detail panel for the selected cell (§14). The static part (names,
// baseline control, note) rebuilds only when the selection or baseline
// changes; the dynamic part refreshes on every load change.
import { el, fmt2 } from './dom.js';
import { questionFor, explainCell } from '../model/explain.js';
import { processCell } from '../model/processCell.js';
import { loadFactors, modelConfig } from '../model/processGrid.js';

const TERM_LABELS = { base: 'From first hour', duration: 'Duration', population: 'Population', interaction: 'Duration × population' };

export function createInspector(container, { rows, columns, config: baseConfig, onSetBaseline, onNote, onOpenEquation }) {
  const config = baseConfig;
  const rowById = new Map(rows.map((r) => [r.id, r]));
  const colById = new Map(columns.map((c) => [c.id, c]));
  let lastStaticKey = null;
  let dynamic = null;

  function empty() {
    lastStaticKey = null;
    container.replaceChildren(
      el('h2', { class: 'panel-title', text: 'Selected cell' }),
      el('p', { class: 'muted', text: 'Select a cell to see what it asks and why it is in its current state.' }));
  }

  function buildStatic(key, p, cell) {
    const [rowId, colId] = key.split(':');
    const row = rowById.get(rowId), col = colById.get(colId);
    const head = [
      el('h2', { class: 'panel-title', text: 'Selected cell' }),
      el('h3', { class: 'cell-title' }, el('span', { text: row.label }), el('span', { class: 'times', text: ' × ' }), el('span', { text: col.label })),
    ];
    if (p.status === 'na') {
      container.replaceChildren(...head,
        el('p', { class: 'muted', text: 'Not applicable. The model metadata records no direct relationship between this architectural capacity and this lived domain.' }));
      return;
    }
    const baseline = cell?.marked ? cell.baseline : null;
    const seg = el('div', { class: 'segmented', role: 'radiogroup', 'aria-label': 'Baseline support' },
      [null, 0, 1, 2, 3, 4].map((b) => el('button', {
        type: 'button', role: 'radio', 'aria-checked': b === baseline ? 'true' : 'false',
        class: b === baseline ? 'on' : '',
        title: b == null ? 'Unmarked — no assertion made' : config.baselineLabels[b],
        onclick: () => onSetBaseline(key, b),
      }, b == null ? '—' : String(b))));
    const note = el('textarea', { rows: 2, placeholder: 'e.g. “Assuming sleeping and dining share the same volume.”', id: 'cell-note' });
    note.value = cell?.note ?? '';
    note.addEventListener('input', () => onNote(key, note.value));
    dynamic = el('div', { class: 'dynamic' });
    container.replaceChildren(...head,
      el('p', { class: 'question', text: questionFor(row, col, p.meta) }),
      el('div', { class: 'field-label', text: 'Baseline support (user-authored)' }),
      seg,
      el('div', { class: 'baseline-label', text: baseline == null ? 'Unmarked — no baseline has been set.' : config.baselineLabels[baseline] }),
      onOpenEquation ? el('button', { type: 'button', class: 'see-math', onclick: () => onOpenEquation(key) }, 'See the math') : null,
      dynamic,
      el('label', { class: 'field-label', for: 'cell-note', text: 'Cell note' }),
      note);
  }

  // Marked cells only: support against demand, where the load comes from,
  // and the written explanation. (E, the minimal-load comparison and the
  // sensitivity numbers are left for a future formula view.)
  function buildDynamic(p, cell, scenario) {
    if (p.status !== 'marked') { dynamic.replaceChildren(); return; }
    const m = p.meta, r = p.result;
    const config = modelConfig(baseConfig, scenario);   // this scenario's adjustments, if any
    const min = config.minimalLoad;
    const f0 = loadFactors(min.durationHours, min.loadRatio, config);
    const f = loadFactors(scenario.durationHours, scenario.loadRatio, config);
    const r0 = processCell(cell.baseline, m, f0.D, f0.P, config);

    // Support vs demand on a shared axis (0 … demand ceiling).
    const scale = (x) => `${(Math.min(x, config.demandCeiling) / config.demandCeiling) * 100}%`;
    const bars = el('div', { class: 'versus' },
      el('p', { class: 'vs-intro', text: 'What the architecture supplies (from the baseline) and what the current duration × population load asks of it.' }),
      el('div', { class: 'vs-row' }, el('span', { class: 'vs-label', text: 'Support' }),
        el('span', { class: 'vs-track' }, el('span', { class: 'vs-fill support', style: `width:${scale(r.Q)}` })), el('span', { class: 'vs-num', text: fmt2(r.Q) })),
      el('div', { class: 'vs-row' }, el('span', { class: 'vs-label', text: 'Demand' }),
        el('span', { class: 'vs-track' }, el('span', { class: 'vs-fill demand', style: `width:${scale(r.demand)}` })), el('span', { class: 'vs-num', text: fmt2(r.demand) })),
      el('div', { class: 'vs-margin', text: `Margin ${r.margin >= 0 ? '+' : '−'}${fmt2(Math.abs(r.margin))}` }));

    const total = r.load || 1;
    const breakdown = el('div', { class: 'breakdown' },
      el('div', { class: 'stack', 'aria-hidden': 'true' },
        Object.entries(r.terms).map(([k, v]) => el('span', { class: `seg ${k}`, style: `flex:${v / total}`, title: TERM_LABELS[k] }))),
      el('ul', { class: 'stack-key' },
        Object.keys(r.terms).map((k) => el('li', {}, el('i', { class: `seg ${k}` }), TERM_LABELS[k]))));

    dynamic.replaceChildren(
      bars,
      el('div', { class: 'field-label', text: 'Where the load comes from' }),
      breakdown,
      el('div', { class: 'explanation' }, explainCell({ meta: m, result: r, minimalResult: r0, baseline: cell.baseline, config, factors: f }).map((t) => el('p', { text: t }))));
  }

  function render(selectedKey, processed, scenario, palette) {
    if (!selectedKey) { if (lastStaticKey !== '') { empty(); lastStaticKey = ''; } return; }
    const p = processed.get(selectedKey);
    const cell = scenario.cells[selectedKey];
    const staticKey = `${scenario.id}|${selectedKey}|${cell?.marked ? cell.baseline : '-'}`;
    if (staticKey !== lastStaticKey) {
      buildStatic(selectedKey, p, cell);
      lastStaticKey = staticKey;
    }
    if (p.status !== 'na') buildDynamic(p, cell, scenario);
  }

  empty();
  return { render };
}
