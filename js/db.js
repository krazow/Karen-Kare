// Minimal IndexedDB wrapper. All app data lives on-device until a
// HIPAA-eligible backend (with a signed BAA) is chosen.
import { seed } from './data.js';

const DB_NAME = 'karen-kare';
const DB_VERSION = 1;
export const STORES = ['clients', 'users', 'visits', 'alerts', 'supervisions', 'audit', 'meta'];

let dbp;
function open() {
  if (dbp) return dbp;
  dbp = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const s of STORES) if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbp;
}

function tx(store, mode, fn) {
  return open().then(db => new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const r = fn(t.objectStore(store));
    t.oncomplete = () => resolve(r && 'result' in r ? r.result : undefined);
    t.onerror = () => reject(t.error);
  }));
}

export const all = store => tx(store, 'readonly', s => s.getAll());
export const get = (store, id) => tx(store, 'readonly', s => s.get(id));
export const put = (store, obj) => tx(store, 'readwrite', s => s.put(obj));
export const clear = store => tx(store, 'readwrite', s => s.clear());

export const uid = (p = '') => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export async function ensureSeeded(force = false) {
  const m = await get('meta', 'seeded');
  if (m && !force) return;
  for (const s of STORES) await clear(s);
  const data = seed();
  for (const [store, rows] of Object.entries(data)) for (const r of rows) await put(store, r);
  await put('meta', { id: 'seeded', at: new Date().toISOString() });
}

// Append-only audit trail (HIPAA 164.312(b) audit controls).
export async function audit(userId, action, detail = '') {
  await put('audit', { id: uid('a_'), time: new Date().toISOString(), userId, action, detail });
}
