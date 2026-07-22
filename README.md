# GovPublish AI

AI-Powered Multilingual Government Content Approval and Publishing Platform.

GovPublish AI is an Arabic-first, RTL-ready interactive prototype for creating, improving, translating, reviewing, approving, scheduling, publishing, and auditing official government content across approved media channels. The prototype uses realistic mock data and simulates AI processing, approval actions, notifications, publishing queues, integration status, analytics, and audit trails without connecting to real social-media APIs.

## Installation

```bash
npm install
npm run dev
```

Production verification:

```bash
npm run build
```

## Demo Accounts

All demo accounts use password `Demo@12345`.

| Role | Email |
| --- | --- |
| Sector Content Creator, Abdullah Alawad | `creator@` |
| Sector Content Creator | `creator@` |
| Sector Reviewer | `reviewer@` |
| Ministry Approver | `approver@` |
| System Administrator | `admin@` |
| Auditor | `auditor@` |

## Role Permissions

Creator users can create publications, upload mock media, choose languages and channels, run AI processing, save drafts, submit for review, and view sector history.

Sector reviewers can inspect sector content, review AI output, add comments, return content, and send publications to ministry review.

Ministry approvers can review content from all sectors, approve selected language and platform items, return or reject with required reasons, reschedule, and start simulated publishing.

System administrators can manage mock users, sectors, publishing channels, terminology, workflows, AI settings, audit logs, and service health. This role is intentionally separate from ministry approval.

Auditors have read-only access to content history, approvals, publishing results, analytics, and audit logs.

## Application Architecture

The prototype is a React, TypeScript, Vite application. It uses React Router for pages, Lucide icons for interface actions, Recharts for analytics, and local browser storage for persistence. The main implementation is organized around typed domain interfaces for:

- `User`, `Role`, `Sector`
- `Publication`, `PublicationTranslation`, `PlatformContent`, `MediaAsset`
- `PublishingChannel`, `ChannelAccount`, `PublishingJob`, `PublishingResult`
- `ApprovalWorkflow`, `ApprovalStep`, `ApprovalAction`
- `Comment`, `Notification`, `AuditLog`
- `OfficialTerm`, `Template`, `AIProcessingResult`, `SensitiveFinding`, `SystemService`

The current prototype keeps these models in the frontend for portability. A production implementation can move the same contracts into a shared package between frontend and backend services.

## Mock API Explanation

The local service behavior is simulated with typed mock data and `localStorage`.

- Login selects a demo user and changes role-based navigation.
- Publication creation persists new records locally.
- AI processing advances through staged progress and creates an AI review record.
- Approval decisions update publication state and require reasons for return or rejection.
- Publishing jobs simulate channel-level success, failure, retry, and external mock URLs.
- Notifications and edits persist after refresh on the same device.

## Live Demo Scenario

Use the default account `creator@prisons.gov.sa` to present the end-to-end scenario. Abdullah Alawad creates the General Directorate of Prisons awareness publication, uploads the demo image with staged progress, selects X, Instagram, Ministry Portal, and Saudi Press Agency, runs the staged AI pipeline, reviews Arabic/English/French/Urdu output, and submits reference `GP-2026-000184` for ministry approval.

Then log out and use `approver@moi.gov.sa`. The same publication appears in the approval center. Approving it starts the animated publishing center, then shows the success screen with mock internal links. The X and Instagram links open the internal Publication Preview page rather than external websites.

Presentation Mode is available from the top bar and simplifies the interface while highlighting workflow buttons.

No real credentials are requested or stored. Channel credentials are displayed only as masked mock tokens.

## Future Real Integration Architecture

A production version should add:

- Backend API with strong role-based access control and sector-level data partitioning.
- Identity provider integration with MFA and session governance.
- Media storage with malware scanning, metadata extraction, and retention policies.
- AI orchestration service with prompt governance, approved terminology enforcement, and human-review gates.
- Translation memory and official glossary synchronization.
- Publishing adapters for approved channels using OAuth, secure gateways, or manual media packages.
- Audit-log service with immutable event storage and export controls.
- Workflow engine for sector-specific approval paths and escalation rules.
- Observability for AI, translation, publishing, notification, database, and media-storage services.
