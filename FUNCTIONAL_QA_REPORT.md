# Functional QA Report

## Pages Tested

- Login and role switch through demo accounts.
- Creator dashboard and My Sector Publications.
- Create New Publication live scenario.
- AI Workspace.
- Approval Center and Approval Details.
- Publishing Center and Publication Success.
- Publication Preview for X and Instagram.
- Notifications Center.
- Audit Logs.
- Channel Settings.
- Language Management.
- Reset Demo Data.

## Buttons Tested

- Save Draft, Run AI, Submit for Ministry Approval.
- Accept AI changes, formal/shorter/translation-rerun controls.
- Open approval record, approve language, disable language, approve platform, disable platform.
- Return for revision, reject, approve, publish now.
- Publishing retry.
- Notification open, mark all read.
- Channel test, enable, disable.
- Language enable, disable.
- Reset Demo Data.

## Workflows Tested

- Successful publication from Abdullah Alawad through AI review, ministry approval, publishing, success page, and internal preview links.
- Ministry return with selected correction areas, affected languages, affected platforms, detailed reason, creator notification, audit event, and returned status.
- Language-level return for French with required reason and preserved previous translations.
- Platform-level exclusion with required reason and preserved platform history.
- Channel retry and publishing result aggregation.
- Admin language disable affecting new-publication language selection without deleting existing records.

## Issues Found

- Several buttons previously only emitted toast messages.
- Ministry language/platform disable lacked a modal and reason workflow.
- Return-to-creator did not capture affected fields/languages/platforms.
- Creator lacked a complete sector workspace.
- State transitions were scattered across pages.
- Audit logs were generated statically rather than from real actions.
- Channel and language settings did not affect publication creation or publishing behavior.
- Success-screen actions such as duplicate, follow-up, and export did not mutate any stored data.
- AI workspace quick actions accepted/formalized/shortened/reran translation without changing publication content or version history.
- Library archive only displayed a message and did not move the record to Archived.
- Template, terminology, AI settings, workflow settings, user management, sector management, health checks, notifications, and analytics export had remaining toast-only actions.
- Language management allowed disabling a language without a required reason.
- Approval Center search only covered title/reference and did not show result counts, clear filters, or empty states.

## Issues Fixed

- Added `src/workflow.ts` as the centralized state-transition and validation service.
- Added persistent audit logs, channel settings, disabled-language settings, and reset-demo state.
- Added modal-based reason capture for language disable, platform disable, publication return, and rejection.
- Added real notifications for workflow changes.
- Added My Sector Publications with dynamic tabs, search, active-filter count, result count, and empty state.
- Connected language disabling to the new publication wizard.
- Connected channel enable/status to publication selection and publishing validation.
- Added timeline entries and version-history entries for core workflow actions.
- Added Vitest tests for workflow rules and settings behavior.
- Converted success-screen actions into stored duplicate/follow-up/export actions.
- Converted AI Workspace actions into actual content/translation/version/timeline updates.
- Converted Library Archive into a validated status change.
- Converted Templates into draft creation, Terminology into persistent glossary updates with duplicate validation, AI Settings into persistent settings, Workflow Settings into persistent workflow mutations, Users into persistent add/activate/deactivate actions, Sectors into persistent edit/account actions, Health into persistent last-check records, Notifications into open/mark-read actions, and Analytics exports into stored export records.
- Added reason-required modal behavior to Language Management.
- Expanded Approval Center search and added clear filters, result count, and empty state.

## Role-Permission Fixes

- Creator/reviewer views remain sector-scoped.
- Admin controls remain in admin navigation.
- Auditor sees read-only messaging on approval details.
- Ministry approval actions are blocked outside valid ministry-review states.

## State-Transition Fixes

- Invalid transitions are rejected through `canTransition`.
- Return/reject actions require reasons.
- Draft publishing, pre-ministry approval, and auditor mutations are blocked.
- Publishing result aggregation now distinguishes Published, Partially Published, and Publishing Failed.

## Persistence Fixes

- Publications, notifications, audit logs, channel settings, disabled languages, and presentation mode persist in localStorage.
- Reset Demo Data restores the seeded prototype state.

## Validation Fixes

- New publication requires title, Arabic content, at least one language, at least one platform, selectable languages, and publishable channels.
- Return/reject/disable flows require detailed reasons before confirmation.
- Publishing blocks disabled or unavailable channels.
- Language disable now requires a selected reason/notes before the setting changes.
- Duplicate official terminology is blocked.
- Published and archived records are protected from duplicate/archive actions where inappropriate.

## Retested After Final Functional Pass

- `npm run test`: 10 workflow tests passed.
- `npm run build`: production build passed.
- Reviewed remaining visible action buttons for state mutation instead of toast-only behavior.

## Remaining Simulated Integrations

- AI processing and translation.
- External platform publishing.
- OAuth/token checks.
- PDF/Excel/CSV export.
- Media storage and file scanning.

## Known Limitations

- The prototype still uses localStorage rather than a backend API.
- Some broader admin forms are simulated at the setting-record level rather than full CRUD with server validation.
- Browser-based hidden dev-server launch is restricted in this managed Windows shell; production build is direct-open friendly.
