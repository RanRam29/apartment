# DirApp v3.0 — Parallel Development Task Board

> **Read this file before starting any work.** This file coordinates work across three AI coding agents.
> **Plan location:** `docs/superpowers/plans/2026-05-27-dirapp-mvp-v3.md`

## Your Assignment

Find your agent name below. Only work on YOUR tasks. Do not touch files owned by other agents.

---

### Agent: CLAUDE_CODE (Orchestrator + Core Contracts)
**Branch:** `cc/core-contracts`
**Role:** Primary orchestrator. Merges all branches when workstreams complete.

| Task | Description | Status | Depends On |
|------|-------------|--------|------------|
| T4 | State Machine v3 — new statuses, AgreementParty, AgreementRoom, OwnershipVerification | 🔵 MERGED | — |
| T5 | Contract Upload + AI Extraction (Gemini OCR) | 🔵 MERGED | T4 |
| T7 | Check-In Flow — photos per room + landlord confirm | 🔵 MERGED | T5 |
| T10 | Check-Out Flow — photos, review rounds, auto-confirm | 🔵 MERGED | T7 |
| T11 | Contract Renewal — PENDING_ACTIVATION state | 🔵 MERGED | T5 |

**Your files (exclusive):**
- `backend/src/services/contractServiceV3.js` (create)
- `backend/src/routes/contractsV3.js` (create)
- `backend/src/models/pg/AgreementParty.js` (create)
- `backend/src/models/pg/AgreementRoom.js` (create)
- `backend/src/models/pg/OwnershipVerification.js` (create)
- `backend/src/models/pg/RentalAgreement.js` (modify — new statuses)
- `backend/src/services/geminiService.js` (modify — add extractContractFields)
- `backend/tests/stateMachine.test.js` (create)
- `backend/tests/contractsV3.test.js` (create)
- `backend/tests/checkin.test.js` (create)
- `backend/tests/checkout.test.js` (create)

---

### Agent: CURSOR / AI Assistant (Financial + Admin)
**Branch:** `cursor/financial-admin`
**Role:** Build the financial engine, storage layer, admin panel, and cron infrastructure.
**If you are the AI assistant inside Cursor IDE, this section is for you.**

| Task | Description | Status | Depends On |
|------|-------------|--------|------------|
| T1 | Storage Migration — Cloudflare R2 replaces Cloudinary | 🟢 DONE | — |
| T8 | Ledger + Payment Tracking — generate, report, confirm, auto-confirm | 🟢 DONE | T1 |
| T9 | EXPIRING Alerts — 120/90/60/45/30 day cron | 🟢 DONE | — |
| T15 | Admin Panel v1 — GODMODE config + management | 🟢 DONE | — |
| T16 | Remaining Cron Jobs — KYC renewal, maintenance alerts, R2 cleanup, CPI | 🟢 DONE | T1 |

**Note:** Cursor tasks implemented by Claude Code (acting as Cursor agent). Branch ready to merge — pending merge into main to replace Cascade's rogue duplicates with proper implementations.

**Your files (exclusive):**
- `backend/src/config/r2.js` (create)
- `backend/src/services/r2Service.js` (create)
- `backend/src/services/uploadService.js` (modify — replace Cloudinary)
- `backend/src/models/pg/LedgerRow.js` (create)
- `backend/src/services/ledgerService.js` (create)
- `backend/src/routes/ledger.js` (create)
- `backend/src/models/pg/AppConfig.js` (create)
- `backend/src/routes/admin.js` (create)
- `backend/src/cron/*.js` (create all cron files)
- `backend/tests/r2Service.test.js` (create)
- `backend/tests/ledger.test.js` (create)
- `backend/tests/cronJobs.test.js` (create)
- `backend/tests/admin.test.js` (create)

**Install these packages:** `@aws-sdk/client-s3 @aws-sdk/s3-request-presigner node-cron`

---

### Agent: CASCADE / Windsurf / Antigravity (Identity + Platform)
**Branch:** `wind/identity-platform`
**Role:** Build identity verification, notifications, platform features, and mobile screens.
**If you are Cascade (the AI agent inside Windsurf/Antigravity), this section is for you.**

| Task | Description | Status | Depends On |
|------|-------------|--------|------------|
| T2 | Notification System v2 — Resend Email + unified notify service | 🔵 MERGED | — |
| T3 | Terms of Service — middleware + acceptance endpoint | 🔵 MERGED | — |
| T6 | KYC v2 — Persona abstraction, HMAC webhook, ID checksum | 🔵 MERGED | T2 |
| T14 | Multi-tenant — role switch, blocking, account locking | 🔵 MERGED | — |
| T12 | Maintenance Flow — tickets, invoices, midrag.co.il link | 🔵 MERGED | T2 |
| T13 | Guarantor Web Flow — invite, web SPA, Persona Web SDK | 🔵 MERGED | T2, T6 |
| T17 | Mobile Screens — all new screens + Zustand stores | 🔵 MERGED | T2 |

**WARNING:** Cascade went out of scope — also implemented all Cursor (T1, T8, T9, T15, T16) and Claude Code (T4, T5, T7, T10, T11) tasks on its branch. This caused a broken `require('./routes/agreements')` import on main that crashed Render (hotfixed `37792b6`). Cursor branch has proper isolated implementations that should replace Cascade's rogue duplicates.

**Your files (exclusive):**
- `backend/src/config/resend.js` (create)
- `backend/src/services/resendService.js` (create)
- `backend/src/services/notificationService.js` (create)
- `backend/src/services/emailService.js` (modify — use Resend)
- `backend/src/middleware/requireTos.js` (create)
- `backend/src/middleware/requireKycApproved.js` (create)
- `backend/src/services/kycServiceV3.js` (create)
- `backend/src/routes/kycV3.js` (create)
- `backend/src/models/pg/TicketInvoice.js` (create)
- `backend/src/services/maintenanceService.js` (create)
- `backend/src/routes/maintenanceV3.js` (create)
- `backend/src/routes/guarantor.js` (create)
- `backend/src/models/pg/AgreementGuarantor.js` (modify — add invitation fields)
- `backend/src/models/pg/MaintenanceTicket.js` (modify — add status flow)
- `backend/src/models/pg/User.js` (modify — add blockedCount, isLocked, activeRole, tosAcceptedAt)
- `backend/src/routes/auth.js` (modify — add switch-role, accept-tos, block/unblock)
- `web/guarantor/` (create entire directory)
- `mobile/src/screens/` (create new screens)
- `mobile/src/store/` (create new stores)
- `mobile/src/services/api.ts` (modify — add new API calls)
- `backend/tests/resendService.test.js` (create)
- `backend/tests/kycV3.test.js` (create)
- `backend/tests/maintenanceV3.test.js` (create)
- `backend/tests/guarantor.test.js` (create)

**Install these packages:** `resend`

---

## Shared Files — MERGE PROTOCOL

These files will be modified by ALL agents. Each agent should ONLY add lines (never remove or reorder existing lines). Merge conflicts will be resolved by Claude Code (orchestrator).

### `backend/src/app.js`
Each agent adds their route imports and `app.use()` lines at the END of the existing list.

### `backend/src/models/index.js`
Each agent adds their model imports and associations at the END of the file.

### `backend/package.json`
Each agent adds dependencies via `npm install`.

---

## Status Legend
- 🔴 TODO — not started
- 🟡 IN PROGRESS — being worked on
- 🟢 DONE — completed and committed
- 🔵 MERGED — merged into main by orchestrator

## Merge Order
1. All three agents work in parallel on their branches
2. When a workstream finishes, update this file (set status to 🟢)
3. Claude Code merges in order: CURSOR first → WINDSURF second → CC last
4. Resolve additive conflicts in app.js, models/index.js, package.json
5. Run full test suite after each merge
6. Final integration test on main branch

## Status Reporting (MANDATORY)
After completing EVERY task:
1. Update `STATUS.md` in your project root with your progress
2. Move completed task to the "Completed Tasks" table with timestamp and commit hashes
3. Update "Current Task" to your next task
4. List ALL files you created or modified
5. If blocked, add the blocker to the "Blockers" table immediately — don't wait

The orchestrator (Claude Code) reads all STATUS.md files to update the master `DASHBOARD.md`.

## Rules
1. **Never modify files outside your exclusive list** (except shared files per protocol above)
2. **Commit frequently** — one commit per subtask
3. **All new endpoints use `/api/v3/` prefix** — don't modify existing v1 endpoints
4. **Follow existing patterns** — look at `backend/src/routes/auth.js` and `backend/src/middleware/auth.js` for style
5. **Run tests before marking DONE** — `cd backend && npx jest --no-coverage`
6. **Update this file** when you change a task status
