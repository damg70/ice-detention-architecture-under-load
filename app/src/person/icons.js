// Lived-domain glyphs for the thought bubble: simple 24×24 strokes in
// currentColor. Static markup only (no data is interpolated).
const P = {
  sleep_rest: 'M3 18v-6h18v6M3 15h18M6 12V9h5v3',
  hygiene_privacy: 'M12 3c3 4 6 7 6 10a6 6 0 0 1-12 0c0-3 3-6 6-10z',
  food_water: 'M6 8h12l-1.5 11h-9zM9 4v2M12 4v2M15 4v2',
  sensory_regulation: 'M4 12h1M8 9v6M12 5v14M16 9v6M20 12h-1',
  movement_recreation: 'M5 12h14M15 8l4 4-4 4M9 8l-4 4 4 4',
  medical_access: 'M10 4h4v6h6v4h-6v6h-4v-6H4v-4h6z',
  legal_social: 'M4 5h16v10H10l-5 4v-4H4z',
  temporal_orientation: 'M12 3a9 9 0 1 0 .01 0zM12 7v5l3 2',
  safety_conflict: 'M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z',
  agency_dignity: 'M6 3h12v18H6zM14 12h1',
};
export const domainIcon = (domain) =>
  `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${P[domain] ?? ''}"/></svg>`;
