// Thought bubble: which line shows at a given hour. Pure and deterministic.
//
// The day is cut into slots of BUBBLE_SECONDS of real time. In each slot,
// the opened capacity's edges that may speak in the current phase (morning,
// afternoon, evening, night) are taken in a fixed order, and the slot number
// picks one, so the same hour always shows the same line. If none may speak
// in this phase, all of them may. Outdoors, only exterior-permeability edges
// speak. Lines come from bubble-lines.json.

import { HOUR_SECONDS } from './dayCycle.js';

// Real seconds each bubble stays up. In code only.
export const BUBBLE_SECONDS = 6;
export const SLOT_HOURS = BUBBLE_SECONDS / HOUR_SECONDS;

export function bandFor(E) {
  return E >= 0.6 ? 'supportive' : E >= 0.4 ? 'mixed' : E >= 0.2 ? 'substantial' : 'severe';
}

// Alternative lines: any entry in bubble-lines.json (a day line or a night
// variant) may be a list of strings instead of one. Day 0 of a viewing (the
// first 24 hours after opening) uses the first; each later day moves to the
// next, wrapping. Deterministic: the same day always says the same thing.
export function pickLine(entry, day = 0) {
  if (!Array.isArray(entry)) return entry ?? null;
  return entry.length ? entry[((day % entry.length) + entry.length) % entry.length] : null;
}

// The line an edge speaks: its night variant at night (when it has one),
// else its day line, choosing among alternatives by day.
export function lineFor(library, key, band, phase, day = 0) {
  return (phase === 'night' && pickLine(library.night[key]?.[band], day)) || pickLine(library.lines[key]?.[band], day);
}

export function phaseAt(hour, phases) {
  const h = ((hour % 24) + 24) % 24;
  for (const [name, [a, b]] of Object.entries(phases)) {
    if (a < b ? h >= a && h < b : h >= a || h < b) return name;
  }
  return null;
}

// edges: the opened capacity's edges (each with key, capacity, domain, E).
// day: whole days since the view opened (picks among alternative lines).
// Returns { key, domain, band, text, slot, phase } or null.
export function bubbleAt(hour, edges, library, { outdoor = 0, day = 0 } = {}) {
  const h = ((hour % 24) + 24) % 24;
  const slot = Math.floor(h / SLOT_HOURS);
  // The phase at the slot's start, so a bubble never changes mid-slot.
  const phase = phaseAt(slot * SLOT_HOURS, library.phases);
  const spoken = edges.filter((e) => library.lines[e.key]);
  let allowed = spoken.filter((e) => library.when[e.key]?.includes(phase));
  if (outdoor > 0.5) allowed = allowed.filter((e) => e.capacity === 'exterior_permeability');
  // The bubble always cycles: when nothing fits this phase (e.g. a capacity
  // whose lines are all daytime), its other lines speak instead.
  // Lines that mention night still wait for the evening.
  if (!allowed.length && outdoor <= 0.5) {
    allowed = spoken.filter((e) => NIGHT_OK.has(phase) || !mentionsNight(e.key, lineFor(library, e.key, bandFor(e.E), phase, day)));
  }
  if (!allowed.length) return null;
  const e = allowed[slot % allowed.length];
  const band = bandFor(e.E);
  const text = lineFor(library, e.key, band, phase, day);
  return { key: e.key, domain: e.domain, E: e.E, band, text, slot, phase };
}

// A selected ring (inspection): cycle that ring's edges, ignoring the
// time-of-day filter, except that lines about night still appear only in
// the evening or at night (night variants only at night). One exception:
// "morning or night" disorientation is valid any time.
const NIGHT_OK = new Set(['evening', 'night']);
const mentionsNight = (key, text) => /night/i.test(text) && key !== 'daylight_orientation:temporal_orientation';

export function ringBubbleAt(hour, edges, library, { day = 0 } = {}) {
  const h = ((hour % 24) + 24) % 24;
  const slot = Math.floor(h / SLOT_HOURS);
  const phase = phaseAt(slot * SLOT_HOURS, library.phases);
  const speak = edges.map((e) => {
    const band = bandFor(e.E);
    const text = lineFor(library, e.key, band, phase, day);
    return text && (NIGHT_OK.has(phase) || !mentionsNight(e.key, text))
      ? { key: e.key, domain: e.domain, E: e.E, band, text, slot, phase }
      : null;
  }).filter(Boolean);
  return speak.length ? speak[slot % speak.length] : null;
}
