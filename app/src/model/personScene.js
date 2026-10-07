// Person view (design_notes.md, "Person view"): what an opened capacity node
// does to one person. Pure: derives everything from the processed grid.
//
// The opened node chooses the lived domains (its outgoing edges). Every edge
// into those domains, from any capacity, is placed on its capacity's home
// ring (body → world). Each ring is one unbroken band: its color and its
// step up or down both come from the average E of its edges (individual
// edges are left to the thought bubbles). Steps stack from the world ring
// inward, so supportive states build a mound and strained ones a pit.
// A ring with no edges asserts nothing and stays flat.

import { buildNetwork } from './network.js';

export function buildPersonScene(ctx, processed, scenario, capacityId, pcfg) {
  const net = buildNetwork(ctx, processed, scenario);
  const node = net.capacities.find((c) => c.id === capacityId);
  const domains = node.edges.map((e) => e.domain);
  const inScene = net.edges.filter((e) => domains.includes(e.domain));

  const rings = pcfg.rings.map((ring) => {
    const edges = inScene.filter((e) => pcfg.homeRing[e.capacity] === ring);
    const meanE = edges.length ? edges.reduce((a, e) => a + e.E, 0) / edges.length : null;
    return {
      ring,
      radii: pcfg.radii[ring],
      edges,
      meanE,
      step: meanE == null ? 0 : (meanE - 0.5) * pcfg.stepHeight,
      own: pcfg.homeRing[capacityId] === ring,
    };
  });
  let h = 0;
  for (let i = rings.length - 1; i >= 0; i--) { h += rings[i].step; rings[i].top = h; }

  // Mannequin: the opened node's least-supported edge (decided 2026-10-01).
  const mannequinE = node.edges.length ? Math.min(...node.edges.map((e) => e.E)) : null;

  // Global lighting reads what the facility provides: the BASELINES of three
  // specific edges, whichever node is open (null when unmarked). Baselines
  // are architecture, fixed under load, so the light never moves with the
  // sliders; what it means to the person is shown by E elsewhere.
  const baselineOf = (key) => net.edges.find((e) => e.key === key)?.baseline ?? null;
  const L = pcfg.lighting;
  const light = { daylight: baselineOf(L.daylightEdge), outdoor: baselineOf(L.outdoorEdge), night: baselineOf(L.nightEdge) };

  return { capacity: node, domains, rings, mannequinE, light };
}
