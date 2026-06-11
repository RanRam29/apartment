# Antigravity Brief: Web Refactor Sprint B

**Project:** DirApp Web Refactor  
**Branch:** `wind/web-refactor-ui` (from `main`, AFTER Claude Code pushes foundation)  
**Worktree:** `C:\apartmentapp-windsurf`  
**Full plan:** `WEB_REFACTOR_PLAN.md` — READ THIS FIRST  
**Status tracker:** `WEB_REFACTOR_STATUS.md` — UPDATE after each task  

---

## WAIT until Claude Code completes A1-A4

You need these to exist before starting:
- `web-next/` folder with working Next.js 15 + Tailwind + DirApp tokens
- `lib/api.ts`, `lib/auth.ts`, `lib/types.ts` — DO NOT MODIFY
- `middleware.ts` — DO NOT MODIFY
- `components/ui/` — shadcn/ui base set
- `components/layout/AppSidebar.tsx`, `TopBar.tsx` — working
- `components/shared/` — PropertyCard, StatusBadge, etc.
- At least Tenant Dashboard working as reference

---

## Your Tasks (14 screens)

### P1 — Do First
| Task | Page File | Stitch Screen ID | API |
|------|-----------|-------------------|-----|
| B1: Landlord Dashboard | `app/(app)/dashboard/page.tsx` (landlord view) | `bf3ed069517e4a69b75958a7b9dd0aa2` | `GET /api/properties/mine`, `GET /api/matches`, `GET /api/v3/ledger` |
| B2: Leads Management | `app/(app)/leads/page.tsx` | `fe75220d4d29464b87bcb05d2ffe99b7` | `GET /api/matches` (landlord view) |
| B3: Profile & Settings + GDPR + WA opt-in | `app/(app)/profile/page.tsx` | `4155a79e92a7439da64699bf6a56073c` | `GET/PUT /api/users/profile`, `PUT /api/users/switch-role`, GDPR: `GET /api/v3/gdpr/export` + `POST /api/v3/gdpr/deletion-request` + `GET/PUT /api/v3/gdpr/preferences`, WhatsApp: `PUT /api/users/profile {whatsappOptIn}` |
| B4: Property Detail | `app/(app)/apartment/[id]/page.tsx` (already exists, add landlord view) | `56335415c19e41d59c0090253f1ce01c` | `GET /api/apartments/:id` |
| B5: Notifications | `app/(app)/notifications/page.tsx` | `c20f6475b1c54d1b9c2a8665e9eb4b47` | `GET /api/notifications`, `PUT /api/notifications/:id/read` |
| B9: Admin Dashboard | `app/(admin)/admin/page.tsx` | `5c75d3a37df1425f9e71390742265c56` | `GET /api/v3/admin/stats/detailed` |
| B10: Admin Users | `app/(admin)/admin/users/page.tsx` | `825c272f78a446e1bd7b26f2a82c8068` | `GET/PUT/DELETE /api/v3/admin/users` |
| B11: Admin Config | `app/(admin)/admin/config/page.tsx` | `b4fbb57884334853a8b9462be6a956d8` | `GET/PUT /api/v3/admin/config` |
| B12: Guarantor Portal | `app/guarantor/[token]/page.tsx` | See W4 IDs in plan | `GET/POST /api/v3/guarantor/:token/*` |

### P2 — After P1
| Task | Page File | Stitch Screen ID | API |
|------|-----------|-------------------|-----|
| B6: Notif Preferences | `app/(app)/notifications/preferences/page.tsx` | `fb1fe57105d24f40ab0b3aa8d077f23c` | `PUT /api/notifications/preferences` |
| B7: Gamification | `app/(app)/gamification/page.tsx` | `d1eb577566574805a2f6b4d6e1df73ea` | `GET /api/gamification/me`, `/leaderboard` |
| B8: Renter Journal | `app/(app)/journal/page.tsx` | `e7e77add334f49fda65edc69afb5bf50` | `GET /api/tenant/journal` |
| B13: 404 + Offline | `app/not-found.tsx` | `19373ae7b1244e2b9a654db696b00e20` | — |

### P3 — Polish
| Task | Notes |
|------|-------|
| B14: Dark Mode | Add dark mode toggle using Tailwind `dark:` classes. Reference dark Stitch screens |

---

## How to Build Each Screen

```
1. Get Stitch HTML:
   Stitch MCP → get_screen(name: "projects/850298985143301658/screens/<ID>")
   → Download htmlCode.downloadUrl → open in browser

2. Extract from HTML:
   - Tailwind classes (copy as-is)
   - Layout structure
   - Hebrew text (copy exactly)
   - Component patterns

3. Build React component:
   - Use TypeScript (.tsx)
   - Use existing components from components/shared/ and components/ui/
   - Use hooks/useApi.ts for data fetching
   - Use hooks/useAuth.ts for user context
   - Use hooks/useRole.ts for role-based rendering

4. Implement ALL states:
   - Loading: use LoadingSkeleton
   - Empty: use EmptyState
   - Error: use ErrorState
   - Success: normal render

5. Test:
   - Login: admin2@dirapp.com / Admin1234!
   - Backend: https://apartment-backend-v24y.onrender.com
   - Check RTL layout
   - Check visual match with Stitch screenshot
```

---

## Rules

- **DO NOT** modify: `tailwind.config.ts`, `middleware.ts`, `lib/api.ts`, `lib/auth.ts`, `lib/types.ts`
- **DO NOT** install new dependencies without checking with Claude Code
- **DO NOT** invent designs — Stitch HTML is the source of truth
- **DO** use existing shared components
- **DO** update `WEB_REFACTOR_STATUS.md` after each task
- **DO** commit per AGENT_PROTOCOL.md format
- **ALL text in Hebrew** — copy from Stitch
- **RTL always** — check that layout mirrors correctly

---

## Guarantor Portal Detail (B12)

This is the biggest task. 4 Stitch screens → 1 page with step wizard:

| Step | Stitch ID | What |
|------|-----------|------|
| Step 1: Review contract | `d53be7daee8f4da4a679486a6c31a305` | Show contract summary, personal details form |
| Step 2: Identity | `0d062d8e2ca94d71af5455c6144fe929` | Israeli ID input + checksum + photo upload |
| Step 3: Signature | `0b359e654694431d9e9a25eb370e8c6b` | Canvas signature + OTP + legal checkbox |
| Success | `720318d925c94d1b9aef91383879ecd5` | Confirmation screen |
| Error/Expired | `37893c538f58483881e5869fc134a7d4` | Token expired or invalid |
| Declined | `0436c79f7e49472a9783e2ec06beb854` | Guarantor refused |

API: All under `/api/v3/guarantor/:token/` — no JWT needed, token-based auth.

---

## Admin Panel Detail (B9-B11)

Admin uses a different sidebar (see `AdminSidebar.tsx` in layout).  
Route group: `app/(admin)/` with `requireRole('admin')` in layout.

| Screen | Key Features |
|--------|-------------|
| Dashboard | 8 stat sections, 56 metrics from `/api/v3/admin/stats/detailed` |
| Users | Paginated table, edit modal, KYC override button, cascading delete with confirm |
| Config | 52 keys in 9 sections, inline edit, save per section |

---

## Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin2@dirapp.com` | `Admin1234!` |
| Tenant | (register new) | — |
| Landlord | (switch role from tenant) | — |

Backend: `https://apartment-backend-v24y.onrender.com`
