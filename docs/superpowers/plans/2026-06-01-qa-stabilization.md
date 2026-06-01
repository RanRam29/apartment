# QA Stabilization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the 3 blocking functional bugs (ToS gate, email verification, seed passwords) and apply design consistency across all screens (logo, fonts, colors, labels, padding).

**Architecture:** All changes are in `mobile/src/` (frontend) except Task 1 which touches `backend/src/seeders/demo.js`. The navigation gate chain in `AppNavigator.tsx` becomes: isAuthenticated → isVerified → tosAccepted → (onboarding if needed) → Tabs. Design fixes apply the existing `dirApp` tokens and `dirType` presets to screens that currently use hardcoded styles.

**Tech Stack:** React Native (Expo Web), TypeScript, React Navigation, Zustand

**Spec:** `docs/superpowers/specs/2026-06-01-qa-stabilization-design.md`

---

## Phase A — Functional Fixes

### Task 1: Sync demo seed passwords on every boot (A3)

**Files:**
- Modify: `backend/src/seeders/demo.js:42-52`

- [ ] **Step 1: Update admin seed to always sync passwordHash**

In `backend/src/seeders/demo.js`, replace lines 42-52:

```js
// OLD:
  for (const a of ADMIN_ACCOUNTS) {
    const adminHash = await bcrypt.hash(a.password, 12);
    const [user, created] = await User.findOrCreate({
      where: { email: a.email },
      defaults: { email: a.email, passwordHash: adminHash, firstName: a.firstName, lastName: a.lastName, role: a.role, isVerified: true, tosAcceptedAt: new Date(), tosVersion: '3.0', trustScore: 50 },
    });
    if (!created && !user.tosAcceptedAt) {
      await user.update({ tosAcceptedAt: new Date(), tosVersion: '3.0' });
    }
    console.log(`${created ? '➕' : '⏩'} Admin: ${a.email}`);
  }
```

With:

```js
// NEW — always sync password + critical fields for ALL admin accounts
  for (const a of ADMIN_ACCOUNTS) {
    const adminHash = await bcrypt.hash(a.password, 12);
    const [user, created] = await User.findOrCreate({
      where: { email: a.email },
      defaults: { email: a.email, passwordHash: adminHash, firstName: a.firstName, lastName: a.lastName, role: a.role, isVerified: true, tosAcceptedAt: new Date(), tosVersion: '3.0', trustScore: 50 },
    });
    if (!created) {
      await user.update({
        passwordHash: adminHash,
        role: a.role,
        isVerified: true,
        tosAcceptedAt: user.tosAcceptedAt || new Date(),
        tosVersion: '3.0',
        trustScore: user.trustScore ?? 50,
      });
    }
    console.log(`${created ? '➕' : '🔄'} Admin: ${a.email}`);
  }
```

- [ ] **Step 2: Add mobile1 to ADMIN_ACCOUNTS array**

Add `mobile1@dirapp.com` to the `ADMIN_ACCOUNTS` array (line 20-24) so it gets synced on every boot:

```js
const ADMIN_ACCOUNTS = [
  { email: 'admin1@dirapp.com', firstName: 'Admin', lastName: 'One', password: 'Admin1234!', role: 'landlord' },
  { email: 'admin@dirapp.com', firstName: 'רן', lastName: 'רן', password: 'Admin1234!', role: 'admin' },
  { email: 'admin2@dirapp.com', firstName: 'Admin', lastName: 'Two', password: 'Admin1234!', role: 'admin' },
  { email: 'mobile1@dirapp.com', firstName: 'בדיקה', lastName: 'בדיקה', password: 'Admin1234!', role: 'landlord' },
];
```

- [ ] **Step 3: Verify with curl**

```bash
# After server restart, test login for each account:
curl -s -X POST https://apartment-backend-v24y.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"mobile1@dirapp.com","password":"Admin1234!"}' | head -c 100
# Expected: {"token":"eyJ...
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/seeders/demo.js
git commit -m "fix(seed): always sync passwords for all demo accounts (QA-003)

Prevents BUG-002 repeat — findOrCreate now always updates passwordHash,
role, and tosAcceptedAt for existing accounts. Added mobile1@ to seed list.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 2: Add ToS gate to navigation (A1)

**Files:**
- Modify: `mobile/src/navigation/AppNavigator.tsx:212-238`

- [ ] **Step 1: Add ToS check in MainNavigator**

In `mobile/src/navigation/AppNavigator.tsx`, replace the `MainNavigator` function (lines 212-238):

```tsx
function MainNavigator() {
  const { user, needsOnboarding } = useAuthStore();
  const appTheme = useAppTheme();
  const isAdmin = user?.role === 'admin';
  const userRole = user?.activeRole || user?.role;

  // Gate chain: onboarding → ToS → Tabs
  const needsToS = !isAdmin && !user?.tosAcceptedAt;

  let initialRoute: keyof MainStackParamList = 'Tabs';
  if (needsOnboarding) {
    initialRoute = 'Onboarding';
  } else if (needsToS) {
    initialRoute = 'Terms';
  }

  useEffect(() => {
    useChatStore.getState().connect();
    return () => useChatStore.getState().disconnect();
  }, []);

  return (
    <MainStack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName={initialRoute}
    >
      <MainStack.Screen
        name="Tabs"
        component={
          isAdmin
            ? AdminTabs
            : userRole === 'landlord'
              ? LandlordTabs
              : TenantTabs
        }
      />
      <MainStack.Screen name="Onboarding" component={OnboardingScreen} />
```

The rest of MainStack.Screen entries stay unchanged.

- [ ] **Step 2: Fix TermsScreen navigation after accept**

In `mobile/src/screens/TermsScreen.tsx`, update the `onPress` in `handleAccept` (line 52-57) to always navigate to Tabs after ToS acceptance, not `goBack`:

```tsx
        onPress: () => {
          navigation.reset({
            index: 0,
            routes: [{ name: 'Tabs' }],
          });
        }
```

This ensures after ToS acceptance the user lands on Tabs, not back to the login/onboarding stack.

- [ ] **Step 3: Add 'Terms' to MainStackParamList if missing**

In `mobile/src/types/index.ts`, ensure `MainStackParamList` includes `Terms`:

```tsx
// If Terms is not already in MainStackParamList, add it:
Terms: undefined;
```

- [ ] **Step 4: Test manually**

1. Clear localStorage → reload → register new user → onboarding → should see Terms screen
2. Accept ToS → should land on Home with working apartment feed
3. Login as admin2 → should skip ToS → go straight to AdminTabs

- [ ] **Step 5: Commit**

```bash
git add mobile/src/navigation/AppNavigator.tsx mobile/src/screens/TermsScreen.tsx mobile/src/types/index.ts
git commit -m "fix(nav): add ToS gate after onboarding — new users see Terms before Tabs (QA-001)

Gate chain: isAuthenticated → onboarding → ToS → Tabs
Admin users bypass ToS gate (they skip requireTos on backend too).
TermsScreen now resets to Tabs after acceptance instead of goBack.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 3: Add email verification gate (A2)

**Files:**
- Create: `mobile/src/screens/VerificationPendingScreen.tsx`
- Modify: `mobile/src/navigation/AppNavigator.tsx`

- [ ] **Step 1: Create VerificationPendingScreen**

Create `mobile/src/screens/VerificationPendingScreen.tsx`:

```tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/useAuthStore';
import { dirApp } from '../theme/dirAppTokens';
import { dirType } from '../theme/textStyles';
import { C } from '../theme';

export default function VerificationPendingScreen() {
  const { user, resendVerification, restoreSession, logout } = useAuthStore();
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [checking, setChecking] = useState(false);

  async function handleResend() {
    setResending(true);
    try {
      await resendVerification(user?.email);
      setResent(true);
    } catch {}
    setResending(false);
  }

  async function handleCheck() {
    setChecking(true);
    try {
      await restoreSession();
    } catch {}
    setChecking(false);
  }

  return (
    <View style={styles.container}>
      <Ionicons name="mail-outline" size={64} color={dirApp.secondary} />
      <Text style={[dirType.title, styles.title]}>אימות אימייל</Text>
      <Text style={[dirType.body, styles.body]}>
        שלחנו קישור אימות ל-{user?.email}.{'\n'}
        בדקו את תיבת הדואר (כולל ספאם) ולחצו על הקישור.
      </Text>

      <TouchableOpacity style={styles.primaryBtn} onPress={handleCheck} disabled={checking}>
        {checking
          ? <ActivityIndicator color={dirApp.onPrimary} />
          : <Text style={styles.primaryBtnText}>אימתתי — בדוק שוב</Text>
        }
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryBtn} onPress={handleResend} disabled={resending}>
        {resending
          ? <ActivityIndicator color={dirApp.secondary} />
          : <Text style={styles.secondaryBtnText}>{resent ? 'נשלח שוב ✓' : 'שלח מייל אימות מחדש'}</Text>
        }
      </TouchableOpacity>

      <TouchableOpacity onPress={logout} style={styles.logoutLink}>
        <Text style={styles.logoutText}>התנתק</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, backgroundColor: dirApp.background },
  title: { color: dirApp.onSurface, marginTop: 20, marginBottom: 8, textAlign: 'center' },
  body: { color: dirApp.onSurfaceVariant, textAlign: 'center', marginBottom: 32, lineHeight: 24 },
  primaryBtn: { backgroundColor: dirApp.primaryContainer, borderRadius: 14, paddingVertical: 16, paddingHorizontal: 48, marginBottom: 12, minWidth: 260, alignItems: 'center' },
  primaryBtnText: { color: dirApp.onPrimary, fontWeight: '700', fontSize: 16 },
  secondaryBtn: { borderWidth: 1.5, borderColor: dirApp.secondary, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 48, marginBottom: 24, minWidth: 260, alignItems: 'center' },
  secondaryBtnText: { color: dirApp.secondary, fontWeight: '600', fontSize: 15 },
  logoutLink: { marginTop: 8 },
  logoutText: { color: dirApp.outline, fontSize: 14 },
});
```

- [ ] **Step 2: Add verification gate to AppNavigator**

In `mobile/src/navigation/AppNavigator.tsx`, import the new screen (after the TermsScreen import):

```tsx
import VerificationPendingScreen from '../screens/VerificationPendingScreen';
```

Update the `AppNavigator` root component (line 422-431) to add a verification gate:

```tsx
  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <RootStack.Screen name="Auth" component={AuthScreen} />
        ) : user?.isVerified === false ? (
          <RootStack.Screen name="VerifyEmail" component={VerificationPendingScreen} />
        ) : (
          <RootStack.Screen name="Main" component={MainNavigator} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
```

Also add `user` to the destructured values:

```tsx
  const { isAuthenticated, isLoading, restoreSession, user } = useAuthStore();
```

- [ ] **Step 3: Add VerifyEmail to RootStackParamList**

In `mobile/src/types/index.ts`, add `VerifyEmail` to `RootStackParamList`:

```tsx
VerifyEmail: undefined;
```

- [ ] **Step 4: Test manually**

1. Register new user → should see VerificationPendingScreen (not Home)
2. Click "אימתתי — בדוק שוב" → still on verification (isVerified still false)
3. Login as admin2 (isVerified: true) → goes straight to AdminTabs
4. Login as existing verified user → goes to Home

- [ ] **Step 5: Commit**

```bash
git add mobile/src/screens/VerificationPendingScreen.tsx mobile/src/navigation/AppNavigator.tsx mobile/src/types/index.ts
git commit -m "feat(auth): add email verification gate — unverified users see pending screen (QA-002)

New VerificationPendingScreen with resend + check buttons.
Gate chain: isAuthenticated → isVerified → MainNavigator → ToS → Tabs.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Phase B — Design Consistency

### Task 4: Fix logo in auth screens (B1)

**Files:**
- Modify: `mobile/src/screens/AuthScreen.tsx` (or wherever the login/register are wrapped)
- Modify: `mobile/src/components/SwipeHouseLogo.tsx`

- [ ] **Step 1: Update SwipeHouseLogo to use vector fallback on dark backgrounds**

The current `SwipeHouseLogo` uses a raster PNG that shows checkerboard. Update `mobile/src/components/SwipeHouseLogo.tsx` to remove the `plate` wrapper and use `plate={false}` by default, plus set `tintColor` for dark backgrounds:

```tsx
export default function SwipeHouseLogo({ size = 'md', plate = false }: Props) {
```

This removes the gray plate background by default.

- [ ] **Step 2: Verify login/register screens look clean**

Reload `apartment-olive.vercel.app` → login screen should show the logo without gray box.

- [ ] **Step 3: Commit**

```bash
git add mobile/src/components/SwipeHouseLogo.tsx
git commit -m "fix(ui): remove gray plate from logo — plate=false by default (QA-D01)

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 5: Hebrew tab labels + violet removal (B2 + B3)

**Files:**
- Modify: `mobile/src/navigation/AppNavigator.tsx:152,202`
- Modify: `mobile/src/screens/HomeScreen.tsx:445`

- [ ] **Step 1: Change 'Home' tab label to Hebrew**

In `mobile/src/navigation/AppNavigator.tsx`:

Line 152 (TenantTabs):
```tsx
      <TenantTab.Screen name="Home"    component={HomeScreen}    options={{ title: 'בית' }} />
```

Line 202 (LandlordTabs):
```tsx
      <LandlordTab.Screen name="Home"      component={HomeScreen}        options={{ title: 'בית' }} />
```

- [ ] **Step 2: Replace violet with design system color in HomeScreen**

In `mobile/src/screens/HomeScreen.tsx`, line 445:

```tsx
// OLD:
    backgroundColor: C.accent.violet,
// NEW:
    backgroundColor: dirApp.primaryContainer,
```

Also check line 36 for the landlord service tile color — leave it as-is since it's a small accent in a tile, not a large block.

- [ ] **Step 3: Commit**

```bash
git add mobile/src/navigation/AppNavigator.tsx mobile/src/screens/HomeScreen.tsx
git commit -m "fix(ui): Hebrew tab labels + replace violet card with design system navy (QA-D02, QA-D03)

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 6: Apply Rubik fonts to auth screens (B4 — part 1)

**Files:**
- Modify: `mobile/src/screens/LoginScreen.tsx`
- Modify: `mobile/src/screens/RegisterScreen.tsx`

- [ ] **Step 1: Add dirType imports and apply to LoginScreen**

In `mobile/src/screens/LoginScreen.tsx`, add import:

```tsx
import { dirType } from '../theme/textStyles';
import { fontFamily } from '../theme/fonts';
```

Update styles (around line 108):
```tsx
  title: { ...dirType.hero, color: dirApp.primary, textAlign: 'right', marginBottom: 4 },
  subtitle: { ...dirType.caption, color: dirApp.outline, textAlign: 'right', marginBottom: 28 },
  input: {
    ...dirType.body,
    backgroundColor: dirApp.surfaceContainerLowest,
    // ... rest stays same
  },
  buttonText: { ...dirType.subhead, color: C.onInverse.primary },
  errorText: { ...dirType.caption, color: C.danger, textAlign: 'right', marginBottom: 10, lineHeight: 20 },
  infoText: { ...dirType.caption, color: C.success, textAlign: 'right', marginBottom: 10, lineHeight: 20 },
  switchText: { ...dirType.label, color: dirApp.outline },
  switchLink: { ...dirType.label, color: dirApp.secondary, fontWeight: '700' },
```

- [ ] **Step 2: Apply same pattern to RegisterScreen**

Same approach — add `dirType` import, spread presets into style declarations.

- [ ] **Step 3: Verify font renders as Rubik in browser**

Reload login page → text should render in Rubik (check devtools → computed font-family).

- [ ] **Step 4: Commit**

```bash
git add mobile/src/screens/LoginScreen.tsx mobile/src/screens/RegisterScreen.tsx
git commit -m "fix(ui): apply Rubik fonts to Login + Register screens via dirType presets (QA-D04)

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 7: Apply Rubik fonts to HomeScreen + ProfileScreen (B4 — part 2)

**Files:**
- Modify: `mobile/src/screens/HomeScreen.tsx`
- Modify: `mobile/src/screens/ProfileScreen.tsx`

- [ ] **Step 1: Add dirType to HomeScreen styles**

In `mobile/src/screens/HomeScreen.tsx`, find all `fontWeight`/`fontSize` declarations in `StyleSheet.create` that don't use `fontFamily`. Replace with `dirType` spreads:

- Welcome title → `...dirType.hero`
- Welcome subtitle → `...dirType.body`
- Tile labels → `...dirType.subhead`
- Tile sublabels → `...dirType.caption`
- Journal card title → `...dirType.title`
- Journal card subtitle → `...dirType.body`

- [ ] **Step 2: Add dirType to ProfileScreen styles**

Same audit for `ProfileScreen.tsx`. Key styles:
- Username → `...dirType.hero`
- Email → `...dirType.body`
- Menu items → `...dirType.label`
- Badge text → `...dirType.caption`

- [ ] **Step 3: Commit**

```bash
git add mobile/src/screens/HomeScreen.tsx mobile/src/screens/ProfileScreen.tsx
git commit -m "fix(ui): apply Rubik fonts to Home + Profile screens (QA-D04 part 2)

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 8: Fix bottom tab padding overlap (B6)

**Files:**
- Modify: `mobile/src/screens/ProfileScreen.tsx`
- Modify: `mobile/src/screens/HomeScreen.tsx`

- [ ] **Step 1: Add paddingBottom to ProfileScreen scroll container**

In `mobile/src/screens/ProfileScreen.tsx`, find `styles.scroll` in `StyleSheet.create` and add bottom padding:

```tsx
  scroll: { paddingBottom: 100 },
```

If `scroll` style doesn't exist, add it to the `ScrollView`'s `contentContainerStyle`.

- [ ] **Step 2: Add paddingBottom to HomeScreen scroll container**

Same pattern in `HomeScreen.tsx` — find the `ScrollView` and ensure `contentContainerStyle` includes `paddingBottom: 100`.

- [ ] **Step 3: Verify no content is clipped by tab bar**

Scroll to bottom of Profile and Home screens — content should have clear space above the tab bar.

- [ ] **Step 4: Commit**

```bash
git add mobile/src/screens/ProfileScreen.tsx mobile/src/screens/HomeScreen.tsx
git commit -m "fix(ui): add paddingBottom to scrollable screens to clear tab bar (QA-D06)

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 9: Push and verify deployment

- [ ] **Step 1: Push all changes**

```bash
git push origin main
```

- [ ] **Step 2: Wait for Vercel build (~2 min)**

Check deployment status via Vercel MCP or dashboard.

- [ ] **Step 3: Verify on production**

1. Register new user → should see VerificationPendingScreen
2. Login as admin2 → AdminTabs (no ToS, no verification gate)
3. Login as admin@ (has ToS) → TenantTabs with working apartment feed
4. Check logo renders cleanly (no gray box)
5. Check all tab labels are Hebrew
6. Check HomeScreen card is navy (not purple)
7. Check fonts are Rubik across Login, Home, Profile

- [ ] **Step 4: Update MASTER.md + BUGS.md with results**
