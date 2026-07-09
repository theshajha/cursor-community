// The one health formula. The UI popover renders FORMULA_TEXT verbatim —
// if you change the code, change the text in the same commit.
const DAY = 86400000;
const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const days = (a, b) => (new Date(a) - new Date(b)) / DAY;

export const FORMULA_TEXT =
  'health = 0.35·cadence + 0.25·trend + 0.20·recency + 0.20·funnel\n' +
  'cadence  events last 60d vs the city’s own trailing baseline\n' +
  'trend    slope of the last 3 events’ attendance\n' +
  'recency  days since the host was last active (60d floor)\n' +
  'funnel   attended → activated-week-1, most recent measured event\n' +
  'thriving ≥ .75 · steady ≥ .50 · cooling ≥ .30 · quiet < .30';

export function healthScore(city, today) {
  const past = city.events.filter(e => e.status === 'past')
    .sort((a, b) => b.date.localeCompare(a.date));

  const in60 = past.filter(e => days(today, e.date) <= 60).length;
  const cadence = clamp(in60 / Math.max(city.baseline_60d, 1));

  const last3 = past.slice(0, 3).reverse();
  let trend = 0.5;
  if (last3.length >= 2) {
    const rel = (last3.at(-1).attended - last3[0].attended) / Math.max(last3[0].attended, 1);
    trend = clamp((rel + 0.5) / 1.0);           // -50%→0, flat→0.5, +50%→1
  }

  const recency = clamp(1 - days(today, city.host_last_active) / 60);

  const measured = past.find(e => e.funnel);
  const funnel = measured
    ? clamp((measured.funnel.activated_w1 / Math.max(measured.attended, 1)) / 0.4)
    : 0.5;                                       // unmeasured: neutral, not penalized

  const score = +(0.35 * cadence + 0.25 * trend + 0.20 * recency + 0.20 * funnel).toFixed(3);
  const state = score >= 0.75 ? 'thriving' : score >= 0.5 ? 'steady'
    : score >= 0.3 ? 'cooling' : 'quiet';
  return { score, state, factors: { cadence: +cadence.toFixed(2), trend: +trend.toFixed(2),
    recency: +recency.toFixed(2), funnel: +funnel.toFixed(2) } };
}
