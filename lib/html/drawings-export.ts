// Generates a self-contained interactive HTML document showing every level
// drawing with all penetration pins. Click a pin to view details, evidence
// fields and photos. All assets (logo, drawings, photos) are inlined as
// base64 data URIs so the file works offline and never depends on signed URLs.

export interface DrawingsExportPin {
  id: string
  x: number
  y: number
  label: string
}

export interface DrawingsExportLevel {
  id: string
  name: string
  drawing_data_uri: string | null
  pins: DrawingsExportPin[]
}

export interface DrawingsExportBuilding {
  id: string
  name: string
  levels: DrawingsExportLevel[]
}

export interface DrawingsExportPenetration {
  id: string
  floorplan_label: string | null
  subcategory_name: string | null
  room_name: string | null
  building_name: string | null
  level_name: string | null
  created_at: string
  fields: { label: string; value: string }[]
  photo_data_uris: string[]
}

export interface DrawingsExportData {
  job: {
    job_number: string
    title: string
    site_name: string | null
    site_address: string | null
  }
  customer: { name: string | null } | null
  company: {
    name: string
    abn: string | null
    email: string | null
    phone: string | null
    website: string | null
    primary_color: string | null
    logo_data_uri: string | null
  }
  buildings: DrawingsExportBuilding[]
  penetrations: DrawingsExportPenetration[]
  credentials: { label: string; value: string }[]
  generated_at: string
}

function esc(s: string | null | undefined): string {
  if (s == null) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function safeJson(obj: unknown): string {
  return JSON.stringify(obj)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/[\u2028\u2029]/g, c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'))
}

export function generateDrawingsHtml(data: DrawingsExportData): string {
  const accent = data.company.primary_color && /^#[0-9a-fA-F]{6}$/.test(data.company.primary_color)
    ? data.company.primary_color
    : '#2563eb'

  const levelsWithDrawings = data.buildings.flatMap(b =>
    b.levels
      .filter(l => l.drawing_data_uri)
      .map(l => ({ building: b, level: l }))
  )

  const totalPins = data.buildings.reduce(
    (sum, b) => sum + b.levels.reduce((s, l) => s + l.pins.length, 0),
    0,
  )

  const penetrationLookup: Record<string, DrawingsExportPenetration> = {}
  for (const p of data.penetrations) penetrationLookup[p.id] = p

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(data.job.job_number)} — Interactive Drawings</title>
<style>
  *, *::before, *::after { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    color: #1e293b;
    background: #f1f5f9;
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
  }
  .accent { color: ${accent}; }

  /* Header */
  header.doc-header {
    background: white;
    border-bottom: 4px solid ${accent};
    padding: 24px 32px;
    display: flex;
    align-items: center;
    gap: 20px;
    flex-wrap: wrap;
  }
  header.doc-header img.logo {
    height: 56px;
    width: auto;
    object-fit: contain;
  }
  header.doc-header .head-text { flex: 1; min-width: 240px; }
  header.doc-header h1 {
    margin: 0;
    font-size: 22px;
    font-weight: 700;
    color: #0f172a;
  }
  header.doc-header .subtitle {
    margin: 2px 0 0;
    font-size: 13px;
    color: #64748b;
  }
  header.doc-header .meta {
    display: flex;
    gap: 16px;
    font-size: 12px;
    color: #475569;
    margin-top: 8px;
    flex-wrap: wrap;
  }
  header.doc-header .meta span { display: inline-flex; align-items: center; gap: 6px; }
  header.doc-header .meta strong { color: ${accent}; font-weight: 600; }

  /* Summary bar */
  .summary {
    background: white;
    padding: 12px 32px;
    border-bottom: 1px solid #e2e8f0;
    display: flex;
    gap: 24px;
    font-size: 13px;
    color: #475569;
  }
  .summary strong { color: #0f172a; font-weight: 700; }

  /* Main */
  main { padding: 32px; max-width: 1400px; margin: 0 auto; }
  .building-section { margin-bottom: 40px; }
  .building-section > h2 {
    margin: 0 0 16px;
    font-size: 18px;
    font-weight: 700;
    color: #0f172a;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .building-section > h2::before {
    content: "";
    display: inline-block;
    width: 4px;
    height: 18px;
    background: ${accent};
    border-radius: 2px;
  }

  .level-card {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    margin-bottom: 16px;
    overflow: hidden;
  }
  .level-card > .level-head {
    padding: 12px 18px;
    border-bottom: 1px solid #e2e8f0;
    display: flex;
    align-items: center;
    gap: 12px;
    background: #f8fafc;
  }
  .level-card > .level-head h3 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: #334155;
    flex: 1;
  }
  .level-card > .level-head .pin-count {
    font-size: 11px;
    background: #dbeafe;
    color: #1d4ed8;
    padding: 3px 10px;
    border-radius: 999px;
    font-weight: 600;
  }

  .floorplan-wrap {
    position: relative;
    background: #f8fafc;
    line-height: 0;
    overflow: hidden;
    touch-action: none;
    cursor: grab;
    user-select: none;
  }
  .floorplan-wrap.panning { cursor: grabbing; }
  .zoom-stage {
    transform-origin: 0 0;
    position: relative;
    will-change: transform;
    --pin-eff: 24px;
  }
  .zoom-stage img.drawing {
    display: block;
    width: 100%;
    height: auto;
    user-select: none;
    -webkit-user-drag: none;
    pointer-events: none;
    image-rendering: -webkit-optimize-contrast;
    image-rendering: high-quality;
  }
  .pin {
    position: absolute;
    transform: translate(-50%, -50%);
    width: var(--pin-eff);
    height: var(--pin-eff);
    border-radius: 50%;
    background: ${accent};
    color: white;
    border: max(1px, calc(var(--pin-eff) / 14)) solid white;
    box-shadow: 0 2px 6px rgba(0,0,0,0.35);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: max(4px, calc(var(--pin-eff) * 0.38));
    font-weight: 700;
    cursor: pointer;
    padding: 0;
    line-height: 1;
    font-family: inherit;
  }
  .pin:hover { box-shadow: 0 4px 10px rgba(0,0,0,0.45); }
  .pin:focus { outline: 3px solid rgba(37,99,235,0.4); outline-offset: 2px; }
  .pin .pin-text {
    white-space: nowrap;
  }

  .zoom-controls {
    position: absolute;
    bottom: 12px;
    right: 12px;
    display: flex;
    gap: 4px;
    z-index: 5;
  }
  .zoom-controls button {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    width: 32px;
    height: 32px;
    font-size: 18px;
    font-weight: 600;
    color: #475569;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0,0,0,0.08);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
    padding: 0;
    font-family: inherit;
  }
  .zoom-controls button:hover { background: #f8fafc; }
  .zoom-controls .zoom-readout {
    width: auto;
    padding: 0 10px;
    font-size: 11px;
    font-weight: 700;
    min-width: 48px;
  }

  /* No drawings empty state */
  .empty {
    background: white;
    border: 1px dashed #cbd5e1;
    border-radius: 12px;
    padding: 48px 24px;
    text-align: center;
    color: #64748b;
    font-size: 14px;
  }

  /* Side panel */
  .panel-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.5);
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s ease;
    z-index: 100;
  }
  .panel-backdrop.open { opacity: 1; pointer-events: auto; }
  .panel {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    width: min(420px, 100%);
    background: white;
    box-shadow: -8px 0 32px rgba(15, 23, 42, 0.18);
    transform: translateX(100%);
    transition: transform 0.25s ease;
    z-index: 101;
    display: flex;
    flex-direction: column;
  }
  .panel.open { transform: translateX(0); }
  .panel-head {
    padding: 14px 20px;
    border-bottom: 1px solid #e2e8f0;
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }
  .panel-head .pin-badge {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: ${accent};
    color: white;
    font-size: 11px;
    font-weight: 700;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    line-height: 1;
  }
  .panel-head h3 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: #0f172a;
    flex: 1;
    min-width: 0;
  }
  .panel-close {
    background: #f1f5f9;
    border: 0;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    cursor: pointer;
    color: #475569;
    font-size: 20px;
    line-height: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
  }
  .panel-close:hover { background: #e2e8f0; }
  .panel-body {
    padding: 16px 20px 24px;
    overflow-y: auto;
    flex: 1;
  }
  .badge-row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 14px;
  }
  .badge {
    display: inline-block;
    font-size: 11px;
    font-weight: 600;
    padding: 3px 10px;
    border-radius: 999px;
  }
  .badge.subcat { background: #ede9fe; color: #6d28d9; }
  .badge.room { background: #d1fae5; color: #047857; }
  .badge.location { background: #f1f5f9; color: #475569; }
  .badge.timestamp { background: #fef3c7; color: #92400e; }

  .field-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px 16px;
    margin-bottom: 18px;
  }
  .field-grid .field-label {
    font-size: 11px;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin: 0 0 2px;
  }
  .field-grid .field-value {
    font-size: 13px;
    color: #1e293b;
    font-weight: 500;
    margin: 0;
    word-break: break-word;
  }
  .empty-fields {
    font-size: 12px;
    color: #94a3b8;
    margin-bottom: 18px;
    font-style: italic;
  }

  .photo-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
  }
  .photo-grid img {
    width: 100%;
    aspect-ratio: 1 / 1;
    object-fit: cover;
    border-radius: 8px;
    cursor: pointer;
    background: #f1f5f9;
  }
  .photo-grid img:hover { opacity: 0.92; }
  .photo-section-label {
    font-size: 11px;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin: 0 0 8px;
  }

  /* Lightbox */
  .lightbox {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.92);
    display: none;
    align-items: center;
    justify-content: center;
    z-index: 200;
    padding: 24px;
  }
  .lightbox.open { display: flex; }
  .lightbox img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    border-radius: 8px;
  }
  .lightbox-close {
    position: absolute;
    top: 16px;
    right: 16px;
    background: rgba(255,255,255,0.12);
    border: 0;
    color: white;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    font-size: 22px;
    cursor: pointer;
    line-height: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .lightbox-close:hover { background: rgba(255,255,255,0.22); }

  /* Footer */
  footer.doc-footer {
    border-top: 1px solid #e2e8f0;
    background: white;
    padding: 24px 32px;
    margin-top: 40px;
    color: #64748b;
    font-size: 12px;
  }
  footer.doc-footer .footer-grid {
    display: flex;
    justify-content: space-between;
    gap: 24px;
    flex-wrap: wrap;
  }
  footer.doc-footer .credentials { max-width: 60%; }
  footer.doc-footer .credentials .cred-row { margin-bottom: 4px; }
  footer.doc-footer .credentials .cred-label { font-weight: 600; color: #475569; }
  footer.doc-footer .footer-meta { text-align: right; }

  @media (max-width: 640px) {
    header.doc-header, .summary, main, footer.doc-footer { padding-left: 16px; padding-right: 16px; }
    .field-grid { grid-template-columns: 1fr; }
    .panel { width: 100%; }
    footer.doc-footer .credentials { max-width: 100%; }
    footer.doc-footer .footer-meta { text-align: left; }
  }
</style>
</head>
<body>

<header class="doc-header">
  ${data.company.logo_data_uri
    ? `<img class="logo" src="${data.company.logo_data_uri}" alt="${esc(data.company.name)} logo">`
    : ''}
  <div class="head-text">
    <h1>${esc(data.company.name)}</h1>
    <p class="subtitle">Interactive Floor Plan Drawings — ${esc(data.job.title)}</p>
    <div class="meta">
      <span><strong>${esc(data.job.job_number)}</strong></span>
      ${data.customer?.name ? `<span>Customer: ${esc(data.customer.name)}</span>` : ''}
      ${data.job.site_name ? `<span>Site: ${esc(data.job.site_name)}</span>` : ''}
      <span>Generated ${esc(data.generated_at)}</span>
    </div>
  </div>
</header>

<div class="summary">
  <span><strong>${levelsWithDrawings.length}</strong> drawing${levelsWithDrawings.length === 1 ? '' : 's'}</span>
  <span><strong>${totalPins}</strong> pinned penetration${totalPins === 1 ? '' : 's'}</span>
  <span style="margin-left:auto;color:#94a3b8;">Click any pin to view details</span>
</div>

<main>
${levelsWithDrawings.length === 0
  ? '<div class="empty">No floor plan drawings have been uploaded for this job.</div>'
  : data.buildings.map(b => {
    const levels = b.levels.filter(l => l.drawing_data_uri)
    if (levels.length === 0) return ''
    return `<section class="building-section">
  <h2>${esc(b.name)}</h2>
  ${levels.map(l => `<div class="level-card">
    <div class="level-head">
      <h3>${esc(l.name)}</h3>
      ${l.pins.length > 0 ? `<span class="pin-count">${l.pins.length} pin${l.pins.length === 1 ? '' : 's'}</span>` : ''}
    </div>
    <div class="floorplan-wrap" data-fp>
      <div class="zoom-stage" data-stage>
        <img class="drawing" src="${l.drawing_data_uri}" alt="${esc(l.name)} floor plan">
        ${l.pins.map(pin => `<button class="pin" type="button" data-pen-id="${esc(pin.id)}" style="left:${pin.x}%;top:${pin.y}%;" aria-label="Pin ${esc(pin.label || '')}">
          <span class="pin-text">${esc(pin.label || '·')}</span>
        </button>`).join('')}
      </div>
      <div class="zoom-controls">
        <button type="button" data-zoom="out" aria-label="Zoom out">−</button>
        <button type="button" class="zoom-readout" data-zoom="reset" aria-label="Reset zoom">100%</button>
        <button type="button" data-zoom="in" aria-label="Zoom in">+</button>
      </div>
    </div>
  </div>`).join('')}
</section>`
  }).join('')
}
</main>

<div class="panel-backdrop" id="panelBackdrop"></div>
<aside class="panel" id="panel" role="dialog" aria-modal="true" aria-labelledby="panelTitle">
  <div class="panel-head">
    <span class="pin-badge" id="panelPinBadge">·</span>
    <h3 id="panelTitle">Penetration Details</h3>
    <button class="panel-close" id="panelClose" aria-label="Close">×</button>
  </div>
  <div class="panel-body" id="panelBody"></div>
</aside>

<div class="lightbox" id="lightbox" role="dialog" aria-modal="true" aria-label="Photo viewer">
  <button class="lightbox-close" id="lightboxClose" aria-label="Close photo">×</button>
  <img id="lightboxImg" src="" alt="Full size">
</div>

<footer class="doc-footer">
  <div class="footer-grid">
    <div class="credentials">
      ${data.credentials.length > 0
        ? data.credentials.map(c => `<div class="cred-row"><span class="cred-label">${esc(c.label)}:</span> ${esc(c.value)}</div>`).join('')
        : ''}
      ${data.company.abn ? `<div class="cred-row"><span class="cred-label">ABN:</span> ${esc(data.company.abn)}</div>` : ''}
      ${data.company.email ? `<div class="cred-row"><span class="cred-label">Email:</span> ${esc(data.company.email)}</div>` : ''}
      ${data.company.phone ? `<div class="cred-row"><span class="cred-label">Phone:</span> ${esc(data.company.phone)}</div>` : ''}
      ${data.company.website ? `<div class="cred-row"><span class="cred-label">Web:</span> ${esc(data.company.website)}</div>` : ''}
    </div>
    <div class="footer-meta">
      <div><strong style="color:#0f172a;">${esc(data.company.name)}</strong></div>
      <div>${esc(data.job.job_number)} — Interactive Drawings</div>
      <div>Generated ${esc(data.generated_at)}</div>
    </div>
  </div>
</footer>

<script>
(function () {
  var PENETRATIONS = ${safeJson(penetrationLookup)};
  var panel = document.getElementById('panel');
  var backdrop = document.getElementById('panelBackdrop');
  var panelBody = document.getElementById('panelBody');
  var panelTitle = document.getElementById('panelTitle');
  var panelBadge = document.getElementById('panelPinBadge');
  var panelClose = document.getElementById('panelClose');
  var lightbox = document.getElementById('lightbox');
  var lightboxImg = document.getElementById('lightboxImg');
  var lightboxClose = document.getElementById('lightboxClose');

  function escHtml(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function openPanel(penId) {
    var pen = PENETRATIONS[penId];
    if (!pen) return;
    panelBadge.textContent = pen.floorplan_label || '·';
    panelTitle.textContent = pen.floorplan_label
      ? 'Pin ' + pen.floorplan_label
      : 'Penetration';

    var html = '';
    html += '<div class="badge-row">';
    if (pen.subcategory_name) html += '<span class="badge subcat">' + escHtml(pen.subcategory_name) + '</span>';
    if (pen.room_name) html += '<span class="badge room">' + escHtml(pen.room_name) + '</span>';
    if (pen.level_name) html += '<span class="badge location">' + escHtml(pen.level_name) + '</span>';
    if (pen.created_at) html += '<span class="badge timestamp">' + escHtml(pen.created_at) + '</span>';
    html += '</div>';

    if (pen.fields && pen.fields.length > 0) {
      html += '<div class="field-grid">';
      for (var i = 0; i < pen.fields.length; i++) {
        var f = pen.fields[i];
        html += '<div>';
        html += '<p class="field-label">' + escHtml(f.label) + '</p>';
        html += '<p class="field-value">' + escHtml(f.value) + '</p>';
        html += '</div>';
      }
      html += '</div>';
    } else {
      html += '<p class="empty-fields">No evidence fields recorded.</p>';
    }

    if (pen.photo_data_uris && pen.photo_data_uris.length > 0) {
      html += '<p class="photo-section-label">Photos (' + pen.photo_data_uris.length + ')</p>';
      html += '<div class="photo-grid">';
      for (var j = 0; j < pen.photo_data_uris.length; j++) {
        html += '<img data-src="' + escHtml(pen.photo_data_uris[j]) + '" src="' + escHtml(pen.photo_data_uris[j]) + '" alt="Photo ' + (j + 1) + '">';
      }
      html += '</div>';
    }

    panelBody.innerHTML = html;

    var photos = panelBody.querySelectorAll('.photo-grid img');
    for (var k = 0; k < photos.length; k++) {
      photos[k].addEventListener('click', function (e) {
        lightboxImg.src = e.currentTarget.getAttribute('data-src');
        lightbox.classList.add('open');
      });
    }

    panel.classList.add('open');
    backdrop.classList.add('open');
  }

  function closePanel() {
    panel.classList.remove('open');
    backdrop.classList.remove('open');
  }

  function closeLightbox() {
    lightbox.classList.remove('open');
    lightboxImg.src = '';
  }

  // Per-floorplan zoom/pan setup (mirrors admin Drawings tab math)
  var MIN_SCALE = 1, MAX_SCALE = 5, BASE_PIN = 24, MIN_PIN = 8;

  function setupZoomPan(wrap) {
    var stage = wrap.querySelector('[data-stage]');
    var readout = wrap.querySelector('[data-zoom="reset"]');
    var btnIn = wrap.querySelector('[data-zoom="in"]');
    var btnOut = wrap.querySelector('[data-zoom="out"]');
    if (!stage) return;

    var state = { scale: 1, x: 0, y: 0 };
    var dragging = false;
    var lastPt = null;
    var lastPinch = null;
    var dragMoved = false;
    var dragStartXY = null;

    function clampXY(tx, ty, s) {
      var cw = wrap.clientWidth, ch = wrap.clientHeight;
      var iw = stage.scrollWidth * s, ih = stage.scrollHeight * s;
      var padX = cw * 0.2, padY = ch * 0.2;
      var minX = -(iw - padX), maxX = cw - padX;
      var minY = -(ih - padY), maxY = ch - padY;
      return {
        x: Math.max(minX, Math.min(maxX, tx)),
        y: Math.max(minY, Math.min(maxY, ty))
      };
    }

    function apply() {
      stage.style.transform = 'translate(' + state.x + 'px, ' + state.y + 'px) scale(' + state.scale + ')';
      var pinEff = Math.max(MIN_PIN, BASE_PIN / state.scale);
      stage.style.setProperty('--pin-eff', pinEff + 'px');
      if (readout) readout.textContent = Math.round(state.scale * 100) + '%';
    }

    function setScale(next) {
      var s = Math.max(MIN_SCALE, Math.min(MAX_SCALE, next));
      var xy = clampXY(state.x, state.y, s);
      state.scale = s; state.x = xy.x; state.y = xy.y;
      apply();
    }

    wrap.addEventListener('wheel', function (e) {
      e.preventDefault();
      e.stopPropagation();
      var rect = wrap.getBoundingClientRect();
      var mx = e.clientX - rect.left, my = e.clientY - rect.top;
      var delta = e.deltaY > 0 ? -0.15 : 0.15;
      var newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, state.scale + delta));
      var imgX = (mx - state.x) / state.scale;
      var imgY = (my - state.y) / state.scale;
      state.scale = newScale;
      state.x = mx - imgX * newScale;
      state.y = my - imgY * newScale;
      var xy = clampXY(state.x, state.y, state.scale);
      state.x = xy.x; state.y = xy.y;
      apply();
    }, { passive: false });

    wrap.addEventListener('pointerdown', function (e) {
      if (e.target.closest('.pin')) return;
      if (e.button !== undefined && e.button !== 0) return;
      dragging = true;
      dragMoved = false;
      lastPt = { x: e.clientX, y: e.clientY };
      dragStartXY = { x: e.clientX, y: e.clientY };
      wrap.classList.add('panning');
      try { wrap.setPointerCapture(e.pointerId); } catch (_) {}
    });

    wrap.addEventListener('pointermove', function (e) {
      if (!dragging || !lastPt) return;
      var dx = e.clientX - lastPt.x, dy = e.clientY - lastPt.y;
      if (dragStartXY) {
        var totalDx = Math.abs(e.clientX - dragStartXY.x);
        var totalDy = Math.abs(e.clientY - dragStartXY.y);
        if (totalDx > 5 || totalDy > 5) dragMoved = true;
      }
      var xy = clampXY(state.x + dx, state.y + dy, state.scale);
      state.x = xy.x; state.y = xy.y;
      lastPt = { x: e.clientX, y: e.clientY };
      apply();
    });

    function endDrag(e) {
      dragging = false;
      lastPt = null;
      dragStartXY = null;
      wrap.classList.remove('panning');
      if (e && e.pointerId !== undefined) {
        try { wrap.releasePointerCapture(e.pointerId); } catch (_) {}
      }
    }
    wrap.addEventListener('pointerup', endDrag);
    wrap.addEventListener('pointercancel', endDrag);
    wrap.addEventListener('pointerleave', endDrag);

    wrap.addEventListener('touchstart', function (e) {
      if (e.touches.length === 2) {
        var dx = e.touches[0].clientX - e.touches[1].clientX;
        var dy = e.touches[0].clientY - e.touches[1].clientY;
        lastPinch = Math.hypot(dx, dy);
      }
    }, { passive: true });

    wrap.addEventListener('touchmove', function (e) {
      if (e.touches.length === 2 && lastPinch !== null) {
        e.preventDefault();
        var dx = e.touches[0].clientX - e.touches[1].clientX;
        var dy = e.touches[0].clientY - e.touches[1].clientY;
        var dist = Math.hypot(dx, dy);
        var delta = (dist - lastPinch) * 0.01;
        setScale(state.scale + delta);
        lastPinch = dist;
      }
    }, { passive: false });

    wrap.addEventListener('touchend', function () { lastPinch = null; });

    if (btnIn) btnIn.addEventListener('click', function (e) { e.stopPropagation(); setScale(state.scale + 0.25); });
    if (btnOut) btnOut.addEventListener('click', function (e) { e.stopPropagation(); setScale(state.scale - 0.25); });
    if (readout) readout.addEventListener('click', function (e) {
      e.stopPropagation();
      state.scale = 1; state.x = 0; state.y = 0;
      apply();
    });

    // Suppress click that follows a pan gesture so pins don't open the panel
    wrap.addEventListener('click', function (e) {
      if (dragMoved) {
        e.stopPropagation();
        e.preventDefault();
        dragMoved = false;
      }
    }, true);

    apply();
  }

  var wraps = document.querySelectorAll('[data-fp]');
  for (var w = 0; w < wraps.length; w++) setupZoomPan(wraps[w]);

  var pins = document.querySelectorAll('.pin');
  for (var i = 0; i < pins.length; i++) {
    pins[i].addEventListener('click', function (e) {
      var penId = e.currentTarget.getAttribute('data-pen-id');
      openPanel(penId);
    });
  }

  panelClose.addEventListener('click', closePanel);
  backdrop.addEventListener('click', closePanel);
  lightbox.addEventListener('click', function (e) {
    if (e.target === lightbox) closeLightbox();
  });
  lightboxClose.addEventListener('click', closeLightbox);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (lightbox.classList.contains('open')) closeLightbox();
      else if (panel.classList.contains('open')) closePanel();
    }
  });
})();
</script>

</body>
</html>`
}
