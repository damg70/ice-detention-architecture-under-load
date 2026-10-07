// Equation mode: the model's math for one tile, worked out live.
//
// Steps 0–4 (baseline, support, load, demand, margin). Each step shows its
// equation in words on a chalkboard band, then the worked equation with this
// tile's numbers. Every element of a worked equation has a pop-up saying what
// it is and whether it can be edited. The graph and the tile follow every
// change, including the header sliders.
//
// Three layers of values: the model's authored numbers; the scenario's own
// saved adjustments (cell.meta, scenario.model); and unsaved edits made here.
// The app saves the edits when equation mode is left (`pending()`), asking
// first when a model-wide constant changed. "Reset" returns to authored values.
import { el, fmt2 } from '../ui/dom.js';
import { resolveMeta, loadFactors } from '../model/processGrid.js';

// Field names here → names stored with the scenario.
export const META_OF = { base: 'baseDemand', dS: 'durationSensitivity', pS: 'populationSensitivity', iS: 'interactionSensitivity' };
export const MODEL_OF = { ceiling: 'demandCeiling', midpoint: 'midpoint' };
import { processCell } from '../model/processCell.js';
import { stateFor, questionFor, formatHours, formatRatio } from '../model/explain.js';
import { colorFor, inkFor } from '../ui/colorScale.js';

// Editable numbers: which value, its range, and who it belongs to.
const FIELDS = {
  base: { label: 'Base demand', scope: 'tile', min: 0, max: 1, step: 0.05 },
  dS: { label: 'Time sensitivity', scope: 'tile', min: 0, max: 1.5, step: 0.05 },
  pS: { label: 'Crowding sensitivity', scope: 'tile', min: 0, max: 1.5, step: 0.05 },
  iS: { label: 'Interaction', scope: 'tile', min: 0, max: 1.5, step: 0.05 },
  ceiling: { label: 'Ceiling', scope: 'model', min: 0.5, max: 3, step: 0.05 },
  midpoint: { label: 'Midpoint', scope: 'model', min: 0, max: 1, step: 0.05 },
};
const FOOT = {
  tile: 'Editable · this tile only',
  model: 'Editable · all 130 tiles in this scenario',
  slider: 'Set with the slider above',
  calc: 'Calculated',
};

// The four sensitivities in the load step: what each means and when you'd
// change it. Each one is the most its term can add to load, at full pressure.
const SENS = [
  { field: 'base', term: 'base', name: 'Base demand', pressure: null,
    means: 'Need that exists from the first hour, before time or crowding add anything.',
    change: 'Raise it if this need presses from the moment someone arrives; lower it if it only builds up with time or crowding.' },
  { field: 'dS', term: 'duration', name: 'Time sensitivity', pressure: 'six months or more',
    means: 'How much this need grows as the stay lengthens.',
    change: 'Raise it if a long stay wears this relationship down more than the model says; lower it if time changes it little.' },
  { field: 'pS', term: 'population', name: 'Crowding sensitivity', pressure: '300% of capacity',
    means: 'How much this need grows with crowding.',
    change: 'Raise it if more people press harder on this relationship than the model says; lower it if crowding changes it little.' },
  { field: 'iS', term: 'interaction', name: 'Interaction', pressure: 'six months and 300% together',
    means: 'The extra strain when a long stay and crowding happen together.',
    change: 'Raise it if long stays and crowding make each other worse here; lower it if they act separately.' },
];
// The same words the cell explanations use.
const degree = (x) => (x >= 0.75 ? 'highly' : x >= 0.45 ? 'moderately' : 'only weakly');
const inWords = (s, x) => (s.field === 'base'
  ? (x >= 0.1 ? 'noticeable from the first hour' : x > 0 ? 'small from the first hour' : 'none from the first hour')
  : `${degree(x)} sensitive${s.field === 'dS' ? ' to time' : s.field === 'pS' ? ' to crowding' : ' to both at once'}`);

// sideHost: where the chalkboard graph goes (the app's side column); without
// one, the view lays out its own side column (the lab page).
export function createEquationMode(root, { ctx, palette = 'standard', sideHost = null } = {}) {
  const { rows, columns, index, config } = ctx;
  const rowById = new Map(rows.map((r) => [r.id, r]));
  const colById = new Map(columns.map((c) => [c.id, c]));

  let scenario = null, key = null;
  let overrides = {};        // unsaved edits: baseline, base, dS, pS, iS, ceiling, midpoint
  let authored = null;       // the model's own values for this tile
  let model = null;          // what the scenario has saved (authored + its adjustments)
  let v = null;              // current values (saved + edits) and results
  let editing = null;        // field being typed into
  let activePop = null;      // data-pop key of the open pop-up
  let litKey = null;         // load sensitivity whose definition is lit (instead of a pop-up)

  // ── Layout ─────────────────────────────────────────────────────────────
  // Reset returns every model number to its authored value (the baseline is
  // the user's own and returns to what is saved).
  const resetToAuthored = () => {
    overrides = {};
    for (const f of [...Object.keys(META_OF), ...Object.keys(MODEL_OF)]) if (model[f] !== authored[f]) overrides[f] = authored[f];
    render();
  };
  const reset = el('button', { type: 'button', class: 'eq-reset', hidden: true, onclick: resetToAuthored });
  const head = el('div', { class: 'eq-head' });
  const steps = el('div', { class: 'eq-steps' });
  const chart = el('div', { class: 'eq-chart-body' });
  const chalk = el('section', { class: 'eq-chalk' },
    el('h2', { text: 'Where this tile sits on the demand curve' }), chart);
  if (sideHost) {
    root.replaceChildren(el('div', { class: 'eq-work in-app' }, el('div', { class: 'eq-main' }, head, steps)));
    sideHost.replaceChildren(chalk);
  } else {
    root.replaceChildren(
      el('div', { class: 'eq-work' },
        el('main', { class: 'eq-main' }, head, steps),
        el('aside', { class: 'eq-side' }, chalk)));
  }
  const pop = el('div', { class: 'eq-pop', role: 'tooltip', hidden: true });
  document.body.append(pop);

  // ── Values ─────────────────────────────────────────────────────────────
  function compute() {
    const [rowId, colId] = key.split(':');
    const meta0 = resolveMeta(index, rowId, colId, config);
    const cell = scenario.cells[key];
    authored = {
      base: meta0.baseDemand, dS: meta0.durationSensitivity, pS: meta0.populationSensitivity, iS: meta0.interactionSensitivity,
      ceiling: config.demandCeiling, midpoint: config.midpoint ?? 0.5,
    };
    model = { baseline: cell?.marked ? cell.baseline : null, ...authored };
    for (const [f, k] of Object.entries(META_OF)) if (typeof cell?.meta?.[k] === 'number') model[f] = cell.meta[k];
    for (const [f, k] of Object.entries(MODEL_OF)) if (typeof scenario.model?.[k] === 'number') model[f] = scenario.model[k];
    const x = { ...model, ...overrides };
    const f = loadFactors(scenario.durationHours, scenario.loadRatio, config);
    const meta = { ...meta0, baseDemand: x.base, durationSensitivity: x.dS, populationSensitivity: x.pS, interactionSensitivity: x.iS };
    const cfg = { ...config, demandCeiling: x.ceiling, midpoint: x.midpoint };
    const r = processCell(x.baseline ?? 0, meta, f.D, f.P, cfg);   // load and demand don't depend on the baseline
    v = { ...x, row: rowById.get(rowId), col: colById.get(colId), meta0, D: f.D, P: f.P, r, marked: x.baseline != null };
    v.state = v.marked ? stateFor(r.E, config) : null;
  }

  // ── Building blocks ────────────────────────────────────────────────────
  const op = (t) => el('span', { class: 'op', text: t });
  const changed = (field) => field in overrides && overrides[field] !== model[field];   // unsaved
  const differs = (field) => field in authored && v[field] !== authored[field];         // not the model's value

  // A number in a worked equation. kind: tile | model | slider | calc | fixed.
  function num(text, kind, popKey, field) {
    const editable = field && FIELDS[field];
    if (editable && editing === field) {
      const f = FIELDS[field];
      const input = el('input', { type: 'number', class: `eq-input ${kind}`, min: f.min, max: f.max, step: f.step, value: v[field], 'aria-label': f.label });
      let done = false;
      const commit = (save) => {
        if (done) return; done = true;
        editing = null;
        const n = parseFloat(input.value);
        if (save && Number.isFinite(n)) {
          const val = Math.round(Math.min(f.max, Math.max(f.min, n)) * 100) / 100;
          if (val === model[field]) delete overrides[field]; else overrides[field] = val;
        }
        render();
      };
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') commit(true);
        else if (e.key === 'Escape') { e.stopPropagation(); commit(false); }
      });
      input.addEventListener('blur', () => commit(true));
      queueMicrotask(() => { input.focus(); input.select(); });
      return input;
    }
    const cls = `eq-n ${kind}${editable && changed(field) ? ' changed' : ''}${editable && differs(field) ? ' adjusted' : ''}`;
    const node = editable
      ? el('button', { type: 'button', class: cls, 'data-pop': popKey, onclick: () => { editing = field; hidePop(); render(); } }, text)
      : el('span', { class: cls, 'data-pop': popKey, tabindex: 0 }, text);
    return node;
  }
  const word = (text, popKey) => el('span', { class: 'eq-word', 'data-pop': popKey, tabindex: 0 }, text);
  const x_ = () => el('span', { class: 'times', text: '×' });

  function step(n, title, def, symbolic, worked, prose) {
    return el('section', { class: 'eq-step' },
      el('div', { class: 'eq-step-title' }, `${n} · ${title}`, el('span', { class: 'eq-def', text: def })),
      symbolic ? el('div', { class: 'eq-symbolic' }, symbolic) : null,
      ...[].concat(worked),
      el('p', { class: 'eq-prose', text: prose }));
  }
  const sw = (cls, text) => el('span', { class: cls, text });

  // ── Render ─────────────────────────────────────────────────────────────
  function render() {
    if (!scenario || !key) return;
    compute();
    const r = v.r, dash = '—';

    const nDiffer = Object.keys(authored).filter(differs).length;
    reset.hidden = !nDiffer;
    reset.textContent = `Reset to the model's values (${nDiffer} adjusted)`;
    head.replaceChildren(
      el('div', { class: 'eq-crumb' }, el('span', { text: 'The math for one tile' }), reset),
      el('h2', { class: 'eq-cell' }, v.row.label, el('span', { class: 'x', text: ' × ' }), v.col.label));

    // 0 · Baseline
    const scale = el('div', { class: 'eq-scale', role: 'radiogroup', 'aria-label': 'Baseline' },
      [0, 1, 2, 3, 4].map((b) => el('button', {
        type: 'button', role: 'radio', 'aria-checked': b === v.baseline ? 'true' : 'false',
        class: `eq-level${b === v.baseline ? ' on' : ''}${b === v.baseline && changed('baseline') ? ' changed' : ''}`,
        'data-pop': `level:${b}`,
        onclick: () => { if (b === model.baseline) delete overrides.baseline; else overrides.baseline = b; render(); },
      }, el('b', { text: String(b) }), config.baselineLabels[b])),
      el('span', { class: 'eq-arrow', 'aria-hidden': 'true', text: '→' }),
      tile());
    const s0 = step(0, 'Baseline', "your 0–4 answer to this tile's question", null,
      [el('p', { class: 'eq-question', text: questionFor(v.row, v.col, v.meta0) }), scale],
      v.marked
        ? 'A judgment about the building before any load, not a measurement. Leave it unmarked and the tile is left out of the model.'
        : 'Unmarked: no baseline has been set, so this tile has no support or margin yet. Choose one above to see the rest of the math.');

    // 1 · Support
    const s1 = step(1, 'Support', 'the baseline as a number from 0 to 1',
      [word('support', 'w:support'), op('='), sw('w-tile', 'baseline'), op('÷'), '4'],
      el('div', { class: 'eq-line' },
        word('support', 'w:support'), op('='),
        v.marked ? num(String(v.baseline), 'tile', 'baseline') : num(dash, 'calc', 'baseline'), op('÷'),
        num('4', 'fixed', 'four'), op('='),
        num(v.marked ? fmt2(r.Q) : dash, 'calc result', 'support')),
      'Support never moves with the sliders: the building is the building.');

    // 2 · Load
    const t = r.terms;
    const s2 = step(2, 'Load', 'how much this tile is asked to bear',
      [word('load', 'w:load'), op('='), sw('w-tile', 'base'), op('+'), sw('w-tile', 'time sensitivity'), op('×'), sw('w-slider', 'D'),
        op('+'), sw('w-tile', 'crowding sensitivity'), op('×'), sw('w-slider', 'P'), op('+'), sw('w-tile', 'interaction'), op('×'), sw('w-slider', 'D'), op('×'), sw('w-slider', 'P')],
      [
        el('div', { class: 'eq-line' }, word('load', 'w:load'), op('='),
          num(fmt2(v.base), 'tile', 'base', 'base'), op('+'),
          num(fmt2(v.dS), 'tile', 'dS', 'dS'), x_(), num(fmt2(v.D), 'slider', 'D')),
        el('div', { class: 'eq-line indent' }, op('+'),
          num(fmt2(v.pS), 'tile', 'pS', 'pS'), x_(), num(fmt2(v.P), 'slider', 'P'), op('+'),
          num(fmt2(v.iS), 'tile', 'iS', 'iS'), x_(), num(fmt2(v.D), 'slider', 'D'), x_(), num(fmt2(v.P), 'slider', 'P')),
        el('div', { class: 'eq-line indent sums' }, op('='),
          num(fmt2(t.base), 'calc', 'tBase'), op('+'), num(fmt2(t.duration), 'calc', 'tDur'), op('+'),
          num(fmt2(t.population), 'calc', 'tPop'), op('+'), num(fmt2(t.interaction), 'calc', 'tInt'), op('='),
          num(fmt2(r.load), 'calc result', 'load')),
        loadKey(),
      ],
      "Each amber number is this tile's own sensitivity; each white number is a pressure from the sliders above (D for duration, P for population). Every term is a sensitivity times a pressure, plus need present from the first hour.");

    // 3 · Demand
    const s3 = step(3, 'Demand', 'load, leveled off below a ceiling',
      [word('demand', 'w:demand'), op('='), sw('w-model', fmt2(v.ceiling)), op('×'), '(1', op('−'), el('span', {}, 'e', el('sup', { text: '−load' })), ')'],
      el('div', { class: 'eq-line' }, word('demand', 'w:demand'), op('='),
        num(fmt2(v.ceiling), 'model', 'ceiling', 'ceiling'), op('×'), '(',
        num('1', 'fixed', 'one'), op('−'),
        el('span', { class: 'eq-pow' }, num('e', 'fixed', 'e'), el('sup', {}, num(`−${fmt2(r.load)}`, 'calc', 'expLoad'))), ')', op('='),
        num(fmt2(r.demand), 'calc result', 'demand')),
      'Load becomes demand along a curve that rises fast and then levels off below a ceiling, so strong architecture can always stay partly ahead.');

    // 4 · Margin
    const chip = v.marked
      ? el('span', { class: 'eq-state', 'data-pop': 'state', tabindex: 0 },
        el('i', { style: `background:${colorFor(r.E, palette)};color:${inkFor(r.E, palette)}`, text: v.state.glyph }), v.state.label)
      : null;
    const s4 = step(4, 'Margin', 'support against demand, and the state it sets',
      [word('E', 'w:E'), op('='), sw('w-model', fmt2(v.midpoint).replace(/0$/, '')), op('+'), 'support', op('−'), 'demand'],
      el('div', { class: 'eq-line' }, word('E', 'w:E'), op('='),
        num(fmt2(v.midpoint).replace(/0$/, ''), 'model', 'midpoint', 'midpoint'), op('+'),
        num(v.marked ? fmt2(r.Q) : dash, 'calc', 'supportIn'), op('−'),
        num(fmt2(r.demand), 'calc', 'demandIn'), op('='),
        num(v.marked ? fmt2(r.E) : dash, 'calc result', 'E'), chip),
      'When support matches demand, E sits at the midpoint. Below that, demand is winning. E sets the tile\'s color and glyph.');

    steps.replaceChildren(s0, s1, s2, s3, s4);
    drawChart();
    if (activePop) {
      const target = root.querySelector(`[data-pop="${CSS.escape(activePop)}"]`);
      if (target) showPop(target); else hidePop();
    }
  }

  // The four sensitivities, defined, with this tile's values in words.
  function loadKey() {
    return el('div', { class: 'eq-key' }, SENS.map((s) => {
      const x = v[s.field];
      return el('div', { class: `eq-key-item${litKey === s.field ? ' lit' : ''}`, 'data-key': s.field },
        el('div', { class: 'eq-key-head' },
          el('span', { class: 'eq-key-name', text: s.name }),
          el('span', { class: `eq-key-val${differs(s.field) ? ' changed' : ''}`, text: fmt2(x) }),
          el('span', { class: 'eq-key-words', text: inWords(s, x) })),
        el('p', { text: `${s.means} ${s.change}` }));
    }));
  }

  function tile() {
    const node = el('span', { class: `eq-tile cell ${v.marked ? 'marked' : 'unmarked'}${v.meta0.provisional ? ' provisional' : ''}`, 'data-pop': 'tile', tabindex: 0 },
      el('span', { class: 'glyph', text: v.marked ? v.state.glyph : '' }),
      el('span', { class: 'pips' }, [0, 1, 2, 3].map((k) => el('i', { class: v.marked && k < v.baseline ? 'on' : '' }))));
    if (v.marked) { node.style.background = colorFor(v.r.E, palette); node.style.color = inkFor(v.r.E, palette); }
    return node;
  }

  // ── Pop-ups ────────────────────────────────────────────────────────────
  function popContent(k) {
    const r = v.r;
    const your = (field) => (differs(field) ? `Your value · the model's is ${fmt2(authored[field])}` : null);
    const P = {
      'w:support': ['Support', 'What the building supplies to this need, from 0 to 1.', 'calc'],
      'w:load': ['Load', 'How much this tile is asked to bear under the current sliders.', 'calc'],
      'w:demand': ['Demand', 'What the load asks of the building, after leveling off below the ceiling.', 'calc'],
      'w:E': ['E, the margin', 'Where support stands against demand, from 0 to 1. It sets the tile\'s state.', 'calc'],
      baseline: [`Baseline · ${v.marked ? v.baseline : 'unmarked'}`, 'Your 0–4 answer from step 0. Change it there.', 'tile'],
      four: ['Top of the scale · 4', 'The highest baseline. Dividing by 4 turns a 0–4 rating into support between 0 and 1.', 'fixed', null, 'Fixed · it defines the baseline scale'],
      support: [`Support · ${v.marked ? fmt2(r.Q) : '—'}`, 'Support for this tile.', 'calc'],
      base: [`Base demand · ${fmt2(v.base)}`, `${SENS.find((x) => x.field === 'base').means} This tile: ${inWords(SENS.find((x) => x.field === 'base'), v.base)}.`, 'tile', your('base')],
      dS: [`Time sensitivity · ${fmt2(v.dS)}`, `${SENS.find((x) => x.field === 'dS').means} This tile: ${inWords(SENS.find((x) => x.field === 'dS'), v.dS)}.`, 'tile', your('dS')],
      pS: [`Crowding sensitivity · ${fmt2(v.pS)}`, `${SENS.find((x) => x.field === 'pS').means} This tile: ${inWords(SENS.find((x) => x.field === 'pS'), v.pS)}.`, 'tile', your('pS')],
      iS: [`Interaction · ${fmt2(v.iS)}`, `${SENS.find((x) => x.field === 'iS').means} This tile: ${inWords(SENS.find((x) => x.field === 'iS'), v.iS)}.`, 'tile', your('iS')],
      D: [`Duration pressure D · ${fmt2(v.D)}`, `From the duration slider (${formatHours(scenario.durationHours)}).`, 'slider'],
      P: [`Population pressure P · ${fmt2(v.P)}`, `From the population slider (${formatRatio(scenario.loadRatio)} of capacity).`, 'slider'],
      tBase: [`Base · ${fmt2(r.terms.base)}`, 'Base demand, added as is.', 'calc'],
      tDur: [`Time × D · ${fmt2(r.terms.duration)}`, `${fmt2(v.dS)} × ${fmt2(v.D)}: the part of the load that comes from time.`, 'calc'],
      tPop: [`Crowding × P · ${fmt2(r.terms.population)}`, `${fmt2(v.pS)} × ${fmt2(v.P)}: the part that comes from crowding.`, 'calc'],
      tInt: [`Interaction × D × P · ${fmt2(r.terms.interaction)}`, `${fmt2(v.iS)} × ${fmt2(v.D)} × ${fmt2(v.P)}: the extra when both are high at once.`, 'calc'],
      load: [`Load · ${fmt2(r.load)}`, 'The four parts added.', 'calc'],
      ceiling: [`Ceiling · ${fmt2(v.ceiling)}`, 'The most demand can ever reach, for every tile.', 'model', your('ceiling')],
      one: ['1', 'Makes demand start at 0 when load is 0.', 'fixed', null, "Fixed · part of the curve's shape"],
      e: ['e · 2.718…', 'A mathematical constant that gives the curve its fast-then-level shape.', 'fixed', null, 'Fixed · mathematical constant'],
      expLoad: [`Load · ${fmt2(r.load)}`, 'The load from step 2.', 'calc'],
      demand: [`Demand · ${fmt2(r.demand)}`, 'Demand for this tile.', 'calc'],
      midpoint: [`Midpoint · ${fmt2(v.midpoint)}`, 'E when support exactly meets demand.', 'model', your('midpoint')],
      supportIn: [`Support · ${v.marked ? fmt2(r.Q) : '—'}`, 'Support from step 1.', 'calc'],
      demandIn: [`Demand · ${fmt2(r.demand)}`, 'Demand from step 3.', 'calc'],
      E: [`E · ${v.marked ? fmt2(r.E) : '—'}`, 'E for this tile.', 'calc'],
      state: [v.marked ? v.state.label : '', `The band E falls in: below 0.2 severe strain, 0.2–0.4 substantial, 0.4–0.6 unstable / mixed, 0.6–0.8 supportive, 0.8 and above resilient margin.`, 'fixed', null, "Fixed here · bands are set in the model's configuration"],
      tile: ['This tile', 'As it appears in the grid: color and glyph from E, pips from the baseline.', 'calc', null, 'Not editable · it shows the result'],
    };
    if (k.startsWith('level:')) {
      const b = +k.slice(6);
      return [`Baseline ${b} · ${config.baselineLabels[b]}`, b === v.baseline ? "This tile's baseline." : 'Click to set this baseline.', 'tile', null, `${FOOT.tile} · your judgment of this building`];
    }
    return P[k];
  }

  // The four load sensitivities light their definition in the key instead.
  const KEYED = new Set(['base', 'dS', 'pS', 'iS']);
  function light(field) {
    litKey = field;
    for (const n of root.querySelectorAll('.eq-key-item')) n.classList.toggle('lit', n.dataset.key === field);
  }

  function showPop(target) {
    if (KEYED.has(target.dataset.pop)) { hidePop(); activePop = target.dataset.pop; light(target.dataset.pop); return; }
    light(null);
    const c = popContent(target.dataset.pop);
    if (!c) return;
    const [title, text, kind, note, foot] = c;
    activePop = target.dataset.pop;
    pop.className = `eq-pop ${kind}`;
    pop.replaceChildren(...[
      el('b', { text: title }),
      el('span', { text }),
      note ? el('em', { text: note }) : null,
      el('i', { text: foot ?? FOOT[kind] ?? 'Fixed' })].filter(Boolean));
    pop.hidden = false;
    const rect = target.getBoundingClientRect(), w = pop.offsetWidth, h = pop.offsetHeight;
    let left = Math.min(Math.max(8, rect.left), innerWidth - w - 8);
    let top = rect.bottom + 10;
    if (top + h > innerHeight - 8) top = rect.top - h - 10;
    pop.style.left = `${left + scrollX}px`;
    pop.style.top = `${top + scrollY}px`;
  }
  function hidePop() { pop.hidden = true; activePop = null; if (litKey && !editing) light(null); }
  const popTarget = (e) => e.target.closest?.('[data-pop]');
  // Mouse and pen: hover. Touch has no hover, so a tap opens the pop-up and
  // it stays until the next tap elsewhere or a scroll.
  root.addEventListener('pointerover', (e) => { const t = popTarget(e); if (t && editing == null) showPop(t); });
  root.addEventListener('pointerout', (e) => {
    if (e.pointerType === 'touch') return;
    if (popTarget(e) && !popTarget({ target: e.relatedTarget ?? document.body })) hidePop();
  });
  document.addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch' && !popTarget(e)) hidePop(); });
  root.addEventListener('focusin', (e) => { const t = popTarget(e); if (t) showPop(t); });
  root.addEventListener('focusout', () => hidePop());
  addEventListener('keydown', (e) => { if (e.key === 'Escape') hidePop(); });
  addEventListener('scroll', () => { if (activePop) hidePop(); }, { passive: true });

  // ── Chart ──────────────────────────────────────────────────────────────
  function drawChart() {
    const r = v.r;
    const W = 380, H = 250, x0 = 40, x1 = 370, yBase = 210, yTop = 30;
    const xMax = Math.max(2, Math.ceil((r.load + 0.3) * 2) / 2);
    const yMax = Math.max(v.ceiling, v.marked ? r.Q : 0, 1) * 1.08;
    const X = (L) => x0 + (L / xMax) * (x1 - x0);
    const Y = (d) => yBase - (d / yMax) * (yBase - yTop);
    const curve = Array.from({ length: 61 }, (_, i) => { const L = (i / 60) * xMax; return `${X(L).toFixed(1)},${Y(v.ceiling * (1 - Math.exp(-L))).toFixed(1)}`; }).join(' L');
    const svg = (tag, attrs, text) => { const n = document.createElementNS('http://www.w3.org/2000/svg', tag); for (const [a, b] of Object.entries(attrs)) n.setAttribute(a, b); if (text != null) n.textContent = text; return n; };
    const g = svg('svg', { viewBox: `0 0 ${W} ${H}`, width: '100%', role: 'img', 'aria-label': `Demand curve. This tile: load ${fmt2(r.load)}, demand ${fmt2(r.demand)}${v.marked ? `, support ${fmt2(r.Q)}` : ''}.` });
    const C = { axis: '#8fa596', chalk: '#f1efe6', dim: '#a7b5a9', tile: '#efc06a', model: '#a9cbe6', short: '#e07a62', head: '#9fd4a8' };
    g.append(
      svg('line', { x1: x0, y1: yBase, x2: x1 + 2, y2: yBase, stroke: C.axis }),
      svg('line', { x1: x0, y1: yBase, x2: x0, y2: yTop - 4, stroke: C.axis }),
      svg('line', { x1: x0, y1: Y(v.ceiling), x2: x1, y2: Y(v.ceiling), stroke: C.model, 'stroke-dasharray': '4 4' }),
      svg('text', { x: x1, y: Y(v.ceiling) - 6, fill: C.model, 'font-size': 11, 'text-anchor': 'end' }, `ceiling ${fmt2(v.ceiling)}`),
    );
    if (v.marked) g.append(
      svg('line', { x1: x0, y1: Y(r.Q), x2: x1, y2: Y(r.Q), stroke: C.tile, 'stroke-width': 1.6 }),
      svg('text', { x: x0 + 6, y: Y(r.Q) - 6, fill: C.tile, 'font-size': 11 }, `support ${fmt2(r.Q)}`));
    g.append(svg('path', { d: `M${curve}`, fill: 'none', stroke: C.chalk, 'stroke-width': 2.2, 'stroke-linecap': 'round' }));
    const px = X(r.load), py = Y(r.demand);
    g.append(svg('line', { x1: px, y1: yBase, x2: px, y2: py, stroke: C.dim, 'stroke-dasharray': '2 3' }));
    if (v.marked) {
      const short = r.demand > r.Q;
      const gap = Math.abs(r.demand - r.Q);
      g.append(svg('line', { x1: px, y1: py, x2: px, y2: Y(r.Q), stroke: short ? C.short : C.head, 'stroke-width': 3.5 }));
      const midY = (py + Y(r.Q)) / 2, right = px < x1 - 70;
      if (gap > 0.03) g.append(
        svg('text', { x: right ? px + 8 : px - 8, y: midY - 2, fill: short ? '#f0a08c' : C.head, 'font-size': 11, 'text-anchor': right ? 'start' : 'end' }, short ? 'shortfall' : 'headroom'),
        svg('text', { x: right ? px + 8 : px - 8, y: midY + 11, fill: short ? '#f0a08c' : C.head, 'font-size': 11, 'text-anchor': right ? 'start' : 'end' }, fmt2(gap)));
    }
    g.append(
      svg('circle', { cx: px, cy: py, r: 5.5, fill: v.marked ? colorFor(r.E, palette) : C.dim, stroke: C.chalk, 'stroke-width': 1.6 }),
      svg('text', { x: px > x0 + 150 ? px - 8 : px + 8, y: py - 12, fill: C.chalk, 'font-size': 11.5, 'text-anchor': px > x0 + 150 ? 'end' : 'start' }, `load ${fmt2(r.load)} → demand ${fmt2(r.demand)}`));
    const ticks = svg('g', { fill: C.dim, 'font-size': 10.5 });
    for (let L = 0; L <= xMax + 1e-9; L += xMax > 3 ? 1 : 0.5) {
      if (L % 1 && xMax > 2) continue;
      ticks.append(svg('text', { x: X(L), y: yBase + 16, 'text-anchor': 'middle' }, L.toFixed(1).replace(/\.0$/, L ? '.0' : '')));
    }
    ticks.append(svg('text', { x: (x0 + x1) / 2, y: yBase + 32, 'text-anchor': 'middle' }, 'load'));
    ticks.append(svg('text', { x: x0 - 8, y: Y(0) + 4, 'text-anchor': 'end' }, '0'), svg('text', { x: x0 - 8, y: Y(1) + 4, 'text-anchor': 'end' }, '1.0'));
    g.append(ticks);
    chart.replaceChildren(g);
  }

  return {
    // Open a tile, starting from what the scenario has saved.
    show(nextScenario, nextKey) {
      overrides = {};
      scenario = nextScenario; key = nextKey; editing = null;
      render();
    },
    // The scenario changed under us (sliders, or another scenario chosen).
    update(nextScenario) {
      if (nextScenario.id !== scenario?.id) overrides = {};
      scenario = nextScenario; render();
    },
    // Unsaved edits, for the app to save: the tile's baseline and own
    // sensitivities (saved without asking) and model-wide constants (asked).
    pending() {
      if (!v) return null;
      const tileFields = ['baseline', ...Object.keys(META_OF)].filter(changed);
      const modelChanges = Object.keys(MODEL_OF).filter(changed).map((f) => ({
        field: MODEL_OF[f], name: FIELDS[f].label, from: model[f], to: v[f], authored: authored[f],
      }));
      // The tile's full set of adjusted sensitivities after the edits.
      const meta = {};
      for (const [f, k] of Object.entries(META_OF)) if (v[f] !== authored[f]) meta[k] = v[f];
      return { key, baselineChanged: changed('baseline'), baseline: v.baseline, tileChanged: tileFields.length > 0, meta, modelChanges };
    },
    discardModelEdits() { for (const f of Object.keys(MODEL_OF)) delete overrides[f]; },
    clearEdits() { overrides = {}; },
    hide() { hidePop(); editing = null; },
    get key() { return key; },
    setPalette(p) { palette = p; render(); },
  };
}
