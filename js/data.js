// MOCK DATA ONLY — fictional people. Never put real PHI here.
// Service codes are common Florida Medicaid HCBS codes; confirm against the
// current AHCA fee schedule / SMMC plan contract before billing.
export const SERVICES = {
  T1019: { label: 'Personal Care', unitMin: 15 },
  S5130: { label: 'Homemaker', unitMin: 15 },
  S5135: { label: 'Adult Companion', unitMin: 15 },
  S5150: { label: 'Respite (in-home)', unitMin: 15 },
};

export const TASK_LIBRARY = [
  ['bath', 'Bathing / shower assist', 'ADL'], ['dress', 'Dressing', 'ADL'], ['groom', 'Grooming / oral care', 'ADL'],
  ['toilet', 'Toileting / incontinence care', 'ADL'], ['transfer', 'Transfer / mobility assist', 'ADL'],
  ['ambulate', 'Ambulation with walker', 'ADL'], ['feed', 'Meal prep & feeding assist', 'ADL'],
  ['remind', 'Medication reminder (self-administered)', 'Health'], ['vitals', 'Observe & report skin / condition', 'Health'],
  ['laundry', 'Laundry', 'IADL'], ['housekeep', 'Light housekeeping', 'IADL'], ['errand', 'Errands / shopping', 'IADL'],
  ['companion', 'Companionship / supervision', 'IADL'],
].map(([id, label, cat]) => ({ id, label, cat }));

const day = (offset) => { const d = new Date(); d.setDate(d.getDate() + offset); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const at = (hhmm) => `${day(0)}T${hhmm}:00`;

export function seed() {
  const users = [
    { id: 'u_aide1', role: 'aide', name: 'Maria Lopez', pin: '1111', employeeId: 'A-1042', lang: 'en',
      credentials: [
        { type: 'HHA 40-hr training (F.S. 400.497)', issued: '2023-03-01', expires: null },
        { type: 'Level 2 background screening', issued: day(-1700), expires: day(125) },
        { type: 'CPR / First Aid', issued: day(-700), expires: day(30) },
        { type: 'HIV/AIDS in-service', issued: day(-300), expires: day(65) },
      ] },
    { id: 'u_aide2', role: 'aide', name: 'Jean-Pierre Baptiste', pin: '2222', employeeId: 'A-1077', lang: 'ht',
      credentials: [
        { type: 'CNA certification (FL)', issued: '2022-06-10', expires: day(200) },
        { type: 'Level 2 background screening', issued: day(-400), expires: day(1425) },
        { type: 'CPR / First Aid', issued: day(-760), expires: day(-30) },
        { type: 'Medication validation (59A-8.0097)', issued: day(-200), expires: day(165) },
      ] },
    { id: 'u_rn1', role: 'rn', name: 'Karen Whitfield, RN', pin: '9999', employeeId: 'N-0007', credentials: [] },
  ];

  const clients = [
    { id: 'c1', name: 'Dorothy Jenkins', medicaidId: '9100000001', dob: '1938-04-12', plan: 'SMMC LTC — Sunshine Health',
      address: '1200 W Main St, Leesburg, FL 34748', lat: 28.8108, lng: -81.8790, phone: '352-555-0101',
      emergency: 'Robert Jenkins (son) 352-555-0144', services: ['T1019', 'S5130'],
      carePlan: { tasks: ['bath', 'dress', 'transfer', 'remind', 'feed', 'housekeep', 'vitals'],
        instructions: 'Uses walker. Fall risk — stand-by assist for all transfers. Diabetic diet; report any foot wounds.',
        updatedBy: 'u_rn1', updatedAt: day(-20) },
      supervisionIntervalDays: 60, lastSupervision: day(-52) },
    { id: 'c2', name: 'Harold Brooks', medicaidId: '9100000002', dob: '1945-09-30', plan: 'SMMC LTC — Humana Healthy Horizons',
      address: '455 N Orange Ave, Orlando, FL 32801', lat: 28.5468, lng: -81.3790, phone: '407-555-0122',
      emergency: 'Linda Brooks (wife) 407-555-0199', services: ['T1019'],
      carePlan: { tasks: ['bath', 'groom', 'toilet', 'ambulate', 'laundry', 'vitals'],
        instructions: 'Hard of hearing — face client when speaking. Report shortness of breath to RN immediately.',
        updatedBy: 'u_rn1', updatedAt: day(-40) },
      supervisionIntervalDays: 60, lastSupervision: day(-63) },
    { id: 'c3', name: 'Rosa Martinez', medicaidId: '9100000003', dob: '1950-01-18', plan: 'Medicaid Fee-for-Service',
      address: '88 SW 8th St, Miami, FL 33130', lat: 25.7656, lng: -80.1951, phone: '305-555-0177',
      emergency: 'Ana Martinez (daughter) 305-555-0188', services: ['S5135', 'S5130'],
      carePlan: { tasks: ['companion', 'errand', 'housekeep', 'remind'],
        instructions: 'Spanish speaking. Early memory loss — redirect gently. Lock door when leaving.',
        updatedBy: 'u_rn1', updatedAt: day(-5) },
      supervisionIntervalDays: 60, lastSupervision: day(-10) },
  ];

  const visits = [
    { id: 'v1', clientId: 'c1', aideId: 'u_aide1', date: day(0), start: at('08:00'), end: at('10:00'), serviceCode: 'T1019', status: 'scheduled' },
    { id: 'v2', clientId: 'c2', aideId: 'u_aide1', date: day(0), start: at('11:00'), end: at('13:00'), serviceCode: 'T1019', status: 'scheduled' },
    { id: 'v3', clientId: 'c3', aideId: 'u_aide1', date: day(0), start: at('15:00'), end: at('17:00'), serviceCode: 'S5135', status: 'scheduled' },
    { id: 'v4', clientId: 'c2', aideId: 'u_aide2', date: day(0), start: at('18:00'), end: at('20:00'), serviceCode: 'T1019', status: 'scheduled' },
  ];

  const supervisions = [
    { id: 's1', clientId: 'c1', rnId: 'u_rn1', aideId: 'u_aide1', date: day(-52), aidePresent: true, notes: 'Aide following plan of care. Client satisfied.' },
    { id: 's2', clientId: 'c3', rnId: 'u_rn1', aideId: 'u_aide1', date: day(-10), aidePresent: false, notes: 'Care plan reviewed with daughter.' },
  ];

  return { users, clients, visits, supervisions, alerts: [], audit: [] };
}
