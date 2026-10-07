// Deterministic, template-based descriptions of a cell's state (§14).
// No inference: every sentence is selected from metadata and thresholds.

export function stateFor(E, config) {
  return config.states.find((s) => E < s.max) ?? config.states[config.states.length - 1];
}

export function questionFor(row, col, meta) {
  return meta.question ?? `To what degree does ${row.phrase} support ${col.phrase}?`;
}

export function formatHours(h) {
  if (h >= 4380) return '6 months+';
  if (h < 96.5) return `${Math.round(h)} hour${Math.round(h) === 1 ? '' : 's'}`;
  const days = h / 24;
  if (days < 6.5) return `${Math.round(days)} days`;
  const unit = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
  if (days < 27.5) return unit(Math.round(days / 7), 'week');
  return unit(Math.round(days / 30), 'month');
}

export const formatRatio = (r) => `${Math.round(r * 100)}%`;

const degree = (x) => (x >= 0.75 ? 'highly' : x >= 0.45 ? 'moderately' : 'only weakly');

const TERM_PHRASES = {
  base: 'need that is present from the first hour',
  duration: 'the duration of exposure',
  population: 'population load',
  interaction: 'the combination of long exposure and crowding',
};

export function dominantTerm(terms) {
  return Object.entries(terms).reduce((a, b) => (b[1] > a[1] ? b : a))[0];
}

export function explainCell({ meta, result, minimalResult, baseline, config, factors }) {
  const out = [];
  const d = meta.durationSensitivity, p = meta.populationSensitivity, i = meta.interactionSensitivity;

  if (Math.abs(d - p) < 0.1) {
    out.push(`This relationship is ${degree(Math.max(d, p))} sensitive to both duration and population load.`);
  } else {
    const [hi, lo] = d > p ? ['duration', 'population load'] : ['population load', 'duration'];
    out.push(`This relationship is ${degree(Math.max(d, p))} sensitive to ${hi} and ${degree(Math.min(d, p))} sensitive to ${lo}.`);
  }
  if (i >= 0.7) out.push('It is especially strained when many people remain together for a long time.');
  if (meta.mechanism) out.push(`Rising demand presses on ${meta.mechanism}.`);
  if (meta.baseDemand >= 0.1) out.push('Part of this need exists from the first hour, regardless of duration or crowding.');

  const total = result.load || 1;
  const dom = dominantTerm(result.terms);
  const share = Math.round((result.terms[dom] / total) * 100);
  out.push(`Under current conditions, the largest share of load (${share}%) comes from ${TERM_PHRASES[dom]}.`);

  const label = config.baselineLabels[baseline].toLowerCase();
  if (result.margin >= 0.1) out.push(`The baseline (${label}) still exceeds what these conditions demand.`);
  else if (result.margin > -0.1) out.push(`The baseline (${label}) roughly matches demand; small changes in load will tip it.`);
  else out.push(`Demand exceeds what the baseline (${label}) can supply.`);

  const s0 = stateFor(minimalResult.E, config), s1 = stateFor(result.E, config);
  if (s0.key !== s1.key) {
    out.push(`With only a few people here for a couple of hours, this cell would read “${s0.label.toLowerCase()}”. The architecture is the same; only the demand on it has changed.`);
  }
  return out;
}
