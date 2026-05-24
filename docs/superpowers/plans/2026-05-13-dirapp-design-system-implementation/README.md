# DirApp Design System — Implementation Plan

**Canonical spec:** Stitch/Figma exports live under `.cursor/1`–`.cursor/3` locally (gitignored in this repo to avoid multi‑MB binaries in clones). For **reviewable source of truth** in Git, use **`mobile/src/theme/dirAppTokens.ts`** plus this checklist; pair with local `.cursor/3/dirapp_design_system/DESIGN.md` when available.

**Source code:**

| Layer | Path |
|--------|------|
| Tokens | `mobile/src/theme/dirAppTokens.ts` |
| Semantic aliases (`C`, `Dark`) | `mobile/src/theme.ts` (`C.navy` aliases `primaryContainer`; `C.bg` → `dirApp.background`) |
| Typography presets | `mobile/src/theme/textStyles.ts` |

**Note:** The path `.claude/worktrees/...` was not present in this workspace; this folder mirrors that intent inside the repo.

---

## Checklist — screen & surface alignment

Use **`dirApp`** in screens for Trust Blue (`primary` / `primaryContainer`) and Action Teal (`secondary`, `secondaryContainer`). Keep **`C`** for status, danger, gold, cyan alpha helpers, and **`Dark.*`** where screens intentionally use the inverse / landlord-dark shell.

### Core shell & discovery

- [x] **Home** — `HomeScreen.tsx` (tiles, hero, notifications: `dirApp.primary`)
- [x] **Swipe + cards** — `SwipeScreen.tsx`, `ApartmentCard.tsx`, `SwipeableCard.tsx` (SUPER stamp + CTAs use `dirApp.primary` / `primaryContainer`)
- [x] **Search** — `SearchScreen.tsx`
- [x] **Map** — `MapScreen.tsx` (popup badge text: `dirApp.primary`)

### Matches & profile

- [x] **Matches** — `MatchesScreen.tsx`, `MatchCard.tsx`
- [x] **Profile** — `ProfileScreen.tsx` (shell + role chip tints explicit `dirApp`)

### Landlord & listings

- [x] **Landlord dashboard** — `LandlordDashboard.tsx`
- [x] **Create listing** — `CreateListingScreen.tsx`
- [x] **Edit listing** — `EditListingScreen.tsx` (aligned with Create listing form/chips/submit)
- [x] **Listings list** — `ListingsScreen.tsx` (keeps **Dark** landlord shell; mint CTAs use `dirApp.primary` for on-accent text)

### Contracts, commercial, payments

- [x] **Contracts** — `ContractsScreen.tsx` (sign row icon on teal: `dirApp.onSecondary`)
- [x] **Commercial** — `CommercialScreen.tsx`
- [x] **Rent payments** — `RentPaymentsScreen.tsx` (accent text/spinner: `dirApp`; inset rows still `navyMidAlpha`)

### Auth & onboarding

- [x] **Auth shell** — `AuthScreen.tsx`
- [x] **Login / Register** — `LoginScreen.tsx`, `RegisterScreen.tsx`
- [x] **Onboarding** — `OnboardingScreen.tsx` (primary CTA label: `dirApp.primary`)
- [x] **Verify identity** — `VerifyIdentityScreen.tsx` (header `dirApp.primary`)

### Chat, leads, roommates

- [x] **Chat** — `ChatScreen.tsx` (me bubble + send control: `dirApp.primary`)
- [x] **Leads** — `LeadsScreen.tsx` (tabs + actions on mint: `dirApp.primary`)
- [x] **Roommate** — `RoommateScreen.tsx`

### Other flows

- [x] **Preferences** — `PreferencesScreen.tsx`
- [x] **Gamification** — `GamificationScreen.tsx` (`CARD` → `dirApp.surfaceTint`)
- [x] **Services** — `ServicesScreen.tsx` (header `dirApp.primary`)
- [x] **IoT** — `IoTScreen.tsx` (header `dirApp.primary`)
- [x] **Logs console** — `LogsConsoleScreen.tsx` (light DirApp panels + tabs)

### Navigation & shared UI

- [x] **App navigator** — `AppNavigator.tsx` (admin tenant/landlord segment: `dirApp.primary` / `primaryContainer`)
- [x] **Apartment search chatbot** — `ApartmentSearchChatbot.tsx` (modal shell `dirApp.primary`, panels `inverseSurface` / `surfaceTint`)
- [x] **Error boundary** — `ErrorBoundary.tsx` (retry on mint: `dirApp.primary`)
- [x] **Startup intro** — `StartupIntroGate.*` (skip hint `dirApp.secondary`)

---

## Incremental fidelity

- Screen-by-screen optional diff against each folder’s `code.html` + `screen.png`.
- **Light shells:** `dirApp.background`, `surfaceContainerLowest`, `outlineVariant` borders.
- **Text on mint / cyan (`C.cyan`):** prefer **`dirApp.primary`** (`#002045`) for WCAG-friendly contrast.
- **Dark shells (`Dark.bg`):** unchanged where intentional; swap legacy **`C.navy`** literals to **`dirApp.primary`** for labels on accent buttons.
