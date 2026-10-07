// Run: node --test app/tests
// Encodes spec §9.4 reference values and the §27 measurable checks.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { processCell } from '../src/model/processCell.js';
import { processGrid, indexIntersections, resolveMeta, loadFactors, cellKey } from '../src/model/processGrid.js';
import { normalizeDuration } from '../src/model/normalizeDuration.js';
import { normalizePopulation, ratioFromPosition, positionFromRatio } from '../src/model/normalizePopulation.js';
import { createScenario, sanitizeScenario } from '../src/storage/scenarioSchema.js';

const load = (f) => JSON.parse(readFileSync(new URL(`../src/data/${f}`, import.meta.url)));
const config = load('model-config.json');
const rows = load('rows.json');
const columns = load('columns.json');
const intersections = load('intersections.json');
const presets = load('presets.json').presets;
const index = indexIntersections(intersections);

const E = (row, col, baseline, hours, ratio) => {
  const { D, P } = loadFactors(hours, ratio, config);
  return processCell(baseline, resolveMeta(index, row, col, config), D, P, config).E;
};
const near = (a, b, msg) => assert.ok(Math.abs(a - b) <= 0.011, `${msg}: expected ${b}, got ${a.toFixed(3)}`);

const H = { '6h': 6, '72h': 72, '1wk': 168, '1mo': 720, '6mo': 4380 };

test('duration anchors (§7.1)', () => {
  const expected = { 2: 0, 8: 0.18, 24: 0.32, 72: 0.47, 168: 0.58, 720: 0.77, 2190: 0.91, 4380: 1 };
  for (const [h, d] of Object.entries(expected)) near(normalizeDuration(+h, config), d, `D(${h}h)`);
});

test('population anchors and slider inverse (§7.2)', () => {
  for (const a of config.population.anchors) near(normalizePopulation(a.ratio, config), a.P, `P(${a.ratio})`);
  near(normalizePopulation(0.1, config), 0, 'below first anchor');
  near(normalizePopulation(5, config), 1, 'above last anchor');
  for (const r of [0.3, 0.9, 1.75, 2.6]) near(ratioFromPosition(positionFromRatio(r, config), config), r, `inverse ${r}`);
});

test('reference values (§9.4)', () => {
  const ref = [
    ['horizontal_space', 'sleep_rest', 1, H['6h'], 0.7, 0.44],
    ['horizontal_space', 'sleep_rest', 4, H['1mo'], 1.5, 0.60],
    ['horizontal_space', 'sleep_rest', 4, H['6mo'], 3.0, 0.43],
    ['wet_core', 'hygiene_privacy', 1, H['6h'], 0.7, 0.34],
    ['wet_core', 'hygiene_privacy', 3, H['1wk'], 0.8, 0.64],
    ['daylight_orientation', 'temporal_orientation', 1, H['6h'], 0.7, 0.60],
    ['daylight_orientation', 'temporal_orientation', 4, H['6mo'], 3.0, 0.73],
    ['spatial_granularity', 'safety_conflict', 4, H['6mo'], 3.0, 0.48],
  ];
  for (const [r, c, b, h, l, e] of ref) near(E(r, c, b, h, l), e, `${r}×${c} b=${b} ${h}h/${l}`);
});

test('Test A — short-term holding at 6 h / 70%: weak duration-driven cells read neutral or better', () => {
  for (const [r, c] of [['daylight_orientation', 'temporal_orientation'], ['spatial_differentiation', 'agency_dignity'], ['exterior_permeability', 'temporal_orientation'], ['acoustic_refuge', 'sleep_rest']]) {
    assert.ok(E(r, c, 1, 6, 0.7) >= 0.45, `${r}×${c}`);
  }
});

test('Test B — same room at 72 h: duration-sensitive cells drop ≥ 0.10', () => {
  const form = [['horizontal_space', 'sleep_rest', 1], ['wet_core', 'hygiene_privacy', 2], ['daylight_orientation', 'temporal_orientation', 1], ['spatial_differentiation', 'agency_dignity', 1], ['exterior_permeability', 'movement_recreation', 0]];
  for (const [r, c, b] of form) {
    const drop = E(r, c, b, 6, 0.7) - E(r, c, b, 72, 0.7);
    assert.ok(drop >= 0.10 - 1e-9, `${r}×${c} dropped ${drop.toFixed(3)}`);
  }
});

test('Test C — occupancy shock 80% → 180% at 1 wk: crowding cells drop ≥ 0.25, daylight < 0.10', () => {
  const form = [['wet_core', 'hygiene_privacy', 3], ['horizontal_space', 'sleep_rest', 3], ['acoustic_refuge', 'sleep_rest', 2], ['functional_adjacency', 'medical_access', 2], ['circulation_autonomy', 'movement_recreation', 2], ['spatial_granularity', 'safety_conflict', 3]];
  for (const [r, c, b] of form) {
    const drop = E(r, c, b, 168, 0.8) - E(r, c, b, 168, 1.8);
    assert.ok(drop >= 0.25, `${r}×${c} dropped ${drop.toFixed(3)}`);
  }
  const day = E('daylight_orientation', 'temporal_orientation', 2, 168, 0.8) - E('daylight_orientation', 'temporal_orientation', 2, 168, 1.8);
  assert.ok(day < 0.10, `daylight dropped ${day.toFixed(3)}`);
});

test('Test D — soft-sided form is contradictory at low load; sensory cells fail faster', () => {
  const lo = [E('sensory_compartmentalization', 'sensory_regulation', 0, 24, 0.6), E('horizontal_space', 'sleep_rest', 3, 24, 0.6)];
  assert.ok(lo[0] < 0.4 && lo[1] > 0.6, `low-load spread ${lo.map((x) => x.toFixed(2))}`);
  const acoustic = E('acoustic_refuge', 'sleep_rest', 1, 720, 2);
  const daylight = E('daylight_orientation', 'temporal_orientation', 2, 720, 2);
  assert.ok(acoustic < daylight - 0.2, 'acoustic deteriorates faster than daylight');
});

test('Test E — resilient form: supportive at 1 mo/150%, ≥0.45 at 6 mo/200%, not immune at 6 mo/300%', () => {
  const authored = intersections.entries.filter((e) => e.applicable !== false);
  for (const e of authored) {
    assert.ok(E(e.row, e.column, 4, 720, 1.5) >= 0.595, `${e.row}×${e.column} at 1mo/150%`);
    assert.ok(E(e.row, e.column, 4, 4380, 2) >= 0.45, `${e.row}×${e.column} at 6mo/200%`);
  }
  assert.ok(E('horizontal_space', 'sleep_rest', 4, 4380, 3) < 0.5);
  assert.ok(E('wet_core', 'hygiene_privacy', 4, 4380, 3) < 0.5);
  assert.ok(E('daylight_orientation', 'temporal_orientation', 4, 4380, 3) >= 0.6);
});

test('schema v1 migration: elasticity and program-fit cells dropped', () => {
  const validKeys = new Set(rows.flatMap((r) => columns.map((c) => cellKey(r.id, c.id))));
  const notes = [];
  const s = sanitizeScenario({
    schemaVersion: 1, name: 'old', durationHours: 72, loadRatio: 1.5,
    cells: {
      'capacity_elasticity:hygiene_privacy': { marked: true, baseline: 3 },
      'capacity_elasticity:medical_access': { marked: true, baseline: 4 },
      'program_fit:sleep_rest': { marked: true, baseline: 1 },
      'wet_core:hygiene_privacy': { marked: true, baseline: 2 },
    },
  }, { validKeys, metadataVersion: 'x', notes });
  assert.equal(s.schemaVersion, 2);
  assert.equal(s.form, undefined);
  assert.deepEqual(Object.keys(s.cells), ['wet_core:hygiene_privacy']);
  assert.equal(notes.length, 2);
});

test('removed rows are gone from the matrix', () => {
  assert.equal(rows.length, 13);
  assert.ok(!rows.some((r) => r.id === 'program_fit' || r.id === 'capacity_elasticity'));
  assert.ok(!intersections.entries.some((e) => e.row === 'program_fit' || e.row === 'capacity_elasticity'));
});

test('unmarked cells are never processed; N/A is distinct; undefined is provisional', () => {
  const s = createScenario({ metadataVersion: 'x' });
  s.durationHours = 4380; s.loadRatio = 3;
  const g = processGrid({ rows, columns, index, config }, s);
  assert.equal(g.size, rows.length * columns.length);
  assert.equal(g.get(cellKey('wet_core', 'legal_social')).status, 'na');
  const u = g.get(cellKey('wet_core', 'hygiene_privacy'));
  assert.equal(u.status, 'unmarked');
  assert.equal(u.result, undefined);
  assert.equal(g.get(cellKey('acoustic_refuge', 'hygiene_privacy')).meta.provisional, true);
});

test('determinism', () => {
  const s = createScenario({ preset: presets[1], metadataVersion: 'x' });
  const a = [...processGrid({ rows, columns, index, config }, s)].map(([k, v]) => [k, v.result?.E]);
  const b = [...processGrid({ rows, columns, index, config }, s)].map(([k, v]) => [k, v.result?.E]);
  assert.deepEqual(a, b);
});

test('presets only reference valid, applicable cells', () => {
  const ids = new Set(rows.flatMap((r) => columns.map((c) => cellKey(r.id, c.id))));
  assert.ok(presets.filter((p) => p.id !== 'blank').length >= 3);
  for (const p of presets) {
    assert.equal(p.form, undefined, `${p.id}: no form block`);
    for (const [k, v] of Object.entries(p.cells)) {
      assert.ok(ids.has(k), `${p.id}: ${k}`);
      assert.ok(Number.isInteger(v) && v >= 0 && v <= 4);
      const [r, c] = k.split(':');
      assert.ok(resolveMeta(index, r, c, config).applicable, `${p.id}: ${k} is N/A`);
    }
  }
});

// ── Network (design_notes.md, "Network view") ────────────────────────────
import { buildNetwork, supportiveThreshold } from '../src/model/network.js';

const net = (preset, hours, ratio) => {
  const s = createScenario({ preset: presets.find((p) => p.id === preset), metadataVersion: 'x' });
  s.durationHours = hours; s.loadRatio = ratio;
  return { s, n: buildNetwork({ rows, columns, config }, processGrid({ rows, columns, index, config }, s), s) };
};

test('network: one edge per marked cell, none for unmarked or N/A', () => {
  const { s, n } = net('purpose_built', 168, 1.5);
  const marked = Object.entries(s.cells).filter(([, c]) => c.marked).map(([k]) => k).sort();
  assert.deepEqual(n.edges.map((e) => e.key).sort(), marked);
  assert.equal(n.capacities.length, rows.length);
  assert.equal(n.domains.length, columns.length);
  const blank = net('blank', 168, 1.5).n;
  assert.equal(blank.edges.length, 0);
  assert.ok(blank.domains.every((d) => d.status === 'none'), 'no edges asserted is not "unsupported"');
});

test('network: degrees and counts are consistent', () => {
  const { n } = net('purpose_built', 168, 1.5);
  const sum = (xs) => xs.reduce((a, b) => a + b, 0);
  assert.equal(sum(n.capacities.map((c) => c.degree)), n.edges.length);
  assert.equal(sum(n.domains.map((d) => d.degree)), n.edges.length);
  for (const d of n.domains) assert.equal(sum(Object.values(d.counts)), d.degree);
  assert.equal(n.domains.find((d) => d.id === 'sleep_rest').degree, 8);
});

test('network: domain status follows supportive edges as load rises', () => {
  const t = supportiveThreshold(config);
  near(t, 0.6, 'supportive threshold');
  const lo = net('purpose_built', 8, 0.7).n;
  const hi = net('purpose_built', 4380, 3).n;
  const order = { supported: 3, 'last-support': 2, unsupported: 1, none: 0 };
  for (const d of lo.domains) {
    const h = hi.domains.find((x) => x.id === d.id);
    assert.ok(order[h.status] <= order[d.status], `${d.id}: ${d.status} → ${h.status}`);
    assert.equal(d.supportive, d.edges.filter((e) => e.E >= t).length);
  }
  assert.ok(hi.domains.filter((d) => d.degree).every((d) => d.status === 'unsupported' || d.status === 'last-support'));
});

// ── Person view (design_notes.md, "Person view") ─────────────────────────
import { buildPersonScene } from '../src/model/personScene.js';
import { lightingAt, outdoorHours, windowKind, HOUR_SECONDS } from '../src/model/dayCycle.js';
const pcfg = load('person-config.json');

const person = (preset, hours, ratio, cap) => {
  const s = createScenario({ preset: presets.find((p) => p.id === preset), metadataVersion: 'x' });
  s.durationHours = hours; s.loadRatio = ratio;
  return buildPersonScene({ rows, columns, config }, processGrid({ rows, columns, index, config }, s), s, cap, pcfg);
};

test('person: every capacity has a home ring', () => {
  for (const r of rows) assert.ok(pcfg.rings.includes(pcfg.homeRing[r.id]), r.id);
});

test('person: the opened node picks the domains; rings hold only edges into them', () => {
  const p = person('purpose_built', 168, 0.9, 'wet_core');
  assert.deepEqual([...p.domains].sort(), ['agency_dignity', 'food_water', 'hygiene_privacy', 'medical_access', 'safety_conflict'].sort());
  for (const r of p.rings) for (const e of r.edges) {
    assert.ok(p.domains.includes(e.domain));
    assert.equal(pcfg.homeRing[e.capacity], r.ring);
  }
  assert.equal(p.rings.find((r) => r.own).ring, 'reach');
});

test('person: mound under low load, pit under heavy load; empty rings stay flat', () => {
  const lo = person('family_residential', 8, 0.6, 'wet_core');
  const hi = person('short_term_holding', 4380, 3, 'wet_core');
  assert.ok(lo.rings[0].top > 0, `body top ${lo.rings[0].top}`);
  assert.ok(hi.rings[0].top < 0, `body top ${hi.rings[0].top}`);
  for (const r of [...lo.rings, ...hi.rings]) if (!r.edges.length) assert.equal(r.step, 0);
  // stacking: each ring's top = its step + the next ring out
  for (let i = 0; i < hi.rings.length - 1; i++) near(hi.rings[i].top, hi.rings[i].step + hi.rings[i + 1].top, 'stack');
  // each ring's color and step come from the average of its edges
  for (const r of lo.rings.filter((x) => x.edges.length)) {
    near(r.meanE, r.edges.reduce((a, e) => a + e.E, 0) / r.edges.length, `${r.ring} mean`);
    near(r.step, (r.meanE - 0.5) * pcfg.stepHeight, `${r.ring} step`);
  }
});

test('person: mannequin follows the opened node\'s least-supported edge', () => {
  const p = person('purpose_built', 168, 1.5, 'wet_core');
  near(p.mannequinE, Math.min(...p.capacity.edges.map((e) => e.E)), 'mannequin');
});


test('day cycle: provision comes from baselines (window, yard, night policy)', () => {
  const L = pcfg.lighting;
  assert.equal(HOUR_SECONDS, 4);
  // window by daylight baseline; unmarked draws an outline, admits nothing
  assert.deepEqual([0, 1, 2, 3, 4].map((b) => windowKind(b, L)), ['none', 'slit', 'window', 'window', 'large']);
  assert.equal(windowKind(null, L), 'outline');
  assert.equal(lightingAt(12, { daylight: 0, outdoor: 0, night: 0 }, L).sun, 0, 'no window, no sun');
  assert.equal(lightingAt(12, { daylight: null, outdoor: 0, night: 0 }, L).sun, 0, 'unmarked admits nothing');
  assert.ok(lightingAt(12, { daylight: 4, outdoor: 0, night: 0 }, L).sun > lightingAt(12, { daylight: 1, outdoor: 0, night: 0 }, L).sun, 'larger window, more sun');
  assert.equal(lightingAt(2, { daylight: 4, outdoor: 0, night: 0 }, L).sun, 0, 'no sun at night');
  // yard: baseline 0 never goes outside; hours follow the baseline
  assert.deepEqual([0, 1, 2, 3, 4].map((b) => outdoorHours(b, L)), [0, 1, 2, 3, 4]);
  for (let h = 0; h < 24; h += 0.25) assert.equal(lightingAt(h, { daylight: 2, outdoor: 0, night: 2 }, L).outdoor, 0, `never outside at ${h}`);
  assert.ok(lightingAt(14.5, { daylight: 2, outdoor: 3, night: 2 }, L).outdoor > 0.99);
  assert.equal(outdoorHours(null, L), 0);
  // night policy: 0–1 lit all night, 2 dimmed (on), 3–4 lights out
  assert.equal(lightingAt(2, { daylight: 2, outdoor: 0, night: 0 }, L).tubes, 1);
  const dim = lightingAt(2, { daylight: 2, outdoor: 0, night: 2 }, L);
  assert.ok(dim.tubes === 1 && dim.fluorescent < 0.6, 'dimmed night setting');
  assert.equal(lightingAt(2, { daylight: 2, outdoor: 0, night: 3 }, L).tubes, 0, 'lights out');
  assert.equal(lightingAt(12, { daylight: 2, outdoor: 0, night: 4 }, L).tubes, 1, 'on by day');
  // sky outside follows the clock alone
  assert.equal(lightingAt(12, { daylight: null, outdoor: null, night: null }, L).sunUp, 1);
  assert.equal(lightingAt(1, { daylight: 4, outdoor: null, night: null }, L).sunUp, 0);
  assert.deepEqual(lightingAt(9.37, { daylight: 3, outdoor: 2, night: 3 }, L), lightingAt(9.37, { daylight: 3, outdoor: 2, night: 3 }, L));
});

test('person: lighting never moves with the load sliders', () => {
  for (const preset of ['short_term_holding', 'purpose_built', 'family_residential']) {
    const a = person(preset, 8, 0.7, 'wet_core').light;
    const b = person(preset, 4380, 3, 'wet_core').light;
    assert.deepEqual(a, b, preset);
  }
  const holding = person('short_term_holding', 8, 0.7, 'wet_core').light;
  assert.deepEqual(holding, { daylight: 0, outdoor: 0, night: 1 }, 'holding: windowless, no yard, lit all night');
});

// ── Thought bubble ───────────────────────────────────────────────────────
import { bubbleAt, ringBubbleAt, bandFor, phaseAt, pickLine, SLOT_HOURS, BUBBLE_SECONDS } from '../src/model/bubbles.js';
const lib = load('bubble-lines.json');

test('bubble: library covers every authored edge, singular voice', () => {
  const authored = intersections.entries.filter((e) => e.applicable !== false).map((e) => `${e.row}:${e.column}`);
  for (const k of authored) {
    for (const b of ['supportive', 'mixed', 'substantial', 'severe']) assert.ok(lib.lines[k]?.[b], `${k} ${b}`);
    assert.ok(lib.when[k]?.length, `${k} when`);
  }
  const all = [...Object.values(lib.lines), ...Object.values(lib.night)].flatMap((v) => Object.values(v)).flat();
  for (const t of all) assert.ok(!/\b(we|us|our)\b/i.test(t), `plural: ${t}`);
  // No specific other days: the duration slider is the only time (habits
  // like "every day" or "most days" are fine).
  const otherDay = /\b(yesterday|tomorrow|the other day|ago|(last|next) (night|week|month|year|time))\b/i;
  for (const t of all) assert.ok(!otherDay.test(t), `refers to another day: ${t}`);
});

test('bubble: alternative lines rotate by day, first line on day 0', () => {
  assert.equal(pickLine('one', 5), 'one');
  assert.equal(pickLine(['a', 'b', 'c'], 0), 'a');
  assert.equal(pickLine(['a', 'b', 'c'], 1), 'b');
  assert.equal(pickLine(['a', 'b', 'c'], 4), 'b');
  const edge = { key: 'wet_core:hygiene_privacy', capacity: 'wet_core', domain: 'hygiene_privacy', E: 0.3 };
  const alt = { ...lib, lines: { ...lib.lines, [edge.key]: { ...lib.lines[edge.key], substantial: ['first', 'second'] } } };
  assert.equal(bubbleAt(10, [edge], alt).text, 'first');
  assert.equal(bubbleAt(10, [edge], alt, { day: 1 }).text, 'second');
  assert.equal(bubbleAt(10, [edge], alt, { day: 2 }).text, 'first');
  assert.equal(ringBubbleAt(10, [edge], alt, { day: 1 }).text, 'second');
  // a night variant list works the same way, at night only
  const altNight = { ...alt, night: { ...lib.night, [edge.key]: { substantial: ['n1', 'n2'] } } };
  assert.equal(bubbleAt(23, [edge], altNight, { day: 1 }).text, 'n2');
  assert.equal(bubbleAt(10, [edge], altNight, { day: 1 }).text, 'second');
});

test('bubble: pacing, phases and bands', () => {
  assert.equal(BUBBLE_SECONDS, 6);
  near(SLOT_HOURS, 1.5, 'slot hours');
  assert.equal(phaseAt(7, lib.phases), 'morning');
  assert.equal(phaseAt(23, lib.phases), 'night');
  assert.equal(phaseAt(3, lib.phases), 'night');
  assert.deepEqual([0.9, 0.5, 0.3, 0.1].map(bandFor), ['supportive', 'mixed', 'substantial', 'severe']);
});

test('bubble: only allowed edges speak; night lines never by day; deterministic', () => {
  const p = person('purpose_built', 168, 1.5, 'wet_core');
  for (let h = 0; h < 24; h += 0.25) {
    const b = bubbleAt(h, p.capacity.edges, lib);
    if (!b) continue;
    assert.ok(lib.when[b.key].includes(b.phase), `${b.key} at ${h}`);   // wet-core has lines for every phase, so no fallback
    if (b.phase !== 'night') assert.ok(!/night/i.test(b.text) || b.key === 'daylight_orientation:temporal_orientation', `night line by day: ${b.text}`);
    assert.deepEqual(b, bubbleAt(h, p.capacity.edges, lib));
    // constant within a slot
    const start = Math.floor(h / SLOT_HOURS) * SLOT_HOURS;
    assert.equal(bubbleAt(start + 0.01, p.capacity.edges, lib)?.key, b.key);
  }
  // sleep edges (evening/night) never speak at noon
  const hs = person('purpose_built', 168, 1.5, 'horizontal_space');
  for (let h = 12; h < 18; h += 0.5) assert.notEqual(bubbleAt(h, hs.capacity.edges, lib)?.domain, 'sleep_rest');
  // the bubble always cycles: every capacity with edges speaks at every hour
  // indoors, even one whose lines are all daytime (exterior permeability)
  for (const pr of presets.filter((x) => x.id !== 'blank')) {
    for (const r of rows) {
      const sc = person(pr.id, 168, 1.5, r.id);
      if (!sc.capacity.edges.length) continue;
      for (let h = 0; h < 24; h += SLOT_HOURS) {
        const b = bubbleAt(h + 0.01, sc.capacity.edges, lib);
        assert.ok(b, `${pr.id} / ${r.id} silent at ${h}h`);
        if (!['evening', 'night'].includes(b.phase)) assert.ok(!/night/i.test(b.text) || b.key === 'daylight_orientation:temporal_orientation', `night line by day: ${b.text}`);
      }
    }
  }
  // outdoors only exterior edges speak
  const w = person('purpose_built', 168, 1.5, 'wet_core');
  assert.equal(bubbleAt(14, w.capacity.edges, lib, { outdoor: 1 }), null);
  // night variant used at night
  const night = bubbleAt(23, [{ key: 'wet_core:hygiene_privacy', capacity: 'wet_core', domain: 'hygiene_privacy', E: 0.3 }], lib);
  assert.equal(night.text, lib.night['wet_core:hygiene_privacy'].substantial);
});

test('bubble: a selected ring speaks its own edges, any time, but night lines only at night', () => {
  const p = person('purpose_built', 720, 0.9, 'wet_core');
  const room = p.rings.find((r) => r.ring === 'room');
  const keys = new Set(room.edges.map((e) => e.key));
  const seen = new Set();
  for (let h = 0; h < 24; h += 0.25) {
    const b = ringBubbleAt(h, room.edges, lib);
    assert.ok(b && keys.has(b.key), `room speaks at ${h}`);
    seen.add(b.key);
    if (!['evening', 'night'].includes(b.phase)) assert.ok(!/night/i.test(b.text), `night line by day: ${b.text}`);
  }
  assert.equal(seen.size, keys.size, 'every edge of the ring gets a turn');
  // a ring with no edges says nothing
  assert.equal(ringBubbleAt(10, [], lib), null);
});

test('scenario adjustments: tile sensitivities and model constants apply, sanitize, and stay scoped', () => {
  const validKeys = new Set(rows.flatMap((r) => columns.map((c) => cellKey(r.id, c.id))));
  const ctx = { rows, columns, index, config };
  const key = 'spatial_granularity:sleep_rest';
  const plain = createScenario({ metadataVersion: 'x' });
  plain.cells[key] = { marked: true, baseline: 2 };
  const before = processGrid(ctx, plain).get(key).result.E;
  // a tile's own crowding sensitivity
  const tuned = structuredClone(plain);
  tuned.cells[key].meta = { populationSensitivity: 1.2 };
  tuned.loadRatio = 1.8; plain.loadRatio = 1.8;
  assert.ok(processGrid(ctx, tuned).get(key).result.E < processGrid(ctx, plain).get(key).result.E, 'higher crowding sensitivity lowers E under crowding');
  // a model-wide constant reaches other tiles too
  const other = 'wet_core:hygiene_privacy';
  plain.cells[other] = { marked: true, baseline: 3 }; tuned.cells[other] = { marked: true, baseline: 3 };
  tuned.model = { midpoint: 0.4 };
  near(processGrid(ctx, plain).get(other).result.E - processGrid(ctx, tuned).get(other).result.E, 0.1, 'midpoint shifts every tile');
  // sanitize keeps valid values, clamps out-of-range ones, drops junk
  const s = sanitizeScenario({ ...tuned, model: { demandCeiling: 9, midpoint: 'x' }, cells: { ...tuned.cells, [key]: { marked: false, meta: { durationSensitivity: -1, bogus: 3 } } } }, { validKeys, metadataVersion: 'x' });
  assert.deepEqual(s.model, { demandCeiling: 3 });
  assert.deepEqual(s.cells[key], { marked: false, meta: { durationSensitivity: 0 } });
  // the authored model is untouched
  assert.equal(config.demandCeiling, 1.15);
  assert.ok(before > 0);
});
