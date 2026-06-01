# DirApp QA Stabilization — Design Spec

**Date:** 2026-06-01
**Author:** Claude Code (CTO)
**Status:** Draft — awaiting approval

---

## Problem Statement

DirApp v3.0 features are functionally complete on the backend, but the frontend has three categories of issues that prevent production readiness:

1. **Blocking bugs** — new tenant registration flow is broken (ToS gate not triggered, email verification not enforced)
2. **Design inconsistency** — 3 different agents built screens with different styles, colors, and font usage
3. **Polish gaps** — broken logo, mixed Hebrew/English labels, avatar placeholders

## Scope

This spec covers primarily **frontend fixes** on `mobile/src/`, plus one backend seed fix (A3). All APIs are verified working.

---

## Phase A — Functional Fixes (P1)

### A1: Auto-redirect to ToS after registration

**Problem:** After registration + onboarding, the user lands on Home but `tosAcceptedAt` is null. All `requireTos`-gated routes (`/api/apartments`, `/api/matches`, `/api/swipe`, `/api/contracts`) return 403. The user sees "אין הרשאה לטעון דירות" with no way to fix it.

**Root cause:** `MainNavigator` (AppNavigator.tsx:212) checks `needsOnboarding` but never checks `tosAcceptedAt`. After onboarding completes, the user goes straight to Tabs.

**Fix:**
- In `MainNavigator`, after onboarding check, add ToS gate:
  ```
  if user is authenticated AND tosAcceptedAt is null → show TermsScreen
  ```
- The `TermsScreen` already exists and works (BUG-006 was fixed). Just need to route to it.
- **File:** `mobile/src/navigation/AppNavigator.tsx` lines 212-238
- **Logic:** `initialRouteName` should be `'Terms'` when `!user?.tosAcceptedAt && !needsOnboarding`
- **Admin exemption:** Admin users (`role === 'admin'`) skip the ToS gate — they already bypass `requireTos` on the backend

**Acceptance criteria:**
- New user registers → onboarding → ToS screen → accept → Home with full access
- Existing user without ToS → ToS screen on next login
- User with ToS → Home directly (no regression)

### A2: Enforce email verification gate

**Problem:** User `testqa01@dirapp.com` registered and entered the app with `isVerified: false`. The backend doesn't enforce verification on login (it returns a token regardless).

**Root cause:** The `POST /api/auth/register` endpoint returns a JWT immediately. The frontend store sets `isAuthenticated: true` without checking `isVerified`.

**Fix — frontend gate:**
- In `AppNavigator`, add verification check before ToS check:
  ```
  if user is authenticated AND isVerified === false → show VerificationPendingScreen
  ```
- Create a simple `VerificationPendingScreen` that shows:
  - "שלחנו לך מייל אימות" message
  - "שלח שוב" button (calls `resendVerification`)
  - "התחברתי מחדש" button (calls `restoreSession` to re-check)
- **Files:** New `mobile/src/screens/VerificationPendingScreen.tsx`, update `AppNavigator.tsx`

**Acceptance criteria:**
- New user registers → sees "check your email" screen → cannot access app
- After verifying email → refresh/re-login → enters app normally
- Already-verified users → no change

### A3: Fix demo seed passwords for all accounts

**Problem:** `mobile1@dirapp.com` (landlord) returns 401 — password out of sync, same pattern as BUG-002.

**Fix:** Apply the same `findOrCreate` + sync pattern from BUG-002 fix to ALL demo accounts in `backend/src/seeders/demo.js`. Ensure every demo account password is synchronized on every boot.

**File:** `backend/src/seeders/demo.js`

**Acceptance criteria:**
- All demo accounts (`admin@`, `admin1@`, `admin2@`, `mobile@`, `mobile1@`) login successfully after server restart

---

## Phase B — Design Consistency

### B1: Fix logo — replace broken PNG with clean SVG component

**Problem:** Login and Register screens show a PNG logo with visible checkerboard (transparency issue). The logo renders inside a gray box on dark backgrounds.

**Fix:**
- The `SwipeHouseLogo` component already exists (`mobile/src/components/SwipeHouseLogo.tsx`)
- Replace the broken `require('../assets/logo.png')` with the `SwipeHouseLogo` vector component in Auth screens
- Remove the gray-background `<Image>` wrapper on login/register

**Files:** `mobile/src/screens/LoginScreen.tsx`, `mobile/src/screens/RegisterScreen.tsx`

### B2: Unify tab labels to Hebrew

**Problem:** "Home" tab label is in English while all others are Hebrew.

**Fix:**
| Tab | Current | Target |
|-----|---------|--------|
| TenantTabs Home | `'Home'` | `'בית'` |
| LandlordTabs Home | `'Home'` | `'בית'` |

**File:** `mobile/src/navigation/AppNavigator.tsx` lines 152, 202

### B3: Remove off-palette violet from HomeScreen

**Problem:** The "זמן השכירות שלי" card uses `C.accent.violet` (#7C3AED) — a legacy color not in the DirApp design system. It creates a jarring purple block that looks like a different app.

**Fix:**
- Replace `C.accent.violet` (#7C3AED) with `dirApp.secondary` (#006b5f) or `dirApp.primaryContainer` (#1a365d) in HomeScreen
- The rental timeline card should use the same teal/navy palette as the rest of the app

**File:** `mobile/src/screens/HomeScreen.tsx` — line 445 and related styles

### B4: Apply Rubik font to all screens

**Problem:** Login, Register, and several other screens use `fontWeight` without `fontFamily`, which falls back to system default instead of Rubik.

**Fix:**
- Audit all `StyleSheet.create` in screens for `fontSize`/`fontWeight` without `fontFamily`
- Replace with `dirType.*` presets from `theme/textStyles.ts`:
  - Titles → `dirType.title`
  - Body text → `dirType.body`
  - Buttons → `dirType.subhead`
  - Labels → `dirType.label`
  - Captions → `dirType.caption`
- Priority screens (most visible):
  1. `LoginScreen.tsx`
  2. `RegisterScreen.tsx`
  3. `HomeScreen.tsx`
  4. `ProfileScreen.tsx`
  5. `SwipeScreen.tsx`

**Files:** ~10 screen files

### B5: Fix profile avatar placeholder

**Problem:** Profile screen shows a gray rectangle above the avatar circle — a broken `<Image>` for the avatar that fails to load.

**Fix:**
- In `ProfileScreen`, guard the avatar `<Image>` with `avatarUrl` check
- If `avatarUrl` is null, show only the initials circle (already there), hide the `<Image>`

**File:** `mobile/src/screens/ProfileScreen.tsx`

### B6: Fix bottom tab padding overlap

**Problem:** On Profile screen, bottom content is clipped by the absolute-positioned tab bar (height: 80px).

**Fix:**
- Add `paddingBottom: 100` to the scroll container in screens that have content extending to the bottom
- This was already fixed for admin screens (`bfee9e8`) — apply same pattern to tenant/landlord screens

**Files:** `ProfileScreen.tsx`, `HomeScreen.tsx`, and other scrollable screens

---

## Implementation Order

```
Phase A (functional — P1):
  A3 → A1 → A2
  (seed fix first so we can test with all accounts,
   then ToS gate, then verification gate)

Phase B (design — P2):
  B1 → B2 → B3 → B4 → B5 → B6
  (logo first for biggest visual impact,
   then quick label fix, then palette, then fonts)
```

## Testing Strategy

- After Phase A: manually login as new tenant, verify ToS flow, verify email gate
- After Phase B: screenshot each screen, compare before/after
- All changes are frontend-only (except A3) — no backend regression risk

## Out of Scope

- Mobile native (Expo) testing — web only for now
- Performance optimization
- New feature development
- Backend API changes (all APIs verified working 2026-06-01)
