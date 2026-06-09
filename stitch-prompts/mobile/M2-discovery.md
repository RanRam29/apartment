# M2: Apartment Discovery Flow (Tenant)

PLATFORM: Mobile App (390×844). RTL Hebrew. Font: Rubik.
COLORS: Primary #002045, CTA #00cba9, Bg #f8f9ff, Text #0b1c30

Build 5 screens. All states required.

---

## Screen 1 — Swipe Screen (Tenant home tab)
- Top bar: DirApp logo (right) | quota "12/20" segment bar (center) | filter + deck count "47 דירות" (left)
- Stacked apartment cards (main visible, next peeking 8px behind):
  - Image (full width, 55% height, rounded 12px top)
  - Gradient overlay bottom → price badge "₪4,500/חודש" white
  - Card body: address "רוטשילד 42, תל אביב" + "3 חדרים · 75 מ²" + feature chips ("חניה" "מעלית" "מרפסת") + Trust Score badge "87"
- Action buttons (64px circles): ❌ red (pass) | ⭐ gold (superlike) | 💚 green (like)
- Undo FAB: "↩️ בטל" appears 4.5sec after swipe (bottom-right)
- Bottom tabs: 🏠 בית (active) | 🔍 חיפוש | 💚 התאמות | 💬 הודעות | 👤 פרופיל
- **States:**
  - Loading: 3 skeleton cards
  - Normal: card stack
  - Empty: illustration + "!סיימת! חזור מחר לדירות חדשות 🎉" + "שנה העדפות" link
  - Quota exceeded: modal "הגעת למגבלה היומית" + "שדרג לפרימיום" button + "המשך מחר" link
  - Match: modal — confetti + "!יש התאמה" + apartment + landlord avatar + "שלח הודעה" + "המשך"
  - Error: "שגיאה בטעינת דירות" + retry

## Screen 2 — Search Screen (Tenant tab)
- Search pill: 🔍 + "...חפש דירה, שכונה, או תאר במילים שלך" + clear + tune icon
- Filter chips (horizontal scroll): "מחיר" "חדרים" "חיות" "חניה" "מעלית" "מרפסת" "ממ"ד" — tap to toggle
- Expanded filter (on tune tap): city dropdown + rooms pills (1-5+) + price min/max + "סנן" button + "נקה הכל"
- AI badge (after NLP): "AI מצא: תל אביב, 3 חדרים, עד ₪5,000, חניה" blue card
- Results: FeaturedResultCard (first, large image) + RegularResultCard list (thumbnail 80px + details)
- View toggle: list/map
- "נמצאו 47 דירות" count
- **States:** initial (suggestion chips), loading, results, no results, search history panel, error

## Screen 3 — Map Screen (Tenant tab)
- Full-screen map (OpenStreetMap)
- Top overlay: location pill "תל אביב" | TAMA38 toggle | list/map toggle
- Price markers: "₪4,500" teal pins (normal), gold (promoted). Tap → popup with details + "פרטים" link
- TAMA38 layer: green semi-transparent polygons (when toggled)
- Bottom carousel (horizontal snap, synced with map): mini cards (280×160) — image + price + address + rooms
- Location FAB: 📍 reset view
- **States:** loading, loaded, empty area, TAMA on/off

## Screen 4 — Apartment Detail (scrollable full screen)
- Floating back button (top-right, RTL)
- Image carousel (380px, pagination dots, tap → full-screen viewer with pinch zoom)
- Luxury badge "פרימיום" (if ≥₪15,000, gold chip)
- Address: "רוטשילד 42, תל אביב — פלורנטין" (Bold 22px)
- Price: "₪9,200/חודש" (#00cba9, Bold 28px)
- Stats: 🛏 3 חדרים | 🏢 קומה 5/8 | 📐 75 מ² | 👁 234 צפיות
- Chips: "פנוי מ-01.07" | "מינימום 12 חודשים" | "חיות מותר ✓"
- True Monthly Cost card: שכירות ₪9,200 + ארנונה ₪450 + ועד ₪250 = **סה"כ ₪9,900** (#00cba9)
- Amenities grid (4 cols): ✓ green / ✗ gray for each
- Description (expandable, 3 lines + "קרא עוד")
- Landlord card: avatar 48px + name + Trust Score "92" + verified ✓ + "צפה בפרופיל"
- Compatibility: "התאמה: 85%" circular progress + mini bars
- Sticky CTA bottom: price + "אני מעוניין/ת" button (#00cba9). Owner view: "ערוך מודעה" instead
- **States:** loading, loaded, image viewer modal, owner view, already liked ("כבר הבעת עניין" disabled)

## Screen 5 — Landlord Profile (modal)
- Back button (top-right)
- Avatar 96px centered
- Name (Bold 22px) + "משכיר מאומת ✓" green chip
- Trust Score: 92/100 circular gradient ring
- Stats: "12 נכסים" | "4.8 ★" | "עונה תוך 2 שעות"
- Bio text
- Active listings: horizontal scroll mini property cards
- "שלח הודעה" button (#00cba9, full width)
- **States:** loading, loaded, no listings
