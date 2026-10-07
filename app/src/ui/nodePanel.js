// Side panel for the network view: the selected node and its edges.
import { el } from './dom.js';
import { colorFor, inkFor } from './colorScale.js';

export function createNodePanel(container, { rows, columns, config, onSelectEdge, onOpenNode }) {
  const rowLabel = new Map(rows.map((r) => [r.id, r.label]));
  const colLabel = new Map(columns.map((c) => [c.id, c.label]));
  const stateLabel = (key) => config.states.find((s) => s.key === key).label;

  function edgeList(edges, otherLabel, palette) {
    if (!edges.length) return el('p', { class: 'muted', text: 'No edges. Mark cells in the grid to connect this node.' });
    return el('ul', { class: 'edge-list' }, [...edges].sort((a, b) => a.E - b.E).map((e) =>
      el('li', {},
        el('button', { type: 'button', class: 'edge-row', onclick: () => onSelectEdge(e.key) },
          el('span', { class: 'swatch small', style: `background:${colorFor(e.E, palette)};color:${inkFor(e.E, palette)}` }, config.states.find((s) => s.key === e.state).glyph),
          el('span', { class: 'edge-name', text: otherLabel(e) }),
          el('span', { class: 'edge-meta', text: `${stateLabel(e.state).toLowerCase()} · ${e.E.toFixed(2)}` })))));
  }

  function render(selectedNode, network, palette) {
    if (!selectedNode) {
      container.replaceChildren(
        el('h2', { class: 'panel-title', text: 'Network' }),
        el('p', { class: 'muted', text: 'Each line is a marked cell, joining an architectural capacity to a lived domain. Thickness is the baseline; color is its state under the current load.' }),
        el('ul', { class: 'hints' },
          el('li', {}, el('kbd', {}, 'hover'), ' trace a node’s edges'),
          el('li', {}, el('kbd', {}, 'click'), ' select a node or an edge'),
          el('li', {}, el('kbd', {}, 'click'), ' again on a capacity: open its person view'),
          el('li', {}, el('kbd', {}, 'tab'), ' ', el('kbd', {}, '← ↑ → ↓'), ' move between nodes')));
      return;
    }
    const [kind, id] = selectedNode.split(':');
    if (kind === 'capacity') {
      const c = network.capacities.find((x) => x.id === id);
      container.replaceChildren(
        el('h2', { class: 'panel-title', text: 'Architectural capacity' }),
        el('h3', { class: 'cell-title', text: c.label }),
        el('button', { type: 'button', class: 'open-person', onclick: () => onOpenNode(id) }, 'Open person view'),
        el('div', { class: 'field-label', text: `Affects ${c.degree} lived domain${c.degree === 1 ? '' : 's'}` }),
        edgeList(c.edges, (e) => colLabel.get(e.domain), palette));
      return;
    }
    const d = network.domains.find((x) => x.id === id);
    const status = {
      none: null,
      unsupported: `0 of ${d.degree} supportive.`,
      'last-support': `1 of ${d.degree} supportive: ${rowLabel.get(d.edges.find((e) => e.supportive)?.capacity)}.`,
      supported: `${d.supportive} of ${d.degree} supportive.`,
    }[d.status];
    container.replaceChildren(
      el('h2', { class: 'panel-title', text: 'Lived domain' }),
      el('h3', { class: 'cell-title', text: d.label }),
      status ? el('p', { class: `domain-status ${d.status}`, text: status }) : null,
      el('div', { class: 'field-label', text: `Shaped by ${d.degree} capacit${d.degree === 1 ? 'y' : 'ies'}` }),
      edgeList(d.edges, (e) => rowLabel.get(e.capacity), palette));
  }

  return { render };
}
