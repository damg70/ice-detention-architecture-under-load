// Continuous strain ↔ support scale (§10). Rendering only — the model
// never sees colors. 0.5 (just adequate) sits on the neutral stop.

const PALETTES = {
  standard: [
    [0.0, [125, 31, 26]],
    [0.25, [194, 80, 43]],
    [0.5, [214, 178, 94]],
    [0.75, [147, 173, 92]],
    [1.0, [61, 122, 76]],
  ],
  // Blue–orange diverging; distinguishable under common color-vision deficiencies.
  colorblind: [
    [0.0, [127, 59, 8]],
    [0.25, [208, 128, 42]],
    [0.5, [227, 217, 191]],
    [0.75, [126, 166, 200]],
    [1.0, [43, 92, 138]],
  ],
};

export const PALETTE_NAMES = Object.keys(PALETTES);

function rgbAt(E, name) {
  const stops = PALETTES[name] ?? PALETTES.standard;
  const x = Math.min(1, Math.max(0, E));
  for (let i = 1; i < stops.length; i++) {
    const [p1, c1] = stops[i];
    if (x <= p1) {
      const [p0, c0] = stops[i - 1];
      const t = (x - p0) / (p1 - p0);
      return c0.map((v, k) => Math.round(v + t * (c1[k] - v)));
    }
  }
  return stops[stops.length - 1][1];
}

// Raw [r, g, b] 0–255, for renderers that don't take CSS colors (three.js).
export const rgbFor = (E, name) => rgbAt(E, name);

export function colorFor(E, name) {
  const [r, g, b] = rgbAt(E, name);
  return `rgb(${r} ${g} ${b})`;
}

// Dark or light ink for legible glyphs on a given fill.
export function inkFor(E, name) {
  const [r, g, b] = rgbAt(E, name).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.28 ? '#1b1a17' : '#faf8f3';
}

export function gradientCss(name) {
  const stops = PALETTES[name] ?? PALETTES.standard;
  return `linear-gradient(90deg, ${stops.map(([p, [r, g, b]]) => `rgb(${r} ${g} ${b}) ${p * 100}%`).join(', ')})`;
}
