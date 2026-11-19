# Karen Kare

Home care aide app for **Florida Medicaid** agencies: Electronic Visit Verification (EVV), plan-of-care documentation, and RN supervision.
PWA today → Capacitor (App Store / Play Store) and Tauri/Electron (Windows installer) later.

> **v0.2 prototype — MOCK DATA ONLY.** Do not enter real patient information until a HIPAA-eligible backend with a signed BAA is in place.

## Releasing
This repo uses the shared [Krazow release kit](https://github.com/krazow/release-kit). In a Claude chat on this repo, type **`/release now`** (beta), then **`/release promote`** (production). `/release status` and `/release rollback` also work.
- Web: `https://krazow.github.io/Karen-Kare/` (beta at `/beta/`, with its own separate data)
- Android APK (`com.krazow.karenkare`) and Windows installer (port 44620) on the GitHub Releases page
- Pull requests and pushes to `main` run QA (`npm test` + release checks) automatically.

## Run it
No build step. Serve the folder over HTTP:
```
python3 -m http.server 8080   # then open http://localhost:8080
```
Demo PINs: Maria (aide) `1111` · Jean-Pierre (aide) `2222` · Karen RN `9999`.

## What's in v0.2
**Aide app (Big Button)**
- Today's visits with Late detection
- GPS clock-in/out with a geofence check against the client's address; reason codes when GPS is off or the aide is out of range
- Plan-of-care task checklist (Done / Not done + reason)
- One-tap change-in-condition report → RN alert
- Visit note, client signature (or reason unable to sign), aide attestation
- 6/6 EVV element check and 15-minute billable units on every completed visit
- Own credential expiry warnings
- English / Español / Kreyòl, remembered per aide (translations need native-speaker review)
- Works offline (service worker + IndexedDB); auto-lock after 5 minutes idle or 5 minutes in the background

**RN portal (Dashboard)**
- Today's KPIs, EVV exceptions, condition alerts with acknowledgement
- Supervisory visits due/overdue (60-day), supervisory visit log
- Care plan editor (tasks + written aide instructions)
- Scheduling, aide credential tracking
- Mark missed visits with a reason
- **HHAeXchange Homecare V5 visit import** export (96-column CSV), with a pre-check that lists every row HHAeXchange would reject
- Settings: Agency Tax ID, NPI, HHAeXchange payer IDs per plan, visit-edit and missed-visit reason/action codes
- Aide HHAeXchange fields (license #, SSN last 5, gender) and client ICD-10 diagnosis codes
- Audit log of every action

## Regulatory map
See [docs/COMPLIANCE-GAPS.md](docs/COMPLIANCE-GAPS.md) for the legal/HIPAA gap analysis and [docs/DESIGN-OPTIONS.md](docs/DESIGN-OPTIONS.md) — Cures Act §12006, 42 CFR 484.80, HIPAA, F.S. 409.9132, Rule 59G-4.132, Rule 59A-8.

## Security
All records are AES-GCM-256 encrypted in IndexedDB. The data key is wrapped per user with a PBKDF2-SHA256 (310k iterations) key derived from their PIN; PINs are never stored, and locking drops the key from memory. Failed sign-ins are logged to the audit trail.
Limitation: a 4-digit PIN can be brute-forced offline by someone who copies the device storage. Production should use 6+ digit PINs or device biometrics (WebAuthn) plus server-held key escrow.

## Florida service codes
T1019 Personal Care, S5130 Homemaker, S5135 Adult Companion, S5125 Attendant Care — SMMC LTC codes; plans bill T1019/S5130 per 15 minutes, one line per date of service.

## Before production
1. Choose a HIPAA-eligible backend and sign a BAA; add real auth (MFA), sync, and server-side audit logs.
2. Get the **EDI Code Table Guide** from HHAeXchange EDI support (payer IDs, reason/action/duty codes), set up the agency's HHAeXchange SFTP account, and pass HHAeXchange integration testing.
3. Native-speaker review of the Spanish and Kreyòl text.
4. Compliance review by a Florida health-care attorney or consultant.
