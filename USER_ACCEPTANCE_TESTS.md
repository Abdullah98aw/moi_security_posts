# User Acceptance Tests

## Creator: Abdullah Alawad

1. Log in with `creator@prisons.gov.sa`.
2. Confirm dashboard shows drafts, previous publications, scheduled publications, pending approvals, and analytics.
3. Open Create New Publication.
4. Verify the prisons announcement is prefilled.
5. Go to Media and click Simulate upload. Confirm progress shows 25%, 48%, 72%, 100%, then Completed.
6. Select X, Instagram, Ministry Portal, and Saudi Press Agency.
7. Select Arabic, English, French, and Urdu.
8. Run AI and wait for all pipeline stages to complete.
9. In AI Workspace, review original Arabic, improved Arabic, translations, platform versions, warnings, and timeline.
10. Click Submit for Ministry Approval.
11. Confirm the status becomes Ministry Review and the item appears in My Sector Publications under Awaiting Ministry Approval.

## Sector Reviewer

1. Log in with `reviewer@publicsecurity.gov.sa`.
2. Confirm only same-sector publications are visible.
3. Open Approval Center.
4. Add a comment to a sector publication.
5. Verify comments remain on refresh.

## Ministry Approver

1. Log in with `approver@moi.gov.sa`.
2. Open Approval Center and find `GP-2026-000184`.
3. Open the publication and approve/disable individual languages and platforms.
4. Disable French and confirm a reason is required.
5. Return a publication and select correction areas, affected languages, affected platforms, and detailed comments.
6. Approve `GP-2026-000184` from Ministry Review.
7. Confirm the Publishing Center animates all four channels.
8. Confirm the success page shows reference number, time, duration, platform count, links, and timeline.
9. Click X and Instagram links and verify internal Publication Preview pages open.

## System Administrator

1. Log in with `admin@moi.gov.sa`.
2. Open Language Management.
3. Disable French.
4. Log in again as Abdullah and verify French is not selectable for new publications.
5. Re-enable French and verify it returns.
6. Open Channel Settings and disable Instagram.
7. Verify Instagram is not selectable for new publications and publishing through it is blocked.
8. Open Audit Logs and verify language/channel actions were recorded.
9. Use Reset Demo Data and confirm defaults are restored.

## Auditor

1. Log in with `auditor@moi.gov.sa`.
2. Verify dashboard, approvals, publishing results, analytics, library, and audit logs are visible.
3. Open an approval detail record.
4. Confirm mutation actions are disabled or read-only.
5. Verify audit logs and publication history are readable.

## Regression Checks

1. Run `npm run test`.
2. Run `npm run build`.
3. Refresh the browser after state changes and confirm publications, notifications, audit logs, channel settings, and language settings persist.
