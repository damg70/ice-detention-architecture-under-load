// Duration of exposure (hours) → D ∈ [0,1] on a log scale. See spec §7.1.

const clamp01 = (x) => Math.min(1, Math.max(0, x));

export function normalizeDuration(hours, config) {
  const { minHours, maxHours } = config.duration;
  if (!(hours > 0)) return 0;
  return clamp01(Math.log(hours / minHours) / Math.log(maxHours / minHours));
}

// Inverse, used by the slider: position t ∈ [0,1] → hours.
export function durationFromPosition(t, config) {
  const { minHours, maxHours } = config.duration;
  return minHours * Math.pow(maxHours / minHours, clamp01(t));
}
