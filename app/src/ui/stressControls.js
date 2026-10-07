// Duration and population/capacity sliders (§7). Sliders store raw values
// (hours, ratio); D and P are displayed only for inspection.
import { el, fmt2 } from './dom.js';
import { normalizeDuration, durationFromPosition } from '../model/normalizeDuration.js';
import { ratioFromPosition, positionFromRatio } from '../model/normalizePopulation.js';
import { formatHours, formatRatio } from '../model/explain.js';
import { loadFactors } from '../model/processGrid.js';

const STEPS = 1000;
const SNAP = 10; // slider units within which a value snaps to a labeled anchor

function ticks(items) {
  return el('div', { class: 'ticks', 'aria-hidden': 'true' },
    items.map(({ pos, label, strong }) =>
      el('span', { class: strong ? 'tick strong' : 'tick', style: `--pos:${pos}` }, label)));
}

export function createStressControls(container, { config, onChange }) {
  const durAnchors = config.duration.anchors.map((a) => ({ ...a, pos: normalizeDuration(a.hours, config) }));
  const popAnchors = config.population.anchors.map((a) => ({ ...a, pos: positionFromRatio(a.ratio, config) }));

  const durInput = el('input', { type: 'range', min: 0, max: STEPS, step: 1, id: 'duration', 'aria-describedby': 'duration-readout' });
  const durReadout = el('output', { id: 'duration-readout', for: 'duration', class: 'readout' });
  const durFactor = el('span', { class: 'factor' });

  const popInput = el('input', { type: 'range', min: 0, max: STEPS, step: 1, id: 'population', 'aria-describedby': 'population-readout' });
  const popReadout = el('output', { id: 'population-readout', for: 'population', class: 'readout' });
  const popAbs = el('span', { class: 'abs' });
  const popFactor = el('span', { class: 'factor' });

  const capInput = el('input', { type: 'number', min: 1, step: 1, inputmode: 'numeric', placeholder: '—', id: 'design-capacity' });
  const curInput = el('input', { type: 'number', min: 0, step: 1, inputmode: 'numeric', placeholder: '—', id: 'current-population' });

  const snap = (v, anchors) => {
    for (const a of anchors) if (Math.abs(v - a.pos * STEPS) <= SNAP) return a;
    return null;
  };

  durInput.addEventListener('input', () => {
    const v = +durInput.value;
    const a = snap(v, durAnchors);
    onChange({ durationHours: a ? a.hours : durationFromPosition(v / STEPS, config) });
  });
  popInput.addEventListener('input', () => {
    const v = +popInput.value;
    const a = snap(v, popAnchors);
    onChange({ loadRatio: a ? a.ratio : ratioFromPosition(v / STEPS, config), fromSlider: true });
  });
  const absChanged = () => {
    const cap = +capInput.value > 0 ? +capInput.value : null;
    const cur = curInput.value !== '' && +curInput.value >= 0 ? +curInput.value : null;
    const patch = { designCapacity: cap, currentPopulation: cur };
    if (cap && cur != null) patch.loadRatio = Math.max(0.05, cur / cap);
    onChange(patch);
  };
  capInput.addEventListener('change', absChanged);
  curInput.addEventListener('change', absChanged);

  container.replaceChildren(
    el('div', { class: 'control' },
      el('div', { class: 'control-head' },
        el('label', { for: 'duration', class: 'control-label', text: 'Duration of exposure' }),
        durReadout, durFactor),
      el('div', { class: 'slider' }, durInput, ticks(durAnchors.map((a) => ({ pos: a.pos, label: a.label }))))),
    el('div', { class: 'control' },
      el('div', { class: 'control-head' },
        el('label', { for: 'population', class: 'control-label', text: 'Population / capacity load' }),
        popReadout, popAbs, popFactor),
      el('div', { class: 'slider' }, popInput,
        ticks(popAnchors.map((a) => ({ pos: a.pos, label: formatRatio(a.ratio), strong: a.ratio === 1 })))),
      el('details', { class: 'absolute' },
        el('summary', { text: 'Absolute numbers (optional)' }),
        el('div', { class: 'abs-fields' },
          el('label', {}, 'Design capacity', capInput),
          el('label', {}, 'Current population', curInput)))),
  );

  function set(s) {
    if (document.activeElement !== durInput) durInput.value = Math.round(normalizeDuration(s.durationHours, config) * STEPS);
    if (document.activeElement !== popInput) popInput.value = Math.round(positionFromRatio(s.loadRatio, config) * STEPS);
    durReadout.textContent = formatHours(s.durationHours);
    popReadout.textContent = `${formatRatio(s.loadRatio)} of capacity${Math.abs(s.loadRatio - 1) < 0.005 ? ' (nominal)' : ''}`;
    const f = loadFactors(s.durationHours, s.loadRatio, config);
    durFactor.textContent = `D ${fmt2(f.D)}`;
    popFactor.textContent = `P ${fmt2(f.P)}`;
    popAbs.textContent = s.designCapacity
      ? `${Math.round(s.loadRatio * s.designCapacity).toLocaleString()} people / ${s.designCapacity.toLocaleString()} design`
      : '';
    if (document.activeElement !== capInput) capInput.value = s.designCapacity ?? '';
    if (document.activeElement !== curInput) curInput.value = s.currentPopulation ?? '';
  }

  return { set };
}
