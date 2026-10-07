// Network reading of a processed grid (design_notes.md, "Network view").
// Capacities and domains are nodes; marked cells are edges. Unmarked and
// N/A cells produce no edge. Derived entirely from processGrid output.

import { cellKey } from './processGrid.js';
import { stateFor } from './explain.js';

// E at or above this is "supportive or better": the lower bound of the
// supportive band in config.states.
export function supportiveThreshold(config) {
  const i = config.states.findIndex((s) => s.key === 'supportive');
  return config.states[i - 1].max;
}

export function buildNetwork({ rows, columns, config }, processed, scenario) {
  const threshold = supportiveThreshold(config);
  const edges = [];
  for (const r of rows) {
    for (const c of columns) {
      const key = cellKey(r.id, c.id);
      const p = processed.get(key);
      if (p?.status !== 'marked') continue;
      edges.push({
        key,
        capacity: r.id,
        domain: c.id,
        baseline: scenario.cells[key].baseline,
        E: p.result.E,
        state: stateFor(p.result.E, config).key,
        supportive: p.result.E >= threshold,
        provisional: !!p.meta.provisional,
      });
    }
  }

  const capacities = rows.map((r) => {
    const out = edges.filter((e) => e.capacity === r.id);
    return { kind: 'capacity', id: r.id, label: r.label, edges: out, degree: out.length };
  });

  const domains = columns.map((c) => {
    const incoming = edges.filter((e) => e.domain === c.id);
    const counts = Object.fromEntries(config.states.map((s) => [s.key, 0]));
    for (const e of incoming) counts[e.state]++;
    const supportive = incoming.filter((e) => e.supportive).length;
    // 'none': no relationship asserted; never treated as unsupported.
    const status = !incoming.length ? 'none'
      : supportive === 0 ? 'unsupported'
      : supportive === 1 ? 'last-support'
      : 'supported';
    return { kind: 'domain', id: c.id, label: c.label, edges: incoming, degree: incoming.length, counts, supportive, status };
  });

  return { edges, capacities, domains };
}
