// Model version 3 — demand-relative margin. See spec §9.
// (v3 drops v2's form-level modifier, capacity elasticity: P arrives unmodified.)
//
//   load   = baseDemand + dS·D + pS·P + iS·D·P
//   demand = DEMAND_CEILING · (1 − e^(−load))
//   E      = clamp(0.5 + (Q − demand), 0, 1)
//
// E = 0.5 means support just matches demand. This is the only place the
// formula lives; replace this function to change the model.

export const MODEL_VERSION = 3;

const clamp01 = (x) => Math.min(1, Math.max(0, x));

export function processCell(baseline, meta, D, P, config) {
  const Q = baseline / 4;
  const terms = {
    base: meta.baseDemand,
    duration: meta.durationSensitivity * D,
    population: meta.populationSensitivity * P,
    interaction: meta.interactionSensitivity * D * P,
  };
  const load = terms.base + terms.duration + terms.population + terms.interaction;
  const demand = config.demandCeiling * (1 - Math.exp(-load));
  const margin = Q - demand;
  // The midpoint is 0.5 in the model; the equation lab can try other values.
  return { Q, terms, load, demand, margin, E: clamp01((config.midpoint ?? 0.5) + margin) };
}
