const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

// MIRROR of scripts/lib/project.mjs — keep project() and MAP_W/H character-identical.
const MAP_W = 1000, MAP_H = 500;
function project(lat, lng) {
  return { x: ((lng + 180) / 360) * MAP_W, y: ((90 - lat) / 180) * MAP_H };
}
// Display crop only (not part of the projection mirror): land spans y≈23–403,
// so this frames the landmass tightly without clipping any of it. The 0 14 1000 403
// reference window lives in project.mjs; here we trim the dead top/bottom margin.
const VIEWBOX = '0 22 1000 382';

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

// ---- drill-down panel ----
const panel = $('#panel');
const backdrop = $('#panel-backdrop');
let lastFocused = null;
const isMobile = () => window.matchMedia('(max-width:720px)').matches;

// Featured event = the firsthand one if present, else most recent.
const featuredEvent = (c) => c.events.find(e => e.source === 'firsthand') ?? c.events[0];

// One phrase per health factor, using real numbers where the data has them.
function factorPhrase(key, c) {
  const evs = c.events;
  if (key === 'cadence') {
    const n = evs.filter(e => { const d = daysBetween(NOW, e.date); return d >= 0 && d <= 90; }).length;
    return n === 0 ? 'no events in the last 90 days' : `${n} event${n > 1 ? 's' : ''} in 90 days`;
  }
  if (key === 'trend') {
    const a = evs.slice(0, 3).map(e => e.attended);
    if (a.length < 2 || a[0] === a[a.length - 1]) return 'attendance steady';
    return a[0] > a[a.length - 1] ? 'attendance rising' : 'attendance slipping';
  }
  if (key === 'recency') {
    const wk = Math.floor(daysBetween(NOW, evs[0].date) / 7);
    if (wk <= 1) return 'host active this week';
    if (wk <= 3) return 'host active recently';
    return `host quiet ${wk} weeks`;
  }
  if (key === 'funnel') {
    const f = featuredEvent(c);
    if (f?.funnel && f.attended) return `activation at ${Math.round((f.funnel.activated_w1 / f.attended) * 100)}%`;
    return 'activation not yet measured';
  }
  return '';
}

function explainer(c) {
  const entries = Object.entries(c.health.factors).sort((a, b) => b[1] - a[1]);
  const top = entries[0][0], bottom = entries[entries.length - 1][0];
  return `<strong>${STATE_WORD[c.health.state]}</strong> — ${factorPhrase(top, c)}, ${factorPhrase(bottom, c)}.`;
}

const cap = (s) => s ? s[0].toUpperCase() + s.slice(1) : s;
function ambassadorRow(c) {
  return c.ambassador?.name
    ? `<p class="p-ambassador">${c.ambassador.name}</p>`
    : `<p class="p-ambassador muted">${cap(c.ambassador?.note) || 'Host not yet mapped'}</p>`;
}

function nextEventBlock(c) {
  const ne = c.next_event;
  if (!ne) return `<div class="p-next muted"><p class="ne-name">No upcoming session scheduled</p></div>`;
  const rsvp = typeof ne.rsvps === 'number' && ne.rsvps > 0 ? ` · ${ne.rsvps} RSVPs` : '';
  const link = ne.url ? ` <a class="ne-link" href="${ne.url}" target="_blank" rel="noopener">↗</a>` : '';
  return `<div class="p-next">
    <p class="ne-name">${ne.name}${link}</p>
    <p class="ne-meta">${fmtDate(ne.date)}${rsvp}</p>
  </div>`;
}

function mediaBlock(c, f) {
  if (!('media' in f)) return '';
  if (!f.media.length) return `<p class="ev-nomedia">No media synced</p>`;
  const imgs = f.media.slice(0, 3).map((src, i) =>
    `<img src="${src}" loading="lazy" alt="${f.name} — photo ${i + 1}">`).join('');
  return `<div class="ev-media">${imgs}</div>
    <p class="ev-credit">Photos: Shashank Jha — ${f.name}</p>`;
}

function lastEventCard(c) {
  const f = featuredEvent(c);
  const eyebrow = f.source === 'firsthand' ? 'Firsthand' : 'Latest event';
  const venue = f.venue ? ` · ${f.venue}` : '';
  return `<div class="p-event">
    <p class="ev-eyebrow">${eyebrow}</p>
    <p class="ev-name">${f.name}</p>
    <p class="ev-meta">${fmtDateY(f.date)}${venue}</p>
    <p class="ev-stat"><b>${f.attended}</b> / ${f.rsvps} attended</p>
    ${mediaBlock(c, f)}
  </div>`;
}

const FUNNEL_ROWS = [
  ['RSVP’d', 'rsvps'],
  ['Attended', 'attended'],
  ['Used redirect', 'redirect_used'],
  ['New signup', 'signed_up'],
  ['Activated wk 1', 'activated_w1'],
  ['Active wk 4', 'active_w4'],
];

function funnelBlock(c) {
  const f = featuredEvent(c);
  if (!f.funnel || !f.rsvps) {
    return `<p class="fn-empty">No attribution data — no instrumented links at this event yet.</p>`;
  }
  const total = f.rsvps;
  const val = (k) => k === 'rsvps' ? f.rsvps : k === 'attended' ? f.attended : f.funnel[k];
  const rows = FUNNEL_ROWS.map(([label, key]) => {
    const v = val(key);
    const pct = Math.max((v / total) * 100, 2);
    return `<div class="fn-row"><div class="fn-bar" style="width:${pct.toFixed(1)}%"></div>
      <span class="fn-label">${label}</span><span class="fn-count">${v}</span></div>`;
  }).join('');
  const u = f.funnel.unattributed;
  const upct = Math.max((u / total) * 100, 2);
  return `<div class="funnel">${rows}
    <div class="fn-row hatch"><div class="fn-bar" style="width:${upct.toFixed(1)}%"></div>
      <span class="fn-label">Unattributed</span><span class="fn-count">${u}</span></div>
  </div>
  <p class="fn-note">attended but never used an event link — the gap attribution infrastructure closes</p>`;
}

function historyBlock(c) {
  const f = featuredEvent(c);
  const rows = c.events.filter(e => e !== f).slice(0, 4).map(e =>
    `<div class="hist-row"><span class="hist-date">${fmtDate(e.date)}</span>
      <span class="hist-name">${e.name}</span><span class="hist-att">${e.attended}</span></div>`).join('');
  if (!rows) return '';
  return `<div class="p-section"><p class="label">Event history</p>
    <div class="p-history">${rows}</div></div>`;
}

function panelHTML(c) {
  return `
  <div class="p-head">
    <div class="p-title">
      <h3>${c.name}</h3>
      <p class="p-country">${c.country}</p>
    </div>
    <button class="p-close" aria-label="Close panel">×</button>
  </div>
  <span class="p-badge"><i style="background:${hColor(c.health.state)}"></i>${STATE_WORD[c.health.state]}</span>
  <p class="p-explain">${explainer(c)}</p>

  <div class="p-section">
    <p class="label">Ambassador</p>
    ${ambassadorRow(c)}
  </div>

  <div class="p-section">
    <p class="label">Next event</p>
    ${nextEventBlock(c)}
  </div>

  <div class="p-section">
    <p class="label">Featured event</p>
    ${lastEventCard(c)}
  </div>

  <div class="p-section">
    <p class="label">Attribution funnel</p>
    ${funnelBlock(c)}
  </div>

  ${historyBlock(c)}`;
}

let closeTimer = null;
function selectCity(id, origin) {
  const c = cityById.get(id);
  if (!c) return;
  lastFocused = origin ?? null;
  clearTimeout(closeTimer);
  hideTip();
  $$('.city.active').forEach(d => d.classList.remove('active'));
  $(`.city[data-id="${id}"]`)?.classList.add('active');

  panel.innerHTML = panelHTML(c);
  panel.hidden = false;
  backdrop.hidden = false;
  panel.setAttribute('tabindex', '-1');
  void panel.offsetWidth; // reflow so the transform transition runs
  panel.classList.add('open');
  backdrop.classList.add('open');
  panel.focus();

  $('.p-close', panel).addEventListener('click', closePanel);
}

function closePanel() {
  if (panel.hidden) return;
  panel.classList.remove('open');
  backdrop.classList.remove('open');
  $$('.city.active').forEach(d => d.classList.remove('active'));
  const done = () => { panel.hidden = true; backdrop.hidden = true; };
  closeTimer = setTimeout(done, 220);
  const origin = lastFocused;
  lastFocused = null;
  if (origin) origin.focus();
}

backdrop.addEventListener('click', closePanel);

// mobile swipe-down to dismiss
let dragStart = null;
panel.addEventListener('pointerdown', (e) => {
  if (!isMobile() || panel.scrollTop > 0) return;
  dragStart = e.clientY;
  panel.classList.add('dragging');
});
panel.addEventListener('pointermove', (e) => {
  if (dragStart == null) return;
  const dy = e.clientY - dragStart;
  if (dy > 0) panel.style.transform = `translateY(${dy}px)`;
});
function endDrag(e) {
  if (dragStart == null) return;
  const dy = e.clientY - dragStart;
  panel.style.transform = '';
  panel.classList.remove('dragging');
  dragStart = null;
  if (dy > 60) closePanel();
}
panel.addEventListener('pointerup', endDrag);
panel.addEventListener('pointercancel', endDrag);

// ---- formula popover ----
const fbtn = $('#formula-btn');
const pop = $('#formula-popover');
function setPopover(open) {
  pop.hidden = !open;
  fbtn.setAttribute('aria-expanded', String(open));
}
fbtn.addEventListener('click', (e) => { e.stopPropagation(); setPopover(pop.hidden); });
document.addEventListener('click', (e) => {
  if (!pop.hidden && !pop.contains(e.target) && e.target !== fbtn) setPopover(false);
});

// ---- global keys ----
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (!panel.hidden) closePanel();
  else if (!pop.hidden) setPopover(false);
});

// ---- KPIs + sparklines ----
function renderSpark(svg, data) {
  const n = data.length;
  if (!n) return;
  const min = Math.min(...data), max = Math.max(...data);
  const range = (max - min) || 1;
  const W = 100, H = 24, pad = 3;
  const pts = data.map((v, i) => {
    const x = n === 1 ? W / 2 : (i / (n - 1)) * W;
    const y = H - pad - ((v - min) / range) * (H - 2 * pad);
    return [x, y];
  });
  const poly = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const [lx, ly] = pts[n - 1];
  svg.innerHTML =
    `<polyline points="${poly}"/><line x1="${lx.toFixed(1)}" y1="${ly.toFixed(1)}" x2="${lx.toFixed(1)}" y2="${ly.toFixed(1)}"/>`;
}

function renderKPIs() {
  for (const [key, k] of Object.entries(pulse.kpis)) {
    const art = $(`.kpi[data-kpi="${key}"]`);
    if (!art) continue;
    const isRate = key === 'activation_rate_30d';
    $('.num-lg', art).textContent = isRate ? `${Math.round(k.value * 100)}%` : String(k.value);
    const deltaEl = $('.delta', art);
    if (!k.delta) {
      deltaEl.textContent = '—';
      deltaEl.className = 'delta small flat';
    } else {
      const up = k.delta > 0;
      const mag = isRate ? `${Math.abs(Math.round(k.delta * 100))}%` : String(Math.abs(k.delta));
      deltaEl.textContent = `${up ? '▲' : '▼'} ${mag}`;
      deltaEl.className = `delta small ${up ? 'up' : 'down'}`;
    }
    renderSpark($('.spark', art), k.spark);
  }
}
renderKPIs();

// ---- needs-attention signals ----
function renderSignals() {
  const row = $('#signals .signal-row');
  row.innerHTML = pulse.signals.map(s => {
    const clickable = !!s.city_id;
    const tag = clickable ? 'button' : 'div';
    const attr = clickable ? ` type="button" data-city="${s.city_id}"` : '';
    return `<${tag} class="signal-card"${attr}>
      <div class="sig-head"><span class="sev ${s.severity}"></span><span class="sig-title">${s.title}</span></div>
      <p class="sig-why">${s.why}</p>
      <p class="sig-action"><span class="arrow">→</span>${s.action}</p>
    </${tag}>`;
  }).join('');
  $$('button.signal-card', row).forEach(b =>
    b.addEventListener('click', () => selectCity(b.dataset.city, b)));
}
renderSignals();
