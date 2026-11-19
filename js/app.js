import * as db from './db.js';
import { SERVICES, TASK_LIBRARY, fullAddress } from './data.js';
import * as rules from './compliance.js';
import { buildV5, toCsv, download } from './evv.js';
import { t, setLang, getLang, LANGS } from './i18n.js';

const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const taskById = Object.fromEntries(TASK_LIBRARY.map(x => [x.id, x]));
const localDate = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const today = () => localDate();
const svc = code => t(SERVICES[code]?.label || code);
const APP_VERSION = '0.2.0'; // stamped by the release kit
const AUTO_LOCK_MS = 5 * 60 * 1000; // HIPAA 164.312(a)(2)(iii) automatic logoff
const MISSED_REASONS = ['Client not home', 'Client refused service', 'Client hospitalized', 'Caregiver unavailable / call-out', 'Emergency evacuation', 'Other'];

let me = null, lockTimer;

// ---------- session & lock ----------
function resetLock() {
  clearTimeout(lockTimer);
  if (me) lockTimer = setTimeout(() => lock(t('Locked after 5 minutes of inactivity')), AUTO_LOCK_MS);
}
['pointerdown', 'keydown'].forEach(e => addEventListener(e, resetLock, { passive: true }));
async function lock(msg) {
  if (me && db.isUnlocked()) await db.audit(me.id, 'logout', msg || 'manual');
  me = null; db.lock(); clearTimeout(lockTimer);
  location.hash = '#/login'; if (msg) toast(msg);
}
// Lock when the app is hidden longer than the timeout (phone pocketed, tab switched)
let hiddenAt = 0;
document.addEventListener('visibilitychange', () => {
  if (document.hidden) hiddenAt = Date.now();
  else if (me && Date.now() - hiddenAt > AUTO_LOCK_MS) lock(t('Locked after 5 minutes of inactivity'));
});

function toast(msg) {
  const el = $('#toast'); el.textContent = msg; el.hidden = false;
  clearTimeout(el._h); el._h = setTimeout(() => (el.hidden = true), 3500);
}
function updateNet() {
  const n = $('#net'); if (!n) return;
  n.textContent = navigator.onLine ? t('Online') : t('Offline — saving on device');
  n.className = 'net ' + (navigator.onLine ? 'on' : 'off');
}
addEventListener('online', updateNet); addEventListener('offline', updateNet);

function getLocation() {
  return new Promise(resolve => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      p => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, acc: Math.round(p.coords.accuracy) }),
      () => resolve(null), { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 });
  });
}

// Shows translated labels, returns the canonical English value (stored in records).
function pickReason(title, reasons) {
  return new Promise(resolve => {
    const d = $('#dialog');
    d.innerHTML = `<form method="dialog"><h2>${esc(title)}</h2>
      <div class="reason-list">${reasons.map((r, i) => `<label class="big-choice"><input type="radio" name="r" value="${esc(r)}" ${i ? '' : 'checked'}> ${esc(t(r))}</label>`).join('')}</div>
      <div class="row"><button value="cancel" class="btn ghost">${t('Cancel')}</button><button value="ok" class="btn primary">${t('Save')}</button></div></form>`;
    d.onclose = () => resolve(d.returnValue === 'ok' ? new FormData($('form', d)).get('r') : null);
    d.showModal();
  });
}

// ---------- shell ----------
function langBar() {
  return `<div class="langs">${Object.entries(LANGS).map(([k, v]) => `<button class="lang ${getLang() === k ? 'on' : ''}" data-lang="${k}">${v}</button>`).join('')}</div>`;
}
function shell(body, { title = 'Karen Kare', back, tabs, langs } = {}) {
  const tabHtml = tabs ? `<nav class="tabs">${tabs.map(([href, label]) =>
    `<a href="${href}" class="${(href === '#/rn' ? location.hash === '#/rn' : location.hash.startsWith(href)) ? 'active' : ''}">${label}</a>`).join('')}</nav>` : '';
  $('#app').innerHTML = `
    <header class="top">
      ${back ? `<a class="back" href="${back}" aria-label="Back">‹</a>` : '<span class="logo">KK</span>'}
      <h1>${esc(title)}</h1>
      ${me ? `<button class="lock" id="lockBtn" aria-label="Lock">🔒 ${esc(me.name.split(' ')[0])}</button>` : ''}
    </header>
    <div id="net" class="net"></div>
    ${tabHtml}
    <main class="${me?.role === 'rn' ? 'dense' : 'big'}">${langs ? langBar() : ''}${body}</main>`;
  $('#lockBtn')?.addEventListener('click', () => lock());
  $('#app').querySelectorAll('[data-lang]').forEach(b => b.addEventListener('click', async () => {
    setLang(b.dataset.lang);
    if (me && me.role === 'aide') { const u = await db.get('users', me.id); u.lang = b.dataset.lang; await db.put('users', u); me = u; }
    route();
  }));
  updateNet();
}

// ---------- login ----------
async function viewLogin() {
  const users = await db.directory();
  shell(`
    <section class="card login">
      <p class="muted">${t('Select your name and enter your PIN.')}</p>
      <form id="lf">
        <div class="user-pick">${users.map((u, i) => `<label class="big-choice"><input type="radio" name="u" value="${u.id}" ${i ? '' : 'checked'}>
          <span><b>${esc(u.name)}</b><br><small>${u.role === 'rn' ? t('RN Supervisor') : t('Home Care Aide')}</small></span></label>`).join('')}</div>
        <input name="pin" type="password" inputmode="numeric" autocomplete="off" maxlength="8" placeholder="PIN" class="pin" required>
        <button class="btn primary xl" id="signin">${t('Sign in')}</button>
      </form>
      <p class="demo">Demo PINs — Maria 1111 · Jean-Pierre 2222 · Karen RN 9999<br>
      <button class="link" id="reset">Reset demo data</button><br><span class="ver">v${APP_VERSION}</span></p>
    </section>`, { title: 'Karen Kare', langs: true });
  $('#lf').onsubmit = async e => {
    e.preventDefault();
    const f = new FormData(e.target), btn = $('#signin');
    btn.disabled = true; btn.textContent = t('Unlocking…');
    if (!(await db.unlock(f.get('u'), f.get('pin')))) { btn.disabled = false; btn.textContent = t('Sign in'); e.target.pin.value = ''; return toast(t('Wrong PIN')); }
    me = await db.get('users', f.get('u'));
    if (me.role === 'aide' && me.lang) setLang(me.lang);
    await db.audit(me.id, 'login'); resetLock();
    location.hash = me.role === 'rn' ? '#/rn' : '#/aide';
  };
  $('#reset').onclick = async () => { await db.ensureSeeded(true); toast('Demo data reset'); viewLogin(); };
}

// ---------- AIDE ----------
function visitState(v) {
  if (v.status === 'completed') return ['Done', 'ok'];
  if (v.status === 'missed') return ['Missed', 'bad'];
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
    <h2 class="hello">${t('Hi')} ${esc(me.name.split(' ')[0])} 👋</h2>
    ${cred.length ? `<div class="banner warn">⚠️ ${cred.map(([c, s]) => `${esc(c.type)} ${s.state === 'expired' ? t('EXPIRED') : t('expires in {n} days', { n: s.left })}`).join('<br>')}<br><small>${t('Tell your supervisor.')}</small></div>` : ''}
    <h3>${t("Today's visits")}</h3>
    ${mine.length ? mine.map(v => { const c = cm[v.clientId]; const [st, cls] = visitState(v); return `
      <a class="visit-card" href="#/visit/${v.id}">
        <div class="time">${rules.fmtTime(v.start)}<br><small>${t('to')} ${rules.fmtTime(v.end)}</small></div>
        <div class="who"><b>${esc(c.name)}</b><br><small>${esc(svc(v.serviceCode))} · ${esc(c.address.line1)}, ${esc(c.address.city)}</small></div>
        <span class="pill ${cls}">${t(st)}</span></a>`; }).join('') : `<p class="muted">${t('No visits scheduled today.')}</p>`}
    <a class="btn ghost xl" href="#/me">${t('My credentials')}</a>`, { title: t('My Day'), langs: true });
}

async function viewMe() {
  shell(`<section class="card"><h3>${esc(me.name)} · ${esc(me.employeeId)}</h3>
    <table class="tbl">${(me.credentials || []).map(c => { const s = rules.credentialStatus(c);
      return `<tr><td>${esc(c.type)}</td><td>${c.expires ? rules.fmtDate(c.expires) : t('No expiry')}</td><td><span class="pill ${s.state === 'ok' ? 'ok' : s.state === 'expired' ? 'bad' : 'warn'}">${s.state === 'ok' ? t('Current') : s.state === 'expired' ? t('EXPIRED') : t('expires in {n} days', { n: s.left })}</span></td></tr>`; }).join('')}</table></section>`,
  { title: t('My credentials'), back: '#/aide' });
}

async function viewVisit(id) {
  const v = await db.get('visits', id);
  if (!v || (me.role === 'aide' && v.aideId !== me.id)) return (location.hash = '#/aide');
  const [c, aide] = await Promise.all([db.get('clients', v.clientId), db.get('users', v.aideId)]);
  const save = async (action, detail) => { await db.put('visits', v); await db.audit(me.id, action, `${v.id} ${detail || ''}`); };
  const back = me.role === 'rn' ? '#/rn/visits' : '#/aide';
  const addr = fullAddress(c.address);
  const header = `
    <section class="card client">
      <h2>${esc(c.name)}</h2>
      <p>${esc(svc(v.serviceCode))} (${v.serviceCode}) · ${rules.fmtTime(v.start)}–${rules.fmtTime(v.end)}</p>
      <p><a href="https://maps.google.com/?q=${encodeURIComponent(addr)}" target="_blank" rel="noopener">📍 ${esc(addr)}</a></p>
      <details><summary>${t('Care instructions from RN')}</summary><p>${esc(c.carePlan.instructions)}</p>
      <p class="muted">${t('Emergency')}: ${esc(c.emergency)}</p></details>
    </section>`;

  if (v.status === 'scheduled') {
    if (me.role !== 'aide') return shell(header + `<p class="muted">${t('Not started.')}</p>`, { title: t('Visit'), back });
    shell(header + `<button id="cin" class="btn go xxl">${t('Clock In')}</button>
      <p class="muted center">${t('Your location is recorded at clock-in and clock-out (Medicaid EVV).')}</p>`, { title: t('Visit'), back });
    $('#cin').onclick = async () => {
      $('#cin').disabled = true; $('#cin').textContent = t('Getting location…');
      const loc = await getLocation(); v.exceptions = [];
      if (!loc) {
        const r = await pickReason(t('Location unavailable — reason'), rules.EXCEPTION_REASONS);
        if (!r) return viewVisit(id);
        v.exceptions.push(`Clock-in: ${r}`);
      } else {
        const m = rules.metersBetween(loc.lat, loc.lng, c.lat, c.lng);
        if (m > rules.GEOFENCE_METERS) {
          const r = await pickReason(t("You are {mi} mi from the client's address — reason", { mi: (m / 1609).toFixed(1) }), rules.EXCEPTION_REASONS);
          if (!r) return viewVisit(id);
          v.exceptions.push(`Clock-in ${m}m from address: ${r}`);
        }
      }
      v.clockIn = { time: new Date().toISOString(), ...(loc || {}), method: loc ? 'gps' : 'manual' };
      v.status = 'in-progress'; v.tasks = {}; v.synced = false;
      await save('clock-in', v.clockIn.method); toast(t('Clocked in')); viewVisit(id);
    };
    return;
  }

  if (v.status === 'in-progress' && me.role === 'aide') {
    const tasks = c.carePlan.tasks.map(x => taskById[x]).filter(Boolean);
    shell(header + `
      <div class="banner info">${t('Clocked in at {t}', { t: rules.fmtTime(v.clockIn.time) })}</div>
      <h3>${t('Care plan tasks')}</h3>
      <div id="tasks">${tasks.map(x => { const s = v.tasks[x.id]; return `
        <div class="task ${s ? s.status : ''}" data-t="${x.id}">
          <div><b>${esc(t(x.label))}</b><small>${x.cat}${s?.reason ? ' · ' + esc(t(s.reason)) : ''}</small></div>
          <button class="btn sm ${s?.status === 'done' ? 'primary' : 'ghost'}" data-a="done">${t('✓ Done')}</button>
          <button class="btn sm ${s?.status === 'not-done' ? 'warn' : 'ghost'}" data-a="not-done">${t('✗ Not done')}</button>
        </div>`; }).join('')}</div>
      <button id="cond" class="btn alert xl">${t('⚠️ Report change in condition')}</button>
      <h3>${t('Visit note')}</h3>
      <textarea id="note" rows="4" placeholder="${esc(t('What happened during the visit? Anything the nurse should know?'))}">${esc(v.note || '')}</textarea>
      <h3>${t('Client signature')}</h3>
      <canvas id="sig" width="600" height="180" class="sig"></canvas>
      <div class="row"><button class="btn ghost sm" id="sigClear">${t('Clear')}</button>
        <label class="chk"><input type="checkbox" id="noSign"> ${t('Client unable to sign')}</label></div>
      <label class="chk attest"><input type="checkbox" id="attest"> ${t('I attest the services above were provided as documented.')}</label>
      <button id="cout" class="btn stop xxl">${t('Clock Out')}</button>`, { title: t('Visit in progress'), back });

    $('#tasks').onclick = async e => {
      const b = e.target.closest('button'); if (!b) return;
      const k = b.closest('.task').dataset.t;
      v.note = $('#note').value;
      if (b.dataset.a === 'done') v.tasks[k] = { status: 'done', at: new Date().toISOString() };
      else { const r = await pickReason(t('Why was this not done?'), rules.TASK_SKIP_REASONS); if (!r) return; v.tasks[k] = { status: 'not-done', reason: r, at: new Date().toISOString() }; }
      await save('task', `${k}=${v.tasks[k].status}`); viewVisit(id);
    };
    $('#note').onchange = async e => { v.note = e.target.value; await save('note'); };
    $('#cond').onclick = () => reportCondition(v, c);
    const sig = setupSignature($('#sig'), v.signature);
    $('#sigClear').onclick = () => sig.clear();
    $('#cout').onclick = async () => {
      v.note = $('#note').value.trim();
      const missing = tasks.filter(x => !v.tasks[x.id]);
      if (missing.length) return toast(t('Mark every task first ({n} left)', { n: missing.length }));
      if (!v.note) return toast(t('Add a visit note'));
      if (!$('#noSign').checked && sig.empty()) return toast(t('Get client signature or tick "unable to sign"'));
      if (!$('#attest').checked) return toast(t('Tick the attestation box'));
      if ($('#noSign').checked) { const r = await pickReason(t('Why could the client not sign?'), ['Physical limitation', 'Cognitive impairment', 'Client asleep', 'Client refused', 'Representative not present']); if (!r) return; v.noSignReason = r; }
      else v.signature = sig.data();
      $('#cout').disabled = true; $('#cout').textContent = t('Getting location…');
      const loc = await getLocation();
      if (!loc) { const r = await pickReason(t('Location unavailable — reason'), rules.EXCEPTION_REASONS); if (!r) return viewVisit(id); v.exceptions.push(`Clock-out: ${r}`); }
      else { const m = rules.metersBetween(loc.lat, loc.lng, c.lat, c.lng); if (m > rules.GEOFENCE_METERS) v.exceptions.push(`Clock-out ${m}m from address`); }
      v.clockOut = { time: new Date().toISOString(), ...(loc || {}), method: loc ? 'gps' : 'manual' };
      v.attested = true; v.status = 'completed';
      await save('clock-out', `units=${rules.units(v)}`); toast(t('Visit complete')); viewVisit(id);
    };
    return;
  }

  if (v.status === 'missed') {
    return shell(header + `<div class="banner warn">${t('Missed')}: ${esc(t(v.missedReason || ''))}</div>`, { title: t('Visit record'), back });
  }

  const els = rules.evvElements(v, c, aide);
  shell(header + `
    <section class="card"><h3>${t('EVV record')} ${rules.evvComplete(v, c, aide) ? `<span class="pill ok">${t('6/6 complete')}</span>` : `<span class="pill bad">${t('incomplete')}</span>`}</h3>
      <table class="tbl">${els.map(([k, val]) => `<tr><td>${esc(k)}</td><td>${val ? esc(val) : `<span class="pill bad">${t('missing')}</span>`}</td></tr>`).join('')}
      <tr><td>${t('Billable units')}</td><td>${rules.units(v)}</td></tr>
      <tr><td>${t('Exceptions')}</td><td>${(v.exceptions || []).map(esc).join('<br>') || t('None')}</td></tr></table></section>
    <section class="card"><h3>${t('Tasks')}</h3><ul>${Object.entries(v.tasks || {}).map(([k, s]) => `<li>${s.status === 'done' ? '✅' : '❌'} ${esc(t(taskById[k]?.label))}${s.reason ? ` — ${esc(t(s.reason))}` : ''}</li>`).join('')}</ul>
      <h3>${t('Note')}</h3><p>${esc(v.note || '—')}</p>
      <h3>${t('Client signature')}</h3>${v.signature ? `<img class="sig-img" src="${v.signature}" alt="Client signature">` : `<p>${esc(t(v.noSignReason || '—'))}</p>`}
      <p class="muted">${t('Aide attestation')}: ${v.attested ? t('Yes') : t('No')}</p></section>`, { title: t('Visit record'), back });
}

async function reportCondition(v, c) {
  const d = $('#dialog');
  const kinds = ['Fall', 'New pain', 'Skin / wound change', 'Breathing problem', 'Confusion / behavior change', 'Not eating / drinking', 'Medication concern', 'Other'];
  d.innerHTML = `<form method="dialog"><h2>${t('Change in condition')}</h2>
    <p class="muted">${t('Your supervising nurse is alerted right away. Call 911 for emergencies.')}</p>
    <div class="reason-list">${kinds.map((r, i) => `<label class="big-choice"><input type="radio" name="k" value="${r}" ${i ? '' : 'checked'}> ${esc(t(r))}</label>`).join('')}</div>
    <textarea name="t" rows="3" placeholder="${esc(t('Describe what you saw'))}"></textarea>
    <div class="row"><button value="cancel" class="btn ghost">${t('Cancel')}</button><button value="ok" class="btn alert">${t('Send to nurse')}</button></div></form>`;
  d.onclose = async () => {
    if (d.returnValue !== 'ok') return;
    const f = new FormData($('form', d));
    await db.put('alerts', { id: db.uid('al_'), visitId: v.id, clientId: c.id, aideId: me.id, kind: f.get('k'), text: f.get('t'), time: new Date().toISOString(), ack: null });
    await db.audit(me.id, 'condition-report', `${c.id} ${f.get('k')}`); toast(t('Nurse alerted'));
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

// ---------- RN PORTAL (English — office staff) ----------
const RN_TABS = [['#/rn', 'Dashboard'], ['#/rn/visits', 'Visits'], ['#/rn/clients', 'Clients'], ['#/rn/aides', 'Aides'], ['#/rn/evv', 'EVV Export'], ['#/rn/settings', 'Settings'], ['#/rn/audit', 'Audit']];
const rnShell = (body, title) => shell(body, { title, tabs: RN_TABS });
const getSettings = async () => (await db.metaGet('settings')) || { id: 'settings', taxId: '', npi: '', payers: {}, header: true };

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
      <div class="kpi bad"><b>${count('Late') + count('Missed')}</b>Late / missed</div>
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
    <section class="card"><table class="tbl"><tr><th>Date</th><th>Client</th><th>Aide</th><th>Service</th><th>Status</th><th>EVV</th><th></th></tr>
      ${visits.map(v => { const [st, cls] = visitState(v); return `<tr><td>${rules.fmtDate(v.date)} ${rules.fmtTime(v.start)}</td><td><a href="#/visit/${v.id}">${esc(cm[v.clientId]?.name)}</a></td>
        <td>${esc(um[v.aideId]?.name)}</td><td>${v.serviceCode}</td><td><span class="pill ${cls}">${st}</span></td>
        <td>${v.status === 'completed' ? (rules.evvComplete(v, cm[v.clientId], um[v.aideId]) ? '✅' : '⚠️') : ''}${v.exceptions?.length ? ' <span class="pill warn">exception</span>' : ''}</td>
        <td>${v.status === 'scheduled' ? `<button class="btn sm ghost" data-miss="${v.id}">Mark missed</button>` : ''}</td></tr>`; }).join('')}</table></section>`, 'Visits');
  $('#nv').onsubmit = async e => {
    e.preventDefault(); const f = Object.fromEntries(new FormData(e.target));
    if (f.e <= f.s) return toast('End time must be after start');
    const v = { id: db.uid('v_'), clientId: f.clientId, aideId: f.aideId, serviceCode: f.serviceCode, date: f.date, start: `${f.date}T${f.s}:00`, end: `${f.date}T${f.e}:00`, status: 'scheduled' };
    await db.put('visits', v); await db.audit(me.id, 'visit-scheduled', v.id); toast('Visit scheduled'); viewRnVisits();
  };
  $('#app').onclick = async e => {
    const id = e.target.dataset?.miss; if (!id) return;
    const r = await pickReason('Why was this visit missed?', MISSED_REASONS); if (!r) return;
    const v = await db.get('visits', id); v.status = 'missed'; v.missedReason = r; v.missedBy = me.id;
    await db.put('visits', v); await db.audit(me.id, 'visit-missed', `${id} ${r}`); toast('Marked missed'); viewRnVisits();
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
      <p>DOB ${rules.fmtDate(c.dob)} · Medicaid ${esc(c.medicaidId)} · ${esc(c.plan)}<br>${esc(fullAddress(c.address))} · ${esc(c.phone)}<br>Emergency: ${esc(c.emergency)}</p>
      <form id="dx" class="grid"><label class="wide">Diagnosis codes (ICD-10, comma separated — required on HHAeXchange visits)<input name="dx" value="${esc((c.dx || []).join(', '))}"></label><button class="btn ghost">Save codes</button></form></section>
    <section class="card"><h3>Plan of care — aide instructions (59A-8.0215 · 42 CFR 484.80(g))</h3>
      <form id="cp"><div class="task-grid">${TASK_LIBRARY.map(x => `<label class="chk"><input type="checkbox" name="t" value="${x.id}" ${c.carePlan.tasks.includes(x.id) ? 'checked' : ''}> ${esc(x.label)}</label>`).join('')}</div>
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
  $('#dx').onsubmit = async e => {
    e.preventDefault(); c.dx = e.target.dx.value.split(/[,\s]+/).map(s => s.trim().toUpperCase()).filter(Boolean);
    await db.put('clients', c); await db.audit(me.id, 'dx-update', id); toast('Diagnosis codes saved');
  };
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
  rnShell(users.map(u => `<section class="card"><h3>${esc(u.name)} · ${esc(u.employeeId)} <small class="muted">· app language: ${LANGS[u.lang || 'en']}</small></h3>
    <form class="grid aide-form" data-id="${u.id}">
      <label>License / certificate #<input name="licenseNumber" value="${esc(u.licenseNumber || '')}"></label>
      <label>SSN last 5 (HHAeXchange)<input name="ssnLast5" value="${esc(u.ssnLast5 || '')}" inputmode="numeric" maxlength="5" pattern="\\d{5}" autocomplete="off"></label>
      <label>Gender<select name="gender">${['F', 'M', 'U'].map(g => `<option ${u.gender === g ? 'selected' : ''}>${g}</option>`).join('')}</select></label>
      <button class="btn ghost">Save</button></form>
    <table class="tbl">${u.credentials.map(c => { const s = rules.credentialStatus(c); return `<tr><td>${esc(c.type)}</td><td>${c.expires ? rules.fmtDate(c.expires) : 'No expiry'}</td>
      <td><span class="pill ${s.state === 'ok' ? 'ok' : s.state === 'expired' ? 'bad' : 'warn'}">${s.state === 'expired' ? 'Expired' : s.state === 'ok' ? 'Current' : `${s.left}d left`}</span></td></tr>`; }).join('')}</table></section>`).join(''), 'Aides');
  document.querySelectorAll('.aide-form').forEach(f => (f.onsubmit = async e => {
    e.preventDefault(); const u = await db.get('users', f.dataset.id);
    Object.assign(u, Object.fromEntries(new FormData(f))); await db.put('users', u); await db.audit(me.id, 'aide-update', u.id); toast('Saved');
  }));
}

async function viewRnSettings() {
  const [s, clients] = await Promise.all([getSettings(), db.all('clients')]);
  const plans = [...new Set(clients.map(c => c.plan))];
  rnShell(`<section class="card"><h3>Agency</h3>
    <form id="st" class="grid">
      <label>Agency Tax ID (EIN, digits only)<input name="taxId" value="${esc(s.taxId)}" inputmode="numeric" maxlength="10"></label>
      <label>Office NPI<input name="npi" value="${esc(s.npi)}" inputmode="numeric" maxlength="10"></label>
      <h4 class="wide">HHAeXchange Payer IDs <small class="muted">— from the HHAeXchange EDI Code Table Guide</small></h4>
      ${plans.map((p, i) => `<label>${esc(p)}<input name="payer_${i}" data-plan="${esc(p)}" value="${esc(s.payers?.[p] || '')}"></label>`).join('')}
      <h4 class="wide">Reason / action codes <small class="muted">— numeric codes from the EDI Code Table Guide</small></h4>
      <label>Visit edit reason code (manual clock-in/out)<input name="editReasonCode" value="${esc(s.editReasonCode || '')}" maxlength="3"></label>
      <label>Visit edit action taken<input name="editActionCode" value="${esc(s.editActionCode || '')}" maxlength="2"></label>
      <label>Missed visit reason code<input name="missedReasonCode" value="${esc(s.missedReasonCode || '')}" maxlength="3"></label>
      <label>Missed visit action taken<input name="missedActionCode" value="${esc(s.missedActionCode || '')}" maxlength="2"></label>
      <label class="chk wide"><input type="checkbox" name="header" ${s.header !== false ? 'checked' : ''}> Include header row in export file</label>
      <button class="btn primary">Save settings</button></form></section>`, 'Settings');
  $('#st').onsubmit = async e => {
    e.preventDefault(); const f = e.target;
    const payers = {}; f.querySelectorAll('[data-plan]').forEach(i => (payers[i.dataset.plan] = i.value.trim()));
    const v = n => f[n].value.trim();
    await db.metaPut({ id: 'settings', taxId: v('taxId'), npi: v('npi'), payers, editReasonCode: v('editReasonCode'), editActionCode: v('editActionCode'),
      missedReasonCode: v('missedReasonCode'), missedActionCode: v('missedActionCode'), header: f.header.checked });
    await db.audit(me.id, 'settings-update'); toast('Settings saved');
  };
}

async function viewRnEvv() {
  const [visits, clients, users, settings] = await Promise.all([db.all('visits'), db.all('clients'), db.all('users'), getSettings()]);
  const render = (from, to) => {
    const { rows, problems } = buildV5(visits.filter(v => v.date >= from && v.date <= to), clients, users, settings);
    rnShell(`<section class="card"><h3>Florida Medicaid EVV — HHAeXchange Homecare V5 visit import</h3>
      <p>Florida runs an <b>open EVV model</b>: AHCA fee-for-service and the SMMC plans aggregate visits in HHAeXchange, and claims without a matching EVV visit are denied.
      This file follows HHAeXchange's 96-column Homecare V5 layout; upload it through your agency's HHAeXchange SFTP account. Sunshine Health requires files at least every two weeks.</p>
      <form id="ex" class="grid"><label>From<input type="date" name="f" value="${from}"></label><label>To<input type="date" name="t" value="${to}"></label>
        <button class="btn ghost" value="check">Check</button><button class="btn primary" value="dl">Download CSV (${rows.length} visits)</button></form>
      ${problems.length ? `<div class="banner warn"><b>${problems.length} issue(s) HHAeXchange would reject:</b><ul>${problems.map(p => `<li>${esc(p)}</li>`).join('')}</ul></div>`
        : rows.length ? '<div class="banner info">No blocking issues found.</div>' : '<p class="muted">No completed or missed visits in this range.</p>'}
      <p class="muted">Before production: get the EDI Code Table Guide from HHAeXchange EDI support, enter the codes on Settings, and complete HHAeXchange's integration testing.</p></section>`, 'EVV Export');
    $('#ex').onsubmit = async e => {
      e.preventDefault(); const f = e.target;
      if (e.submitter?.value !== 'dl') return render(f.f.value, f.t.value);
      const r = buildV5(visits.filter(v => v.date >= f.f.value && v.date <= f.t.value), clients, users, settings);
      download(`HHAX_V5_${settings.taxId || 'AGENCY'}_${f.f.value}_${f.t.value}.csv`, toCsv(r.rows, settings.header !== false));
      await db.audit(me.id, 'evv-export', `${f.f.value}..${f.t.value} rows=${r.rows.length}`);
    };
  };
  render(today(), today());
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
  if ((!me || !db.isUnlocked()) && h !== '#/login') { me = null; location.hash = '#/login'; return; }
  const [, a, b] = h.split('/');
  const isRn = me?.role === 'rn';
  if (h === '#/login') return viewLogin();
  if (a === 'visit') return viewVisit(b);
  if (a === 'rn' && !isRn) return (location.hash = '#/aide');
  if (a === 'rn') return ({ undefined: viewRnDash, visits: viewRnVisits, clients: viewRnClients, client: () => viewRnClient(h.split('/')[3]),
    aides: viewRnAides, evv: viewRnEvv, settings: viewRnSettings, audit: viewRnAudit }[b] || viewRnDash)();
  if (a === 'me') return viewMe();
  return isRn ? (location.hash = '#/rn') : viewAideHome();
}

(async function start() {
  setLang(getLang());
  await db.ensureSeeded();
  addEventListener('hashchange', route);
  if (location.hash !== '#/login') location.hash = '#/login'; else route();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
})();
