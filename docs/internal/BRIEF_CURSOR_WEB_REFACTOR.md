# Cursor Brief: Web Refactor Sprint C

**Project:** DirApp Web Refactor  
**Branch:** `cursor/web-refactor-financial` (from `main`)  
**Worktree:** `C:\apartmentapp-cursor`  
**Full plan:** `WEB_REFACTOR_PLAN.md`  
**Status tracker:** `WEB_REFACTOR_STATUS.md` — UPDATE after each task  

---

## Your Scope: Contracts, Payments, Maintenance, Check-In/Out

These are the financial and operational screens — your specialty.
All backend APIs exist and are production-verified. You build the UI.

---

## Prerequisites

Pull `main` first. The foundation is ready:
- `web-next/` — Next.js 16 + Tailwind 4 + DirApp Design System
- `lib/api.ts` — API client (uses `/api/*` proxy → backend on Render)
- `lib/auth.ts` — JWT management
- `lib/types.ts` — All TypeScript interfaces
- `hooks/useAuth.ts` — Auth context
- `hooks/useApi.ts` — SWR wrapper
- `components/ui/` — shadcn/ui (15 components)
- `components/layout/AppSidebar.tsx` + `TopBar.tsx` — working app shell

**DO NOT MODIFY:** `lib/api.ts`, `lib/auth.ts`, `middleware.ts`, `tailwind.config.ts`, `globals.css`, `layout.tsx`

If you need a new type → add to `lib/types.ts`.  
If you need a new hook → create in `hooks/`.  
If you need a shared component → create in `components/shared/`.

---

## Tasks (5 screens, priority order)

### C1: Contracts List + Detail + Upload
**Files:**
- `app/(app)/contracts/page.tsx` — list
- `app/(app)/contracts/[id]/page.tsx` — detail
- `app/(app)/contracts/upload/page.tsx` — upload wizard

**Stitch screen IDs:**
| Screen | ID | What |
|--------|-----|------|
| Contracts List | `49a20cc2e7654b72b3ae0dbabae5db68` | Table with filters |
| Contract Detail v2 | `06531205a7694b5c84a2482fab6c53d2` | Status banner + full info |
| Contract Upload | `2147f002dd2749ae8b8d52a92262305a` | 3-step wizard |

**APIs:**
```
GET  /api/contracts                     → list (filtered by role)
GET  /api/v3/contracts/:id              → detail (includes amendments)
POST /api/v3/contracts                  → upload (multipart/form-data, Gemini OCR)
POST /api/v3/contracts/:id/amendments   → propose amendment (max 10)
```

**Key features:**
- List: table with columns נכס/סטטוס/תאריכים/שכ"ד/פעולות
- Status badges: UPLOAD(gray), PENDING_SIGN(yellow), ACTIVE(green), EXPIRING(orange), ENDED(red)
- Detail: full contract info + amendment history + action buttons
- Upload: 3-step wizard (upload PDF/DOCX → Gemini extracts → review → send to sign)
- Upload uses `apiUpload()` from `lib/api.ts` for multipart/form-data

---

### C2: Digital Signature Modal
**File:** `components/contracts/SignatureModal.tsx` (used inside contract detail)

**Stitch screen ID:** `e41f45f78a0744b19b7f3b1321c1b5e7`

**API:**
```
POST /api/v3/contracts/:id/sign         → sign (requires KYC approved)
```

**Key features:**
- Canvas for drawing signature (use HTML5 Canvas)
- Legal checkbox "אני מאשר/ת שחתימה זו מחייבת"
- KYC gate: if user.kycStatus !== "APPROVED" → show message + redirect to KYC
- On sign success → contract status changes → refresh detail page

---

### C3: Ledger / Payments
**File:** `app/(app)/payments/page.tsx`

**Stitch screen ID:** `5b11b6894cb842bbb3d4fc239403ea6b`

**APIs:**
```
GET  /api/v3/ledger/:contractId         → all rows for contract
POST /api/v3/ledger/:id/report          → tenant reports payment
POST /api/v3/ledger/:id/confirm         → landlord confirms
POST /api/v3/ledger/:id/reject          → landlord rejects
```

**Key features:**
- Monthly payment rows with status: PENDING(gray), REPORTED(yellow), PAID(green), OVERDUE(red)
- Tenant view: "דווח תשלום" button → modal with receipt upload
- Landlord view: "אשר ✓" / "דחה ✗" buttons per row
- Receipt thumbnail → click to view full
- Filter by contract dropdown (if multiple contracts)
- Role-aware: different actions for tenant vs landlord

---

### C4: Maintenance
**File:** `app/(app)/maintenance/page.tsx`

**Stitch screen IDs:**
| Screen | ID |
|--------|-----|
| Maintenance list | `e9542c66f2eb4b56b0ec8d03ff075af4` |
| Ticket detail panel | `8f92ef029eea4a15b3c9dceb09bc9253` |

**APIs:**
```
GET  /api/v3/maintenance                → list (filtered by contract)
POST /api/v3/maintenance                → create ticket (+ photo upload to R2)
PUT  /api/v3/maintenance/:id            → update status (IN_PROGRESS, CLOSED)
```

**Key features:**
- Table/cards with tickets: title, status, date, assignee
- Status: OPEN(red), IN_PROGRESS(yellow), CLOSED(green), ESCALATED(orange)
- Create ticket modal: title + description + photo upload
- Tenant actions: create, confirm closure, reopen
- Landlord actions: "אני מטפל", upload invoice, close
- Side panel for ticket detail (like Stitch design)
- "midrag.co.il" external link button for landlord

---

### C5: Check-In / Check-Out
**File:** `app/(app)/checkin/page.tsx`

**Stitch screen ID:** `02859fce416a4e4ab4606ad2c49961f7`

**APIs:**
```
GET  /api/v3/checkin/:contractId        → room photos
POST /api/v3/checkin                    → submit (photos per room → R2)
POST /api/v3/checkin/:id/review         → landlord approve/reject
```

**Key features:**
- Tab per room (kitchen, salon, bathroom, bedrooms)
- Photo upload per room (up to 20 photos)
- Tenant: upload photos → submit → wait for landlord review
- Landlord: review photos → approve ✓ / request fix
- Fix rounds counter (max 3, auto-confirm after 3)
- Type toggle: CHECK_IN / CHECK_OUT
- Comparison view for check-out (side-by-side with check-in)

---

## How to Get Stitch HTML

```
1. Stitch MCP tool:
   get_screen(
     name: "projects/850298985143301658/screens/<ID>",
     projectId: "850298985143301658",
     screenId: "<ID>"
   )

2. Download htmlCode.downloadUrl with curl

3. Open in browser to see the design

4. Copy Tailwind classes directly into React components
```

---

## Design Rules

- **RTL always** — `dir="rtl"`, text aligns right
- **Font:** Rubik (already loaded globally)
- **Colors:** use DirApp tokens: `text-tenant-blue`, `bg-landlord-green`, `text-on-surface-variant`, etc.
- **Inputs:** `h-[48px] rounded-lg border border-outline-variant focus:border-landlord-green focus:ring-1 focus:ring-landlord-green`
- **Buttons primary:** `h-[48px] bg-landlord-green text-white font-bold rounded-full`
- **Cards:** `bg-surface-container-lowest rounded-xl soft-shadow border border-outline-variant`
- **Icons:** Material Symbols Outlined (already loaded in app layout)
- **All text in Hebrew** — copy from Stitch HTML

---

## States Required Per Screen

Every screen must implement:
- **Loading:** use `<Skeleton />` from `components/ui/skeleton`
- **Empty:** icon + message + CTA
- **Error:** error message + retry button
- **Success:** normal render with real data

---

## Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin/Landlord | `admin2@dirapp.com` | `Admin1234!` |

Backend: `https://apartment-backend-v24y.onrender.com`  
Local dev: `npm run dev` in `web-next/` (port 3000)  
API proxy: `/api/*` → backend (configured in `next.config.ts`)

---

## Commit Format

```
feat(web): <description>

AGENT: Cursor

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
```

---

## Rules

- **DO NOT** modify foundation files (see list above)
- **DO NOT** install new npm packages without checking with Claude Code
- **DO NOT** invent designs — Stitch HTML is the source of truth
- **DO** use existing shared components and hooks
- **DO** update `WEB_REFACTOR_STATUS.md` after each task
- **DO** run `npm run build` before committing — must pass
- **ALL** text in Hebrew, copied from Stitch
