import * as db from './db.js';
import { SERVICES, TASK_LIBRARY } from './data.js';
import * as rules from './compliance.js';
import { buildCsv, download } from './evv.js';

const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const taskById = Object.fromEntries(TASK_LIBRARY.map(t => [t.id, t]));
const localDate = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const today = () => localDate();
const AUTO_LOCK_MS = 5 * 60 * 1000; // HIPAA 164.312(a)(2)(iii) automatic logoff

let me = null;
let lockTimer;

// ---------- session & lock ----------
function resetLock() {
  clearTimeout(lockTimer);
  if (me) lockTimer = setTimeout(() => lock('Locked after 5 minutes of inactivity'), AUTO_LOCK_MS);
}
['pointerdown', 'keydown'].forEach(e => addEventListener(e, resetLock, { passive: true }));
async function lock(msg) {
  if (me) await db.audit(me.id, 'logout', msg || 'manual');
  me = null; sessionStorage.removeItem('kk_user');
  location.hash = '#/login'; if (msg) toast(msg);
}

function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(t._h); t._h = setTimeout(() => (t.hidden = true), 3500);
}

function updateNet() {
  const n = $('#net'); n.textContent = navigator.onLine ? 'Online' : 'Offline — saving on device';
  n.className = 'net ' + (navigator.onLine ? 'on' : 'off');
}
addEventListener('online', updateNet); addEventListener('offline', updateNet);

// ---------- GPS ----------
function getLocation() {
  return new Promise(resolve => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      p => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, acc: Math.round(p.coords.accuracy) }),
      () => resolve(null), { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 });
  });
}

function pickReason(title, reasons) {
  return new Promise(resolve => {
    const d = $('#dialog');
    d.innerHTML = `<form method="dialog"><h2>${esc(title)}</h2>
      <div class="reason-list">${reasons.map((r, i) => `<label class="big-choice"><input type="radio" name="r" value="${esc(r)}" ${i ? '' : 'checked'}> ${esc(r)}</label>`).join('')}</div>
      <div class="row"><button value="cancel" class="btn ghost">Cancel</button><button value="ok" class="btn primary">Save</button></div></form>`;
    d.onclose = () => resolve(d.returnValue === 'ok' ? new FormData($('form', d)).get('r') : null);
    d.showModal();
  });
}

// ---------- shell ----------
function shell(body, { title = 'Karen Kare', back, tabs } = {}) {
  const tabHtml = tabs ? `<nav class="tabs">${tabs.map(([href, label]) =>
    `<a href="${href}" class="${location.hash.startsWith(href) && (href !== '#/rn' || location.hash === '#/rn') ? 'active' : ''}">${label}</a>`).join('')}</nav>` : '';
  $('#app').innerHTML = `
    <header class="top">
      ${back ? `<a class="back" href="${back}" aria-label="Back">‹</a>` : '<span class="logo">KK</span>'}
      <h1>${esc(title)}</h1>
      ${me ? `<button class="lock" id="lockBtn" aria-label="Lock">🔒 ${esc(me.name.split(' ')[0])}</button>` : ''}
    </header>
    <div id="net" class="net"></div>
    ${tabHtml}
    <main class="${me?.role === 'rn' ? 'dense' : 'big'}">${body}</main>`;
  $('#lockBtn')?.addEventListener('click', () => lock());
  updateNet();
}

// ---------- login ----------
async function viewLogin() {
  const users = await db.all('users');
  shell(`
    <section class="card login">
      <p class="muted">Select your name and enter your PIN.</p>
      <form id="lf">
        <div class="user-pick">${users.map((u, i) => `<label class="big-choice"><input type="radio" name="u" value="${u.id}" ${i ? '' : 'checked'}>
          <span><b>${esc(u.name)}</b><br><small>${u.role === 'rn' ? 'RN Supervisor' : 'Home Care Aide'}</small></span></label>`).join('')}</div>
        <input name="pin" type="password" inputmode="numeric" autocomplete="off" maxlength="6" placeholder="PIN" class="pin" required>
        <button class="btn primary xl">Sign in</button>
      </form>
      <p class="demo">Demo PINs — Maria 1111 · Jean-Pierre 2222 · Karen RN 9999<br>
      <button class="link" id="reset">Reset demo data</button></p>
    </section>`, { title: 'Karen Kare' });
  $('#lf').onsubmit = async e => {
    e.preventDefault();
    const f = new FormData(e.target), u = users.find(x => x.id === f.get('u'));
    if (!u || u.pin !== f.get('pin')) { await db.audit(f.get('u'), 'login-failed'); return toast('Wrong PIN'); }
    me = u; sessionStorage.setItem('kk_user', u.id); await db.audit(u.id, 'login'); resetLock();
    location.hash = u.role === 'rn' ? '#/rn' : '#/aide';
  };
  $('#reset').onclick = async () => { await db.ensureSeeded(true); toast('Demo data reset'); viewLogin(); };
}

// ---------- AIDE ----------
function visitState(v) {
  if (v.status === 'completed') return ['Done', 'ok'];
  if (v.status === 'in-progress') return ['In progress', 'info'];
  if (Date.now() > new Date(v.start).getTime() + 15 * 60000) return ['Late', 'bad'];
  return ['Scheduled', 'muted'];
}

async function viewAideHome() {
  const [visits, clients] = await Promise.all([db.all('visits'), db.all('clients')]);
  const cm = Object.fromEntries(clients.map(c => [c.id, c]));
  const mine = visits.filter(v => v.aideId === me.id && v.date === today()).sort((a, b) => a.start.localeCompare(b.start));
  const cred = (me.credentials || []).map(c => [c, rules.credentialStatus(c)]).filter(([, s]) => s.state !== 'ok');
  shell(`
    <h2 class="hello">Hi ${esc(me.name.split(' ')[0])} 👋</h2>
    ${cred.length ? `<div class="banner warn">⚠️ ${cred.map(([c, s]) => `${esc(c.type)} ${s.state === 'expired' ? 'EXPIRED' : `expires in ${s.left} days`}`).join('<br>')}<br><small>Tell your supervisor.</small></div>` : ''}
    <h3>Today's visits</h3>
    ${mine.length ? mine.map(v => { const c = cm[v.clientId]; const [st, cls] = visitState(v); return `
      <a class="visit-card" href="#/visit/${v.id}">
        <div class="time">${rules.fmtTime(v.start)}<br><small>to ${rules.fmtTime(v.end)}</small></div>
        <div class="who"><b>${esc(c.name)}</b><br><small>${esc(SERVICES[v.serviceCode].label)} · ${esc(c.address)}</small></div>
        <span class="pill ${cls}">${st}</span></a>`; }).join('') : '<p class="muted">No visits scheduled today.</p>'}
    <a class="btn ghost xl" href="#/me">My credentials</a>`, { title: 'My Day' });
}

async function viewMe() {
  shell(`<section class="card"><h3>${esc(me.name)} · ${esc(me.employeeId)}</h3>
    <table class="tbl">${(me.credentials || []).map(c => { const s = rules.credentialStatus(c);
      return `<tr><td>${esc(c.type)}</td><td>${c.expires ? rules.fmtDate(c.expires) : 'No expiry'}</td><td><span class="pill ${s.state === 'ok' ? 'ok' : s.state === 'expired' ? 'bad' : 'warn'}">${s.state}</span></td></tr>`; }).join('')}</table></section>`,
  { title: 'My Credentials', back: '#/aide' });
}

async function viewVisit(id) {
  const v = await db.get('visits', id);
  if (!v || (me.role === 'aide' && v.aideId !== me.id)) return (location.hash = '#/aide');
  const [c, aide] = await Promise.all([db.get('clients', v.clientId), db.get('users', v.aideId)]);
  const save = async (action, detail) => { await db.put('visits', v); await db.audit(me.id, action, `${v.id} ${detail || ''}`); };
  const back = me.role === 'rn' ? '#/rn/visits' : '#/aide';
  const header = `
    <section class="card client">
      <h2>${esc(c.name)}</h2>
      <p>${esc(SERVICES[v.serviceCode].label)} (${v.serviceCode}) · ${rules.fmtTime(v.start)}–${rules.fmtTime(v.end)}</p>
      <p><a href="https://maps.google.com/?q=${encodeURIComponent(c.address)}" target="_blank" rel="noopener">📍 ${esc(c.address)}</a></p>
      <details><summary>Care instructions from RN</summary><p>${esc(c.carePlan.instructions)}</p>
      <p class="muted">Emergency: ${esc(c.emergency)}</p></details>
    </section>`;

  if (v.status === 'scheduled') {
    if (me.role !== 'aide') return shell(header + '<p class="muted">Not started.</p>', { title: 'Visit', back });
    shell(header + `<button id="cin" class="btn go xxl">Clock In</button>
      <p class="muted center">Your location is recorded at clock-in and clock-out (Medicaid EVV).</p>`, { title: 'Visit', back });
    $('#cin').onclick = async () => {
      $('#cin').disabled = true; $('#cin').textContent = 'Getting location…';
      const loc = await getLocation(); v.exceptions = [];
      if (!loc) {
        const r = await pickReason('Location unavailable — reason', rules.EXCEPTION_REASONS);
        if (!r) return viewVisit(id);
        v.exceptions.push(`Clock-in: ${r}`);
      } else {
        const m = rules.metersBetween(loc.lat, loc.lng, c.lat, c.lng);
        if (m > rules.GEOFENCE_METERS) {
          const r = await pickReason(`You are ${(m / 1609).toFixed(1)} mi from the client's address — reason`, rules.EXCEPTION_REASONS);
          if (!r) return viewVisit(id);
          v.exceptions.push(`Clock-in ${m}m from address: ${r}`);
        }
      }
      v.clockIn = { time: new Date().toISOString(), ...(loc || {}), method: loc ? 'gps' : 'manual' };
      v.status = 'in-progress'; v.tasks = {}; v.synced = false;
      await save('clock-in', v.clockIn.method); toast('Clocked in'); viewVisit(id);
    };
    return;
  }

  if (v.status === 'in-progress' && me.role === 'aide') {
    const tasks = c.carePlan.tasks.map(t => taskById[t]).filter(Boolean);
    shell(header + `
      <div class="banner info">Clocked in at ${rules.fmtTime(v.clockIn.time)}</div>
      <h3>Care plan tasks</h3>
      <div id="tasks">${tasks.map(t => { const s = v.tasks[t.id]; return `
        <div class="task ${s ? s.status : ''}" data-t="${t.id}">
          <div><b>${esc(t.label)}</b><small>${t.cat}${s?.reason ? ' · ' + esc(s.reason) : ''}</small></div>
          <button class="btn sm ${s?.status === 'done' ? 'primary' : 'ghost'}" data-a="done">✓ Done</button>
          <button class="btn sm ${s?.status === 'not-done' ? 'warn' : 'ghost'}" data-a="not-done">✗ Not done</button>
        </div>`; }).join('')}</div>
      <button id="cond" class="btn alert xl">⚠️ Report change in condition</button>
      <h3>Visit note</h3>
      <textarea id="note" rows="4" placeholder="What happened during the visit? Anything the nurse should know?">${esc(v.note || '')}</textarea>
      <h3>Client signature</h3>
      <canvas id="sig" width="600" height="180" class="sig"></canvas>
      <div class="row"><button class="btn ghost sm" id="sigClear">Clear</button>
        <label class="chk"><input type="checkbox" id="noSign" ${v.noSignReason ? 'checked' : ''}> Client unable to sign</label></div>
      <label class="chk attest"><input type="checkbox" id="attest"> I attest the services above were provided as documented.</label>
      <button id="cout" class="btn stop xxl">Clock Out</button>`, { title: 'Visit in progress', back });

    $('#tasks').onclick = async e => {
      const b = e.target.closest('button'); if (!b) return;
      const t = b.closest('.task').dataset.t;
      if (b.dataset.a === 'done') v.tasks[t] = { status: 'done', at: new Date().toISOString() };
      else { const r = await pickReason('Why was this not done?', rules.TASK_SKIP_REASONS); if (!r) return; v.tasks[t] = { status: 'not-done', reason: r, at: new Date().toISOString() }; }
      await save('task', `${t}=${v.tasks[t].status}`); viewVisit(id);
    };
    $('#note').onchange = async e => { v.note = e.target.value; await save('note'); };
    $('#cond').onclick = () => reportCondition(v, c);
    const sig = setupSignature($('#sig'), v.signature);
    $('#sigClear').onclick = () => sig.clear();
    $('#cout').onclick = async () => {
      v.note = $('#note').value.trim();
      const missing = tasks.filter(t => !v.tasks[t.id]);
      if (missing.length) return toast(`Mark every task first (${missing.length} left)`);
      if (!v.note) return toast('Add a visit note');
      if (!$('#noSign').checked && sig.empty()) return toast('Get client signature or tick "unable to sign"');
      if (!$('#attest').checked) return toast('Tick the attestation box');
      if ($('#noSign').checked) { const r = await pickReason('Why could the client not sign?', ['Physical limitation', 'Cognitive impairment', 'Client asleep', 'Client refused', 'Representative not present']); if (!r) return; v.noSignReason = r; }
      else v.signature = sig.data();
      $('#cout').disabled = true; $('#cout').textContent = 'Getting location…';
      const loc = await getLocation();
      if (!loc) { const r = await pickReason('Location unavailable — reason', rules.EXCEPTION_REASONS); if (!r) return viewVisit(id); v.exceptions.push(`Clock-out: ${r}`); }
      else { const m = rules.metersBetween(loc.lat, loc.lng, c.lat, c.lng); if (m > rules.GEOFENCE_METERS) v.exceptions.push(`Clock-out ${m}m from address`); }
      v.clockOut = { time: new Date().toISOString(), ...(loc || {}), method: loc ? 'gps' : 'manual' };
      v.attested = true; v.status = 'completed';
      await save('clock-out', `units=${rules.units(v)}`); toast('Visit complete'); viewVisit(id);
    };
    return;
  }

  // completed (or RN viewing in-progress)
  const els = rules.evvElements(v, c, aide);
  shell(header + `
    <section class="card"><h3>EVV record ${rules.evvComplete(v, c, aide) ? '<span class="pill ok">6/6 complete</span>' : '<span class="pill bad">incomplete</span>'}</h3>
      <table class="tbl">${els.map(([k, val]) => `<tr><td>${k}</td><td>${val ? esc(val) : '<span class="pill bad">missing</span>'}</td></tr>`).join('')}
      <tr><td>Billable units</td><td>${rules.units(v)}</td></tr>
      <tr><td>Exceptions</td><td>${(v.exceptions || []).map(esc).join('<br>') || 'None'}</td></tr></table></section>
    <section class="card"><h3>Tasks</h3><ul>${Object.entries(v.tasks || {}).map(([t, s]) => `<li>${s.status === 'done' ? '✅' : '❌'} ${esc(taskById[t]?.label)}${s.reason ? ` — ${esc(s.reason)}` : ''}</li>`).join('')}</ul>
      <h3>Note</h3><p>${esc(v.note || '—')}</p>
      <h3>Client signature</h3>${v.signature ? `<img class="sig-img" src="${v.signature}" alt="Client signature">` : `<p>${esc(v.noSignReason || '—')}</p>`}
      <p class="muted">Aide attestation: ${v.attested ? 'Yes' : 'No'}</p></section>`, { title: 'Visit record', back });
}

async function reportCondition(v, c) {
  const d = $('#dialog');
  d.innerHTML = `<form method="dialog"><h2>Change in condition</h2>
    <p class="muted">Your supervising nurse is alerted right away. Call 911 for emergencies.</p>
    <div class="reason-list">${['Fall', 'New pain', 'Skin / wound change', 'Breathing problem', 'Confusion / behavior change', 'Not eating / drinking', 'Medication concern', 'Other'].map((r, i) =>
      `<label class="big-choice"><input type="radio" name="k" value="${r}" ${i ? '' : 'checked'}> ${r}</label>`).join('')}</div>
    <textarea name="t" rows="3" placeholder="Describe what you saw"></textarea>
    <div class="row"><button value="cancel" class="btn ghost">Cancel</button><button value="ok" class="btn alert">Send to nurse</button></div></form>`;
  d.onclose = async () => {
    if (d.returnValue !== 'ok') return;
    const f = new FormData($('form', d));
    await db.put('alerts', { id: db.uid('al_'), visitId: v.id, clientId: c.id, aideId: me.id, kind: f.get('k'), text: f.get('t'), time: new Date().toISOString(), ack: null });
    await db.audit(me.id, 'condition-report', `${c.id} ${f.get('k')}`); toast('Nurse alerted');
  };
  d.showModal();
}

function setupSignature(cv, existing) {
  const ctx = cv.getContext('2d'); let drawing = false, dirty = false;
  ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.strokeStyle = '#0b2540';
  if (existing) { const i = new Image(); i.onload = () => ctx.drawImage(i, 0, 0); i.src = existing; dirty = true; }
  const pos = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * cv.width / r.width, (e.clientY - r.top) * cv.height / r.height]; };
  cv.onpointerdown = e => { drawing = true; cv.setPointerCapture(e.pointerId); ctx.beginPath(); ctx.moveTo(...pos(e)); };
  cv.onpointermove = e => { if (!drawing) return; ctx.lineTo(...pos(e)); ctx.stroke(); dirty = true; };
  cv.onpointerup = () => (drawing = false);
  return { clear: () => { ctx.clearRect(0, 0, cv.width, cv.height); dirty = false; }, empty: () => !dirty, data: () => cv.toDataURL('image/png') };
}

// ---------- RN PORTAL ----------
const RN_TABS = [['#/rn', 'Dashboard'], ['#/rn/visits', 'Visits'], ['#/rn/clients', 'Clients'], ['#/rn/aides', 'Aides'], ['#/rn/evv', 'EVV Export'], ['#/rn/audit', 'Audit']];
const rnShell = (body, title) => shell(body, { title, tabs: RN_TABS });

async function viewRnDash() {
  const [visits, clients, users, alerts] = await Promise.all([db.all('visits'), db.all('clients'), db.all('users'), db.all('alerts')]);
  const cm = Object.fromEntries(clients.map(c => [c.id, c])), um = Object.fromEntries(users.map(u => [u.id, u]));
  const todays = visits.filter(v => v.date === today());
  const count = s => todays.filter(v => visitState(v)[0] === s).length;
  const exc = visits.filter(v => v.exceptions?.length);
  const open = alerts.filter(a => !a.ack).sort((a, b) => b.time.localeCompare(a.time));
  const sup = clients.map(c => [c, rules.supervisionStatus(c)]).filter(([, s]) => s.state !== 'ok');
  const creds = users.flatMap(u => (u.credentials || []).map(c => [u, c, rules.credentialStatus(c)])).filter(([, , s]) => s.state !== 'ok');
  rnShell(`
    <div class="kpis">
      <div class="kpi"><b>${todays.length}</b>Visits today</div>
      <div class="kpi ok"><b>${count('Done')}</b>Completed</div>
      <div class="kpi info"><b>${count('In progress')}</b>In progress</div>
      <div class="kpi bad"><b>${count('Late')}</b>Late / missed</div>
      <div class="kpi warn"><b>${exc.length}</b>EVV exceptions</div>
    </div>
    <section class="card"><h3>Change-in-condition alerts (${open.length})</h3>
      ${open.length ? open.map(a => `<div class="alert-row"><div><b>${esc(cm[a.clientId]?.name)}</b> — ${esc(a.kind)}<br><small>${esc(a.text)} · ${esc(um[a.aideId]?.name)} · ${new Date(a.time).toLocaleString()}</small></div>
        <button class="btn sm primary" data-ack="${a.id}">Acknowledge</button></div>`).join('') : '<p class="muted">No open alerts.</p>'}</section>
    <section class="card"><h3>Supervisory visits due (59A-8.0095 · 42 CFR 484.80(h))</h3>
      ${sup.length ? `<table class="tbl">${sup.map(([c, s]) => `<tr><td><a href="#/rn/client/${c.id}">${esc(c.name)}</a></td><td>Last: ${rules.fmtDate(c.lastSupervision)} (${s.since}d)</td>
        <td><span class="pill ${s.state === 'overdue' ? 'bad' : 'warn'}">${s.state === 'overdue' ? `${-s.left}d overdue` : `due in ${s.left}d`}</span></td></tr>`).join('')}</table>` : '<p class="muted">All current.</p>'}</section>
    <section class="card"><h3>Credentials expiring / expired</h3>
      ${creds.length ? `<table class="tbl">${creds.map(([u, c, s]) => `<tr><td>${esc(u.name)}</td><td>${esc(c.type)}</td><td><span class="pill ${s.state === 'expired' ? 'bad' : 'warn'}">${s.state === 'expired' ? 'Expired' : `${s.left}d left`}</span></td></tr>`).join('')}</table>` : '<p class="muted">All current.</p>'}</section>`, 'RN Portal');
  $('#app').onclick = async e => {
    const id = e.target.dataset?.ack; if (!id) return;
    const a = await db.get('alerts', id); a.ack = { by: me.id, at: new Date().toISOString() };
    await db.put('alerts', a); await db.audit(me.id, 'alert-ack', id); viewRnDash();
  };
}

async function viewRnVisits() {
  const [visits, clients, users] = await Promise.all([db.all('visits'), db.all('clients'), db.all('users')]);
  const cm = Object.fromEntries(clients.map(c => [c.id, c])), um = Object.fromEntries(users.map(u => [u.id, u]));
  const aides = users.filter(u => u.role === 'aide');
  visits.sort((a, b) => b.start.localeCompare(a.start));
  rnShell(`
    <section class="card"><h3>Schedule a visit</h3>
      <form id="nv" class="grid">
        <label>Client<select name="clientId">${clients.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></label>
        <label>Aide<select name="aideId">${aides.map(a => `<option value="${a.id}">${esc(a.name)}</option>`).join('')}</select></label>
        <label>Service<select name="serviceCode">${Object.entries(SERVICES).map(([k, s]) => `<option value="${k}">${k} ${s.label}</option>`).join('')}</select></label>
        <label>Date<input type="date" name="date" value="${today()}" required></label>
        <label>Start<input type="time" name="s" value="09:00" required></label>
        <label>End<input type="time" name="e" value="11:00" required></label>
        <button class="btn primary">Add visit</button>
      </form></section>
    <section class="card"><table class="tbl"><tr><th>Date</th><th>Client</th><th>Aide</th><th>Service</th><th>Status</th><th>EVV</th></tr>
      ${visits.map(v => { const [st, cls] = visitState(v); return `<tr><td>${rules.fmtDate(v.date)} ${rules.fmtTime(v.start)}</td><td><a href="#/visit/${v.id}">${esc(cm[v.clientId]?.name)}</a></td>
        <td>${esc(um[v.aideId]?.name)}</td><td>${v.serviceCode}</td><td><span class="pill ${cls}">${st}</span></td>
        <td>${v.status === 'completed' ? (rules.evvComplete(v, cm[v.clientId], um[v.aideId]) ? '✅' : '⚠️') : ''}${v.exceptions?.length ? ' <span class="pill warn">exception</span>' : ''}</td></tr>`; }).join('')}</table></section>`, 'Visits');
  $('#nv').onsubmit = async e => {
    e.preventDefault(); const f = Object.fromEntries(new FormData(e.target));
    if (f.e <= f.s) return toast('End time must be after start');
    const v = { id: db.uid('v_'), clientId: f.clientId, aideId: f.aideId, serviceCode: f.serviceCode, date: f.date, start: `${f.date}T${f.s}:00`, end: `${f.date}T${f.e}:00`, status: 'scheduled' };
    await db.put('visits', v); await db.audit(me.id, 'visit-scheduled', v.id); toast('Visit scheduled'); viewRnVisits();
  };
}

async function viewRnClients() {
  const clients = await db.all('clients');
  rnShell(`<section class="card"><table class="tbl"><tr><th>Client</th><th>Medicaid ID</th><th>Plan</th><th>Supervision</th></tr>
    ${clients.map(c => { const s = rules.supervisionStatus(c); return `<tr><td><a href="#/rn/client/${c.id}">${esc(c.name)}</a></td><td>${esc(c.medicaidId)}</td><td>${esc(c.plan)}</td>
      <td><span class="pill ${s.state === 'ok' ? 'ok' : s.state === 'overdue' ? 'bad' : 'warn'}">${s.state === 'overdue' ? 'overdue' : `${s.left}d left`}</span></td></tr>`; }).join('')}</table></section>`, 'Clients');
}

async function viewRnClient(id) {
  const [c, users, sups, visits] = await Promise.all([db.get('clients', id), db.all('users'), db.all('supervisions'), db.all('visits')]);
  const aides = users.filter(u => u.role === 'aide');
  const mySups = sups.filter(s => s.clientId === id).sort((a, b) => b.date.localeCompare(a.date));
  rnShell(`
    <p><a href="#/rn/clients">‹ All clients</a></p>
    <section class="card"><h2>${esc(c.name)}</h2>
      <p>DOB ${rules.fmtDate(c.dob)} · Medicaid ${esc(c.medicaidId)} · ${esc(c.plan)}<br>${esc(c.address)} · ${esc(c.phone)}<br>Emergency: ${esc(c.emergency)}</p></section>
    <section class="card"><h3>Plan of care — aide instructions (59A-8.0215 · 42 CFR 484.80(g))</h3>
      <form id="cp"><div class="task-grid">${TASK_LIBRARY.map(t => `<label class="chk"><input type="checkbox" name="t" value="${t.id}" ${c.carePlan.tasks.includes(t.id) ? 'checked' : ''}> ${esc(t.label)}</label>`).join('')}</div>
        <label>Written instructions<textarea name="ins" rows="3">${esc(c.carePlan.instructions)}</textarea></label>
        <p class="muted">Last updated ${rules.fmtDate(c.carePlan.updatedAt)}</p><button class="btn primary">Save care plan</button></form></section>
    <section class="card"><h3>Log RN supervisory visit</h3>
      <form id="sv" class="grid">
        <label>Date<input type="date" name="date" value="${today()}" required></label>
        <label>Aide<select name="aideId">${aides.map(a => `<option value="${a.id}">${esc(a.name)}</option>`).join('')}</select></label>
        <label class="chk"><input type="checkbox" name="present"> Aide present / observed</label>
        <label class="wide">Findings<textarea name="notes" rows="2" required placeholder="Aide following plan of care? Client/caregiver satisfied? Skills observed?"></textarea></label>
        <button class="btn primary">Save supervisory visit</button></form>
      <table class="tbl">${mySups.map(s => `<tr><td>${rules.fmtDate(s.date)}</td><td>${s.aidePresent ? 'Aide observed' : 'Aide not present'}</td><td>${esc(s.notes)}</td></tr>`).join('')}</table></section>
    <section class="card"><h3>Visit history</h3><ul>${visits.filter(v => v.clientId === id).sort((a, b) => b.start.localeCompare(a.start)).map(v =>
      `<li><a href="#/visit/${v.id}">${rules.fmtDate(v.date)} ${rules.fmtTime(v.start)} · ${v.serviceCode} · ${visitState(v)[0]}</a></li>`).join('')}</ul></section>`, c.name);
  $('#cp').onsubmit = async e => {
    e.preventDefault(); const f = new FormData(e.target);
    c.carePlan = { tasks: f.getAll('t'), instructions: f.get('ins'), updatedBy: me.id, updatedAt: today() };
    await db.put('clients', c); await db.audit(me.id, 'care-plan-update', id); toast('Care plan saved');
  };
  $('#sv').onsubmit = async e => {
    e.preventDefault(); const f = Object.fromEntries(new FormData(e.target));
    await db.put('supervisions', { id: db.uid('s_'), clientId: id, rnId: me.id, aideId: f.aideId, date: f.date, aidePresent: !!f.present, notes: f.notes });
    if (!c.lastSupervision || f.date > c.lastSupervision) { c.lastSupervision = f.date; await db.put('clients', c); }
    await db.audit(me.id, 'supervisory-visit', id); toast('Supervisory visit saved'); viewRnClient(id);
  };
}

async function viewRnAides() {
  const users = (await db.all('users')).filter(u => u.role === 'aide');
  rnShell(users.map(u => `<section class="card"><h3>${esc(u.name)} · ${esc(u.employeeId)}</h3><table class="tbl">
    ${u.credentials.map(c => { const s = rules.credentialStatus(c); return `<tr><td>${esc(c.type)}</td><td>${c.expires ? rules.fmtDate(c.expires) : 'No expiry'}</td>
      <td><span class="pill ${s.state === 'ok' ? 'ok' : s.state === 'expired' ? 'bad' : 'warn'}">${s.state === 'expired' ? 'Expired' : s.state === 'ok' ? 'Current' : `${s.left}d left`}</span></td></tr>`; }).join('')}</table></section>`).join(''), 'Aides');
}

async function viewRnEvv() {
  const [visits, clients, users] = await Promise.all([db.all('visits'), db.all('clients'), db.all('users')]);
  const done = visits.filter(v => v.status === 'completed');
  rnShell(`<section class="card"><h3>Florida Medicaid EVV export</h3>
    <p>Florida uses an <b>open EVV model</b>: AHCA and the SMMC plans aggregate visits in HHAeXchange. Claims without a matching EVV visit are denied.</p>
    <p>${done.length} completed visit(s) ready. Every row carries the six Cures Act elements plus GPS, exception reasons and 15-minute units.</p>
    <form id="ex" class="grid"><label>From<input type="date" name="f" value="${today()}"></label><label>To<input type="date" name="t" value="${today()}"></label>
      <button class="btn primary">Download CSV</button></form>
    <p class="muted">Before going live, map these columns to HHAeXchange's current EDI/API spec for alternate EVV vendors.</p></section>`, 'EVV Export');
  $('#ex').onsubmit = async e => {
    e.preventDefault(); const f = Object.fromEntries(new FormData(e.target));
    const sel = visits.filter(v => v.date >= f.f && v.date <= f.t);
    download(`evv_${f.f}_${f.t}.csv`, buildCsv(sel, clients, users)); await db.audit(me.id, 'evv-export', `${f.f}..${f.t}`);
  };
}

async function viewRnAudit() {
  const [log, users] = await Promise.all([db.all('audit'), db.all('users')]);
  const um = Object.fromEntries(users.map(u => [u.id, u]));
  log.sort((a, b) => b.time.localeCompare(a.time));
  rnShell(`<section class="card"><table class="tbl"><tr><th>Time</th><th>User</th><th>Action</th><th>Detail</th></tr>
    ${log.slice(0, 300).map(a => `<tr><td>${new Date(a.time).toLocaleString()}</td><td>${esc(um[a.userId]?.name || a.userId)}</td><td>${esc(a.action)}</td><td>${esc(a.detail)}</td></tr>`).join('')}</table></section>`, 'Audit Log');
}

// ---------- router ----------
async function route() {
  $('#app').onclick = null;
  const h = location.hash || '#/login';
  if (!me && h !== '#/login') return (location.hash = '#/login');
  const [, a, b] = h.split('/');
  const isRn = me?.role === 'rn';
  if (h === '#/login') return viewLogin();
  if (a === 'visit') return viewVisit(b);
  if (a === 'rn' && !isRn) return (location.hash = '#/aide');
  if (a === 'rn') return ({ undefined: viewRnDash, visits: viewRnVisits, clients: viewRnClients, client: () => viewRnClient(h.split('/')[3]), aides: viewRnAides, evv: viewRnEvv, audit: viewRnAudit }[b] || viewRnDash)();
  if (a === 'me') return viewMe();
  return isRn ? (location.hash = '#/rn') : viewAideHome();
}

(async function start() {
  await db.ensureSeeded();
  const uidS = sessionStorage.getItem('kk_user');
  if (uidS) { me = await db.get('users', uidS); resetLock(); }
  addEventListener('hashchange', route);
  route();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
})();
