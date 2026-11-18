// Encrypted IndexedDB store.
// Every record (except the login directory and key material in `meta`) is
// AES-GCM-256 encrypted with a random data key. That data key is wrapped
// separately for each user with a key derived from their PIN (PBKDF2-SHA256),
// so nothing is readable on the device until someone signs in, and locking the
// app drops the key from memory. PINs are never stored.
import { seed } from './data.js';

const DB_NAME = 'karen-kare';
const DB_VERSION = 2; // v2 = encrypted at rest; upgrading wipes v1 plaintext data
export const STORES = ['clients', 'users', 'visits', 'alerts', 'supervisions', 'audit', 'meta'];
const PBKDF2_ITERS = 310000;
const enc = new TextEncoder(), dec = new TextDecoder();

let dbp, dataKey = null;
function open() {
  if (dbp) return dbp;
  dbp = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      const db = req.result;
      if (e.oldVersion < 2) for (const s of [...db.objectStoreNames]) db.deleteObjectStore(s);
      for (const s of STORES) if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbp;
}
function raw(store, mode, fn) {
  return open().then(db => new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const r = fn(t.objectStore(store));
    t.oncomplete = () => resolve(r && 'result' in r ? r.result : undefined);
    t.onerror = () => reject(t.error);
  }));
}

// ---- crypto ----
const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
async function kek(pin, salt) {
  const base = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: PBKDF2_ITERS, hash: 'SHA-256' }, base,
    { name: 'AES-GCM', length: 256 }, false, ['wrapKey', 'unwrapKey']);
}
async function wrapFor(pin, key) {
  const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
  const w = await crypto.subtle.wrapKey('raw', key, await kek(pin, salt), { name: 'AES-GCM', iv });
  return { salt: b64(salt), iv: b64(iv), w: b64(w) };
}
async function encrypt(obj) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, dataKey, enc.encode(JSON.stringify(obj)));
  return { id: obj.id, iv: b64(iv), ct: b64(ct) };
}
async function decrypt(rec) {
  if (!rec) return rec;
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(rec.iv) }, dataKey, unb64(rec.ct));
  return JSON.parse(dec.decode(pt));
}
const need = () => { if (!dataKey) throw new Error('locked'); };

// ---- public API ----
export const isUnlocked = () => !!dataKey;
export const lock = () => { dataKey = null; };
export const all = async store => { need(); return Promise.all((await raw(store, 'readonly', s => s.getAll())).map(decrypt)); };
export const get = async (store, id) => { need(); return decrypt(await raw(store, 'readonly', s => s.get(id))); };
export const put = async (store, obj) => { need(); const rec = await encrypt(obj); return raw(store, 'readwrite', s => s.put(rec)); };
export const uid = (p = '') => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

// meta = plaintext, non-PHI only (login directory, wrapped keys, settings flags)
export const metaGet = id => raw('meta', 'readonly', s => s.get(id));
export const metaPut = obj => raw('meta', 'readwrite', s => s.put(obj));

export async function directory() { return (await metaGet('directory'))?.users || []; }

export async function unlock(userId, pin) {
  const k = (await metaGet('keys'))?.wrapped?.[userId];
  if (!k) return false;
  try {
    dataKey = await crypto.subtle.unwrapKey('raw', unb64(k.w), await kek(pin, unb64(k.salt)),
      { name: 'AES-GCM', iv: unb64(k.iv) }, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  } catch { dataKey = null; }
  if (!dataKey) {
    const f = (await metaGet('failedLogins')) || { id: 'failedLogins', list: [] };
    f.list.push({ userId, time: new Date().toISOString() }); await metaPut(f);
    return false;
  }
  const f = await metaGet('failedLogins');
  if (f?.list.length) { for (const x of f.list) await audit(x.userId, 'login-failed', '', x.time); await metaPut({ id: 'failedLogins', list: [] }); }
  return true;
}

export async function ensureSeeded(force = false) {
  if (!force && await metaGet('seeded')) return;
  for (const s of STORES) await raw(s, 'readwrite', st => st.clear());
  const data = seed();
  const k = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
  dataKey = k;
  const wrapped = {};
  for (const u of data.users) { wrapped[u.id] = await wrapFor(u.pin, k); delete u.pin; }
  await metaPut({ id: 'keys', wrapped });
  await metaPut({ id: 'directory', users: data.users.map(u => ({ id: u.id, name: u.name, role: u.role })) });
  for (const [store, rows] of Object.entries(data)) for (const r of rows) await put(store, r);
  await metaPut({ id: 'seeded', at: new Date().toISOString() });
  dataKey = null;
}

// Append-only audit trail (HIPAA 164.312(b) audit controls).
export async function audit(userId, action, detail = '', time = new Date().toISOString()) {
  await put('audit', { id: uid('a_'), time, userId, action, detail });
}
