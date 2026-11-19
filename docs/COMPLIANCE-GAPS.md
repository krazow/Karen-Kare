# Karen Kare — Legal & HIPAA Gap Analysis

_Reviewed 2026-11-18 against v0.2.0. Not legal advice: have a Florida health-care attorney and a HIPAA security professional confirm before real patient data is used._

## Bottom line

**Software on its own can't be "HIPAA compliant."** HIPAA applies to the home care agency (the covered entity) and to any vendor that stores or handles its patient data (a business associate). The app supplies the *technical* safeguards. The agency and the vendor must also have the *administrative* and *physical* safeguards: risk analysis, policies, training, BAAs, device control, breach response.

Today Karen Kare is a well-protected **prototype**. It must not hold real patient data until the five blockers below are closed.

### Blockers before any real patient data
| # | Gap | Rule | Why it blocks |
|---|---|---|---|
| 1 | **Data lives only on the phone.** No server, no backup, no recovery. | HIPAA 164.308(a)(7) contingency plan / data backup; Florida 59A-8.022 requires "a process for reconstruction of the records in the event of a system breakdown"; record retention (below) | A lost or broken phone loses visit records the agency must keep for years. |
| 2 | **No signed BAA / hosting.** | HIPAA 164.308(b), 164.502(e) | Any server, sync, backup, email or push service that touches PHI needs a BAA. Backend choice is still deferred. |
| 3 | **Sign-in is a 4-digit PIN only, with no MFA.** | HIPAA 164.312(d) person authentication; MFA is in the proposed Security Rule update | A copied device could be brute-forced offline. Needs server-backed accounts + MFA (or device biometrics/WebAuthn) and 6+ digit PINs. |
| 4 | **Clock-in time comes from the phone's clock.** | Cures Act §12006 EVV (time begins/ends); Medicaid program integrity | An aide can change the phone's time. EVV times need a trusted server timestamp (or a signed time source) when syncing. |
| 5 | **No agency HIPAA program yet.** | HIPAA 164.308(a)(1) risk analysis, (a)(2) security official, (a)(5) workforce training, 164.316 written policies kept 6 years | Agency-side; the app can't do this. |

## Status of each requirement

Legend: ✅ in the app · 🔧 fixed in this pull request · ⚠️ needs the backend / future build · 🏢 agency responsibility (outside the app)

### HIPAA Security Rule (45 CFR 164 Subpart C) — the current rule
The 2025 proposal to modernize the Security Rule (mandatory MFA and encryption, yearly risk analysis, asset inventory) is **still not final**: HHS pushed final action back to 2027. The app is built toward it anyway.

| Safeguard | Status |
|---|---|
| Unique user IDs — 164.312(a)(2)(i) | ✅ one account per person, no shared logins |
| Automatic logoff — 164.312(a)(2)(iii) | ✅ 5 min idle or 5 min in background |
| Encryption at rest — 164.312(a)(2)(iv) | ✅ AES-GCM-256, key wrapped per user (PBKDF2 310k), PINs never stored |
| Encryption in transit — 164.312(e) | ⚠️ HTTPS for the app; there's no sync yet. Sync must be TLS 1.2+ to a BAA host. |
| Audit controls — 164.312(b) | ✅ every action logged · 🔧 **now hash-chained so edits or deletions are detected** (Audit tab shows "intact") |
| Integrity — 164.312(c) | ✅ completed visits can't be edited · 🔧 audit chain · ⚠️ server copy for tamper evidence |
| Person authentication — 164.312(d) | ✅ PIN · 🔧 **lockout after 5 wrong PINs (5 min, doubling)** · ⚠️ MFA |
| Log-in monitoring — 164.308(a)(5)(ii)(C) | ✅ failed sign-ins audited · 🔧 lockout |
| Emergency access procedure — 164.312(a)(2)(ii) | ⚠️ needs an admin "break-glass" account on the server |
| Contingency / backup — 164.308(a)(7) | ⚠️ **Blocker 1** |
| Device & media controls — 164.310(d) | 🏢 agency-managed phones (MDM), remote wipe, disposal policy · 🔧 export now warns the file contains PHI |
| Risk analysis, security official, training, sanctions — 164.308(a)(1)–(5) | 🏢 |
| Business associate agreements — 164.308(b) | 🏢 / ⚠️ **Blocker 2**. Note: HHAeXchange receives PHI from the agency for Medicaid EVV. Confirm with HHAeXchange/AHCA what agreement covers that flow. |

### HIPAA Privacy & Breach Notification
| Requirement | Status |
|---|---|
| Minimum necessary — 164.502(b) | ✅ aides see only their own visits · 🔧 aides now see only the last 4 digits of the Medicaid ID |
| Notice of Privacy Practices, patient access/amendment rights — 164.520, .524, .526 | 🏢 (⚠️ a records export for a patient's own request would help) |
| Breach notification — 164.400–414 (60 days; HHS; media if 500+) | 🏢 written incident-response plan. Encrypted data whose key wasn't exposed is generally not a reportable breach. |
| Third-party links | ✅ map link sends only the address, with no name; 🏢 decide whether to allow it by policy |

### Federal Medicaid
| Requirement | Status |
|---|---|
| EVV six data elements — Cures Act §12006 | ✅ all six captured and checked · ⚠️ trusted time (Blocker 4) |
| Exclusion screening — no Medicaid payment for services by excluded individuals (42 CFR 1001.1901, 455.436) | 🔧 **monthly OIG LEIE + AHCA exclusion check tracked per aide**, with a "check done today" button and overdue alerts · 🏢 actually run the searches (AHCA's Background Screening Clearinghouse includes an OIG search) |
| Record retention | ⚠️ keep visit records **at least 6 years** (Florida Medicaid providers: 6 years; HIPAA documentation: 6 years). The app never deletes records; the server must do the same. |
| Language access — ACA §1557 | ✅ English / Spanish / Haitian Creole for aides · 🏢 professional review of the translations; taglines/notices for patients |
| Accessibility — Section 504 (WCAG 2.1 AA for apps of HHS-funded providers, including third-party apps) | Deadline extended to **May 11, 2027** (15+ employees) / **May 10, 2028** (fewer). 🔧 orientation lock removed (WCAG 1.3.4), visible keyboard focus, labels on PIN and signature, reduced-motion support · ⚠️ full WCAG 2.1 AA audit with screen readers before the deadline |

### Federal Medicare (only if the agency becomes Medicare-certified for skilled home health)
Personal care alone isn't a Medicare benefit, so these are **out of scope for the current Florida Medicaid target**. They'd be needed to bill Medicare:
OASIS assessments (484.55), skilled-care plan of care signed by a physician/allowed practitioner (484.60), RN aide supervision every **14 days** for skilled patients (484.80(h)(1)), 75-hour aide training + competency + 12 hours in-service a year (484.80(b)–(d)), and Medicare claims. The app currently tracks the 60-day aide-only supervision.

### Florida
| Requirement | Status |
|---|---|
| Licensure — Ch. 400 Part III F.S., Rule 59A-8 F.A.C. (AHCA home health agency, or nurse registry / homemaker-companion registration) | 🏢 |
| Clinical records content — 59A-8.022 (plan of care, service notes, supervisory visits, reports to physicians) and safeguards against unauthorized access | ✅ · ⚠️ reconstruction after system breakdown (Blocker 1) · ⚠️ physician/practitioner reports and case conferences not yet in the app |
| Electronic signatures in the record — 59A-8.022 | ✅ client signature + aide attestation · ⚠️ server-side signing and identity binding |
| Record retention — F.S. 400.491 and Medicaid provider rules | ⚠️ 6 years (see above) |
| Dementia (ADRD) training — F.S. 430.5025 (2022 law): basic training plus additional hours for direct-care staff | 🔧 **now tracked per aide**. Corrected: v0.2 tracked an HIV/AIDS course, which Florida now requires only for the medically-fragile-children aide program (F.S. 400.4765). |
| Aide training — 40 hours or CNA (F.S. 400.497) | ✅ tracked |
| Level 2 background screening, rescreening every 5 years — F.S. 408.809, Ch. 435 | ✅ tracked with expiry alerts |
| **Mandatory abuse reporting** — F.S. 415.1034: anyone who suspects abuse, neglect or exploitation of a vulnerable adult must report **immediately** to the central hotline | 🔧 **new "Suspected abuse, neglect or exploitation" option** alerts the nurse **and** tells the aide to call 1-800-96-ABUSE (962-2873) or report online, in all three languages |
| Breach of personal information — F.S. 501.171 (notify individuals within **30 days**; Attorney General if 500+) | 🏢 incident plan. Encrypted data is exempt unless the key was also compromised. |
| Medicaid EVV — HHAeXchange (open model) | ✅ V5 export · 🏢 EDI Code Table Guide, SFTP account, integration testing · 🔧 PHI warning before download |
| Emergency management — F.S. 400.492 (to confirm): service during declared emergencies, patient priority list | ⚠️ add patient emergency priority and evacuation notes; the app already works offline |

## What this pull request changes
1. Account lockout after 5 wrong PINs (5 min, doubling, max 24 h), with a message in the aide's language.
2. Hash-chained audit trail with an integrity check on the Audit tab.
3. Florida Abuse Hotline prompt for suspected abuse, neglect or exploitation (F.S. 415.1034).
4. Monthly exclusion-check tracking (OIG LEIE + AHCA) per aide.
5. Dementia (ADRD) training tracked; HIV/AIDS item removed for regular aides.
6. Aides see only the last 4 digits of Medicaid IDs (minimum necessary).
7. PHI warning before the EVV file is downloaded.
8. Confidentiality notice on the sign-in screen; demo PINs and "reset" hidden once `DEMO = false`.
9. Accessibility: no orientation lock, visible focus, labels, reduced motion.
10. Automated tests for lockout, the audit chain, the hotline prompt and the export warning.

## Next build steps (in order)
1. Pick the HIPAA-eligible backend + BAA → server accounts with MFA, encrypted sync, server timestamps for EVV, backups, 6-year retention.
2. Agency HIPAA program: risk analysis, policies, training, MDM for phones, incident-response plan (HIPAA 60 days / Florida 30 days).
3. WCAG 2.1 AA audit.
4. HHAeXchange onboarding (code table, SFTP, testing).
5. Legal review by a Florida health-care attorney.
