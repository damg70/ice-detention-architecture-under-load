// Person view: the scene for one opened capacity, with its day bar, thought
// bubble and ring selection. Used by the main app (opened from a Network
// capacity node) and by the standalone person.html. The caller supplies the
// scenario and capacity, and places `note` (how the bubble reads) in its
// panel; it may also move `daybar` there (it starts over the scene).
import { el } from '../ui/dom.js';
import { processGrid } from '../model/processGrid.js';
import { buildPersonScene } from '../model/personScene.js';
import { lightingAt, formatClock, HOUR_SECONDS } from '../model/dayCycle.js';
import { colorFor, inkFor } from '../ui/colorScale.js';
import { createPersonView } from './scene.js';
import { bubbleAt, ringBubbleAt } from '../model/bubbles.js';
import { domainIcon } from './icons.js';

const loadJSON = (f) => fetch(new URL(`../data/${f}`, import.meta.url), { cache: 'no-cache' }).then((r) => r.json());

// Write text only when it changes. Rewriting a button's label every frame
// replaces the node under the pointer, and Safari then drops the click.
const setText = (node, text) => { if (node.textContent !== text) node.textContent = text; };

// ctx: { rows, columns, index, config }. onEscape: Escape with no ring selected.
export async function createPersonMode(root, { ctx, palette = 'standard', onEscape } = {}) {
  const [pcfg, bubbleLines] = await Promise.all(['person-config.json', 'bubble-lines.json'].map(loadJSON));
  const colLabel = new Map(ctx.columns.map((c) => [c.id, c.label]));

  // ── DOM ────────────────────────────────────────────────────────────────
  const stage = el('div', { class: 'stage', tabindex: 0, role: 'group',
    'aria-label': 'Person view. Enter selects a ring; arrow keys move between rings; Escape exits.' });
  const note = el('div', { class: 'person-note', 'aria-live': 'polite' });
  const ringLabel = el('div', { class: 'ring-label', hidden: true });
  const bubbleTag = el('span', { class: 'bubble-tag' });
  const bubbleIcon = el('span', { class: 'bubble-icon' });
  const bubbleText = el('span', { class: 'bubble-text' });
  const bubble = el('div', { class: 'bubble', hidden: true, 'aria-live': 'polite' },
    el('div', { class: 'bubble-body' }, bubbleTag, bubbleIcon, bubbleText),
    el('span', { class: 'bubble-dot one' }), el('span', { class: 'bubble-dot two' }));
  const playBtn = el('button', { type: 'button', class: 'play' });
  const scrub = el('input', { type: 'range', min: 0, max: 24, step: 0.05, 'aria-label': 'Hour of day' });
  const clock = el('span', { class: 'clock' });
  const mode = el('span', { class: 'mode' });
  const daybar = el('div', { class: 'panel overlay daybar' }, playBtn, scrub, clock, mode);
  root.replaceChildren(stage, ringLabel, bubble, daybar);

  // ── State ──────────────────────────────────────────────────────────────
  let scenario = null, capacityId = null, data = null;
  let hour = 6, day = 0, playing = true, active = false;   // day: whole days since opening
  let selectedRing = null;   // a selected ring speaks its own edges in the bubble

  const view = createPersonView(stage, {
    palette, lighting: pcfg.lighting, cellRadius: pcfg.radii.world[1] + 0.0225,
  });
  view.setActive(false);

  function refresh() {
    data = buildPersonScene(ctx, processGrid(ctx, scenario), scenario, capacityId, pcfg);
    view.setScene(data, ctx.config);
    renderDay();
  }

  // ── Day bar: the user owns the clock ───────────────────────────────────
  playBtn.addEventListener('click', () => { playing = !playing; renderDay(); });
  scrub.addEventListener('input', () => { hour = +scrub.value; playing = false; renderDay(); });
  // Safari doesn't focus a range input on click, so track the drag directly.
  let scrubbing = false;
  scrub.addEventListener('pointerdown', () => { scrubbing = true; });
  addEventListener('pointerup', () => { scrubbing = false; });
  addEventListener('pointercancel', () => { scrubbing = false; });

  function renderDay() {
    const s = lightingAt(hour, data.light, pcfg.lighting);
    view.setLighting(s);
    const ring = selectedRing && data.rings.find((r) => r.ring === selectedRing);
    renderBubble(ring
      ? { ring, line: ringBubbleAt(hour, ring.edges, bubbleLines, { day }) }
      : { ring: null, line: bubbleAt(hour, data.capacity.edges, bubbleLines, { outdoor: s.outdoor, day }) });
    setText(playBtn, playing ? 'Pause' : 'Play');
    if (!scrubbing) scrub.value = s.hour;
    setText(clock, formatClock(s.hour));
    setText(mode, s.outdoor > 0.5 ? 'Outdoors'
      : s.sun > 0.05 ? 'Fluorescent, sun through the window'
      : s.tubes < 0.5 ? 'Lights out'
      : 'Fluorescent');
  }

  // ── Thought bubble ─────────────────────────────────────────────────────
  // One line at a time, chosen by bubbleAt(); it fades between lines and
  // follows the mannequin's head on screen, also while paused.
  let shownKey = null, fadeTimer = null;
  // { ring: selected ring or null, line: bubble line or null }.
  function renderBubble({ ring, line: b }) {
    const key = `${ring?.ring ?? ''}|${b ? `${b.key}|${b.text}` : ''}`;
    if (key === shownKey) return;
    shownKey = key;
    clearTimeout(fadeTimer);
    bubble.classList.add('fading');
    fadeTimer = setTimeout(() => {
      if (!b && !ring) { bubble.hidden = true; return; }
      bubble.hidden = false;
      // A selected ring strokes the bubble in its color and names itself.
      bubble.classList.toggle('ring', !!ring);
      bubble.style.setProperty('--ring', ring && ring.meanE != null ? colorFor(ring.meanE, palette) : 'transparent');
      bubbleTag.textContent = ring ? ring.ring : '';
      if (b) {
        bubbleIcon.innerHTML = domainIcon(b.domain);      // static glyph markup
        bubbleIcon.style.background = colorFor(b.E, palette);
        bubbleIcon.style.color = inkFor(b.E, palette);
        bubbleIcon.title = colLabel.get(b.domain);
      }
      bubbleText.textContent = b ? b.text : '';
      bubble.classList.remove('fading');
    }, bubble.hidden ? 0 : 250);
  }
  function placeBubble() {
    const p = view.headScreen();
    bubble.style.visibility = p ? '' : 'hidden';
    if (p) bubble.style.transform = `translate(${Math.round(p.x)}px, ${Math.round(p.y)}px)`;
  }

  // ── Ring selection: click, or the keyboard ─────────────────────────────
  function selectRing(name) {
    selectedRing = name;
    view.setSelectedRing(name);
    renderNote();
    if (data) renderDay();
  }
  // How the thought bubble reads now, and how to change it.
  function renderNote() {
    note.replaceChildren(...(selectedRing ? [
      el('p', {}, 'Ring selected: ', el('strong', { class: 'person-note-ring', text: selectedRing }), '.'),
      el('p', { text: 'The thought bubble now speaks for this ring alone: one feature at a time, from each capacity on this ring that shapes the same lived domains. Its outline takes the ring’s color.' }),
      el('p', { class: 'muted', text: 'Arrow keys move to the next ring. Click the ring again, or press Escape, to go back to this capacity.' }),
    ] : [
      el('p', { text: 'The thought bubble speaks for this capacity: one feature at a time, following the time of day.' }),
      el('p', { class: 'muted', text: 'Click a ring, or focus the scene and press Enter, to hear that ring instead.' }),
    ]));
  }
  renderNote();
  view.onRingClick((name) => selectRing(name && name !== selectedRing ? name : null));
  addEventListener('keydown', (e) => {
    if (!active || e.key !== 'Escape' || e.defaultPrevented) return;
    if (selectedRing) selectRing(null);
    else onEscape?.();
  });

  // Tab focuses the scene (it is never hijacked); Enter or Space toggles ring
  // mode, starting at the opened capacity's own ring; arrows cycle the
  // selected ring, wrapping: up/right step outward (body → world), down/left
  // inward.
  const ringOrder = pcfg.rings;
  const startRing = () => data?.rings.find((r) => r.own)?.ring ?? ringOrder[0];
  stage.addEventListener('keydown', (e) => {
    const step = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1 }[e.key];
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      selectRing(selectedRing ? null : startRing());
    } else if (step) {
      e.preventDefault();
      if (!selectedRing) { selectRing(startRing()); return; }
      const i = ringOrder.indexOf(selectedRing);
      selectRing(ringOrder[(i + step + ringOrder.length) % ringOrder.length]);
    }
  });

  // ── Ring labels on hover ───────────────────────────────────────────────
  view.onRingHover((name, p) => {
    ringLabel.hidden = !name;
    if (!name) return;
    setText(ringLabel, name);
    const o = root.getBoundingClientRect();   // the pointer is in page coordinates
    ringLabel.style.transform = `translate(${Math.round(p.x - o.left + 14)}px, ${Math.round(p.y - o.top + 14)}px)`;
  });

  view.onFrame((dt) => {
    if (!data) return;
    placeBubble();
    if (!playing) return;
    hour += dt / HOUR_SECONDS;
    if (hour >= 24) { hour -= 24; day += 1; }   // a new day can bring alternative lines
    renderDay();
  });

  return {
    note,
    daybar,
    stage,
    get capacityId() { return capacityId; },
    get isOpen() { return active; },
    // Open a capacity. Each opening starts the day at midnight, playing.
    show(nextScenario, nextCapacity) {
      scenario = nextScenario;
      capacityId = nextCapacity;
      hour = 0;
      day = 0;
      playing = true;
      shownKey = null;
      selectRing(null);
      active = true;
      view.setActive(true);
      refresh();
    },
    // The scenario changed (load sliders, or the source picker).
    update(nextScenario) {
      scenario = nextScenario;
      if (active) refresh();
    },
    hide() {
      active = false;
      view.setActive(false);
      ringLabel.hidden = true;
    },
    setPalette(p) {
      if (p === palette) return;
      palette = p;
      view.setPalette(p);
      shownKey = null;
      if (active) refresh();
    },
  };
}
