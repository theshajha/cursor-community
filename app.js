const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

// MIRROR of scripts/lib/project.mjs — keep character-identical.
const MAP_W = 1000, MAP_H = 500, VIEWBOX = '0 14 1000 403';
function project(lat, lng) {
  return { x: ((lng + 180) / 360) * MAP_W, y: ((90 - lat) / 180) * MAP_H };
}

const [pulse, mapPath] = await Promise.all([
  fetch('data/pulse.json').then(r => r.json()),
  fetch('data/map-path.json').then(r => r.json()),
]);

const cityById = new Map(pulse.cities.map(c => [c.id, c]));

// ---- formatting helpers ----
const fmtDate = (iso) => new Date(iso + 'T00:00:00Z')
  .toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
const fmtDateY = (iso) => new Date(iso + 'T00:00:00Z')
  .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
const rel = (iso) => {
  const min = Math.round((Date.now() - new Date(iso)) / 60000);
  if (min < 60) return `synced ${Math.max(min, 1)} min ago`;
  const h = Math.round(min / 60);
  if (h < 48) return `synced ${h} h ago`;
  return `synced ${fmtDate(iso.slice(0, 10))}`;
};
const STATE_WORD = { thriving: 'Thriving', steady: 'Steady', cooling: 'Cooling', quiet: 'Quiet' };
const hColor = (state) => `var(--health-${state})`;
const daysBetween = (a, b) => Math.round((new Date(a) - new Date(b)) / 86400000);
const NOW = new Date(pulse.generated_at);

$('#week-label').textContent = `Week of ${fmtDate(pulse.week_of)}`;
$('#freshness').textContent = rel(pulse.generated_at);
$('#formula-popover pre').textContent = pulse.formula;

// ---- map ----
function renderMap() {
  const r = (c) => 3.5 + 3.5 * Math.min(c.members / 500, 1);
  const dots = pulse.cities.map(c => {
    const { x, y } = project(c.lat, c.lng);
    return `<circle class="city ${c.health.state}" data-id="${c.id}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r(c).toFixed(1)}" tabindex="0" role="button" aria-label="${c.name} — ${c.health.state}"/>`;
  }).join('');
  $('#map').innerHTML =
    `<svg viewBox="${VIEWBOX}" xmlns="http://www.w3.org/2000/svg">
       <path class="land" d="${mapPath.d}"/>${dots}</svg>`;
}
renderMap();

// ---- tooltip ----
const tip = $('#tooltip');

function tooltipHTML(c) {
  const host = c.ambassador?.name
    ? `<p class="tt-row">Host · ${c.ambassador.name}</p>`
    : `<p class="tt-row" style="color:var(--text-ter)">${c.ambassador?.note ?? 'host not yet mapped'}</p>`;
  let ev = '';
  if (c.next_event) {
    ev = `<p class="tt-row">Next · ${c.next_event.name} · ${fmtDate(c.next_event.date)}</p>`;
  } else if (c.events?.length) {
    const last = c.events[0];
    ev = `<p class="tt-row">Last · ${last.name} · ${fmtDate(last.date)}</p>`;
  }
  return `
    <p class="tt-name">${c.name} <span class="tt-country">· ${c.country}</span></p>
    ${host}${ev}
    <p class="tt-state"><i style="background:${hColor(c.health.state)}"></i>${STATE_WORD[c.health.state]}</p>`;
}

function showTip(circle, c) {
  tip.innerHTML = tooltipHTML(c);
  tip.hidden = false;
  const card = $('.map-card').getBoundingClientRect();
  const r = circle.getBoundingClientRect();
  const cx = r.left + r.width / 2 - card.left;
  const cy = r.top - card.top;
  const tw = tip.offsetWidth, th = tip.offsetHeight;
  let left = Math.max(8, Math.min(cx - tw / 2, card.width - tw - 8));
  let top = cy - th - 12;
  if (top < 8) top = r.bottom - card.top + 12;
  tip.style.left = `${left}px`;
  tip.style.top = `${top}px`;
}
function hideTip() { tip.hidden = true; }

// ---- interaction wiring (delegated on the map) ----
const map = $('#map');
map.addEventListener('pointerover', (e) => {
  const dot = e.target.closest('.city');
  if (dot) showTip(dot, cityById.get(dot.dataset.id));
});
map.addEventListener('pointerout', (e) => {
  if (e.target.closest('.city')) hideTip();
});
map.addEventListener('focusin', (e) => {
  const dot = e.target.closest('.city');
  if (dot) showTip(dot, cityById.get(dot.dataset.id));
});
map.addEventListener('focusout', (e) => {
  if (e.target.closest('.city')) hideTip();
});
map.addEventListener('click', (e) => {
  const dot = e.target.closest('.city');
  if (dot) selectCity(dot.dataset.id, dot);
});
map.addEventListener('keydown', (e) => {
  const dot = e.target.closest('.city');
  if (dot && (e.key === 'Enter' || e.key === ' ')) {
    e.preventDefault();
    selectCity(dot.dataset.id, dot);
  }
});

// ---- selectCity stub (filled in Task 9) ----
function selectCity(id, origin) {
  // Task 9 renders the drill-down panel here.
}
