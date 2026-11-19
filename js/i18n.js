// Aide-facing translations. Keys are the English text, so any missing string
// falls back to English. Spanish and Haitian Creole (Kreyòl) were machine
// drafted — have a native speaker who knows home care review them before launch.
export const LANGS = { en: 'English', es: 'Español', ht: 'Kreyòl' };

const es = {
  'Authorized users only. This app holds confidential health information protected by HIPAA and Florida law. All activity is logged.': 'Solo usuarios autorizados. Esta aplicación contiene información de salud confidencial protegida por HIPAA y la ley de Florida. Toda actividad queda registrada.',
  'Too many wrong PINs. Try again in {n} min.': 'Demasiados PIN incorrectos. Intente de nuevo en {n} min.',
  'Suspected abuse, neglect or exploitation': 'Sospecha de abuso, negligencia o explotación',
  'Report to the Florida Abuse Hotline now': 'Reporte ahora a la Línea de Abuso de Florida',
  'Florida law requires you to report suspected abuse, neglect or exploitation yourself, right away. Telling the nurse is not enough.': 'La ley de Florida le exige reportar usted mismo, de inmediato, cualquier sospecha de abuso, negligencia o explotación. Avisar a la enfermera no es suficiente.',
  'Report online': 'Reportar en línea', 'Call 911 if the person is in immediate danger.': 'Llame al 911 si la persona está en peligro inmediato.',
  'My Day': 'Mi día', 'Hi': 'Hola', "Today's visits": 'Visitas de hoy', 'No visits scheduled today.': 'No hay visitas programadas hoy.',
  'My credentials': 'Mis credenciales', 'Tell your supervisor.': 'Avise a su supervisor.', 'EXPIRED': 'VENCIDO', 'expires in {n} days': 'vence en {n} días',
  'Scheduled': 'Programada', 'In progress': 'En curso', 'Done': 'Terminada', 'Late': 'Tarde', 'Missed': 'Perdida', 'to': 'a',
  'Care instructions from RN': 'Instrucciones de la enfermera', 'Emergency': 'Emergencia', 'Clock In': 'Marcar entrada', 'Clock Out': 'Marcar salida',
  'Getting location…': 'Obteniendo ubicación…', 'Your location is recorded at clock-in and clock-out (Medicaid EVV).': 'Su ubicación se registra al marcar entrada y salida (EVV de Medicaid).',
  'Clocked in at {t}': 'Entrada marcada a las {t}', 'Care plan tasks': 'Tareas del plan de cuidado', '✓ Done': '✓ Hecho', '✗ Not done': '✗ No hecho',
  '⚠️ Report change in condition': '⚠️ Reportar cambio en la condición', 'Visit note': 'Nota de la visita',
  'What happened during the visit? Anything the nurse should know?': '¿Qué pasó durante la visita? ¿Algo que la enfermera deba saber?',
  'Client signature': 'Firma del cliente', 'Clear': 'Borrar', 'Client unable to sign': 'El cliente no puede firmar',
  'I attest the services above were provided as documented.': 'Certifico que los servicios anteriores se prestaron según lo documentado.',
  'Mark every task first ({n} left)': 'Marque todas las tareas primero (faltan {n})', 'Add a visit note': 'Agregue una nota de la visita',
  'Get client signature or tick "unable to sign"': 'Obtenga la firma del cliente o marque "no puede firmar"', 'Tick the attestation box': 'Marque la casilla de certificación',
  'Why was this not done?': '¿Por qué no se hizo?', 'Why could the client not sign?': '¿Por qué el cliente no pudo firmar?',
  'Location unavailable — reason': 'Ubicación no disponible — motivo', "You are {mi} mi from the client's address — reason": 'Está a {mi} millas de la dirección del cliente — motivo',
  'Cancel': 'Cancelar', 'Save': 'Guardar', 'Change in condition': 'Cambio en la condición',
  'Your supervising nurse is alerted right away. Call 911 for emergencies.': 'Se alertará a su enfermera supervisora de inmediato. Llame al 911 en emergencias.',
  'Describe what you saw': 'Describa lo que observó', 'Send to nurse': 'Enviar a la enfermera', 'Nurse alerted': 'Enfermera alertada',
  'Clocked in': 'Entrada marcada', 'Visit complete': 'Visita completada', 'EVV record': 'Registro EVV', '6/6 complete': '6/6 completo',
  'incomplete': 'incompleto', 'missing': 'falta', 'Billable units': 'Unidades facturables', 'Exceptions': 'Excepciones', 'None': 'Ninguna',
  'Tasks': 'Tareas', 'Note': 'Nota', 'Aide attestation': 'Certificación del asistente', 'Yes': 'Sí', 'No': 'No',
  'Sign in': 'Iniciar sesión', 'Select your name and enter your PIN.': 'Seleccione su nombre e ingrese su PIN.', 'Wrong PIN': 'PIN incorrecto',
  'Online': 'En línea', 'Offline — saving on device': 'Sin conexión — guardando en el dispositivo', 'Visit in progress': 'Visita en curso',
  'Visit': 'Visita', 'Visit record': 'Registro de visita', 'Not started.': 'No ha comenzado.', 'No expiry': 'Sin vencimiento', 'Current': 'Vigente',
  'Home Care Aide': 'Asistente de cuidado en el hogar', 'RN Supervisor': 'Enfermera supervisora', 'Unlocking…': 'Desbloqueando…',
  'Locked after 5 minutes of inactivity': 'Bloqueado tras 5 minutos de inactividad',
  // services
  'Personal Care': 'Cuidado personal', 'Homemaker': 'Ama de casa', 'Adult Companion': 'Compañía para adultos', 'Attendant Care': 'Asistente de cuidado',
  // tasks
  'Bathing / shower assist': 'Ayuda con baño / ducha', 'Dressing': 'Vestir', 'Grooming / oral care': 'Aseo personal / higiene bucal',
  'Toileting / incontinence care': 'Uso del baño / cuidado de incontinencia', 'Transfer / mobility assist': 'Ayuda con traslados / movilidad',
  'Ambulation with walker': 'Caminar con andador', 'Meal prep & feeding assist': 'Preparar comida y ayudar a comer',
  'Medication reminder (self-administered)': 'Recordatorio de medicamentos (autoadministrados)', 'Observe & report skin / condition': 'Observar y reportar piel / condición',
  'Laundry': 'Lavandería', 'Light housekeeping': 'Limpieza ligera', 'Errands / shopping': 'Mandados / compras', 'Companionship / supervision': 'Compañía / supervisión',
  // reasons
  'Client not home': 'El cliente no estaba en casa', 'Client refused service': 'El cliente rechazó el servicio',
  'Caregiver forgot to clock in/out': 'Olvidé marcar entrada/salida', 'GPS unavailable / poor signal': 'GPS no disponible / señal débil',
  'Service in community (not home)': 'Servicio en la comunidad (no en casa)', 'Device failure': 'Falla del dispositivo',
  'Client hospitalized': 'Cliente hospitalizado', 'Emergency evacuation': 'Evacuación de emergencia',
  'Client refused': 'El cliente se negó', 'Not needed today': 'No fue necesario hoy', 'Client unavailable': 'Cliente no disponible',
  'Unsafe to perform': 'No es seguro realizarlo', 'Supplies unavailable': 'No hay materiales',
  'Fall': 'Caída', 'New pain': 'Dolor nuevo', 'Skin / wound change': 'Cambio en piel / herida', 'Breathing problem': 'Problema para respirar',
  'Confusion / behavior change': 'Confusión / cambio de conducta', 'Not eating / drinking': 'No come / no bebe', 'Medication concern': 'Problema con medicamentos', 'Other': 'Otro',
  'Physical limitation': 'Limitación física', 'Cognitive impairment': 'Deterioro cognitivo', 'Client asleep': 'El cliente está dormido',
  'Representative not present': 'El representante no está presente',
};

const ht = {
  'Authorized users only. This app holds confidential health information protected by HIPAA and Florida law. All activity is logged.': 'Se sèlman moun ki gen otorizasyon. Aplikasyon sa a gen enfòmasyon sante konfidansyèl ke HIPAA ak lalwa Florid pwoteje. Tout aktivite anrejistre.',
  'Too many wrong PINs. Try again in {n} min.': 'Twòp PIN ki pa bon. Eseye ankò nan {n} minit.',
  'Suspected abuse, neglect or exploitation': 'Sispèk abi, neglijans oswa eksplwatasyon',
  'Report to the Florida Abuse Hotline now': 'Rapòte bay Liy Abi Florid la kounye a',
  'Florida law requires you to report suspected abuse, neglect or exploitation yourself, right away. Telling the nurse is not enough.': 'Lalwa Florid mande pou ou menm rapòte touswit nenpòt sispèk abi, neglijans oswa eksplwatasyon. Di enfimyè a sèlman pa ase.',
  'Report online': 'Rapòte sou entènèt', 'Call 911 if the person is in immediate danger.': 'Rele 911 si moun nan an danje touswit.',
  'My Day': 'Jounen mwen', 'Hi': 'Bonjou', "Today's visits": 'Vizit jodi a', 'No visits scheduled today.': 'Pa gen vizit pwograme jodi a.',
  'My credentials': 'Sètifika mwen yo', 'Tell your supervisor.': 'Di sipèvizè w la.', 'EXPIRED': 'EKSPIRE', 'expires in {n} days': 'ap ekspire nan {n} jou',
  'Scheduled': 'Pwograme', 'In progress': 'Ap fèt', 'Done': 'Fini', 'Late': 'An reta', 'Missed': 'Rate', 'to': 'jiska',
  'Care instructions from RN': 'Enstriksyon swen enfimyè a', 'Emergency': 'Ijans', 'Clock In': 'Antre (Clock In)', 'Clock Out': 'Soti (Clock Out)',
  'Getting location…': 'N ap chèche pozisyon…', 'Your location is recorded at clock-in and clock-out (Medicaid EVV).': 'Yo anrejistre pozisyon w lè w antre ak lè w soti (EVV Medicaid).',
  'Clocked in at {t}': 'Ou antre a {t}', 'Care plan tasks': 'Travay plan swen an', '✓ Done': '✓ Fèt', '✗ Not done': '✗ Pa fèt',
  '⚠️ Report change in condition': '⚠️ Rapòte chanjman nan kondisyon', 'Visit note': 'Nòt vizit',
  'What happened during the visit? Anything the nurse should know?': 'Kisa ki te pase pandan vizit la? Èske gen yon bagay enfimyè a ta dwe konnen?',
  'Client signature': 'Siyati kliyan an', 'Clear': 'Efase', 'Client unable to sign': 'Kliyan an pa ka siyen',
  'I attest the services above were provided as documented.': 'Mwen sètifye sèvis ki anwo yo te bay jan yo ekri l la.',
  'Mark every task first ({n} left)': 'Make chak travay anvan (rete {n})', 'Add a visit note': 'Ajoute yon nòt vizit',
  'Get client signature or tick "unable to sign"': 'Pran siyati kliyan an oswa make "pa ka siyen"', 'Tick the attestation box': 'Make kaz sètifikasyon an',
  'Why was this not done?': 'Poukisa sa pa t fèt?', 'Why could the client not sign?': 'Poukisa kliyan an pa t ka siyen?',
  'Location unavailable — reason': 'Pozisyon pa disponib — rezon', "You are {mi} mi from the client's address — reason": 'Ou a {mi} mil de adrès kliyan an — rezon',
  'Cancel': 'Anile', 'Save': 'Anrejistre', 'Change in condition': 'Chanjman nan kondisyon',
  'Your supervising nurse is alerted right away. Call 911 for emergencies.': 'Enfimyè sipèvizè w la ap resevwa yon alèt touswit. Rele 911 pou ijans.',
  'Describe what you saw': 'Dekri sa w te wè', 'Send to nurse': 'Voye bay enfimyè a', 'Nurse alerted': 'Enfimyè a resevwa alèt la',
  'Clocked in': 'Ou antre', 'Visit complete': 'Vizit la fini', 'EVV record': 'Dosye EVV', '6/6 complete': '6/6 konplè',
  'incomplete': 'pa konplè', 'missing': 'manke', 'Billable units': 'Inite pou fakti', 'Exceptions': 'Eksepsyon', 'None': 'Okenn',
  'Tasks': 'Travay', 'Note': 'Nòt', 'Aide attestation': 'Sètifikasyon èd la', 'Yes': 'Wi', 'No': 'Non',
  'Sign in': 'Konekte', 'Select your name and enter your PIN.': 'Chwazi non w epi antre PIN ou.', 'Wrong PIN': 'PIN pa bon',
  'Online': 'Sou entènèt', 'Offline — saving on device': 'San entènèt — n ap anrejistre sou aparèy la', 'Visit in progress': 'Vizit ap fèt',
  'Visit': 'Vizit', 'Visit record': 'Dosye vizit', 'Not started.': 'Poko kòmanse.', 'No expiry': 'Pa ekspire', 'Current': 'Ajou',
  'Home Care Aide': 'Èd swen lakay', 'RN Supervisor': 'Enfimyè sipèvizè', 'Unlocking…': 'N ap debloke…',
  'Locked after 5 minutes of inactivity': 'Bloke apre 5 minit san aktivite',
  'Personal Care': 'Swen pèsonèl', 'Homemaker': 'Travay kay', 'Adult Companion': 'Konpayon pou granmoun', 'Attendant Care': 'Swen asistan',
  'Bathing / shower assist': 'Ede benyen / douch', 'Dressing': 'Abiye', 'Grooming / oral care': 'Swen kò / swen bouch',
  'Toileting / incontinence care': 'Ale twalèt / swen enkontinans', 'Transfer / mobility assist': 'Ede deplase / transfè',
  'Ambulation with walker': 'Mache ak walker', 'Meal prep & feeding assist': 'Prepare manje & ede manje',
  'Medication reminder (self-administered)': 'Raple pran medikaman (pou kont li)', 'Observe & report skin / condition': 'Obsève & rapòte po / kondisyon',
  'Laundry': 'Lave rad', 'Light housekeeping': 'Ti travay kay', 'Errands / shopping': 'Fè komisyon / achte', 'Companionship / supervision': 'Konpayi / siveyans',
  'Client not home': 'Kliyan an pa lakay', 'Client refused service': 'Kliyan an refize sèvis la',
  'Caregiver forgot to clock in/out': 'Mwen bliye antre/soti', 'GPS unavailable / poor signal': 'GPS pa mache / siyal fèb',
  'Service in community (not home)': 'Sèvis nan kominote a (pa lakay)', 'Device failure': 'Aparèy la an pàn',
  'Client hospitalized': 'Kliyan an lopital', 'Emergency evacuation': 'Evakyasyon ijans',
  'Client refused': 'Kliyan an refize', 'Not needed today': 'Pa t nesesè jodi a', 'Client unavailable': 'Kliyan an pa t disponib',
  'Unsafe to perform': 'Pa an sekirite pou fè l', 'Supplies unavailable': 'Pa gen materyèl',
  'Fall': 'Tonbe', 'New pain': 'Nouvo doulè', 'Skin / wound change': 'Chanjman nan po / blesi', 'Breathing problem': 'Pwoblèm pou respire',
  'Confusion / behavior change': 'Konfizyon / chanjman konpòtman', 'Not eating / drinking': 'Pa manje / pa bwè', 'Medication concern': 'Pwoblèm medikaman', 'Other': 'Lòt',
  'Physical limitation': 'Limit fizik', 'Cognitive impairment': 'Pwoblèm memwa / konprann', 'Client asleep': 'Kliyan an ap dòmi',
  'Representative not present': 'Reprezantan an pa la',
};

const DICTS = { es, ht };
let lang = (() => { try { return localStorage.getItem('kk_lang') || 'en'; } catch { return 'en'; } })();
export const getLang = () => lang;
export function setLang(l) { lang = LANGS[l] ? l : 'en'; try { localStorage.setItem('kk_lang', lang); } catch {} document.documentElement.lang = lang; }
export function t(s, vars) {
  let out = (DICTS[lang] && DICTS[lang][s]) || s;
  if (vars) for (const [k, v] of Object.entries(vars)) out = out.replace(`{${k}}`, v);
  return out;
}
export const dictionaries = DICTS;
