# DirApp — Web Refactor: Full Implementation Plan
> **Project Code:** WEB-REFACTOR-v4  
> **Manager:** Claude Code (CTO / Orchestrator)  
> **Start Date:** 2026-06-09  
> **Status:** 🔵 IN PROGRESS  
> **CEO Approved:** 2026-06-09  
> **Design Source:** Stitch Project `850298985143301658` (98 web screens)

---

## 1. Vision

Replace the current disconnected web pieces (3 separate SPAs) with a **single Next.js 15 App Router application** that implements every Stitch screen pixel-perfect, connected to the existing production backend.

**Rule:** If Backend = ✅, it gets the new Stitch design. If Backend = 🟡/❌, it waits for CEO approval.

---

## 2. Architecture Decision Record

### Framework: Next.js 15 (App Router)

| Factor | Decision | Reasoning |
|--------|----------|-----------|
| Framework | Next.js 15 App Router | File-based routing maps 1:1 to Stitch screens, SSR for landing page SEO, Middleware for auth |
| Styling | Tailwind CSS 4 | Stitch outputs Tailwind HTML — zero conversion needed |
| Components | shadcn/ui + DirApp custom theme | Production-ready accessible components, customized with DirApp tokens |
| Language | TypeScript (strict) | Type safety for API contracts, better maintainability |
| Auth | JWT (existing backend) | `middleware.ts` protects routes, token in httpOnly cookie |
| API Client | Fetch + SWR | Server components use fetch, client components use SWR for caching |
| Forms | React Hook Form + Zod | Validation matches backend Sequelize constraints |
| Real-time | Socket.io-client | Chat integration with existing backend |
| Deploy | Vercel | `app.dirapp.co.il` (or new Vercel project) |
| Monorepo | No | Single `web-next/` folder, clean separation from mobile |

### What We Keep
- Backend on Render (untouched)
- Mobile app (untouched)
- All existing APIs (untouched)

### What We Replace
- `web/index.html` → Next.js landing page (SSG)
- `web/admin/` → Next.js admin routes (protected)
- `web/guarantor/` → Next.js guarantor route (token-based)

---

## 3. Design System — Contract

Every screen MUST use these tokens. They come from Stitch and are non-negotiable.

### Colors
```typescript
// tailwind.config.ts — extracted from Stitch project
const colors = {
  'tenant-blue': '#002045',      // Primary, headers, sidebar
  'landlord-green': '#00cba9',   // CTAs, active states, links
  'admin-red': '#ba1a1a',        // Error, destructive actions
  'guarantor-purple': '#6b4fa0', // Guarantor role badge
  
  primary: '#00091b',
  'primary-container': '#1a365d',
  secondary: '#006b5f',
  'secondary-container': '#62fae3',
  
  background: '#f8f9ff',
  surface: '#f8f9ff',
  'surface-low': '#eff4ff',
  'surface-container': '#e5eeff',
  'surface-container-low': '#f2f3f9',
  'surface-container-lowest': '#ffffff',
  
  'on-surface': '#0b1c30',
  'on-surface-variant': '#43474e',
  outline: '#74777f',
  'outline-variant': '#c4c6cf',
  
  error: '#ba1a1a',
  'error-container': '#ffdad6',
}
```

### Typography (Rubik only)
```
Display:  800 weight, 48px/56px (web), 40px/48px (mobile)
H1:       700 weight, 36px/44px (web), 28px/32px (mobile)
H2:       700 weight, 28px/36px (web), 22px/26px (mobile)
H3:       600 weight, 22px/30px (web), 20px/24px (mobile)
H4:       600 weight, 18px/26px
Body:     400 weight, 16px/26px
Label:    500 weight, 14px/20px
Caption:  400 weight, 12px/16px
```

### Spacing
```
Sidebar width:  260px
Topbar height:  64px
Gutter:         24px
Margin mobile:  16px
Margin desktop: 32px
Input height:   48px
Button height:  48px
```

### Components
```
Buttons:    Primary (#00cba9, white text, 24px radius, 48px h)
            Secondary (outline, #002045 or teal)
            Danger (outline, #ba1a1a)
Inputs:     48px h, 8px radius, #c4c6cf border, focus: #00cba9
Cards:      White bg, 12px radius, shadow rgba(0,32,69,0.06)
Badges:     24px h, 12px radius (pill), semantic colors
Avatars:    Circular, 2px white border, 12px green online dot
```

### Layout Rules
```
Direction:  RTL always (dir="rtl" lang="he")
Web:        Right sidebar 260px (#002045), top bar 64px (white)
Shadows:    0px 4px 12px rgba(0, 32, 69, 0.06) — "Trust Blue tint"
Back arrow: Points RIGHT (RTL convention)
```

---

## 4. Folder Structure

```
web-next/
├── app/
│   ├── layout.tsx                    ← RootLayout: RTL, Rubik, providers
│   ├── page.tsx                      ← W1: Landing Page (SSG)
│   ├── globals.css                   ← Tailwind directives + custom
│   │
│   ├── (auth)/
│   │   ├── layout.tsx                ← Auth layout (no sidebar)
│   │   ├── login/page.tsx            ← W2: Login
│   │   ├── register/page.tsx         ← W2: Register
│   │   └── verify-email/page.tsx     ← W2: Email Verification
│   │
│   ├── (app)/
│   │   ├── layout.tsx                ← App layout: Sidebar + TopBar + auth guard
│   │   │
│   │   ├── dashboard/page.tsx        ← W3: Tenant OR Landlord dashboard (by role)
│   │   ├── search/page.tsx           ← W6: Search Grid
│   │   ├── apartment/[id]/page.tsx   ← W6: Apartment Detail
│   │   ├── matches/page.tsx          ← W6: Matches
│   │   ├── chat/page.tsx             ← W6: Chat
│   │   ├── chat/[matchId]/page.tsx   ← W6: Chat Conversation
│   │   │
│   │   ├── contracts/page.tsx        ← W7: Contracts List
│   │   ├── contracts/[id]/page.tsx   ← W7: Contract Detail
│   │   ├── contracts/upload/page.tsx ← W7: Contract Upload
│   │   ├── payments/page.tsx         ← W7: Ledger
│   │   ├── maintenance/page.tsx      ← W7: Maintenance
│   │   ├── checkin/page.tsx          ← W7: Check-In/Out
│   │   │
│   │   ├── leads/page.tsx            ← W8: Leads Management (landlord)
│   │   ├── properties/page.tsx       ← W8: Properties (landlord)
│   │   ├── profile/page.tsx          ← W8: Profile & Settings
│   │   ├── journal/page.tsx          ← Renter Journal
│   │   ├── gamification/page.tsx     ← Gamification
│   │   └── notifications/page.tsx    ← W9: Notifications
│   │
│   ├── (admin)/
│   │   ├── layout.tsx                ← Admin layout: admin sidebar + requireRole('admin')
│   │   ├── admin/page.tsx            ← W5: Admin Dashboard
│   │   ├── admin/users/page.tsx      ← W5: User Management
│   │   └── admin/config/page.tsx     ← W5: Config Panel
│   │
│   └── guarantor/
│       └── [token]/page.tsx          ← W4: Guarantor Portal (no auth, token-based)
│
├── components/
│   ├── ui/                           ← shadcn/ui (Button, Input, Dialog, etc.)
│   ├── layout/
│   │   ├── AppSidebar.tsx            ← Right sidebar, role-aware navigation
│   │   ├── TopBar.tsx                ← Search, notifications bell, avatar
│   │   └── AdminSidebar.tsx          ← Admin-specific sidebar
│   ├── shared/
│   │   ├── PropertyCard.tsx          ← Reused in search, dashboard, leads
│   │   ├── ContractCard.tsx          ← Reused in contracts list, dashboard
│   │   ├── MatchCard.tsx             ← Reused in matches, leads
│   │   ├── TrustScoreBadge.tsx       ← Circular progress ring
│   │   ├── StatusBadge.tsx           ← Pill badges (Active, Pending, etc.)
│   │   ├── RoleBadge.tsx             ← Tenant/Landlord/Admin/Guarantor
│   │   ├── EmptyState.tsx            ← Illustration + text + CTA
│   │   ├── LoadingSkeleton.tsx       ← Skeleton loaders per component
│   │   └── ErrorState.tsx            ← Error display + retry
│   └── forms/
│       ├── LoginForm.tsx
│       ├── RegisterForm.tsx
│       ├── ContractUploadForm.tsx
│       ├── MaintenanceTicketForm.tsx
│       └── PaymentReportForm.tsx
│
├── lib/
│   ├── api.ts                        ← API client: baseURL, auth header, error handling
│   ├── auth.ts                       ← JWT decode, cookie management, role checks
│   ├── socket.ts                     ← Socket.io client singleton
│   ├── types.ts                      ← TypeScript interfaces matching backend models
│   └── utils.ts                      ← formatCurrency, formatDate, RTL helpers
│
├── hooks/
│   ├── useAuth.ts                    ← Auth context hook
│   ├── useSocket.ts                  ← Chat socket hook
│   ├── useRole.ts                    ← Current role (tenant/landlord/admin)
│   └── useApi.ts                     ← SWR wrapper with auth
│
├── middleware.ts                     ← Auth redirect: /login if no token, role routing
├── tailwind.config.ts                ← DirApp Design System tokens (from Stitch)
├── next.config.ts                    ← API rewrites to backend
├── package.json
└── tsconfig.json
```

---

## 5. API Integration Map

Every page connects to existing backend endpoints. No new endpoints needed.

### Auth
| Page | Method | Endpoint | Notes |
|------|--------|----------|-------|
| Login | POST | `/api/auth/login` | Returns JWT + user object |
| Register | POST | `/api/auth/register` | role, email, password, firstName, lastName |
| Verify Email | POST | `/api/auth/verify-email` | 6-digit code |
| Middleware | — | JWT decode | `middleware.ts` checks token validity |

### Discovery (W6)
| Page | Method | Endpoint | Notes |
|------|--------|----------|-------|
| Search Grid | GET | `/api/apartments` | ?city=&minPrice=&maxPrice=&rooms= |
| Apartment Detail | GET | `/api/apartments/:id` | Full details + landlord |
| Create Match | POST | `/api/swipes` | action: 'right' / 'left' / 'superlike' |

### Matches & Chat (W6)
| Page | Method | Endpoint | Notes |
|------|--------|----------|-------|
| Matches List | GET | `/api/matches` | tenant & landlord views |
| Accept Match | POST | `/api/matches/:id/accept` | Landlord only |
| Chat List | GET | `/api/messages/conversations` | Sorted by last message |
| Chat Messages | GET | `/api/messages/:matchId` | Paginated (50/page) |
| Send Message | Socket.io | `chat:send` | Real-time via socket |

### Contracts (W7)
| Page | Method | Endpoint | Notes |
|------|--------|----------|-------|
| Contracts List | GET | `/api/contracts` | Filtered by role |
| Contract Detail | GET | `/api/v3/contracts/:id` | Includes amendments |
| Upload Contract | POST | `/api/v3/contracts` | multipart/form-data + Gemini OCR |
| Sign Contract | POST | `/api/v3/contracts/:id/sign` | Requires KYC approved |
| Propose Amendment | POST | `/api/v3/contracts/:id/amendments` | Max 10 |

### Payments (W7)
| Page | Method | Endpoint | Notes |
|------|--------|----------|-------|
| Ledger | GET | `/api/v3/ledger/:contractId` | All rows |
| Report Payment | POST | `/api/v3/ledger/:id/report` | Tenant reports |
| Confirm Payment | POST | `/api/v3/ledger/:id/confirm` | Landlord confirms |

### Maintenance (W7)
| Page | Method | Endpoint | Notes |
|------|--------|----------|-------|
| Tickets List | GET | `/api/v3/maintenance` | Filtered by contract |
| Create Ticket | POST | `/api/v3/maintenance` | + photo upload to R2 |
| Update Status | PUT | `/api/v3/maintenance/:id` | IN_PROGRESS, CLOSED |

### Check-In/Out (W7)
| Page | Method | Endpoint | Notes |
|------|--------|----------|-------|
| Check-In | GET | `/api/v3/checkin/:contractId` | Room photos |
| Submit Check-In | POST | `/api/v3/checkin` | Photos per room → R2 |
| Approve/Reject | POST | `/api/v3/checkin/:id/review` | Landlord action |

### Profile & Leads (W8)
| Page | Method | Endpoint | Notes |
|------|--------|----------|-------|
| Profile | GET | `/api/users/profile` | Current user |
| Update Profile | PUT | `/api/users/profile` | firstName, lastName, phone, etc. |
| Switch Role | PUT | `/api/users/switch-role` | Toggle tenant ↔ landlord |
| My Properties | GET | `/api/properties/mine` | Landlord's listings |
| Leads | GET | `/api/matches` | Landlord view: pending leads |

### Gamification & Journal
| Page | Method | Endpoint | Notes |
|------|--------|----------|-------|
| Trust Score | GET | `/api/gamification/me` | score, badges, history |
| Leaderboard | GET | `/api/gamification/leaderboard` | Top 50 |
| Renter Journal | GET | `/api/tenant/journal` | Aggregated timeline |

### Notifications (W9)
| Page | Method | Endpoint | Notes |
|------|--------|----------|-------|
| Notifications | GET | `/api/notifications` | Sorted desc |
| Mark Read | PUT | `/api/notifications/:id/read` | — |

### Admin (W5)
| Page | Method | Endpoint | Notes |
|------|--------|----------|-------|
| Dashboard Stats | GET | `/api/v3/admin/stats/detailed` | 8 sections, 56 metrics |
| Users List | GET | `/api/v3/admin/users` | Paginated + kycProfile |
| Edit User | PUT | `/api/v3/admin/users/:id` | — |
| Delete User | DELETE | `/api/v3/admin/users/:id` | Cascading |
| Config | GET/PUT | `/api/v3/admin/config` | 52 keys, 9 sections |

### Guarantor (W4)
| Page | Method | Endpoint | Notes |
|------|--------|----------|-------|
| Load Invitation | GET | `/api/v3/guarantor/:token` | Token-based, no auth |
| Submit KYC | POST | `/api/v3/guarantor/:token/verify` | ID + photo |
| Sign | POST | `/api/v3/guarantor/:token/sign` | Signature + OTP |
| Decline | POST | `/api/v3/guarantor/:token/decline` | — |

---

## 6. Stitch → Code Process (Per Screen)

```
Step 1: PULL
   get_screen(screenId) → download HTML file
   Download screenshot for visual reference

Step 2: ANALYZE
   Identify: layout structure, Tailwind classes, components, texts, states
   Map: which API endpoints this screen needs
   List: all interactive elements + their behavior (from 01-FLOW-MAP.md)

Step 3: BUILD
   Create React component using Tailwind (classes transfer 1:1 from Stitch HTML)
   Wire up API calls via lib/api.ts
   Implement all states: loading, empty, error, success, edge cases

Step 4: VERIFY
   Visual comparison: Stitch screenshot vs browser
   Functional test: all buttons/links work, API returns correct data
   RTL check: layout mirrors correctly, text aligns right

Step 5: LOG
   Update WEB_REFACTOR_STATUS.md with completion status
```

---

## 7. Work Division — Claude Code vs Antigravity

### Claude Code (Orchestrator) — Sprint A

**Scope:** Foundation + Critical Business Logic

| # | Task | Stitch Screens | Priority | Est |
|---|------|---------------|----------|-----|
| A1 | Next.js project + Tailwind + DirApp tokens + shadcn/ui | Design System | P0 | 2h |
| A2 | RootLayout: RTL, Rubik font, providers, globals.css | — | P0 | 1h |
| A3 | Auth: Login + Register + JWT + middleware.ts | W2 login, W2 register | P0 | 3h |
| A4 | Layout Shell: AppSidebar + TopBar + role routing | W3 shell | P0 | 3h |
| A5 | Landing Page (SSG) | W1 | P1 | 2h |
| A6 | Tenant Dashboard | W3 tenant dashboard | P1 | 3h |
| A7 | Search Grid + Apartment Detail | W6 search, W6 detail | P1 | 4h |
| A8 | Matches List (tenant + landlord) | W6 matches | P1 | 2h |
| A9 | Chat (Socket.io integration) | W6 chat | P1 | 4h |
| A10 | Contracts List + Detail + Upload | W7 contracts (3 screens) | P1 | 5h |
| A11 | Digital Signature Modal | W7 signature | P1 | 2h |
| A12 | Ledger / Payments | W7 ledger | P1 | 3h |
| A13 | Maintenance | W7 maintenance | P1 | 2h |
| A14 | Check-In / Check-Out | W7 checkin | P2 | 3h |
| A15 | Email Verification page | W2 verify | P2 | 1h |
| | | | **Total** | **~40h** |

**Deliverables:**
- Working Next.js app with auth, sidebar, all tenant flows
- All contract/payment/maintenance screens connected to backend
- Chat with Socket.io working

---

### Antigravity (Windsurf) — Sprint B

**Scope:** Dashboards + Profiles + Admin + Guarantor + Polish

| # | Task | Stitch Screens | Priority | Est |
|---|------|---------------|----------|-----|
| B1 | Landlord Dashboard | W3 landlord dashboard | P1 | 3h |
| B2 | Leads Management + Side Panel | W8 leads | P1 | 3h |
| B3 | Profile & Settings (tenant + landlord) | W8 profile | P1 | 3h |
| B4 | Property Detail page | W8 property detail | P1 | 2h |
| B5 | Notifications Center | W9 notifications | P1 | 2h |
| B6 | Notification Preferences | W9 preferences | P2 | 1h |
| B7 | Gamification & Rating | Gamification screens | P2 | 2h |
| B8 | Renter Journal | Journal screens | P2 | 2h |
| B9 | Admin Dashboard | W5 admin dashboard | P1 | 3h |
| B10 | Admin User Management | W5 users | P1 | 3h |
| B11 | Admin Config Panel | W5 config | P1 | 2h |
| B12 | Guarantor Portal (3-step wizard) | W4 guarantor (8 screens) | P1 | 4h |
| B13 | Error States: 404 + Offline | Edge case screens | P2 | 1h |
| B14 | Dark Mode variants | Dark mode screens | P3 | 3h |
| | | | **Total** | **~34h** |

**Deliverables:**
- All landlord screens working
- Admin panel fully redesigned
- Guarantor portal rebuilt
- Notifications + gamification + journal

---

## 8. Interface Contract Between Claude Code & Antigravity

### What Claude Code Provides BEFORE Antigravity Starts

1. **Working Next.js project** with:
   - `tailwind.config.ts` with all DirApp tokens
   - `lib/api.ts` — API client with auth header
   - `lib/auth.ts` — JWT management
   - `lib/types.ts` — All TypeScript interfaces
   - `middleware.ts` — Auth protection
   - `hooks/useAuth.ts`, `hooks/useRole.ts`, `hooks/useApi.ts`
   - `components/ui/` — shadcn/ui base set
   - `components/layout/AppSidebar.tsx` — Working sidebar with navigation
   - `components/layout/TopBar.tsx` — Working top bar

2. **Shared components** (used by both):
   - `PropertyCard.tsx`
   - `StatusBadge.tsx`
   - `RoleBadge.tsx`
   - `TrustScoreBadge.tsx`
   - `EmptyState.tsx`
   - `LoadingSkeleton.tsx`
   - `ErrorState.tsx`

3. **At least one working page** as reference implementation (Tenant Dashboard)

### Rules for Antigravity

1. **Branch:** `wind/web-refactor-ui` from `main` (after Claude Code pushes foundation)
2. **Never modify:** `tailwind.config.ts`, `middleware.ts`, `lib/api.ts`, `lib/auth.ts`, `lib/types.ts`
3. **Always use:** shared components from `components/shared/` and `components/ui/`
4. **Stitch is the source of truth:** Download HTML from Stitch for each screen, translate to React. Do not invent designs
5. **All text in Hebrew** — copy from Stitch HTML
6. **Test every page** with real API data (use `admin2@dirapp.com` / `Admin1234!`)
7. **Update `WEB_REFACTOR_STATUS.md`** after each screen completion
8. **Commit format:** per AGENT_PROTOCOL.md

### How to Pull Stitch HTML (for Antigravity)

```
1. Get screen ID from WEB_REFACTOR_STATUS.md (mapped below)
2. Use Stitch MCP: get_screen(projectId: "850298985143301658", screenId: "<id>")
3. Download the htmlCode.downloadUrl
4. Open in browser to see the design
5. Use the screenshot.downloadUrl for visual reference
6. Translate HTML → React component (Tailwind classes stay as-is)
```

---

## 9. Screen → Stitch ID Mapping

### W1: Landing Page
| Screen | Stitch ID | Notes |
|--------|-----------|-------|
| Landing Page | `2dff70d337d648bc85891f889006b954` | |
| Landing + Animations | `9c995df1489d498bb74f2549465644c4` | Use this one |

### W2: Auth
| Screen | Stitch ID | Notes |
|--------|-----------|-------|
| Login | `c1b2fecf37484aaf81f57542e389541d` | |
| Login Success | `15bd2e3648e84c6cb96e10ebf91b79e3` | |
| Login Error | `124a56972dba4b73b4d4e66399457c4c` | |
| Register | `40d8b94e3ccd47459b5cbc06d07e2f32` | |
| Register Error | `087e72aaba83428f995de543ab6ee957` | |
| Register Loading | `0c83a808bd9947e08dfc3211fb49b4e1` | |
| Register Success | `fe944e33c33843e4ba5e8b99e37bf590` | |
| Register Success Confetti | `083ca3a829d94a09a948a7c8a65c4afa` | Use this one |
| Register Success Animation | `ded0041f975c445987c11b7039d9364e` | |
| Register Success Confetti v2 | `ee9e0eb21fca4766b5a1d107ef1a5216` | |
| Email Verification | `e69338273a2e4793b193ad78372d4e30` | |
| Email Verify Success | `cd56039b056742698c7ac8401dec8ac7` | |
| Email Verify Loading | `ec993111f75544e1a8a9d133b73fad60` | |
| Email Verify Error | `09b9d10f95a347afaf505e19e5a53a3a` | |
| Search Results | `38bfa3c31a2e48f49e30d1583c7f9b08` | |

### W3: Dashboards
| Screen | Stitch ID | Notes |
|--------|-----------|-------|
| Tenant Dashboard | `f9a5633d3d364d0786ecb6826c9380cd` | |
| Landlord Dashboard [LATEST] | `bf3ed069517e4a69b75958a7b9dd0aa2` | |
| Landlord Extended [LATEST] | `33a792ca032b42ab99255ccddd0672ad` | |
| Landlord Extended Dark | `e69e053fd21c4544b04ace5dea7f8f65` | |

### W4: Guarantor Portal
| Screen | Stitch ID | Notes |
|--------|-----------|-------|
| Step 1 [LATEST] | `d53be7daee8f4da4a679486a6c31a305` | |
| Step 1 — Personal Details | `489d778ac2054d8dbe961ec5ee23cea8` | |
| Step 2 — Identity | `0d062d8e2ca94d71af5455c6144fe929` | |
| Step 3 — Signature | `0b359e654694431d9e9a25eb370e8c6b` | |
| Success | `720318d925c94d1b9aef91383879ecd5` | |
| Success v2 | `edb8af5e0ac94aafa6ebb2ef6bd3bf79` | |
| Error/Expired | `37893c538f58483881e5869fc134a7d4` | |
| Declined | `0436c79f7e49472a9783e2ec06beb854` | |

### W5: Admin Panel
| Screen | Stitch ID | Notes |
|--------|-----------|-------|
| Admin Dashboard | `b65d06b0fbb8422286b9c502b9d4c976` | |
| Admin Dashboard v2 | `5c75d3a37df1425f9e71390742265c56` | Use this one |
| User Management | `825c272f78a446e1bd7b26f2a82c8068` | |
| System Settings | `b4fbb57884334853a8b9462be6a956d8` | |

### W6: Discovery, Matches & Chat
| Screen | Stitch ID | Notes |
|--------|-----------|-------|
| Swipe / Discovery | `4f23a73edd424c03b37660137d5ae110` | |
| Search Grid | `256670bd42104a80a0abf23ef0ac59de` | |
| Search No Results | `bfa2b67acc6d4734b69cd06353508e14` | Edge case |
| Matches | `4eee8db5885b4d25ad3ef9b45f1339c6` | |
| Chat | `4c06661fb46e4ae4a76411999abc18bf` | |

### W7: Contracts, Payments & Maintenance
| Screen | Stitch ID | Notes |
|--------|-----------|-------|
| Contracts List | `49a20cc2e7654b72b3ae0dbabae5db68` | |
| Contract Upload | `2147f002dd2749ae8b8d52a92262305a` | |
| Contract Detail | `5e04746f14094e13bc4244e487dd8fe4` | |
| Contract Detail v2 | `06531205a7694b5c84a2482fab6c53d2` | Use this one |
| Digital Signature | `e41f45f78a0744b19b7f3b1321c1b5e7` | |
| Payments/Ledger | `5b11b6894cb842bbb3d4fc239403ea6b` | |
| Maintenance | `e9542c66f2eb4b56b0ec8d03ff075af4` | |
| Maintenance Detail Panel | `8f92ef029eea4a15b3c9dceb09bc9253` | |
| Check-In/Out | `02859fce416a4e4ab4606ad2c49961f7` | |

### W8: Profile, Properties & Leads
| Screen | Stitch ID | Notes |
|--------|-----------|-------|
| Profile & Settings | `4155a79e92a7439da64699bf6a56073c` | |
| Profile Dark | `345ab00701fc4a67aa2491d178d6676e` | |
| Property Detail | `b1e1460e9f2e4c4ea0d6f040dadf905e` | |
| Property Detail Sticky CTA | `56335415c19e41d59c0090253f1ce01c` | Use this one |
| Leads Management | `fe75220d4d29464b87bcb05d2ffe99b7` | |
| Leads Dark | `335111a98c7f4f5d8d30bd5bb01bbd87` | |

### W9: Notifications
| Screen | Stitch ID | Notes |
|--------|-----------|-------|
| Notification Center | `c20f6475b1c54d1b9c2a8665e9eb4b47` | |
| Notification Preferences | `fb1fe57105d24f40ab0b3aa8d077f23c` | |

### Gamification & Journal
| Screen | Stitch ID | Notes |
|--------|-----------|-------|
| Gamification | `d1eb577566574805a2f6b4d6e1df73ea` | |
| Gamification Dark | `b78ae810e9a240208c2cac4a1ee6e711` | |
| Renter Journal | `e7e77add334f49fda65edc69afb5bf50` | |
| Journal Dark | `5257e154bbba42a2a3a6b2b1defbb7d6` | |

### Edge Cases
| Screen | Stitch ID | Notes |
|--------|-----------|-------|
| 404 Page | `19373ae7b1244e2b9a654db696b00e20` | |
| Offline State | `0efd0fb7f0094ff1adce7e7a8eb4fee6` | |

---

## 10. 🟡 Features Awaiting CEO Approval

These features have partial or no backend. They will NOT be built until approved:

| Feature | Backend Status | Decision (2026-06-09) |
|---------|---------------|----------------------|
| NLP Search (V2-4) | 🟡 Backend ready | ✅ **APPROVED** — included in A7 (Search Grid). E2E verify during dev |
| GDPR Privacy (V2-7) | 🟡 Routes exist | ✅ **APPROVED** — 3 buttons in B3 (Profile). Legal requirement |
| WhatsApp opt-in | 🟡 User model field | ✅ **APPROVED** — toggle in B3 (Profile). Required for Phase 2 |
| Web Swipe UX | ✅ Backend exists | ❌ **REJECTED** — Grid only on web. Swipe stays mobile-exclusive |
| Stripe Connect (V2-1) | ❌ Not started | ⏳ Not in scope |

---

## 11. Communication Protocol

### Daily Sync
Both agents update `WEB_REFACTOR_STATUS.md` with:
- Tasks completed today
- Tasks in progress
- Blockers
- Next planned task

### Blocking Issues
If Antigravity needs something from Claude Code:
1. Add to `WEB_REFACTOR_STATUS.md` under "BLOCKED" section
2. Describe: what's needed, which screen, which API
3. Claude Code resolves within same sprint

### Merge Protocol
1. Antigravity works on `wind/web-refactor-ui`
2. Claude Code works on `feat/web-refactor-foundation`
3. Claude Code merges foundation first → main
4. Antigravity rebases on main
5. Claude Code reviews + merges Antigravity's branch
6. Final integration test on main

---

## 12. Definition of Done (Per Screen)

- [ ] Stitch HTML downloaded and used as reference
- [ ] React component created with TypeScript
- [ ] All Tailwind classes from Stitch preserved
- [ ] Connected to real backend API (not mock data)
- [ ] All states implemented: loading, empty, error, success
- [ ] RTL layout verified
- [ ] Hebrew text matches Stitch exactly
- [ ] Navigation works (links, buttons go to correct pages)
- [ ] Responsive: works at 1440px and 1024px minimum
- [ ] Visual match: component looks like Stitch screenshot
