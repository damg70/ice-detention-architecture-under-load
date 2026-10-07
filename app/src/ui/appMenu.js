// App menu (top left, after the title): saved scenarios and file actions.
import { el } from './dom.js';

export function createAppMenu(container, h) {
  const menu = el('details', { class: 'menu' });
  const list = el('div', { class: 'menu-list', role: 'menu' });
  const file = el('input', { type: 'file', accept: 'application/json,.json', class: 'sr-only', tabindex: -1 });
  file.addEventListener('change', () => { if (file.files[0]) h.onImport(file.files[0]); file.value = ''; });
  menu.append(el('summary', { class: 'menu-button' }, 'Scenario'), list);
  container.replaceChildren(menu, file);

  const close = () => { menu.open = false; };
  document.addEventListener('click', (e) => { if (!menu.contains(e.target)) close(); });
  menu.addEventListener('keydown', (e) => { if (e.key === 'Escape') { close(); menu.querySelector('summary').focus(); } });

  const item = (text, onclick, extra = {}) => el('button', {
    type: 'button', role: 'menuitem', class: 'menu-item', ...extra,
    onclick: () => { close(); onclick(); },
  }, text);

  function render(lib, scenario) {
    const saved = Object.values(lib.scenarios).sort((a, b) => a.name.localeCompare(b.name));
    list.replaceChildren(
      el('div', { class: 'menu-heading', text: 'Saved scenarios' }),
      ...saved.map((s) => item(s.name, () => h.onSwitch(s.id), {
        class: `menu-item${s.id === scenario.id ? ' current' : ''}`,
        'aria-current': s.id === scenario.id ? 'true' : null,
      })),
      el('hr'),
      item('New blank scenario', h.onNew),
      item('Duplicate', h.onDuplicate),
      item('Reset to archetype', h.onReset),
      item('Delete', h.onDelete),
      el('hr'),
      item('Export JSON', h.onExport),
      item('Import JSON…', () => file.click()));
  }

  return { render };
}
