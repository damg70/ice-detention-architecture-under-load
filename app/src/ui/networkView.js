// Network view: capacities (left) → domains (right), in grid order so the
// layout is recognizable when the view slides over. Nodes are fixed; edges
// are added, removed and recolored in place so they transition under load.
import { colorFor } from './colorScale.js';

const NS = 'http://www.w3.org/2000/svg';
const svgEl = (tag, attrs = {}, text) => {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null) n.setAttribute(k, v);
  if (text != null) n.textContent = text;
  return n;
};

const W = 880;
const XL = 320;        // capacity node x
const XR = 650;        // domain node x
const TOP = 70;        // room for the column headings
const ROW = 42;
const WIDTHS = [1.5, 3, 4.5, 6, 7.5]; // edge stroke by baseline 0–4

export function createNetworkView(container, { rows, columns, config, onSelectNode, onOpenNode, onSelectEdge }) {
  const span = (rows.length - 1) * ROW;
  const capY = (i) => TOP + i * ROW;
  const domY = (j) => TOP + (j * span) / (columns.length - 1);
  const H = TOP + span + 40;

  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, class: 'network', role: 'group', 'aria-label': 'Network of capacities and lived domains' });
  const gEdges = svgEl('g', { class: 'edges' });
  const gNodes = svgEl('g', { class: 'nodes' });
  svg.append(
    svgEl('text', { class: 'col-heading', x: XL + 7, y: 28, 'text-anchor': 'end' }, 'Architectural capacity'),
    svgEl('text', { class: 'col-heading', x: XR - 7, y: 28 }, 'Lived domain'),
    gEdges, gNodes);
  container.replaceChildren(svg);

  const nodeEls = new Map(); // `${kind}:${id}` → { g, y, ... }
  const edgeEls = new Map(); // cell key → path
  let hoverNode = null;
  let selectedNode = null;

  // ── Nodes (built once) ────────────────────────────────────────────────
  rows.forEach((r, i) => {
    const y = capY(i);
    const g = svgEl('g', { class: 'node capacity', tabindex: 0, role: 'button', 'data-node': `capacity:${r.id}` });
    g.append(
      svgEl('rect', { class: 'hit', x: 20, y: y - ROW / 2, width: XL - 10, height: ROW }),
      svgEl('text', { class: 'label', x: XL - 16, y: y + 4, 'text-anchor': 'end' }, r.label),
      svgEl('circle', { class: 'dot', cx: XL, cy: y, r: 7 }),
      svgEl('circle', { class: 'ring', cx: XL, cy: y, r: 12 }));
    gNodes.append(g);
    nodeEls.set(`capacity:${r.id}`, { g, y, kind: 'capacity', id: r.id, label: r.label });
  });
  columns.forEach((c, j) => {
    const y = domY(j);
    const g = svgEl('g', { class: 'node domain', tabindex: 0, role: 'button', 'data-node': `domain:${c.id}` });
    g.append(
      svgEl('rect', { class: 'hit', x: XR - 10, y: y - 16, width: W - XR, height: 32 }),
      svgEl('circle', { class: 'dot', cx: XR, cy: y, r: 7 }),
      svgEl('circle', { class: 'ring', cx: XR, cy: y, r: 12 }),
      svgEl('text', { class: 'label', x: XR + 16, y: y + 4 }, c.label));
    gNodes.append(g);
    nodeEls.set(`domain:${c.id}`, { g, y, kind: 'domain', id: c.id, label: c.label });
  });

  const rowIndex = new Map(rows.map((r, i) => [r.id, i]));
  const colIndex = new Map(columns.map((c, j) => [c.id, j]));
  const edgePath = (e) => {
    const y1 = capY(rowIndex.get(e.capacity)), y2 = domY(colIndex.get(e.domain));
    const x1 = XL + 8, x2 = XR - 8, mx = (x1 + x2) / 2;
    return `M${x1} ${y1} C${mx} ${y1} ${mx} ${y2} ${x2} ${y2}`;
  };

  // ── Highlighting ──────────────────────────────────────────────────────
  function applyHighlight() {
    const focus = hoverNode ?? selectedNode;
    svg.classList.toggle('focusing', !!focus);
    const [kind, id] = focus ? focus.split(':') : [];
    const linked = new Set();
    for (const [key, path] of edgeEls) {
      const [cap, dom] = key.split(':');
      const on = !!focus && ((kind === 'capacity' && cap === id) || (kind === 'domain' && dom === id));
      path.classList.toggle('hl', on);
      if (on) { linked.add(`capacity:${cap}`); linked.add(`domain:${dom}`); }
    }
    for (const [k, n] of nodeEls) {
      n.g.classList.toggle('hl', k === focus || linked.has(k));
      n.g.classList.toggle('selected', k === selectedNode);
    }
  }

  // ── Events ────────────────────────────────────────────────────────────
  const nodeOf = (t) => t.closest?.('[data-node]')?.dataset.node;
  svg.addEventListener('pointerover', (e) => {
    const k = nodeOf(e.target);
    if (k !== undefined && k !== hoverNode) { hoverNode = k; applyHighlight(); }
  });
  svg.addEventListener('pointerout', (e) => {
    if (nodeOf(e.target) && !nodeOf(e.relatedTarget ?? document.body)) { hoverNode = null; applyHighlight(); }
  });
  svg.addEventListener('pointerleave', () => { hoverNode = null; applyHighlight(); });
  svg.addEventListener('focusin', (e) => { const k = nodeOf(e.target); if (k) { hoverNode = k; applyHighlight(); } });
  svg.addEventListener('focusout', () => { hoverNode = null; applyHighlight(); });
  svg.addEventListener('click', (e) => {
    const path = e.target.closest('path.edge');
    if (path) { onSelectEdge(path.dataset.key); return; }
    const k = nodeOf(e.target);
    if (!k) return;
    const [kind, id] = k.split(':');
    if (k === selectedNode && kind === 'capacity') onOpenNode(kind, id);
    else onSelectNode(kind, id);
  });
  svg.addEventListener('keydown', (e) => {
    const k = nodeOf(e.target);
    if (!k) return;
    const [kind, id] = k.split(':');
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (k === selectedNode && kind === 'capacity') onOpenNode(kind, id);
      else onSelectNode(kind, id);
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const list = kind === 'capacity' ? rows : columns;
      const i = list.findIndex((x) => x.id === id) + (e.key === 'ArrowDown' ? 1 : -1);
      if (list[i]) nodeEls.get(`${kind}:${list[i].id}`).g.focus();
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const other = kind === 'capacity' ? 'domain' : 'capacity';
      const y = nodeEls.get(k).y;
      const nearest = [...nodeEls.values()].filter((n) => n.kind === other)
        .reduce((a, b) => (Math.abs(b.y - y) < Math.abs(a.y - y) ? b : a));
      nearest.g.focus();
    } else if (e.key === 'Escape') {
      onSelectNode(null);
    }
  });

  // ── Update (every state change) ───────────────────────────────────────
  function update(network, { palette, selectedNode: sel }) {
    selectedNode = sel;
    const live = new Set(network.edges.map((e) => e.key));
    for (const [key, path] of edgeEls) if (!live.has(key)) { path.remove(); edgeEls.delete(key); }
    // Heavier edges drawn last, so strong architecture failing is on top.
    for (const e of [...network.edges].sort((a, b) => a.baseline - b.baseline)) {
      let path = edgeEls.get(e.key);
      if (!path) {
        path = svgEl('path', { class: 'edge', 'data-key': e.key, d: edgePath(e) });
        path.append(svgEl('title'));
        edgeEls.set(e.key, path);
      }
      gEdges.append(path); // keeps paint order by baseline
      path.style.stroke = colorFor(e.E, palette);
      path.style.strokeWidth = WIDTHS[e.baseline];
      path.classList.toggle('provisional', e.provisional);
      const s = config.states.find((x) => x.key === e.state);
      path.firstChild.textContent = `${rowLabel(e.capacity)} × ${colLabel(e.domain)} — baseline ${e.baseline}, ${s.label.toLowerCase()} (${e.E.toFixed(2)})`;
    }

    for (const c of network.capacities) {
      const n = nodeEls.get(`capacity:${c.id}`);
      n.g.classList.toggle('isolated', c.degree === 0);
      n.g.setAttribute('aria-label', `${c.label}, ${c.degree} edge${c.degree === 1 ? '' : 's'}`);
    }
    for (const d of network.domains) {
      const n = nodeEls.get(`domain:${d.id}`);
      n.g.dataset.status = d.status;
      n.g.setAttribute('aria-label', `${d.label}: ${d.supportive} of ${d.degree} incoming supportive`);
    }
    applyHighlight();
  }

  const rowLabel = (id) => rows.find((r) => r.id === id).label;
  const colLabel = (id) => columns.find((c) => c.id === id).label;

  return { update, focusNode: (k) => nodeEls.get(k)?.g.focus() };
}
