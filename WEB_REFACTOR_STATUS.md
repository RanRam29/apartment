# DirApp — Web Refactor Status Tracker
> **Updated:** 2026-06-09  
> **Sprint Start:** 2026-06-09 (CEO approved)

---

## Claude Code — Sprint A (Foundation + Critical)

| # | Task | Screen | Status | Date | Notes |
|---|------|--------|--------|------|-------|
| A1 | Next.js + Tailwind + tokens + shadcn | DS | ✅ | 2026-06-09 | Next.js 16 + TW4 + 15 shadcn components + DirApp tokens |
| A2 | RootLayout + RTL + Rubik + Providers | — | ✅ | 2026-06-09 | RTL, Hebrew, Rubik font, AuthContext, API client, types |
| A3 | Auth: Login + Register + JWT + proxy | W2 | ✅ | 2026-06-09 | Login + Register + API proxy + error handling + loading states |
| A4 | Layout: Sidebar + TopBar + auth guard | W3 shell | ✅ | 2026-06-09 | Role-aware sidebar (tenant/landlord/admin), TopBar, redirect if no auth |
| A5 | Landing Page (SSG) | W1 | ❌ | — | |
| A6 | Tenant Dashboard | W3 tenant | ❌ | — | |
| A7 | Search Grid + Detail | W6 | ❌ | — | |
| A8 | Matches List | W6 | ❌ | — | |
| A9 | Chat (Socket.io) | W6 | ❌ | — | |
| A10 | Contracts List + Detail + Upload | W7 | ❌ | — | |
| A11 | Digital Signature Modal | W7 | ❌ | — | |
| A12 | Ledger / Payments | W7 | ❌ | — | |
| A13 | Maintenance | W7 | ❌ | — | |
| A14 | Check-In / Check-Out | W7 | ❌ | — | |
| A15 | Email Verification | W2 | ❌ | — | |

---

## Antigravity — Sprint B (UI + Admin + Polish)

**BLOCKED until:** Claude Code completes A1-A4 (foundation)

| # | Task | Screen | Status | Date | Notes |
|---|------|--------|--------|------|-------|
| B1 | Landlord Dashboard | W3 | ❌ | — | |
| B2 | Leads Management | W8 | ❌ | — | |
| B3 | Profile & Settings | W8 | ❌ | — | |
| B4 | Property Detail | W8 | ❌ | — | |
| B5 | Notifications Center | W9 | ❌ | — | |
| B6 | Notification Preferences | W9 | ❌ | — | |
| B7 | Gamification & Rating | — | ❌ | — | |
| B8 | Renter Journal | — | ❌ | — | |
| B9 | Admin Dashboard | W5 | ❌ | — | |
| B10 | Admin User Management | W5 | ❌ | — | |
| B11 | Admin Config Panel | W5 | ❌ | — | |
| B12 | Guarantor Portal | W4 | ❌ | — | |
| B13 | Error States (404, Offline) | Edge | ❌ | — | |
| B14 | Dark Mode | — | ❌ | — | |

---

## Resolved Decisions (CEO Approved 2026-06-09)

| Item | Decision |
|------|----------|
| NLP Search UI | ✅ Include in A7 (Search Grid) |
| GDPR Privacy UI | ✅ Include in B3 (Profile) — 3 buttons |
| WhatsApp opt-in UI | ✅ Include in B3 (Profile) — 1 toggle |
| Web Swipe UX | ❌ Rejected — Grid only, Swipe stays mobile |

---

## Daily Log

| Date | Agent | What | Next |
|------|-------|------|------|
| 2026-06-09 | Claude Code | Created WEB_REFACTOR_PLAN.md + STATUS.md | Awaiting CEO approval to start |
| 2026-06-09 | Claude Code | A1+A2 DONE: Next.js 16, Tailwind 4, DirApp DS, shadcn/ui (15 components), RTL layout, auth system, API client, TypeScript types | Next: A3 (Login + Register) |

---

## Integration Milestones

| Milestone | Target | Status |
|-----------|--------|--------|
| Foundation deployed (A1-A4) | 2026-06-09 | ✅ |
| Antigravity can start (unblock B) | 2026-06-09 | ✅ |
| All tenant flows working (A5-A15) | — | ❌ |
| All landlord flows working (B1-B4) | — | ❌ |
| Admin + Guarantor done (B9-B12) | — | ❌ |
| Merge + E2E verification | — | ❌ |
| Production deploy | — | ❌ |
