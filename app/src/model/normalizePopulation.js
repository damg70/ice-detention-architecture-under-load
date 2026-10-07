// Load ratio (current / design capacity) → P ∈ [0,1] by piecewise-linear
// interpolation over the anchor table in model-config.json. See spec §7.2.

export function normalizePopulation(ratio, config) {
  const a = config.population.anchors;
  if (!(ratio > a[0].ratio)) return a[0].P;
  for (let i = 1; i < a.length; i++) {
    if (ratio <= a[i].ratio) {
      const t = (ratio - a[i - 1].ratio) / (a[i].ratio - a[i - 1].ratio);
      return a[i - 1].P + t * (a[i].P - a[i - 1].P);
    }
  }
  return a[a.length - 1].P;
}

// The slider spaces anchors evenly so each labeled step gets equal travel.
// position t ∈ [0,1] ↔ ratio.
export function ratioFromPosition(t, config) {
  const a = config.population.anchors;
  const x = Math.min(1, Math.max(0, t)) * (a.length - 1);
  const i = Math.min(a.length - 2, Math.floor(x));
  return a[i].ratio + (x - i) * (a[i + 1].ratio - a[i].ratio);
}

export function positionFromRatio(ratio, config) {
  const a = config.population.anchors;
  if (ratio <= a[0].ratio) return 0;
  for (let i = 1; i < a.length; i++) {
    if (ratio <= a[i].ratio) {
      const t = (ratio - a[i - 1].ratio) / (a[i].ratio - a[i - 1].ratio);
      return (i - 1 + t) / (a.length - 1);
    }
  }
  return 1;
}
