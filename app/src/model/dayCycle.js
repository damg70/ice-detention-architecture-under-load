// The 24-hour cycle: lighting as a deterministic function of the hour and
// what the facility PROVIDES — three baselines (architecture and operations,
// fixed under load): the window (daylight × temporal), yard time (exterior ×
// movement) and the night lighting policy (sensory compartmentalization ×
// sleep). What that provision MEANS to the person (E) is shown by the rings,
// mannequin and bubble, never by the lighting, so dragging the load sliders
// never changes the light (design_notes.md, 2026-10-03).

// Real seconds per simulated hour. 4 → a 96-second day, slow enough for
// 6-second thought bubbles to be read (2026-10-04). In code only.
export const HOUR_SECONDS = 4;

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
// 0 outside [start, end), 1 inside, with `fade`-hour edges.
const window01 = (h, start, end, fade) => smooth(start - fade, start, h) * (1 - smooth(end, end + fade, h));

// Baseline (0–4) → provision. null = unmarked: no assertion.
export const windowKind = (b, L) => (b == null ? 'outline' : L.windowByBaseline[b]);
export const outdoorHours = (b, L) => (b == null ? 0 : L.outdoorHoursByBaseline[b]);
const nightLevelFor = (b, L) => (b == null ? L.nightLevelUnmarked : L.nightLevelByBaseline[b]);
const sunStrengthFor = (b, L) => (b == null ? 0 : L.sunByBaseline[b]);

// Returns the lighting state at `hour` (0–24), given baselines
// light = { daylight, outdoor, night } (each 0–4 or null).
//   fluorescent: 0–1 level of the overhead tubes
//   tubes:       0–1 whether the tubes are on (0 = lights out); below the
//                threshold the remaining light is night ambient
//   outdoor:     0–1 blend toward open sky
//   sun:         0–1 sunlight through the window right now
//   sunAngle:    0 at sunrise → 1 at sunset (drives the sun's path)
//   sunUp:       0–1 daytime (time of day only, for the sky outside)
//   daylight:    0–1 how much daylight the window admits (by its size)
//   window:      'none' | 'slit' | 'window' | 'large' | 'outline'
export function lightingAt(hour, light, L) {
  const h = ((hour % 24) + 24) % 24;
  const day = window01(h, L.lightsOn, L.lightsOff, L.fade);
  const nightLevel = nightLevelFor(light.night, L);
  const oh = outdoorHours(light.outdoor, L);
  const outdoor = oh > 0 ? window01(h, L.outdoorStart, L.outdoorStart + oh, L.fade) : 0;
  const sunUp = window01(h, L.sunrise, L.sunset, L.fade);
  const daylight = sunStrengthFor(light.daylight, L);
  const fluorescent = (nightLevel + (1 - nightLevel) * day) * (1 - outdoor);
  return {
    hour: h,
    fluorescent,
    tubes: smooth(L.lightsOutBelow, L.lightsOutBelow + 0.15, fluorescent),
    outdoor,
    sun: daylight * sunUp * (1 - outdoor),
    sunAngle: Math.min(1, Math.max(0, (h - L.sunrise) / (L.sunset - L.sunrise))),
    sunUp,
    daylight,
    window: windowKind(light.daylight, L),
    outdoorHours: oh,
  };
}

export function formatClock(hour) {
  const h = ((hour % 24) + 24) % 24;
  const m = Math.floor((h % 1) * 60);
  return `${String(Math.floor(h)).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
