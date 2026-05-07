# Spec: Apartment Detail — Image Carousel + Contact Action Bar

**Date:** 2026-05-06  
**Status:** Approved  
**Scope:** `mobile/src/screens/ApartmentDetailScreen.tsx`, `mobile/src/types/index.ts`, `mobile/src/screens/MatchesScreen.tsx`

---

## Problem

1. `ApartmentDetailScreen` renders `undefined` for all apartment fields because the API response is `{ apartment: {...} }` but the query returns `r.data` instead of `r.data.apartment`.
2. The image carousel code exists but never displays images because of the above data bug.
3. There is no way for a tenant to contact the landlord from the detail screen.

---

## Goals

1. Fix image carousel so listings with images display them.
2. Add a persistent contact action bar at the bottom of the detail screen.
3. Keep the screen crash-free and type-safe.

---

## Non-Goals

- Creating matches from the detail screen.
- Editing or deleting listings from the detail screen.
- Push notifications on WhatsApp link click.

---

## Design

### 1. API Response Unwrap Fix

**File:** `ApartmentDetailScreen.tsx`

```ts
queryFn: () => apartmentsApi.getById(apartmentId).then((r) => r.data.apartment ?? r.data),
```

This is already applied in the working branch. It ensures all fields (`rooms`, `floor`, `price`, etc.) resolve correctly.

---

### 2. Image Carousel

**Location:** Top of the scroll area, existing `ScrollView` horizontal carousel.

**Image shape guard:** Images can arrive as `ApartmentImage` objects (`{ url, publicId }`) or plain strings. A helper normalises them:

```ts
function getImageUrl(img: unknown): string | null {
  if (typeof img === 'string') return img;
  if (img && typeof (img as any).url === 'string') return (img as any).url;
  return null;
}
```

**Behaviour:**
- ≥1 valid image → horizontal paginated `ScrollView` with dot indicators.
- 0 valid images → existing house-icon placeholder (`noImagePlaceholder` style).
- Dot indicator updates via `onMomentumScrollEnd` → `setActiveImage(index)`.

No changes to existing carousel markup or styles are needed once the data bug and the shape guard are in place.

---

### 3. Navigation Type Update

**File:** `mobile/src/types/index.ts`

```ts
ApartmentDetail: { apartmentId: string; matchId?: string };
```

`matchId` is optional. It is only passed when navigating from `MatchesScreen`.

---

### 4. MatchesScreen — Pass matchId

**File:** `mobile/src/screens/MatchesScreen.tsx`

When a match card is tapped, navigate to the detail screen with both IDs:

```ts
navigation.navigate('ApartmentDetail', {
  apartmentId: match.apartmentId,
  matchId: match.id,
});
```

Currently `MatchesScreen` does not navigate to `ApartmentDetail` at all — this adds that navigation path.

---

### 5. Contact Action Bar

**Location:** Fixed bar at the bottom of `ApartmentDetailScreen`, rendered outside the `ScrollView` but inside `SafeAreaView`. The `ScrollView` gets `paddingBottom: 80` so content is never hidden under the bar.

**Visibility rules:**

| Condition | WhatsApp button | Chat button |
|---|---|---|
| `apt.landlord.phone` present | ✅ shown | — |
| `matchId` param present | — | ✅ shown |
| Neither | bar not rendered | — |
| Both | both shown side by side | |

**WhatsApp button:**
- Background: `#25D366`
- Icon: `logo-whatsapp` (Ionicons)
- Label: `WhatsApp`
- Action: `Linking.openURL('https://wa.me/972XXXXXXXXX?text=...')`
- Phone normalisation: strip leading `0`, replace with `972`; strip `+972` prefix and re-add `972`

**Pre-filled WhatsApp message (Hebrew):**
```
היי, ראיתי את הדירה "${apt.title}" ב-DirApp ואשמח לשמוע פרטים 🏠
```

**Chat button:**
- Background: `#6C5CE7` (DirApp brand purple)
- Icon: `chatbubble-outline` (Ionicons)
- Label: `פתח צ'אט`
- Action: `navigation.navigate('Chat', { matchId, title: apt.title })`
- Only rendered if `matchId` param is defined

**Layout:**
- `flexDirection: 'row'`, `gap: 10`, `padding: 16`
- Each button: `flex: 1`, `height: 48`, `borderRadius: 14`
- Stacked icons + text horizontally inside each button

---

### 6. Error Handling

- If `Linking.openURL` fails (device has no WhatsApp): error is silently caught. No alert shown — standard behaviour for deep links.
- If `matchId` is stale or invalid, `ChatScreen` already handles errors gracefully.

---

### 7. Files Changed

| File | Change |
|---|---|
| `mobile/src/screens/ApartmentDetailScreen.tsx` | Unwrap fix, image guard, contact bar |
| `mobile/src/types/index.ts` | Add `matchId?` to `ApartmentDetail` param |
| `mobile/src/screens/MatchesScreen.tsx` | Navigate to `ApartmentDetail` with `matchId` |

No backend changes required.

---

## Success Criteria

- [ ] Listings with images show the carousel; listings without images show the placeholder
- [ ] `apt.rooms`, `apt.floor`, `apt.price` all render real values (not `undefined`)
- [ ] WhatsApp button opens `wa.me` link with pre-filled Hebrew message
- [ ] Chat button navigates to existing `ChatScreen` with correct `matchId`
- [ ] Landlord viewing their own listing (no `matchId`) sees no contact bar
- [ ] Tenant viewing listing from swipe feed (no `matchId`) sees WhatsApp only (if phone available)
- [ ] No TypeScript errors, no linter errors
