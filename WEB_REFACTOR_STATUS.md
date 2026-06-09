# DirApp — Web Refactor Status Tracker
> **Updated:** 2026-06-09  
> **Sprint Start:** 2026-06-09 (CEO approved)

---

## Claude Code — Sprint A (Foundation + Core UX)

| # | Task | Screen | Status | Date | Notes |
|---|------|--------|--------|------|-------|
| A1 | Next.js + Tailwind + tokens + shadcn | DS | ✅ | 2026-06-09 | Next.js 16 + TW4 + 15 shadcn components + DirApp tokens |
| A2 | RootLayout + RTL + Rubik + Providers | — | ✅ | 2026-06-09 | RTL, Hebrew, Rubik font, AuthContext, API client, types |
| A3 | Auth: Login + Register + JWT + proxy | W2 | ✅ | 2026-06-09 | Login + Register + API proxy + error handling + loading states |
| A4 | Layout: Sidebar + TopBar + auth guard | W3 shell | ✅ | 2026-06-09 | Role-aware sidebar (tenant/landlord/admin), TopBar, redirect if no auth |
| A5 | Landing Page (SSG) | W1 | ✅ | 2026-06-09 | 8 sections, scroll animations, hero, features, footer |
| A6 | Tenant Dashboard | W3 tenant | ✅ | 2026-06-09 | Quick actions, apartments, contracts table, trust score, notifications |
| A7 | Search Grid + NLP + Detail | W6 | ❌ | — | Next session |
| A8 | Matches List | W6 | ❌ | — | |
| A9 | Chat (Socket.io) | W6 | ❌ | — | |
| A15 | Email Verification | W2 | ❌ | — | |

---

## Antigravity — Sprint B (Dashboards + Profiles + Admin)

**STATUS:** UNBLOCKED — working

| # | Task | Screen | Status | Date | Notes |
|---|------|--------|--------|------|-------|
| B1 | Landlord Dashboard | W3 | ✅ | 2026-06-09 | Completed with real data + mock fallbacks |
| B2 | Leads Management | W8 | 🔵 | — | In progress |
| B3 | Profile & Settings + GDPR + WA opt-in | W8 | ❌ | — | |
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

## Cursor — Sprint C (Contracts + Payments + Maintenance)

**STATUS:** UNBLOCKED — brief ready

| # | Task | Screen | Status | Date | Notes |
|---|------|--------|--------|------|-------|
| C1 | Contracts List + Detail + Upload | W7 | ❌ | — | 3 pages + Gemini OCR upload |
| C2 | Digital Signature Modal | W7 | ❌ | — | Canvas signature + KYC gate |
| C3 | Ledger / Payments | W7 | ❌ | — | Role-aware (tenant report / landlord confirm) |
| C4 | Maintenance | W7 | ❌ | — | Tickets + side panel detail |
| C5 | Check-In / Check-Out | W7 | ❌ | — | Room tabs + photo upload + fix rounds |

---

## Resolved Decisions (CEO Approved 2026-06-09)

| Item | Decision |
|------|----------|
| NLP Search UI | ✅ Include in A7 (Search Grid) |
| GDPR Privacy UI | ✅ Include in B3 (Profile) — 3 buttons |
| WhatsApp opt-in UI | ✅ Include in B3 (Profile) — 1 toggle |
| Web Swipe UX | ❌ Rejected — Grid only, Swipe stays mobile |

---

## Work Division

```
Claude Code:  A7-A9, A15  — Search, Matches, Chat, Email Verify (management + core UX)
Antigravity:  B1-B14      — Dashboards, Profiles, Admin, Guarantor, Polish
Cursor:       C1-C5       — Contracts, Payments, Maintenance, Check-In/Out
```

Merge order: Claude Code merges all branches → main → deploy

---

## Daily Log

| Date | Agent | What | Next |
|------|-------|------|------|
| 2026-06-09 | Claude Code | A1-A6 DONE + deployed to Vercel production | A7 next session |
| 2026-06-09 | Antigravity | B1 DONE (Landlord Dashboard) | B2 (Leads) |
| 2026-06-09 | Claude Code | Created Cursor brief (BRIEF_CURSOR_WEB_REFACTOR.md) | Cursor starts C1 |

---

## Integration Milestones

| Milestone | Target | Status |
|-----------|--------|--------|
| Foundation deployed (A1-A4) | 2026-06-09 | ✅ |
| Antigravity unblocked (Sprint B) | 2026-06-09 | ✅ |
| Cursor unblocked (Sprint C) | 2026-06-09 | ✅ |
| Landing + Auth + Dashboard live | 2026-06-09 | ✅ |
| All search/match/chat (A7-A9) | — | ❌ |
| All contracts/payments (C1-C5) | — | ❌ |
| All landlord/admin (B1-B14) | — | ❌ |
| Final merge + E2E | — | ❌ |
| Production deploy (full) | — | ❌ |
