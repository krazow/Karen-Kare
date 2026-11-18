# Karen Kare — Research & Design Options

_Prepared 2026-11-18. Not legal advice — have a Florida health-care attorney or compliance consultant confirm before go-live._

## 1. What the law requires the aide app to capture

### Federal — Medicaid (21st Century Cures Act §12006)
Every Medicaid-funded personal care and home health visit must be verified electronically (EVV) with six data elements:
1. Type of service performed
2. Individual receiving the service
3. Date of service
4. Location of service delivery
5. Individual providing the service
6. Time the service begins and ends

Traditional Medicare does **not** require EVV; Medicare obligations come from the Conditions of Participation below.

### Federal — Medicare Home Health CoPs (42 CFR Part 484)
- **§484.80(g)** Aide works from written patient-care instructions prepared by the RN / skilled professional; only performs tasks in the plan of care.
- **§484.80(h)** RN on-site supervisory visit at least every **14 days** for patients receiving skilled care (aide need not be present); on-site observation of the aide at least every **60 days** for aide-only patients. Must be documented.
- **§484.60** Plan of care / coordination; **§484.110** clinical records (authenticated, dated, retained).
- **§484.80(b)–(d)** Aide training (75 hrs) + competency evaluation + 12 hrs in-service per year — personnel records.

### Federal — HIPAA (45 CFR 164)
PHI encrypted at rest and in transit, unique user IDs, auto-logoff, audit logs, access control, BAA with every host/vendor that touches PHI.

### Florida
- **F.S. 409.9132 + Rule 59G-4.132** — AHCA EVV program for Medicaid home health (visits, private duty nursing, personal care).
- **HHAeXchange** is AHCA's EVV vendor (fee-for-service since 10/1/2024) and the vendor for the SMMC managed-care plans (Sunshine, Humana, Molina, etc.). Florida runs an **open model**: agencies can use their own EVV system as long as it feeds visits/claims to HHAeXchange via EDI. Claims without a matching EVV visit are denied.
- **Ch. 400 Part III F.S. / Rule 59A-8 F.A.C.** (AHCA home health agency licensure):
  - 59A-8.0095 — aide/CNA duties; RN supervisory visits documented in patient file; aide reports changes in condition.
  - 59A-8.0215 — plan of care available to all staff providing care.
  - 59A-8.022 — clinical record contents: referral source, plan of care, clinical & service notes, supervisory visits, case conferences, reports to physicians; retention per F.S. 400.491.
  - 59A-8.0216 / .0219 / .0097 — RN delegation & medication administration by aides: signed patient consent, MAR, validation records, report dose/route changes to the nurse.
  - 59A-8.0099 — Aides for Medically Fragile Children (AMFC): RN supervision at least every 60 days.
  - Aide training: 40 hrs (F.S. 400.497); CNA certification on file.

### Resulting minimum feature set for the aide
| Requirement | Feature |
|---|---|
| Cures Act 6 elements | GPS clock-in/out, service code, client & aide IDs, timestamps (offline-capable, tamper-evident) |
| Plan-of-care tasks (484.80(g), 59A-8.0215) | Per-visit task checklist from RN care plan; "performed / refused / not done + reason" |
| Service notes (59A-8.022) | Visit note, client/rep signature, aide signature |
| Change in condition (59A-8.0095/.0219) | One-tap "report to nurse" with alert to supervising RN |
| Medication (59A-8.0219) | MAR (only when RN-delegated & aide validated) |
| Supervision (484.80(h)) | RN supervisory visit log + 14/60-day due alerts |
| Personnel (484.80, 400.497) | Training hrs, CNA cert, in-service, med-validation expiry tracking |
| HIPAA | MFA, PIN re-lock, encrypted local cache, audit trail, BAA-covered backend |
| Florida EVV | Export / EDI to HHAeXchange (open-model alternate EVV) |

## 2. What the big agencies in Florida use

Exact internal tooling isn't always public; this is what's verifiable.

| Agency (strong FL presence) | Segment | Platform / caregiver app |
|---|---|---|
| Amedisys | Medicare home health | Homecare Homebase (HCHB) + HCHB Smart Scheduling |
| CenterWell Home Health (Humana) | Medicare home health | HCHB (HCHB states 5 of the top 5 home health providers use it) |
| Enhabit | Medicare home health | HCHB family |
| BAYADA | Home health / PDN / personal care | Enterprise EHR + EVV (HHAeXchange for FL Medicaid) |
| Aveanna | Pediatric PDN / home health | Proprietary **AveannaCare Mobile EVV** app |
| Interim HealthCare | Home health + personal care franchise | Franchise platform (WellSky family) |
| Visiting Angels | Private-duty franchise | **AxisCare** (many franchisees) |
| Home Instead | Private-duty franchise | Franchise-provided platform + caregiver app |
| Comfort Keepers / Right at Home / BrightStar | Private-duty franchise | **WellSky Personal Care** (supports ~80% of franchise networks) or AxisCare |
| Any agency billing FL Medicaid | Medicaid personal care / HH | **HHAeXchange+** caregiver app (state/MCO EVV) |

### Feature comparison of the caregiver apps
| Capability | HCHB | WellSky Personal Care | AxisCare | HHAeXchange+ | AveannaCare |
|---|---|---|---|---|---|
| GPS clock-in/out (EVV) | ✓ | ✓ | ✓ | ✓ | ✓ |
| Care-plan task list / ADLs | ✓ (clinical) | ✓ | ✓ | ✓ | partial |
| Visit notes & signatures | ✓ | ✓ | ✓ | ✓ | ✓ |
| Clinical docs (OASIS, MAR) | ✓ | — | partial | partial | — |
| Offline mode | ✓ | partial | partial | ✗ (needs connection) | partial |
| Messaging with office | ✓ | ✓ | ✓ HIPAA chat | ✓ | — |
| Multi-language | partial | ✓ | 7+ | 20+ | — |
| Shift pick-up / swap | — | ✓ | ✓ | ✓ | — |
| Credential/training tracking | ✓ | ✓ | ✓ | ✓ | — |
| Caregiver engagement (rewards, surveys) | — | ✓ TeamEngage | — | — | — |

**Gaps we can win on:** true offline-first EVV (rural FL, hurricane outages), plain-language big-button UI for aides, change-in-condition escalation built in, and one app that covers both Medicare CoP documentation and Florida Medicaid EVV.

## 3. Design options

### Scope
- **Option A — Aide App only.** Aide-facing PWA: schedule, EVV clock-in/out, task checklist, notes, signatures, condition reporting. A small admin page loads clients/care plans and exports EVV to HHAeXchange. Fastest to ship; agency still needs other software for billing/scheduling.
- **Option B — Aide App + Agency/RN Portal (recommended).** Everything in A, plus RN portal: care plans & aide instructions, supervisory-visit tracking (14/60-day alerts), MAR & delegation consent, scheduling, personnel credential tracking, audit/compliance reports, HHAeXchange EDI export. Covers both Medicare CoPs and FL Medicaid.
- **Option C — Full agency platform.** B plus billing/claims (837), payroll export, intake/referrals, OASIS, family portal. Competes with AxisCare/WellSky; much larger build and certification effort.

### Visual / UX direction
- **1. "Big Button" simple** — huge tap targets, one action per screen, icons + text, high contrast, Spanish/Haitian Creole from day one. Best for aide adoption.
- **2. "Clinical Dashboard"** — denser cards & timeline like HCHB; better for RN/office users.
- **3. Hybrid** — Big Button for aides, dashboard for RN/admin portal.

### Platform architecture (all options)
- PWA (offline-first, service worker, encrypted IndexedDB queue) → later **Capacitor** wrap for App Store/Play Store and **Tauri/Electron** for the Windows installer from the same codebase.
- Backend must be HIPAA-eligible with a signed BAA (e.g., Supabase HIPAA add-on, AWS, or Azure). No PHI on any non-BAA service (including analytics, email, push).
