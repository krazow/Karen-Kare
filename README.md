# Karen Kare

Home care aide app for **Florida Medicaid** agencies: Electronic Visit Verification (EVV), plan-of-care documentation, and RN supervision.
PWA today → Capacitor (App Store / Play Store) and Tauri/Electron (Windows installer) later.

> **v0.1 prototype — MOCK DATA ONLY.** Do not enter real patient information until a HIPAA-eligible backend with a signed BAA is in place.

## Run it
No build step. Serve the folder over HTTP:
```
python3 -m http.server 8080   # then open http://localhost:8080
```
Demo PINs: Maria (aide) `1111` · Jean-Pierre (aide) `2222` · Karen RN `9999`.

## What's in v0.1
**Aide app (Big Button)**
- Today's visits with Late detection
- GPS clock-in/out with a geofence check against the client's address; reason codes when GPS is off or the aide is out of range
- Plan-of-care task checklist (Done / Not done + reason)
- One-tap change-in-condition report → RN alert
- Visit note, client signature (or reason unable to sign), aide attestation
- 6/6 EVV element check and 15-minute billable units on every completed visit
- Own credential expiry warnings
- Works offline (service worker + IndexedDB); auto-lock after 5 minutes of inactivity

**RN portal (Dashboard)**
- Today's KPIs, EVV exceptions, condition alerts with acknowledgement
- Supervisory visits due/overdue (60-day), supervisory visit log
- Care plan editor (tasks + written aide instructions)
- Scheduling, aide credential tracking
- EVV CSV export for HHAeXchange (open model)
- Audit log of every action

## Regulatory map
See [docs/DESIGN-OPTIONS.md](docs/DESIGN-OPTIONS.md) — Cures Act §12006, 42 CFR 484.80, HIPAA, F.S. 409.9132, Rule 59G-4.132, Rule 59A-8.

## Before production
1. Choose a HIPAA-eligible backend and sign a BAA; add real auth (MFA) and server-side audit logs.
2. Encrypt the on-device cache (WebCrypto AES-GCM, key unlocked by PIN or biometrics).
3. Get HHAeXchange's alternate-EVV EDI spec and map the export to it; certify with HHAeXchange.
4. Add translations: Spanish and Haitian Creole.
5. Have a compliance review done by a Florida health-care attorney or consultant.
