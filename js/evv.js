// EVV export for Florida's open model. Florida AHCA and the SMMC plans use
// HHAeXchange as the EVV aggregator; alternate EVV systems submit visits via
// HHAeXchange's EDI/API spec. This CSV carries every field that spec needs,
// but the final file layout MUST be mapped to HHAeXchange's current EDI
// guide before production submission.
import { SERVICES } from './data.js';
import { units } from './compliance.js';

const COLS = ['VisitID', 'ClientMedicaidID', 'ClientName', 'CaregiverEmployeeID', 'CaregiverName', 'ProcedureCode', 'ServiceType',
  'VisitDate', 'ScheduledStart', 'ScheduledEnd', 'ClockIn', 'ClockOut', 'ClockInLat', 'ClockInLng', 'ClockInMethod',
  'ClockOutLat', 'ClockOutLng', 'ClockOutMethod', 'ServiceAddress', 'Units', 'ExceptionReason', 'Payer'];

const esc = v => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

export function buildCsv(visits, clients, users) {
  const cm = Object.fromEntries(clients.map(c => [c.id, c]));
  const um = Object.fromEntries(users.map(u => [u.id, u]));
  const rows = visits.filter(v => v.status === 'completed').map(v => {
    const c = cm[v.clientId] || {}, a = um[v.aideId] || {};
    return [v.id, c.medicaidId, c.name, a.employeeId, a.name, v.serviceCode, SERVICES[v.serviceCode]?.label, v.date, v.start, v.end,
      v.clockIn?.time, v.clockOut?.time, v.clockIn?.lat, v.clockIn?.lng, v.clockIn?.method,
      v.clockOut?.lat, v.clockOut?.lng, v.clockOut?.method, c.address, units(v),
      (v.exceptions || []).join('; '), c.plan];
  });
  return [COLS, ...rows].map(r => r.map(esc).join(',')).join('\r\n');
}

export function download(name, text, type = 'text/csv') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
