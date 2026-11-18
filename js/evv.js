// HHAeXchange "Homecare V5 Visit Import" flat file (96 columns, CSV).
// Florida AHCA and the SMMC plans aggregate EVV in HHAeXchange; an alternate
// EVV system like Karen Kare submits visits in this layout over SFTP/API.
// Layout source: knowledge.hhaexchange.com → EDI → Homecare V5 Flat File Import Layout.
// Payer IDs and reason/action codes come from HHAeXchange's EDI Code Table Guide
// (request it from HHAeXchange EDI support) and are entered on the Settings page.

export const V5_COLUMNS = ['Agency Tax ID', 'Office NPI', 'Payer ID', 'Medicaid Number', 'Member First Name', 'Member Last Name', 'Member ID',
  'Caregiver Code', 'Caregiver Registry ID', 'Caregiver License Number', 'Caregiver First Name', 'Caregiver Last Name', 'Caregiver Gender',
  'Caregiver Date of Birth', 'Caregiver SSN', 'Caregiver Email', 'Schedule ID', 'Visit ID', 'Procedure Code', 'Diagnosis Code',
  'Schedule Start Time', 'Schedule End Time', 'Visit Start Time', 'Visit End Time', 'EVV Start Time', 'EVV End Time',
  'Clock-In Service Location Address Line 1', 'Clock-In Service Location Address Line 2', 'Clock-In Service Location City',
  'Clock-In Service Location State', 'Clock-In Service Location Zip Code', 'Clock-In Service Location Type',
  'Clock-Out Service Location Address Line 1', 'Clock-Out Service Location Address Line 2', 'Clock-Out Service Location City',
  'Clock-Out Service Location State', 'Clock-Out Service Location Zip Code', 'Clock-Out Service Location Type', 'Duties',
  'Clock-In Phone Number', 'Clock-In Latitude', 'Clock-In Longitude', 'Clock-In EVV Other Info', 'Clock-Out Phone Number',
  'Clock-Out Latitude', 'Clock-Out Longitude', 'Clock-Out EVV Other Info', 'Invoice Number', 'Visit Edit Reason Code',
  'Visit Edit Action Taken', 'Visit Edit Made By', 'Notes', 'Is Deletion', 'Invoice Line Item ID', 'Total Billed Amount', 'Units Billed',
  'Billed Rate', 'Submission Type', 'TRN Number', 'Enable Secondary Billing', 'Other Subscriber ID', 'Primary Payer ID',
  'Primary Payer Name', 'Relationship to Insured', 'Primary Payer Policy or Group Number', 'Primary Payer Program Name', 'Plan Type',
  'Total Paid Amount', 'Total Paid Units', 'Paid Date', 'Deductible', 'Coinsurance', 'Copay', 'Contracted Adjustments',
  'Not Medically Necessary', 'Non-Covered Charges', 'Max Benefit Exhausted', 'Missed Visit', 'Missed Visit Reason Code',
  'Missed Visit Action Taken Code', 'Missed Visit Notes', 'Travel Time Request Hours', 'Travel Time Comments', 'Cancel Travel Time Request',
  'Timesheet Required', 'Timesheet Approved', 'User Field 1', 'User Field 2', 'User Field 3', 'User Field 4', 'User Field 5',
  'User Field 6', 'User Field 7', 'User Field 8', 'User Field 9', 'User Field 10'];
const COL = Object.fromEntries(V5_COLUMNS.map((c, i) => [c, i]));

const pad = n => String(n).padStart(2, '0');
// YYYY-MM-DD HH:MM, 24-hour, agency local time
export function v5Time(iso) { if (!iso) return ''; const d = new Date(iso); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`; }
const split = name => { const p = String(name || '').replace(/,.*$/, '').trim().split(/\s+/); return [p.slice(0, -1).join(' ') || p[0], p.length > 1 ? p.at(-1) : '']; };
const ssn = last5 => (/^\d{5}$/.test(last5 || '') ? `000-0${last5[0]}-${last5.slice(1)}` : '');
const clip = (s, n) => String(s ?? '').replace(/[\r\n]+/g, ' ').slice(0, n);
const esc = v => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

// Returns { rows, problems } — problems are per-visit issues HHAeXchange would reject.
export function buildV5(visits, clients, users, settings) {
  const cm = Object.fromEntries(clients.map(c => [c.id, c])), um = Object.fromEntries(users.map(u => [u.id, u]));
  const rows = [], problems = [];
  for (const v of visits.filter(x => x.status === 'completed' || x.status === 'missed')) {
    const c = cm[v.clientId], a = um[v.aideId], r = new Array(V5_COLUMNS.length).fill('');
    const set = (k, val) => { r[COL[k]] = val ?? ''; };
    const issue = m => problems.push(`${v.date} ${c?.name || v.clientId} (${v.id}): ${m}`);
    const [mf, ml] = split(c.name), [cf, cl] = split(a.name);
    const payer = settings.payers?.[c.plan] || '';
    set('Agency Tax ID', settings.taxId); set('Office NPI', settings.npi); set('Payer ID', payer);
    set('Medicaid Number', c.medicaidId); set('Member First Name', mf); set('Member Last Name', ml); set('Member ID', c.id);
    set('Caregiver Code', a.employeeId); set('Caregiver First Name', cf); set('Caregiver Last Name', cl); set('Caregiver Gender', a.gender || 'U');
    set('Schedule ID', v.id); set('Visit ID', v.id); set('Procedure Code', v.serviceCode);
    set('Schedule Start Time', v5Time(v.start)); set('Schedule End Time', v5Time(v.end)); set('Is Deletion', 'N');
    if (!settings.taxId) issue('Agency Tax ID not set (Settings)');
    if (!payer) issue(`Payer ID for "${c.plan}" not set (Settings)`);

    if (v.status === 'missed') {
      set('Missed Visit', 'Y'); set('Missed Visit Reason Code', settings.missedReasonCode); set('Missed Visit Action Taken Code', settings.missedActionCode);
      set('Missed Visit Notes', clip(v.missedReason, 1000));
      if (!settings.missedReasonCode || !settings.missedActionCode) issue('Missed-visit reason/action codes not set (Settings)');
    } else {
      set('Missed Visit', 'N');
      set('Caregiver License Number', a.licenseNumber); set('Caregiver SSN', ssn(a.ssnLast5)); set('Diagnosis Code', (c.dx || []).join('|'));
      set('Visit Start Time', v5Time(v.clockIn.time)); set('Visit End Time', v5Time(v.clockOut.time));
      set('EVV Start Time', v5Time(v.clockIn.time)); set('EVV End Time', v5Time(v.clockOut.time));
      const community = (v.exceptions || []).some(e => /community/i.test(e)) ? 'Community' : 'Home';
      for (const side of ['In', 'Out']) {
        set(`Clock-${side} Service Location Address Line 1`, c.address.line1); set(`Clock-${side} Service Location City`, c.address.city);
        set(`Clock-${side} Service Location State`, c.address.state); set(`Clock-${side} Service Location Zip Code`, c.address.zip);
        set(`Clock-${side} Service Location Type`, community);
        const p = side === 'In' ? v.clockIn : v.clockOut;
        if (p.method === 'gps') { set(`Clock-${side} Latitude`, p.lat); set(`Clock-${side} Longitude`, p.lng); }
      }
      set('User Field 1', v.clockIn.method === 'gps' ? 'Mobile' : 'Manual'); set('User Field 2', v.clockOut.method === 'gps' ? 'Mobile' : 'Manual');
      // duties: task ids, '*' prefix = attempted but refused (HHAX duty codes are payer-specific; map before go-live)
      if (settings.dutyCodes) set('Duties', Object.entries(v.tasks || {}).map(([k, s]) => (s.status === 'done' ? '' : '*') + (settings.dutyCodes[k] || k)).join('|'));
      set('Notes', clip(v.note, 1000));
      if (v.clockIn.method !== 'gps' || v.clockOut.method !== 'gps') {
        set('Visit Edit Reason Code', settings.editReasonCode); set('Visit Edit Action Taken', settings.editActionCode); set('Visit Edit Made By', a.name);
        if (!settings.editReasonCode || !settings.editActionCode) issue('Manual clock-in/out needs Visit Edit reason/action codes (Settings)');
      }
      if (!a.licenseNumber) issue(`Caregiver license number missing (${a.name})`);
      if (!ssn(a.ssnLast5)) issue(`Caregiver SSN last 5 missing (${a.name})`);
      if (!c.dx?.length) issue('Client diagnosis code missing');
    }
    rows.push(r);
  }
  return { rows, problems };
}

export function toCsv(rows, header = true) {
  return [...(header ? [V5_COLUMNS] : []), ...rows].map(r => r.map(esc).join(',')).join('\r\n');
}

export function download(name, text, type = 'text/csv') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
