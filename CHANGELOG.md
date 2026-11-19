# Changelog

## 0.2.0 (2026-11-19)

First release.

### Added
- Aide app (big buttons): today's visits, GPS clock-in/out with a check against the client's address, care-plan task checklist, change-in-condition alert to the nurse, visit note, client signature, attestation, and a 6/6 Medicaid EVV check on every visit.
- RN portal: dashboard (visits, alerts, supervisory visits due, expiring credentials), scheduling, missed visits, care plan editor, diagnosis codes, supervisory visit log, aide records, audit log.
- Florida Medicaid EVV export in HHAeXchange's Homecare V5 visit import format (96 columns), with a check that lists anything HHAeXchange would reject.
- Settings for agency tax ID, NPI, HHAeXchange payer IDs and reason/action codes.
- English, Spanish and Haitian Creole for aides.
- Works offline; all data encrypted on the device and unlocked by the user's PIN; automatic lock after 5 minutes.
- Release kit: `/release now` builds, tests and publishes the web app, Android APK and Windows installer (beta, then production).
- Account locks for a while after 5 wrong PINs.
- Tamper-evident audit trail: the Audit tab shows whether any entry was changed or deleted.
- "Suspected abuse, neglect or exploitation" report that tells the aide to call the Florida Abuse Hotline (required by Florida law).
- Monthly exclusion-list check tracked for each aide, with a "check done today" button.
- Dementia (ADRD) training tracked for each aide.
- Confidentiality notice on the sign-in screen and a warning before downloading the EVV file.
- Legal and HIPAA gap analysis (docs/COMPLIANCE-GAPS.md).

### Changed
- Aides now see only the last 4 digits of a client's Medicaid ID.
- Removed the HIV/AIDS course for regular aides (Florida only requires it for the medically-fragile-children aide program).
- Accessibility: the app can rotate, keyboard focus is visible, and screen readers get labels for the PIN and signature.

### Fixed
- The RN portal is always in English, even right after an aide using Spanish or Kreyòl signs out.
- Signing out returns the sign-in screen to English and clears any leftover message from the last person.
- The button on the abuse hotline screen now says Close.
- The aide's "today" list uses the phone's local date, so evening visits no longer jump to the next day.
