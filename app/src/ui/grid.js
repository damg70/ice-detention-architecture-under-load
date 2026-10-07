// The matrix. DOM is built once and updated in place so focus survives
// slider movement. Two visual layers per marked cell:
//   - pips: the user's baseline (architecture; never changes with load)
//   - fill + glyph: processed state under current load
import { el } from './dom.js';
import { cellKey } from '../model/processGrid.js';
import { stateFor } from '../model/explain.js';
import { colorFor, inkFor } from './colorScale.js';

export function createGrid(container, { rows, columns, config, onSelect, onCycle, onSetBaseline, onClear }) {
  const cells = []; // [r][c] → td
  const rowHeads = [];
  const colHeads = [];
  let active = [0, 0];
  let selectedKey = null;

  const table = el('table', { class: 'grid', role: 'grid', 'aria-label': 'Architectural capacities by lived domains' });
  const corner = el('th', { class: 'corner', scope: 'col' },
    el('span', { class: 'corner-col', text: 'Lived domain →' }),
    el('span', { class: 'corner-row', text: 'Architectural capacity ↓' }));
  const headRow = el('tr', {}, corner);
  columns.forEach((c, j) => {
    const th = el('th', { scope: 'col', class: 'col-head', title: c.label, 'data-c': j }, el('span', { text: c.label }));
    colHeads.push(th);
    headRow.append(th);
  });
  table.append(el('thead', {}, headRow));

  const tbody = el('tbody');
  rows.forEach((r, i) => {
    const th = el('th', { scope: 'row', class: 'row-head', title: r.description, 'data-r': i }, r.label);
    rowHeads.push(th);
    const tr = el('tr', {}, th);
    cells.push([]);
    columns.forEach((c, j) => {
      const td = el('td', { role: 'gridcell', tabindex: -1, 'data-r': i, 'data-c': j, 'data-key': cellKey(r.id, c.id) },
        el('span', { class: 'glyph', 'aria-hidden': 'true' }),
        el('span', { class: 'val', 'aria-hidden': 'true' }),
        el('span', { class: 'pips', 'aria-hidden': 'true' }, [0, 1, 2, 3].map(() => el('i'))));
      cells[i].push(td);
      tr.append(td);
    });
    tbody.append(tr);
  });
  table.append(tbody);
  container.replaceChildren(table);
  cells[0][0].tabIndex = 0;

  // Row/column highlighting (§20).
  function highlight(pos) {
    table.classList.toggle('scanning', !!pos);
    for (let i = 0; i < rows.length; i++) {
      rowHeads[i].classList.toggle('hl', !!pos && pos[0] === i);
      for (let j = 0; j < columns.length; j++) {
        cells[i][j].classList.toggle('hl', !!pos && (pos[0] === i || pos[1] === j));
      }
    }
    colHeads.forEach((th, j) => th.classList.toggle('hl', !!pos && pos[1] === j));
  }
  const posOf = (td) => [+td.dataset.r, +td.dataset.c];

  function focusCell(i, j) {
    cells[active[0]][active[1]].tabIndex = -1;
    active = [i, j];
    const td = cells[i][j];
    td.tabIndex = 0;
    td.focus();
  }

  table.addEventListener('pointerover', (e) => {
    const td = e.target.closest('td');
    if (td) highlight(posOf(td));
  });
  table.addEventListener('pointerleave', () => highlight(table.contains(document.activeElement) ? active : null));
  table.addEventListener('focusin', (e) => {
    const td = e.target.closest('td');
    if (td) { active = posOf(td); highlight(active); }
  });
  table.addEventListener('focusout', (e) => { if (!table.contains(e.relatedTarget)) highlight(null); });

  table.addEventListener('click', (e) => {
    const td = e.target.closest('td');
    if (!td) return;
    const key = td.dataset.key;
    focusCell(...posOf(td));
    if (key === selectedKey) onCycle(key);
    else onSelect(key);
  });

  table.addEventListener('keydown', (e) => {
    const td = e.target.closest('td');
    if (!td) return;
    const [i, j] = posOf(td);
    const key = td.dataset.key;
    const moves = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
    if (moves[e.key]) {
      e.preventDefault();
      const ni = Math.min(rows.length - 1, Math.max(0, i + moves[e.key][0]));
      const nj = Math.min(columns.length - 1, Math.max(0, j + moves[e.key][1]));
      focusCell(ni, nj);
      onSelect(cells[ni][nj].dataset.key);
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      const nj = e.key === 'Home' ? 0 : columns.length - 1;
      focusCell(i, nj);
      onSelect(cells[i][nj].dataset.key);
    } else if (/^[0-4]$/.test(e.key)) {
      e.preventDefault();
      onSetBaseline(key, +e.key);
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      onSetBaseline(key, null);
    } else if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (key === selectedKey) onCycle(key);
      else onSelect(key);
    } else if (e.key === 'Escape') {
      onClear();
    }
  });

  function update(processed, scenario, { selected, palette, showValues }) {
    selectedKey = selected;
    rows.forEach((r, i) => columns.forEach((c, j) => {
      const td = cells[i][j];
      const key = td.dataset.key;
      const p = processed.get(key);
      const cell = scenario.cells[key];
      const [glyph, val, pips] = td.children;
      td.className = `cell ${p.status}${p.meta.provisional ? ' provisional' : ''}${key === selected ? ' selected' : ''}${cell?.note ? ' has-note' : ''}${td.classList.contains('hl') ? ' hl' : ''}`;
      td.setAttribute('aria-selected', key === selected ? 'true' : 'false');
      if (p.status === 'marked') {
        const s = stateFor(p.result.E, config);
        td.style.background = colorFor(p.result.E, palette);
        td.style.color = inkFor(p.result.E, palette);
        glyph.textContent = s.glyph;
        val.textContent = showValues ? p.result.E.toFixed(2) : '';
        [...pips.children].forEach((pip, k) => pip.classList.toggle('on', k < cell.baseline));
        td.setAttribute('aria-label', `${r.label} × ${c.label}. Baseline ${cell.baseline}, ${config.baselineLabels[cell.baseline]}. Current: ${s.label}, ${p.result.E.toFixed(2)}.`);
      } else {
        td.style.background = '';
        td.style.color = '';
        glyph.textContent = '';
        val.textContent = '';
        [...pips.children].forEach((pip) => pip.classList.remove('on'));
        td.setAttribute('aria-label', `${r.label} × ${c.label}. ${p.status === 'na' ? 'Not applicable' : 'Unmarked'}.`);
      }
    }));
  }

  return { update, focusCell };
}
