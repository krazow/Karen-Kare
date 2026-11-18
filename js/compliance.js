// Compliance rules. Each rule cites its source so auditors can trace it.
import { SERVICES } from './data.js';

export const GEOFENCE_METERS = 400; // flag clock-ins farther than ~1/4 mile from the service address

export const EXCEPTION_REASONS = [
  'Client not home', 'Client refused service', 'Caregiver forgot to clock in/out', 'GPS unavailable / poor signal',
  'Service in community (not home)', 'Device failure', 'Client hospitalized', 'Emergency evacuation',
];
export const TASK_SKIP_REASONS = ['Client refused', 'Not needed today', 'Client unavailable', 'Unsafe to perform', 'Supplies unavailable'];

export function daysBetween(a, b = new Date()) {
  return Math.floor((new Date(b) - new Date(a)) / 86400000);
}

export function metersBetween(lat1, lng1, lat2, lng2) {
  const R = 6371000, r = x => x * Math.PI / 180;
  const dLat = r(lat2 - lat1), dLng = r(lng2 - lng1);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

// 21st Century Cures Act §12006 — the six EVV data elements.
export function evvElements(v, client, aide) {
  return [
    ['Type of service', !!v.serviceCode && SERVICES[v.serviceCode]?.label],
    ['Individual receiving service', client && `${client.name} (${client.medicaidId})`],
    ['Date of service', v.date],
    ['Location of service', v.clockIn && client && `${client.address.line1}, ${client.address.city} · ${v.clockIn.method === 'gps' ? `GPS ${v.clockIn.lat.toFixed(5)}, ${v.clockIn.lng.toFixed(5)}` : 'manual'}`],
    ['Individual providing service', aide && `${aide.name} (${aide.employeeId})`],
    ['Begin / end time', v.clockIn && v.clockOut && `${fmtTime(v.clockIn.time)} – ${fmtTime(v.clockOut.time)}`],
  ];
}
export const evvComplete = (v, c, a) => evvElements(v, c, a).every(([, val]) => !!val);

export function units(v) {
  if (!v.clockIn || !v.clockOut) return 0;
  const min = (new Date(v.clockOut.time) - new Date(v.clockIn.time)) / 60000;
  return Math.floor(min / (SERVICES[v.serviceCode]?.unitMin || 15));
}

// RN supervisory visit due (59A-8.0095 / 42 CFR 484.80(h)(2): at least every 60 days for aide-only care).
export function supervisionStatus(client) {
  const since = client.lastSupervision ? daysBetween(client.lastSupervision) : Infinity;
  const left = client.supervisionIntervalDays - since;
  return { since, left, state: left < 0 ? 'overdue' : left <= 14 ? 'due-soon' : 'ok' };
}

export function credentialStatus(c) {
  if (!c.expires) return { state: 'ok', left: Infinity };
  const left = -daysBetween(c.expires);
  return { left, state: left < 0 ? 'expired' : left <= 60 ? 'due-soon' : 'ok' };
}

export function fmtTime(iso) { return iso ? new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '—'; }
export function fmtDate(iso) { return iso ? new Date(iso.length === 10 ? iso + 'T12:00' : iso).toLocaleDateString() : '—'; }
