# DirApp — Stitch Design Prompts (Complete Flows)
> **Version:** 1.0 | **Date:** 2026-06-07
> **App:** DirApp — Israeli Smart Rental Marketplace
> **Direction:** RTL (Hebrew-first)
> **Font:** Rubik (Google Fonts)
> **Platforms:** Mobile (390×844) + Web Desktop (1440×900)

---

## IMPORTANT INSTRUCTIONS FOR STITCH

```
GLOBAL RULES — APPLY TO EVERY PROMPT BELOW:

1. COMPLETE FLOWS: Every prompt describes a FULL user flow. Build ALL screens
   listed — do not skip any screen, do not ask "should I add more screens?"
   Every screen listed is required.

2. ALL ACTORS: Each flow involves multiple user roles (tenant, landlord, admin,
   guarantor, system). Build the screen from EACH actor's perspective as specified.

3. ALL STATES: Every screen has multiple states (loading, empty, error, success,
   edge cases). Build all of them.

4. DESIGN SYSTEM: Use these tokens consistently across ALL screens:
   - Primary (Trust Blue): #002045
   - Primary Container: #1a365d
   - Secondary (Teal): #006b5f
   - Action Teal (CTAs, active tabs, links): #00cba9
   - Secondary Container: #62fae3
   - Background: #f8f9ff
   - Surface Container: #e5eeff
   - On Surface (text): #0b1c30
   - On Surface Variant: #43474e
   - Outline: #74777f
   - Error: #ba1a1a
   - Error Container: #ffdad6
   - White: #ffffff
   - Font: Rubik (all weights)

5. PLATFORM DETECTION: Each prompt starts with either [MOBILE] or [WEB].
   - [MOBILE]: 390×844, single column, bottom tab bar, cards, bottom sheets, FAB
   - [WEB]: 1440×900, sidebar (260px, right side RTL, #002045 bg), top bar (64px),
     multi-column layout, tables, modals
   
6. RTL: Everything is right-to-left. Sidebar is on the RIGHT. Back arrows point RIGHT.
   Text aligns RIGHT. Navigation flows RIGHT to LEFT.

7. DO NOT ASK QUESTIONS. Everything you need is in each prompt. Just build it all.
```

---

# PART A — MOBILE SCREENS (390×844)

---

## FLOW M1: Onboarding & Authentication (7 screens)

```
PLATFORM: Mobile App (390×844, iPhone 14). React Native / Expo.
DIRECTION: RTL (Hebrew)
FONT: Rubik
COLORS: Primary #002045, CTA #00cba9, Background #f8f9ff, Text #0b1c30, Error #ba1a1a

Design the COMPLETE onboarding and authentication flow — 7 screens total.
Every screen listed below is REQUIRED. Build all states for each screen.

SCREEN M1-1 — SPLASH (1 screen):
- Full screen, gradient background #002045 → #1a365d
- DirApp logo centered (house icon + "דיראפ" text, white)
- Tagline below: "הדרך החכמה למצוא דירה" (white, Rubik Regular 16px)
- Loading spinner or progress indicator at bottom
- States: loading (with spinner), loaded (transitions to next)

SCREEN M1-2 — ONBOARDING CAROUSEL (3 slides in 1 screen):
- Background: #f8f9ff
- Progress pills at top (3 dots, active = Action Teal #00cba9)
- "דלג" (skip) link top-left
- Each slide has: illustration (240px), heading (Rubik Bold 24px), body text (Rubik Regular 16px)
  - Slide 1: Swipe illustration + "החלק ימינה לדירת חלומותיך" + "גלה דירות שמתאימות בדיוק לך עם AI חכם"
  - Slide 2: Contract illustration + "חוזה דיגיטלי מאובטח" + "העלה, חתום, ונהל — הכל מהאפליקציה"
  - Slide 3: Shield illustration + "אימות זהות ותשלומים בטוחים" + "KYC מובנה, לדג'ר תשלומים, ו-WhatsApp"
- "הבא" button (Action Teal, full width, 48px height) — on last slide changes to "בואו נתחיל!"
- States: slide 1 active, slide 2 active, slide 3 active

SCREEN M1-3 — AUTH SCREEN (Login tab):
- Tab selector top: "התחברות" | "הרשמה" — active tab underlined in Action Teal
- LOGIN TAB:
  - "ברוך הבא!" heading (Rubik Bold 28px, #002045)
  - Email input (icon: mail, placeholder: "אימייל", rounded 8px, border #c4c6cf)
  - Password input (icon: lock, show/hide eye toggle, placeholder: "סיסמה")
  - "שכחת סיסמה?" link (Action Teal, right-aligned)
  - "התחבר" button (Action Teal bg, white text, full width, 48px)
  - States: empty form, filled form, loading (button spinner), error (red border + message "אימייל או סיסמה שגויים"), success (navigate away)

SCREEN M1-4 — AUTH SCREEN (Register tab):
- Same tab selector, "הרשמה" active
- REGISTER TAB:
  - "הצטרף לדיראפ" heading
  - Role toggle: "שוכר" | "משכיר" (pill toggle, Action Teal active)
  - First Name input (placeholder: "שם פרטי")
  - Last Name input (placeholder: "שם משפחה")
  - Email input
  - Phone input (placeholder: "+972...")
  - Password input (with strength meter below: weak=red, medium=yellow, strong=green)
  - Confirm Password input
  - Checkbox: "אני מסכים/ה לתנאי השימוש ומדיניות הפרטיות" (links in Action Teal)
  - "הרשם" button (Action Teal, full width)
  - States: empty, filling (validation in real-time), password mismatch error, email taken error, loading, success

SCREEN M1-5 — EMAIL VERIFICATION PENDING:
- Centered layout on #f8f9ff
- Mail icon illustration (large, 120px, animated envelope)
- "בדוק את המייל שלך" title (Rubik Bold 24px)
- "שלחנו קוד אימות ל-" + email in bold
- 6-digit code input (6 individual boxes, 48×56px each, auto-focus next on digit entry)
- Timer: "שלח שוב בעוד 0:45" (gray) → at 0:00 becomes "שלח שוב" Action Teal link
- "אמת" button (Action Teal, full width)
- States: waiting for input, timer running, timer expired (resend active), invalid code (shake + red border), verifying (spinner), success (green check animation)

SCREEN M1-6 — ONBOARDING PREFERENCES (Tenant only, 4 steps):
- Progress dots at top (4 steps)
- Step 0 — WELCOME: emoji 👋, "ברוך הבא לדיראפ!", "נתאים לך דירות בול בשבילך", "בוא נתחיל" button
- Step 1 — BUDGET: emoji 💰, "מה התקציב שלך?", min/max sliders ₪1,000–₪15,000, "הבא" + "חזרה" buttons
- Step 2 — CITIES: emoji 🏙️, "איפה מחפש?", multi-select city chips (תל אביב, ירושלים, חיפה, באר שבע, etc.), "הבא" + "חזרה"
- Step 3 — FINISH: emoji 🎉, "מעולה! הכל מוכן", "הדירות כבר מחכות לך", "יאללה!" button → navigate to Swipe
- States per step: active step highlighted in Action Teal, completed steps show green checkmark

SCREEN M1-7 — TERMS OF SERVICE:
- Header: "תנאי שימוש"
- Scrollable text area (full height minus header and button)
- Hebrew legal text (lorem ipsum placeholder for design)
- Sticky bottom: "אישור והמשך" button (Action Teal, full width)
- "חזרה" back button in header
- States: scrolling, scrolled to bottom (button activates), accepted (navigate back with success)
```

---

## FLOW M2: Apartment Discovery — Tenant View (5 screens)

```
PLATFORM: Mobile App (390×844). React Native / Expo.
DIRECTION: RTL (Hebrew)
FONT: Rubik
COLORS: Primary #002045, CTA #00cba9, Background #f8f9ff, Text #0b1c30

Design the COMPLETE apartment discovery flow from the TENANT perspective — 5 screens.
This flow covers: browsing → swiping → searching → map → viewing apartment details.

SCREEN M2-1 — SWIPE SCREEN (Tenant home tab):
- Top bar:
  - Right: DirApp logo (small)
  - Center: daily quota display "12/20" (segment bar, 5 segments, filled proportionally)
  - Left: filter icon (opens preferences) + deck count badge "47 דירות"
- Main area: stacked apartment cards (main card visible, next card peeking 8px behind)
  - Card content:
    - Property image (full card width, 55% height, rounded 12px top)
    - Gradient overlay at bottom (transparent → rgba(0,0,0,0.7))
    - On image: price badge "₪4,500/חודש" (white, bg semi-transparent)
    - Below image (card body, white bg, padding 16px):
      - Address: "רוטשילד 42, תל אביב" (Rubik Bold 18px)
      - Details: "3 חדרים · 75 מ² · קומה 3" (Rubik Regular 14px, gray)
      - Feature chips: "חניה" "מעלית" "מרפסת" (small outlined chips)
      - Trust Score: small circular badge "87" (green gradient)
- Action buttons row (centered, below card, 24px spacing):
  - ❌ Pass — red circle (64px), white X icon
  - ⭐ Superlike — gold circle (56px), star icon
  - 💚 Like — green circle (64px), white heart icon
- Undo FAB: small floating button "↩️ בטל" appears 4.5sec after swipe (bottom-right)
- Keyboard hint (web only): "← דלג | → אהבתי | ↑ סופר לייק"
- Bottom tab bar: 🏠 בית (active) | 🔍 חיפוש | 💚 התאמות | 💬 הודעות | 👤 פרופיל

- STATES (build ALL):
  - Loading: 3 skeleton cards stacked
  - Normal: card stack with actions
  - Empty: all swiped — illustration + "סיימת! חזור מחר לדירות חדשות 🎉" + "שנה העדפות" link
  - Quota exceeded: modal overlay "הגעת למגבלה היומית (20 החלקות)" + "שדרג לפרימיום" Action Teal button + "המשך מחר" gray link
  - Match celebration: modal — confetti animation + "!יש התאמה" title + apartment image + landlord avatar + "שלח הודעה" button + "המשך להחליק" link
  - Error: "שגיאה בטעינת דירות" + retry button
  - Landlord-mode error: "מצב משכיר פעיל — עבור למצב שוכר כדי להחליק"

SCREEN M2-2 — SEARCH SCREEN (Tenant tab):
- Top: search pill input (icon 🔍 + "חפש דירה, שכונה, או תאר במילים שלך..." + clear X + tune icon)
- Below search: filter chips row (horizontal scroll):
  - "מחיר" "חדרים" "חיות" "חניה" "מעלית" "מרפסת" "ממ״ד"
  - Tapping chip toggles it (filled = active)
- Expanded filter panel (when tune icon tapped):
  - City selector (searchable dropdown)
  - Rooms selector: 1 | 1.5 | 2 | 2.5 | 3 | 3.5 | 4 | 5+ (horizontal pill selector)
  - Price inputs: min ₪__ — max ₪__
  - "סנן" (apply) Action Teal button + "נקה הכל" link
- AI parsed badge (shown after NLP search): "AI מצא: תל אביב, 3 חדרים, עד ₪5,000, חניה" (blue info card)
- Results section:
  - First result: FeaturedResultCard (large image 200px, gradient overlay, price + address + specs)
  - Remaining: RegularResultCard list (thumbnail 80px left, title + price + address + chips right)
  - Each card: heart icon (toggle favorite)
- View toggle: list/map
- "נמצאו 47 דירות" results count
- STATES: empty (initial — show suggestions chips), loading (skeleton), results, no results ("לא נמצאו דירות — נסה לשנות חיפוש"), search history panel (recent searches with delete), error

SCREEN M2-3 — MAP SCREEN (Tenant tab):
- Full-screen map (OpenStreetMap tiles)
- Top overlay bar:
  - Location pill: "תל אביב" with pin icon
  - TAMA 38 toggle: switch to show urban renewal zones
  - View switcher: map/list toggle
- Map markers:
  - Price label markers: "₪4,500" on teal pins (normal), gold pins (promoted)
  - Tap marker → popup: apartment title, price, rooms, "פרטים" link
  - TAMA 38 layer: semi-transparent green polygons when toggled on
- Bottom carousel (horizontal snap scroll, synced with map):
  - Mini apartment cards (280×160px): image + price + address + rooms + sqm
  - Scrolling carousel pans map to matching marker
  - Tap card → navigate to ApartmentDetail
- Location FAB: "📍" button to reset map view
- STATES: loading (map loading), loaded (markers), empty (no results in area), TAMA layer on/off

SCREEN M2-4 — APARTMENT DETAIL (scrollable, full screen):
- Floating back button (top-right for RTL, circular, white bg, shadow)
- Image carousel: horizontal scroll, 380px height, pagination dots below
  - Tap image → full-screen image viewer modal (pinch to zoom, swipe to navigate)
- Luxury badge: "פרימיום" (gold chip, if rent ≥ ₪15,000)
- Title section:
  - Address: "רוטשילד 42, תל אביב — פלורנטין" (Rubik Bold 22px)
  - Price: "₪9,200/חודש" (Action Teal, Rubik Bold 28px)
  - Verified badge: "מאומת ✓" green chip
- Stats row (4 items, icons + values):
  - 🛏 "3 חדרים" | 🏢 "קומה 5/8" | 📐 "75 מ²" | 👁 "234 צפיות"
- Detail chips: "פנוי מ-01.07" | "מינימום 12 חודשים" | "חיות מותר ✓"
- True Monthly Cost card (elevated card, bordered):
  - "עלות חודשית אמיתית" heading (Rubik SemiBold 16px)
  - Row: "שכירות" — "₪9,200"
  - Row: "ארנונה (הערכה)" — "₪450"
  - Row: "ועד בית" — "₪250"
  - Divider
  - Total row: "סה״כ" — "₪9,900" (Action Teal, Bold)
  - Disclaimer: "* סכומים מוערכים, ייתכנו שינויים" (caption gray)
- Amenities grid (4 columns): חניה ✓ | מעלית ✓ | מרפסת ✓ | ממ"ד ✓ | מיזוג ✓ | מחסן ✗ | ריהוט ✗ | חיות ✓
  - Each: icon + label + ✓ (green) or ✗ (gray)
- Description: expandable text block (3 lines → "קרא עוד" link)
- Landlord card (elevated):
  - Avatar (48px) + name + Trust Score badge "92" + verified badge
  - "צפה בפרופיל" link
- Compatibility card (if user has preferences):
  - "התאמה: 85%" with circular progress ring
  - Mini bars: תקציב, מיקום, אורח חיים, שירותים
- Sticky CTA bar (bottom, shadow, white bg):
  - Price: "₪9,200/חודש"
  - "אני מעוניין/ת" button (Action Teal, 48px) — creates match/like
  - If user is owner: "ערוך מודעה" button instead
- STATES: loading (skeleton), loaded, image viewer modal open, owner view (edit button), already liked (button disabled "כבר הבעת עניין")

SCREEN M2-5 — LANDLORD PROFILE (modal):
- Back button (top-right)
- Avatar (96px, centered)
- Name: "דוד כהן" (Rubik Bold 22px)
- Verified badge: "משכיר מאומת ✓" (green chip)
- Trust Score: large circular badge "92/100" with gradient ring
- Stats row: "12 נכסים" | "4.8 ★ דירוג" | "עונה תוך 2 שעות"
- Bio/about: text block
- Active listings section: horizontal scroll of mini property cards
  - Each: image thumbnail + address + price
  - Tap → navigate to ApartmentDetail
- "שלח הודעה" button (Action Teal, full width) — opens chat
- STATES: loading, loaded, no listings ("אין נכסים פעילים")
```

---

## FLOW M3: Match & Chat — Both Actors (5 screens)

```
PLATFORM: Mobile App (390×844). React Native / Expo.
DIRECTION: RTL (Hebrew)
FONT: Rubik
COLORS: Primary #002045, CTA #00cba9, Background #f8f9ff, Text #0b1c30

Design the COMPLETE matching and chat flow — 5 screens.
This flow involves TWO actors: tenant (waiting for approval) and landlord (approving/rejecting).
Build screens for BOTH perspectives.

SCREEN M3-1 — MATCHES LIST (Tenant view):
- Header: "ההתאמות שלי" (Rubik Bold 22px)
- Tabs: "הכל" | "ממתין" | "אושר" (underline active = Action Teal)
- Match cards (vertical list, separated by 12px):
  - Property thumbnail (80×80px, rounded 8px) on right (RTL)
  - Content (left of image):
    - Address: "רוטשילד 42, ת״א" (Rubik SemiBold 16px)
    - Price: "₪4,500/חודש" (Rubik Regular 14px)
    - Date: "הותאם לפני 2 ימים" (caption, gray)
  - Status badge (left edge):
    - "ממתין לאישור" — yellow bg, dark text
    - "אושר ✓" — green bg, white text
    - "נדחה" — red bg, white text
  - Unread messages badge: red circle "3" (if has unread)
  - Tap → navigate to Chat
- STATES:
  - Loading: skeleton cards
  - Empty: illustration + "עוד אין התאמות! המשך להחליק כדי למצוא דירה 🏠"
  - Populated: list of match cards
  - Tab: all / pending only / accepted only

SCREEN M3-2 — MATCHES LIST (Landlord view — same screen, different content):
- Same header and tabs
- Landlord sees: tenant avatar + tenant name + which property + compatibility score
- Match card content:
  - Tenant avatar (48px, circular) + name
  - "מעוניין ב: רוטשילד 42" (which property)
  - Compatibility: "התאמה: 87%" mini progress bar
  - AI lead score badge: green "ליד איכותי" / yellow "בינוני" / red "חלש"
  - Trust Score: "87" small badge
- For PENDING tab — action buttons on each card:
  - "אשר ✓" green button (40px height)
  - "דחה ✗" red outline button (40px height)
  - Tapping "אשר" → confirm dialog "לאשר את ישראל ישראלי?" → Yes/No
  - Tapping "דחה" → confirm dialog "לדחות?" → Yes/No
- For ACCEPTED tab — "פתח צ'אט" button
- STATES: loading, empty ("אין לידים חדשים"), pending leads, accepted leads, confirm dialog

SCREEN M3-3 — CHAT LIST (Both actors):
- Header: "הודעות" (Rubik Bold 22px)
- Search bar: "חפש שיחה..." (rounded input, search icon)
- Conversation items (vertical list):
  - Avatar (48px, circular) + online dot (green, 12px, bottom-right of avatar)
  - Name (Rubik SemiBold 16px, bold if unread)
  - Last message preview (1 line, Rubik Regular 14px, gray, truncated)
  - Timestamp (top-left for RTL): "14:32" or "אתמול" or "12.06"
  - Unread count badge: red circle with number (e.g., "3")
  - Property context line: "לגבי: רוטשילד 42" (small, gray)
- Tap conversation → navigate to Chat screen
- STATES: loading (skeleton), empty ("אין שיחות עדיין. אשר התאמה כדי להתחיל!"), populated, search active (filtered results)

SCREEN M3-4 — CHAT CONVERSATION (Both actors):
- Header bar:
  - Back arrow (right, RTL)
  - Avatar (32px) + name + "מחובר" green dot / "לא מחובר" gray
  - "⋯" more menu (block user, view profile)
- Property context banner (top, below header):
  - Mini apartment card: small image + address + price
  - Tap → navigate to ApartmentDetail
- Messages area (scrollable):
  - Date separators: centered pill "היום" | "אתמול" | "12 ביוני"
  - Sent messages (right side, RTL): Action Teal (#00cba9) bg bubble, white text
    - Rounded 16px, sharp corner bottom-right
    - Timestamp below: "14:32" + read receipt ✓✓ (blue=read, gray=delivered)
  - Received messages (left side): #e5eeff bg bubble, dark text
    - Rounded 16px, sharp corner bottom-left
    - Timestamp below: "14:30"
  - Typing indicator: 3 animated dots in a bubble (shown when other party types)
- Input bar (bottom, 56px):
  - Attachment button: 📎 icon (gray)
  - Text input: "הקלד הודעה..." (flex, rounded, expandable multiline, max 2000 chars)
  - Send button: Action Teal circle with ➤ arrow icon (disabled when empty, enabled when text)
- STATES: loading (spinner), loaded empty ("שלח הודעה ראשונה! 👋"), populated, typing indicator visible, sending (message appears with clock icon), sent (single check), delivered (double check gray), read (double check blue), error ("שגיאה בשליחה — נסה שוב")

SCREEN M3-5 — LEAD DETAIL (Landlord only, modal/bottom sheet):
- Triggered when landlord taps a lead to see more info before approving
- Tenant avatar (80px) + name + age
- Trust Score: large circular "87/100" with gradient ring
- AI Lead Qualification: "ליד איכותי — 92%" green badge
- Compatibility breakdown (horizontal bars):
  - תקציב: 90%
  - מיקום: 85%
  - אורח חיים: 80%
  - העדפות כלליות: 88%
- Renter Journal summary:
  - "3 חוזים קודמים" | "0 איחורים" | "24 חודשים ותק"
- Contact info: phone + email (if shared after match)
- Action buttons (bottom, sticky):
  - "אשר והמשך לצ'אט" (Action Teal, full width, 48px)
  - "דחה" (red outline, full width, 40px)
  - "שלח הודעה קודם" (gray outline)
- STATES: loading, loaded, approve confirm dialog, reject confirm dialog
```

---

## FLOW M4: Contract Lifecycle — All Actors (8 screens)

```
PLATFORM: Mobile App (390×844). React Native / Expo.
DIRECTION: RTL (Hebrew)
FONT: Rubik
COLORS: Primary #002045, CTA #00cba9, Background #f8f9ff, Text #0b1c30

Design the COMPLETE contract lifecycle — 8 screens.
This flow involves: Landlord (creates, uploads, signs), Tenant (reviews, signs, verifies),
Guarantor (invited, KYC, signs), Admin (overrides), and System (AI analysis, state transitions).

SCREEN M4-1 — CONTRACTS LIST (Both actors):
- Header: "החוזים שלי" (Rubik Bold 22px) + "+" FAB button (Action Teal, bottom-right)
- Contract cards (vertical list):
  - Property thumbnail (60×60px, rounded 8px) on right
  - Content:
    - Address: "רוטשילד 42, ת״א"
    - Dates: "01.07.2026 — 30.06.2027"
    - Rent: "₪4,500/חודש"
  - Status badge (colored by state):
    - "טיוטה" — gray bg
    - "ממתין לחתימה" — yellow bg
    - "פעיל ✓" — green bg, white text
    - "פג בקרוב ⚠️" — orange bg
    - "הסתיים" — red bg
  - Progress bar: thin bar showing position in contract timeline (green filled)
  - Tap → navigate to Contract Detail
- FAB "+" → navigate to Contract Upload (Landlord only)
- STATES: loading (skeleton), empty ("אין חוזים — המשכיר צריך ליצור חוזה ראשון"), populated, error

SCREEN M4-2 — CONTRACT UPLOAD (Landlord only):
- Header: "העלה חוזה חדש" + back button
- STEP 1 — UPLOAD FILE:
  - Large dashed border upload zone (full width, 200px height)
  - Cloud upload icon (centered, 64px, gray)
  - "גרור קובץ או לחץ לבחירה" text
  - "PDF, DOCX — עד 10MB" (caption, gray)
  - On file selected: file name + size + ✗ remove + progress bar
  - "העלה ונתח" button (Action Teal)
- STEP 2 — AI ANALYSIS (auto-transitions after upload):
  - Loading state: animated Gemini logo + "AI מנתח את החוזה..." + progress bar
  - Results:
    - "ניתוח AI הושלם ✓" success banner
    - Extracted fields as editable form:
      - כתובת (address) — value + confidence badge (high ✓ green / medium ⚠ yellow / low ✗ red)
      - תאריך התחלה — date picker
      - תאריך סיום — date picker
      - שכר דירה — number input
      - פיקדון — number input
      - שם משכיר — text
      - שם שוכר — text
    - "אשר פרטים" button (Action Teal)
- STEP 3 — ASSIGN PARTIES:
  - "הזמן שוכר" — search by email/name input
  - "הזמן ערב (אופציונלי)" — email input
  - "שלח לחתימה" button (Action Teal)
  - Summary: "החוזה יישלח לחתימה ל-3 צדדים"
- STATES: initial (upload zone), file selected, uploading (progress), analyzing (AI loader), analysis results, editing extracted fields, assigning parties, sending invites, success ("החוזה נוצר ונשלח!"), error

SCREEN M4-3 — CONTRACT DETAIL (Both actors):
- Header: back button + status badge
- Status banner (full width, colored): "פעיל — בתוקף עד 30.06.2027" (green) or "ממתין לחתימתך" (yellow)
- Property image (200px height, full width)
- Contract info card:
  - Row: "משכיר" — "דוד כהן"
  - Row: "שוכר" — "ישראל ישראלי"
  - Row: "תאריך התחלה" — "01.07.2026"
  - Row: "תאריך סיום" — "30.06.2027"
  - Row: "שכ״ד חודשי" — "₪4,500"
  - Row: "פיקדון" — "₪9,000"
  - Row: "הצמדת מדד" — "כן — CPI שנתי"
- Contract timeline (horizontal progress dots):
  הועלה → ממתין → [חתום שוכר ✓] → [חתום משכיר ✓] → פעיל
  - Completed steps: green ✓
  - Current step: Action Teal dot
  - Future steps: gray dots
- Signatures section:
  - Landlord: signature preview or "ממתין ⏳" + timestamp
  - Tenant: signature preview or "ממתין ⏳" + timestamp
  - Guarantor: name + "מאושר ✓" green / "ממתין ⏳" yellow / "סורב ✗" red
- KYC status per party:
  - Each: name + "מאומת ✓" green badge / "ממתין" yellow / "נכשל" red
- Action buttons (varies by state and role):
  - PENDING_SIGN + tenant not signed: "חתום על החוזה" (Action Teal, full width)
  - PENDING_SIGN + landlord not signed: "חתום על החוזה" (Action Teal)
  - ACTIVE: "אמת בעלות" (secondary) + "הצע תיקון" (outline) + "הורד PDF" (outline)
  - EXPIRING: "חדש חוזה" (Action Teal) + "הורד PDF"
- Amendments section (if any):
  - List of proposed amendments
  - Each: description + proposed by + date + status (pending/approved/rejected)
  - "הצע תיקון חדש" link
- STATES: loading, all status views (UPLOAD/PENDING_SIGN/ACTIVE/EXPIRING/ENDED), KYC gate (blocked — "השלם אימות זהות לפני חתימה"), signing modal, amendment modal

SCREEN M4-4 — DIGITAL SIGNATURE (modal overlay):
- Triggered when user taps "חתום על החוזה"
- KYC gate check: if not verified → "עליך לעבור אימות זהות לפני חתימה" + "עבור לאימות" button → VerifyIdentityScreen
- If verified:
  - "חתימה דיגיטלית" heading
  - Contract summary (key terms in list)
  - Checkbox: "אני מאשר/ת שקראתי את החוזה ומסכים/ה לתנאיו"
  - Signature canvas (full width, 150px height, bordered)
    - "חתום כאן" placeholder text (gray, disappears on draw)
    - Drawing with finger/stylus
    - "נקה" link (top-left of canvas)
  - "חתום ואשר" button (Action Teal) — disabled until checkbox checked + signature drawn
  - "ביטול" link
- STATES: KYC blocked, ready to sign, drawing signature, signed (success animation + "החוזה נחתם בהצלחה! ✓"), error

SCREEN M4-5 — PROPOSE AMENDMENT (modal):
- "הצע תיקון לחוזה" heading
- Contract: "רוטשילד 42 — חוזה פעיל"
- Amendment description textarea: "תאר את השינוי המבוקש..." (max 500 chars)
- Category selector: "שכ״ד" | "תאריכים" | "תנאים" | "אחר" (chips)
- "שלח הצעה" button (Action Teal)
- Note: "ההצעה תישלח לצד השני לאישור"
- STATES: empty form, filling, sending (spinner), success ("ההצעה נשלחה! ✓"), error, max amendments reached ("הגעת למקסימום 10 תיקונים")

SCREEN M4-6 — AMENDMENT REVIEW (other party receives):
- Push notification: "הצעת תיקון חדשה לחוזה רוטשילד 42"
- Screen shows:
  - Amendment card: category badge + description + proposed by + date
  - Current vs proposed comparison (if applicable)
  - "אשר תיקון ✓" green button
  - "דחה תיקון ✗" red outline button
  - "שלח הודעה למציע" outline button
- STATES: loaded, approving (confirm dialog), rejecting (confirm dialog), approved success, rejected success

SCREEN M4-7 — KYC / VERIFY IDENTITY (Both actors):
- Header: "אימות זהות" + shield icon
- Current status card (top):
  - "לא אומת" — red badge + "נדרש אימות לפני חתימה על חוזים"
  - "בתהליך" — yellow badge + "ממתין לאישור — עד 24 שעות"
  - "מאומת ✓" — green badge + "זהותך אומתה בהצלחה" + verification date
- Steps visualization (vertical, 3 steps):
  1. "צלם תעודת זהות" — ID card icon — (completed ✓ / current → / future ○)
  2. "צלם סלפי" — camera icon
  3. "המתן לאישור" — clock icon
- Current step highlighted in Action Teal, completed in green
- "התחל אימות" button (Action Teal, full width) — launches Persona SDK
- Info text: "האימות לוקח עד 24 שעות. תקבל התראה כשיושלם."
- IF REJECTED: red alert card:
  - "האימות נכשל" heading
  - Specific reason text (e.g., "תמונה לא ברורה", "פרטים לא תואמים")
  - "נסה שוב" button
- IF TIMEOUT (24h): "פג הזמן לאימות — נסה שוב" + "התחל אימות חדש" button
- STATES: not started, in progress (pending), approved (green success), rejected (red + reasons + retry), timeout (expired + retry)

SCREEN M4-8 — OWNERSHIP VERIFICATION (Tenant only):
- Header: "אימות בעלות"
- Explanation: "כדי להבטיח שהדירה שייכת למשכיר, אנא אשר שראית הוכחת בעלות"
- Verification options:
  - "ראיתי נסח טאבו" checkbox
  - "ראיתי חוזה קודם" checkbox
  - "דיברתי עם ועד הבית" checkbox
  - "אחר" + text input
- "אשר בעלות" button (Action Teal)
- Note: "האישור שלך יתועד במערכת"
- STATES: form, confirmed success, already verified
```

---

## FLOW M5: Payments & Ledger — Both Actors (4 screens)

```
PLATFORM: Mobile App (390×844). React Native / Expo.
DIRECTION: RTL (Hebrew)
FONT: Rubik
COLORS: Primary #002045, CTA #00cba9, Background #f8f9ff, Text #0b1c30

Design the COMPLETE payment and ledger flow — 4 screens.
Actors: Tenant (reports payment), Landlord (confirms/rejects), System (auto-confirm 48h).

SCREEN M5-1 — LEDGER SCREEN (Both actors):
- Header: "תשלומי שכירות" + property address subtitle
- Contract/property selector (dropdown, if multiple contracts)
- Summary card (top, elevated):
  - Tenant view: "יתרה לתשלום: ₪4,500" (large, bold) + "תאריך פירעון: 1 ביולי 2026" + circular progress
  - Landlord view: "ממתין לאישור: 1 תשלום" + "הכנסה החודש: ₪4,500"
- Monthly rows (list, each row expandable):
  - Month: "יולי 2026" (right side, RTL)
  - Amount: "₪4,500"
  - Due date: "01.07.2026"
  - Status badge:
    - "שולם ✓" — green bg
    - "דווח — ממתין לאישור" — yellow bg
    - "ממתין" — gray bg
    - "באיחור" — red bg, bold
    - "אושר אוטומטית" — blue bg (48h auto-confirm)
  - Expand arrow → shows: payment date, receipt thumbnail (tap to enlarge), method, notes
  - Tenant action (for pending rows): "דווח על תשלום" button
  - Landlord actions (for reported rows): "אשר ✓" green + "דחה ✗" red
  - Auto-confirm countdown (for reported rows): "אישור אוטומטי בעוד 36 שעות" (caption gray)
- STATES: loading (skeleton), populated, empty ("אין שורות לדג'ר — החוזה טרם הופעל"), error

SCREEN M5-2 — REPORT PAYMENT (Tenant, bottom sheet):
- Header: "דווח על תשלום" + ✗ close
- Month: auto-filled with current pending month (editable dropdown)
- Amount: pre-filled "₪4,500" (editable)
- Payment date: date picker (defaults to today)
- Payment method: selector chips "העברה בנקאית" | "צ'ק" | "מזומן" | "Bit" | "אחר"
- Reference number: text input (optional)
- Receipt upload:
  - Dashed upload zone (camera icon + "צלם או בחר קבלה")
  - After upload: thumbnail preview + ✗ remove
  - "JPG, PNG, PDF — עד 5MB"
- Notes: textarea (optional, "הערות נוספות...")
- "שלח דיווח" button (Action Teal, full width)
- Note: "המשכיר יקבל התראה. אם לא יגיב תוך 48 שעות — התשלום יאושר אוטומטית."
- STATES: empty form, filling, uploading receipt (progress), submitting (spinner), success ("דיווח נשלח! ✓"), error

SCREEN M5-3 — CONFIRM/REJECT PAYMENT (Landlord, bottom sheet):
- Triggered when landlord taps on a REPORTED payment
- Header: "אישור תשלום" + ✗ close
- Payment details:
  - Month: "יוני 2026"
  - Amount reported: "₪4,500"
  - Payment date: "01.06.2026"
  - Method: "העברה בנקאית"
  - Reference: "#12345"
  - Receipt: thumbnail (tap to enlarge to full-screen viewer)
- Auto-confirm countdown: "אישור אוטומטי בעוד 36 שעות ⏳"
- Action buttons:
  - "אשר תשלום ✓" (green button, full width, 48px)
  - "דחה — בקש הוכחה נוספת" (red outline, full width)
- If rejecting: notes textarea appears "סיבת דחייה..." + "שלח דחייה" button
- STATES: loaded, confirming (dialog), confirmed success, rejecting (notes input), rejected success, receipt viewer modal

SCREEN M5-4 — PAYMENT REJECTED NOTICE (Tenant view):
- Push notification: "המשכיר דחה את דיווח התשלום ליוני"
- Screen shows:
  - Red alert card: "התשלום נדחה ✗"
  - Rejection reason: "הקבלה לא ברורה, נא לשלוח תמונה חדשה"
  - "דווח שוב" button (Action Teal) → opens Report Payment with same month
  - "צור קשר עם המשכיר" button (outline) → opens Chat
- STATES: loaded, navigating to report again, navigating to chat
```

---

## FLOW M6: Maintenance — All Actors (6 screens)

```
PLATFORM: Mobile App (390×844). React Native / Expo.
DIRECTION: RTL (Hebrew)
FONT: Rubik
COLORS: Primary #002045, CTA #00cba9, Background #f8f9ff, Text #0b1c30

Design the COMPLETE maintenance/service ticket flow — 6 screens.
Actors: Tenant (opens ticket), Landlord (responds, handles, invoices), System (24h escalation),
Admin (force-close), External (midrag.co.il deep link).

SCREEN M6-1 — MAINTENANCE TICKETS LIST (Both actors):
- Header: "תקלות ותחזוקה" + FAB "+" (bottom-right, Action Teal) for tenant
- Filter tabs: "הכל (8)" | "פתוח (2)" | "בטיפול (3)" | "נסגר (3)"
  - Active tab: Action Teal underline
- Ticket cards (vertical list):
  - Category icon (right side, RTL, 40px circle):
    🔧 אינסטלציה (blue) | ⚡ חשמל (yellow) | 🌡️ מיזוג (cyan) | 🚪 דלתות/חלונות (brown) | 🎨 צבע (purple) | 📦 כללי (gray)
  - Title: "נזילה בחדר אמבטיה" (Rubik SemiBold 16px)
  - Description: 2 lines max, truncated
  - Photo indicator: 📷 "2 תמונות" (if attached)
  - Status badge: "פתוח" (red) / "בטיפול" (yellow) / "ממתין לחשבונית" (orange) / "נסגר" (green)
  - Time: "נפתח לפני 3 שעות" — red text if >24h without response
  - Urgency: "🔴 דחוף" badge (if contains urgent keywords)
  - Tap → navigate to Ticket Detail
- STATES: loading, empty ("אין תקלות — מעולה! 🎉"), populated, filtered views, error

SCREEN M6-2 — CREATE TICKET (Tenant, bottom sheet or full screen):
- Header: "פתח תקלה חדשה" + ✗ close
- Property selector (dropdown — if multiple active contracts)
- Category selector: 6 icon cards in 2×3 grid
  - 🔧 אינסטלציה | ⚡ חשמל | 🌡️ מיזוג | 🚪 דלתות | 🎨 צבע | 📦 כללי
  - Tap to select (Action Teal border when active)
- Title input: "כותרת התקלה" (max 100 chars)
- Description textarea: "תאר את התקלה בפירוט..." (4 rows, max 500 chars)
- Urgency toggle: "דחוף 🔴" switch (off by default)
- Photo upload: horizontal scroll of upload slots (up to 5)
  - Each slot: dashed box with camera icon → tap to capture/select
  - Uploaded: thumbnail + ✗ remove
- WhatsApp notification: checkbox "שלח הודעה למשכיר ב-WhatsApp"
- "שלח תקלה" button (Action Teal, full width)
- STATES: empty form, category selected, filling, photos uploading, submitting, success ("התקלה נפתחה! המשכיר יקבל התראה"), error

SCREEN M6-3 — TICKET DETAIL (Both actors):
- Header: back button + ticket # + status badge
- Category icon + title (large)
- Status timeline (vertical, right-aligned for RTL):
  - 🟢 "נפתח — 15.06 14:32 — ישראל ישראלי"
  - 🟡 "בטיפול — 15.06 16:45 — דוד כהן: אני מטפל"
  - 🟠 "ממתין לחשבונית — 16.06 10:00"
  - ⚫ "נסגר — 16.06 14:00 — ישראל ישראלי"
  - Each step: colored dot + date + text + who
  - Current step: larger dot, pulsing
- Description text (full)
- Photos gallery: horizontal scroll of thumbnails, tap to expand full-screen
- Updates/comments thread (chat-like):
  - Each update: name + role badge + text + timestamp
  - Landlord can add responses inline
- LANDLORD ACTIONS (if status = OPEN):
  - "אני מטפל" button (Action Teal) → changes to IN_PROGRESS
  - "שלח טכנאי" button (outline) → opens technician assignment
  - "הצע פתרון חלופי" button (outline) → opens response modal
  - "פתח ב-midrag.co.il" button (outline, external link icon) → deep link
- LANDLORD ACTIONS (if IN_PROGRESS):
  - "העלה חשבונית" button → opens invoice upload
  - "סגור תקלה" button (if invoice uploaded)
- TENANT ACTIONS (if IN_PROGRESS or WAITING_INVOICE):
  - "אשר סגירה" button (green) → closes ticket
  - "עדיין לא טופל" button (red outline) → sends notification to landlord
- ADMIN ACTIONS:
  - "סגור תקלה (אדמין)" button (red) → force-close
- STATES: all status views (OPEN/IN_PROGRESS/WAITING_INVOICE/CLOSED), comment thread, photo viewer, response modal

SCREEN M6-4 — LANDLORD RESPONSE (modal):
- Triggered when landlord taps response action
- Response type selector:
  - "אני מטפל באופן אישי" (icon: person)
  - "שולח טכנאי" (icon: tool)
  - "מציע פתרון חלופי" (icon: lightbulb)
- Note textarea: "הוסף הערה..."
- Estimated time: "זמן טיפול משוער" dropdown: "היום" | "מחר" | "2-3 ימים" | "שבוע"
- "שלח תגובה" button
- STATES: selecting type, adding note, sending, success

SCREEN M6-5 — UPLOAD INVOICE (Landlord, bottom sheet):
- "העלה חשבונית" heading
- Amount input: "₪___" (number)
- Invoice upload zone: dashed box + camera icon
  - After upload: thumbnail + ✗ remove
- Description: "תיאור העבודה..." textarea
- "שלח חשבונית" button (Action Teal)
- Note: "החשבונית תישמר ב-R2 ותצורף לתקלה"
- STATES: empty, filling, uploading, submitted success

SCREEN M6-6 — ESCALATION NOTICE (System → Landlord & Admin):
- Push notification: "⚠️ תקלה #42 — 24 שעות ללא מענה"
- Notification card in Notifications screen:
  - Red border
  - "תקלה: נזילה בחדר אמבטיה"
  - "נפתחה לפני 24 שעות — טרם ניתן מענה"
  - "טפל עכשיו" button (Action Teal) → opens Ticket Detail
  - After 3 days: additional escalation "⚠️⚠️ 3 ימים ללא טיפול — הועבר לאדמין"
```

---

## FLOW M7: Check-In & Check-Out — Both Actors (4 screens)

```
PLATFORM: Mobile App (390×844). React Native / Expo.
DIRECTION: RTL (Hebrew)
FONT: Rubik
COLORS: Primary #002045, CTA #00cba9, Background #f8f9ff, Text #0b1c30

Design the COMPLETE property inspection flow — 4 screens.
Actors: Tenant (photographs rooms), Landlord (approves or requests fixes), System (auto-confirm after 3 rounds).
This flow is used TWICE: once for check-in (move in) and once for check-out (move out).

SCREEN M7-1 — CHECK-IN SCREEN (Both actors):
- Header: "צ'ק-אין — רוטשילד 42" + status badge ("בתהליך" yellow / "הושלם ✓" green)
- Progress bar: "4/6 חדרים הושלמו" (horizontal, Action Teal fill, percentage text)
- Room tabs (horizontal scroll):
  "מטבח" | "סלון" | "חדר שינה 1" | "חדר שינה 2" | "אמבטיה" | "מקלחת" | "+ חדר חדש"
  - Active tab: Action Teal underline
  - Completed rooms: ✓ green checkmark on tab
- Current room content:
  - Photo grid (3 columns, square thumbnails):
    - Each photo: thumbnail + ✗ remove overlay (tap to view full-screen)
    - Last slot: "+" dashed box + camera icon → opens camera/picker
    - Count: "7/20 תמונות" (per room max)
  - Notes textarea: "הערות לחדר זה..." (optional)
  - Room condition: star rating ⭐⭐⭐⭐⭐ (1-5, tap to rate)
- Bottom action bar (sticky):
  - TENANT view:
    - "שמור והמשך לחדר הבא" button (outline)
    - "שלח צ'ק-אין" button (Action Teal) — only when all rooms have at least 1 photo
  - LANDLORD view (after tenant submits):
    - "אשר צ'ק-אין ✓" green button
    - "בקש תיקון" orange button + round counter "סבב 1/3"
- STATES: initial (empty rooms), photographing (adding photos), room completed, all rooms done (submit active), submitted (waiting for landlord), landlord reviewing, approved (green banner "צ'ק-אין אושר!"), fix requested (orange banner "המשכיר ביקש תיקון — סבב 2/3"), auto-confirmed (after 3 rounds: blue banner "אושר אוטומטית"), error

SCREEN M7-2 — CHECK-OUT SCREEN (Both actors):
- Same structure as Check-In but with additions:
- Header: "צ'ק-אאוט — רוטשילד 42"
- Comparison mode: side-by-side photos from check-in vs check-out
  - Split view: "צ'ק-אין" (left) | "צ'ק-אאוט" (right) per room
  - Swipe between rooms
- Damage notes: additional textarea "תאר נזקים (אם יש)..."
- Condition change indicator: "מצב השתפר ↑" / "ללא שינוי =" / "נזק חדש ↓" (colored badges)
- Tenant: same photo upload + notes flow
- Landlord: same approve/request-fix flow with round counter
- STATES: same as check-in + comparison view, damage detected, deposit discussion trigger

SCREEN M7-3 — FIX REQUEST DETAIL (Tenant receives):
- Push notification: "המשכיר ביקש תיקון בצ'ק-אין — סבב 2/3"
- Screen shows:
  - Room name: "מטבח"
  - Landlord's note: "נא לצלם מקרוב את הכיור — תמונה לא ברורה"
  - Current photos from that room (thumbnail grid)
  - "צלם תמונות נוספות" button → opens camera for that room
  - "שלח מחדש" button (Action Teal)
  - Round counter: "סבב 2/3 — אם לא יאושר, יאושר אוטומטית בסבב הבא"
- STATES: fix request loaded, adding photos, resubmitted, auto-confirmed (round 3)

SCREEN M7-4 — INSPECTION SUMMARY (Both actors, after completion):
- Header: "סיכום צ'ק-אין" / "סיכום צ'ק-אאוט"
- Status: "הושלם ✓" green banner
- Per-room summary cards:
  - Room name + ✓ badge
  - Photo count: "12 תמונות"
  - Condition rating: ⭐⭐⭐⭐⭐
  - Notes (if any)
  - Tap to expand and view photos
- Rounds used: "אושר בסבב 1/3" or "אושר אוטומטית בסבב 3/3"
- Timestamps: submitted + approved dates
- "הורד דוח PDF" button (outline)
- STATES: loaded summary, photo viewer, PDF download
```

---

## FLOW M8: Guarantor — External Actor (1 screen in app, full web portal separately)

```
PLATFORM: Mobile App (390×844). React Native / Expo.
DIRECTION: RTL (Hebrew)
FONT: Rubik
COLORS: Primary #002045, CTA #00cba9, Background #f8f9ff, Text #0b1c30

Design the guarantor invitation flow from the LANDLORD's mobile perspective — 1 screen.
The guarantor's full portal is in the WEB section (Flow W-GUARANTOR).

SCREEN M8-1 — INVITE GUARANTOR (Landlord, from Contract Detail):
- Bottom sheet modal triggered from Contract Detail → "הזמן ערב"
- "הזמנת ערב לחוזה" heading
- Contract: "רוטשילד 42 — חוזה ממתין"
- Guarantor email input: "אימייל הערב"
- Guarantor name input: "שם הערב"
- Guarantor phone input: "טלפון הערב" (for OTP)
- Guarantee amount: pre-filled "₪13,500" (3× monthly rent, editable)
- Expiry: "5 ימים" (configurable by admin)
- "שלח הזמנה" button (Action Teal)
- Note: "הערב יקבל לינק מאובטח באימייל. הקישור תקף ל-5 ימים."
- After sending: success card "ההזמנה נשלחה ל-david@email.com ✓"
- Guarantor status tracking (after invite):
  - "ממתין לתגובה ⏳" yellow
  - "אומת וחתם ✓" green
  - "סירב ✗" red + notification to landlord
  - "פג תוקף" gray + "שלח מחדש" link
- STATES: form, sending, sent success, tracking status, declined alert, expired + resend
```

---

## FLOW M9: Profile, Settings & Trust Score (5 screens)

```
PLATFORM: Mobile App (390×844). React Native / Expo.
DIRECTION: RTL (Hebrew)
FONT: Rubik
COLORS: Primary #002045, CTA #00cba9, Background #f8f9ff, Text #0b1c30

Design the COMPLETE profile and settings flow — 5 screens.
Different content for Tenant vs Landlord.

SCREEN M9-1 — PROFILE SCREEN (Tenant):
- DirApp logo branding (top center, small)
- Avatar (80px, circular, camera icon overlay for upload)
- Name: "ישראל ישראלי" + pencil edit icon → opens edit modal
- Email: "israel@email.com" + verified ✓ badge
- Role badge: "שוכר" blue pill + "החלף למשכיר" link (Action Teal)
- Trust Score card (elevated, tappable → Gamification):
  - Circular score: "87/100" with gradient ring (green)
  - "Trust Score" label
  - "לחץ לפרטים →" caption
- Premium banner: "שדרג לפרימיום 👑" (if free) or "פרימיום פעיל ✓" (if premium)
- Menu list (vertical, each item = row with icon + label + chevron):
  - 🏠 "העדפות דירה"
  - 👥 "שותפים לדירה"
  - 🛡️ "אימות זהות" + status badge (green/yellow/red)
  - 📋 "החוזים שלי"
  - 💰 "תשלומי שכירות"
  - 📓 "היומן שלי"
  - 🏆 "נקודות ודירוג"
  - 🔧 "תקלות"
  - Divider
  - ⚙️ "הגדרות פרטיות"
  - 📜 "תנאי שימוש"
  - 🔔 "התראות"
- WhatsApp section:
  - Toggle: "קבל עדכונים ב-WhatsApp" + phone input (if toggled on)
- Dark mode toggle: 🌙 "מצב כהה"
- "התנתק" button (red text, bottom)
- Version: "v3.0.1" (caption, gray, centered)
- STATES: loaded, edit modal (name fields + save/cancel), avatar uploading, WhatsApp toggling, logging out (confirm dialog)

SCREEN M9-2 — PROFILE SCREEN (Landlord):
- Same structure but different menu:
  - 📊 "דשבורד"
  - 🏠 "הנכסים שלי"
  - 👥 "לידים"
  - 📋 "החוזים שלי"
  - 💰 "תשלומים"
  - 🔧 "תקלות"
  - 🏆 "נקודות ודירוג"
  - (+ same settings section)
- Role: "משכיר" green pill + "החלף לשוכר" link

SCREEN M9-3 — RENTER JOURNAL (Tenant):
- Header: "היומן שלי" + history icon
- Property filter dropdown (if multiple contracts)
- Aggregated stats (top cards row):
  - "12 חודשים" | "₪54,000 שולמו" | "3 תקלות" | "0 איחורים"
- Timeline (vertical, right-aligned for RTL):
  - Date dots connected by line
  - Entry cards:
    - Type icon circle: 📋 contract | 📸 check-in | 💰 payment | 🔧 maintenance | 📸 check-out
    - Title: "חוזה נחתם — רוטשילד 42"
    - Date: "15 ביוני 2026"
    - Key detail: amount / status / room count
    - "צפה בפרטים →" link
- STATES: loading, populated timeline, empty ("עוד אין רשומות ביומן"), filtered by property

SCREEN M9-4 — GAMIFICATION / TRUST SCORE:
- Header: "נקודות ודירוג" + trophy icon
- Hero card:
  - Large circular Trust Score: "87" (120px, gradient ring animated)
  - Rank: "שוכר מצטיין 🏆" gold text
  - "גבוה מ-85% מהשוכרים"
- Score breakdown (4 horizontal bar cards):
  - "תשלומים בזמן: 95/100" (green bar)
  - "תחזוקת דירה: 88/100" (blue bar)
  - "תקשורת: 82/100" (teal bar)
  - "ותק במערכת: 75/100" (purple bar)
- Level & Points:
  - Current level: "רמה 3 — 850 נקודות" with progress bar to level 4 (1500)
  - Level badges: 1 (🥉 מתחיל) → 2 (🥈 פעיל) → 3 (🥇 מנוסה) → 4 (💎 VIP)
- Badges gallery (horizontal scroll):
  - Earned: colored badge + title (e.g., "חוקר 🔍", "מאומת ✓", "VIP 💎")
  - Locked: grayed out + "?" + unlock condition
- Points history (recent 10):
  - "+5 — תשלום בזמן (יוני 2026)"
  - "+3 — סופר לייק"
  - "+50 — חוזה נחתם"
  - "+25 — אימות זהות"
- Leaderboard (top 10):
  - 🥇 1 | דני לוי | 96
  - 🥈 2 | שרה כהן | 94
  - 🥉 3 | ישראל ישראלי (אתה) | 87 ← highlighted row
- STATES: loading, loaded, empty (new user — "התחל לצבור נקודות!")

SCREEN M9-5 — PRIVACY SETTINGS:
- Header: "הגדרות פרטיות" + lock icon
- Sections:
  - "שינוי סיסמה":
    - Current password input
    - New password input + strength meter
    - Confirm password input
    - "עדכן סיסמה" button
  - "התראות" (toggle matrix):
    - Row per category: תשלומים | חוזים | תחזוקה | התאמות | מערכת
    - Column per channel: פוש | אימייל | WhatsApp
    - Toggle switch in each cell
  - "נתונים ופרטיות":
    - "ייצוא נתונים (GDPR)" button (outline) — downloads JSON
    - "בקש מחיקת חשבון" button (red outline) — confirm dialog "החשבון יימחק תוך 30 יום. האם להמשיך?"
  - "WhatsApp":
    - Opt-in toggle + phone input
    - Explanation: "נשלח עדכוני תשלום, תחזוקה, וחידוש חוזה"
- STATES: loaded, changing password (validation), exporting data (loading), deletion request (confirm dialog + success), WhatsApp toggling
```

---

## FLOW M10: Landlord Dashboard & Listings (4 screens)

```
PLATFORM: Mobile App (390×844). React Native / Expo.
DIRECTION: RTL (Hebrew)
FONT: Rubik
COLORS: Primary #002045, CTA #00cba9, Background #f8f9ff, Text #0b1c30

Design the COMPLETE landlord management flow — 4 screens.

SCREEN M10-1 — LANDLORD DASHBOARD (Home tab):
- Header: "שלום, דוד 👋" + profile avatar (right, RTL)
- ToS warning banner (if not accepted): yellow card "עליך לאשר תנאי שימוש" + "אשר" button
- Trust Score mini widget: shield icon + "87/100" + progress bar + "→" (tap to gamification)
- "סקירה כללית" section heading
- Metrics carousel (horizontal scroll, 5 cards):
  - "דירות פעילות: 3" — cyan bg, house icon
  - "חוזים פעילים: 2" — violet bg, document icon
  - "לידים ממתינים: 7" — orange bg, people icon
  - "תשלומים ממתינים: 2" — green bg, card icon
  - "תקלות פתוחות: 1" — red bg, wrench icon
  - Each card tappable → navigates to relevant screen
- "פעולות מהירות" section (2×2 grid):
  - "הוסף דירה" (house + icon) → CreateListing
  - "נהל לידים" (people icon) → Leads
  - "צפה בחוזים" (document icon) → Contracts
  - "תשלומים" (wallet icon) → RentPayments
- "פעילות אחרונה" section: list of 5 recent activities
  - "ישראל ישראלי דיווח תשלום — יוני" + timestamp
  - "ליד חדש: שרה כהן — רוטשילד 42" + timestamp
- STATES: loading (skeleton), loaded, ToS warning visible, empty (new landlord — onboarding prompt)

SCREEN M10-2 — LISTINGS MANAGEMENT (Landlord tab):
- Header: "הנכסים שלי"
- Listing cards (vertical list):
  - Property image (full width, 160px, rounded top)
  - Title + address
  - Price: "₪4,500/חודש"
  - Status toggle: "פעיל ✓" (green switch) / "לא פעיל" (gray switch)
  - Stats row: "👁 234 צפיות" | "💚 12 לייקים" | "👥 3 לידים"
  - Action buttons row:
    - "ערוך" (pencil icon, outline)
    - "שכפל" (copy icon, outline)
    - "AI שיווק" (sparkle icon, outline) → opens marketing copy modal
    - "שתף" (share icon, outline)
    - "מחק" (trash icon, red outline) → confirm dialog
- Marketing copy modal:
  - Style selector: "מקצועי" | "ידידותי" | "יוקרתי" (3 chips)
  - Loading: "AI יוצר טקסט שיווקי..."
  - Result: generated text preview
  - "העתק" button + "שתף" button
- FAB: "+" → CreateListing
- STATES: loading, empty ("הוסף את הדירה הראשונה שלך!"), populated, marketing modal, delete confirm

SCREEN M10-3 — CREATE LISTING (Landlord):
- Header: "הוסף דירה חדשה" + back button
- ToS gate: if not accepted → redirect to Terms
- Form (scrollable):
  - Title input: "כותרת המודעה" (max 100 chars)
  - Description textarea: "תיאור הדירה..." (max 1000 chars)
  - Price input: "₪ שכירות חודשית"
  - Building fee input: "₪ ועד בית"
  - 2-column row: "חדרים" (number stepper) + "קומה" (number stepper)
  - 2-column row: "סה״כ קומות" + "שטח במ²"
  - City autocomplete: searchable, matches Israeli cities
  - Street autocomplete: validated against OpenStreetMap
  - House number input
  - Amenities checklist (2 columns, checkbox + emoji + label):
    🅿️ חניה | 🛗 מעלית | 🌿 מרפסת | ❄️ מיזוג | 🐾 חיות | 🛡️ ממ"ד | 🪑 ריהוט | 📦 מחסן
  - Image picker: horizontal scroll, up to 10 images
    - "+" dashed box → opens camera/gallery
    - Each: thumbnail + ✗ remove + drag to reorder
    - Count: "3/10 תמונות"
  - "פרסם דירה" button (Action Teal, full width, 48px)
- STATES: empty form, filling (real-time validation), city autocomplete dropdown, street autocomplete, images uploading, submitting, success ("הדירה פורסמה! 🎉"), validation errors (highlighted fields)

SCREEN M10-4 — EDIT LISTING (Landlord):
- Same as Create but pre-populated with existing data
- Header: "ערוך דירה" + back button
- All fields pre-filled, editable
- Existing images shown + can add/remove
- "עדכן דירה" button instead of "פרסם"
- "מחק מודעה" link (red, bottom) → confirm dialog
- STATES: loading existing data, editing, saving, success, delete confirm
```

---

## FLOW M11: Notifications (2 screens)

```
PLATFORM: Mobile App (390×844). React Native / Expo.
DIRECTION: RTL (Hebrew)
FONT: Rubik
COLORS: Primary #002045, CTA #00cba9, Background #f8f9ff, Text #0b1c30

Design the notifications center — 2 screens.

SCREEN M11-1 — NOTIFICATIONS LIST:
- Header: "התראות" + "סמן הכל כנקרא" link (Action Teal)
- Filter tabs: "הכל" | "תשלומים" | "חוזים" | "תחזוקה" | "התאמות" | "מערכת"
- Notification items (vertical list):
  - Unread indicator: blue dot (right side, RTL)
  - Type icon (40px circle, colored by type):
    💰 תשלומים (teal) | 📋 חוזים (blue) | 🔧 תחזוקה (orange) | 💚 התאמות (green) | ⚠️ מערכת (red) | 📱 WhatsApp (WhatsApp green)
  - Title (bold if unread): "התשלום ליוני אושר"
  - Body (1 line, gray): "המשכיר אישר את דיווח התשלום שלך"
  - Timestamp: "לפני 3 שעות" (top-left, RTL)
  - Tap → navigates to relevant screen (payment/contract/ticket/match)
  - Swipe left to dismiss
- Date separators: "היום" | "אתמול" | "השבוע"
- STATES: loading, empty ("אין התראות חדשות 🔔"), populated, filtered by tab, all read

SCREEN M11-2 — ADMIN SCREENS (3 tabs):
- These are tabs in the Admin bottom navigation, not accessible to regular users
- AdminConfig: sectioned config editor (9 sections, 52 keys, toggle/number/text inputs, save button)
- AdminUsers: paginated user list (search, filter by role/KYC, edit modal, block/unblock, KYC override)
- AdminStats: KPI cards + charts (users, listings, payments, contracts, interactions, maintenance, engagement, security metrics)
- See Flow M9 and earlier descriptions for full detail — include all 3 tabs with full content
```

---

# PART B — WEB SCREENS (1440×900)

---

## FLOW W1: Landing Page (1 page, 7 sections)

```
PLATFORM: Web Desktop (1440×900). Browser-based marketing page.
DIRECTION: RTL (Hebrew)
FONT: Rubik (Google Fonts)
COLORS: Primary #002045, CTA #00cba9, Background #f8f9ff, Text #0b1c30
LAYOUT: Full-width sections, max content 1200px centered. NO sidebar. NO login required.

Design the COMPLETE landing page — 1 page with 7 sections.

NAVBAR (fixed, 64px, glassmorphic blur bg):
- Right (RTL): DirApp logo
- Center: links "יתרונות" | "איך זה עובד" | "הצטרפו" (smooth scroll anchors)
- Left: "הצטרפו לרשימה" CTA button (Action Teal)

SECTION 1 — HERO (100vh):
- Background: gradient mesh #002045 → #1a365d with subtle geometric shapes
- Right side (RTL):
  - H1: "מצא את הדירה שלך בהחלקה אחת" (Rubik ExtraBold 48px, white)
  - Subtitle: "חוזים דיגיטליים, אימות זהות, תשלומים חכמים — הכל במקום אחד" (Rubik Regular 18px, rgba white 80%)
  - 2 CTAs: "הצטרף כשוכר" (Action Teal button, 48px) + "אני משכיר" (white outline button)
  - Trust badges row: "🔒 SSL 256-bit" | "🛡️ KYC מאומת" | "📋 GDPR תואם"
- Left side: 3D phone mockup showing SwipeScreen (slightly rotated, shadow)
- Badge: "🚀 בקרוב בישראל" floating

SECTION 2 — STATS BAR (80px, #002045 bg):
- 4 stats (white text, Rubik Bold 36px number + Regular 14px label):
  - "₪50B+" — "שוק השכירות השנתי"
  - "2.4M" — "שוכרים פעילים בישראל"
  - "3 שבועות" — "זמן חיפוש ממוצע"
  - "₪0" — "עמלת תיווך"

SECTION 3 — FEATURES (id="features"):
- Section title: "למה דיראפ?" (centered, Rubik Bold 36px)
- 6 feature cards (3×2 grid, 24px gap):
  Each card: icon (64px, teal circle bg) + title (Rubik Bold 18px) + description (2 lines, gray) + "למד עוד →" link
  1. 👆 "גלה דירות בהחלקה" — "ממשק Tinder-style עם AI שמתאים דירות בדיוק לך"
  2. 📋 "חוזה דיגיטלי חכם" — "העלאה, ניתוח AI, חתימה דיגיטלית — בלי ניירת"
  3. 🔒 "אימות זהות מאובטח" — "KYC מובנה עם Persona, HMAC webhooks, ותיקוף ישראלי"
  4. 💰 "מעקב תשלומים" — "לדג'ר דיגיטלי, תזכורות אוטומטיות, אישור ב-WhatsApp"
  5. 🔧 "ניהול תחזוקה" — "פתיחת תקלות, מעקב טכנאים, חשבוניות — הכל מתועד"
  6. 📱 "WhatsApp מובנה" — "תזכורות תשלום, עדכוני תקלות, וחידוש חוזה ישירות ל-WhatsApp"
  - Hover effect: slight scale + shadow

SECTION 4 — HOW IT WORKS (id="how"):
- Title: "איך זה עובד?" (centered)
- 3 steps connected by dotted horizontal line:
  1. Circle "1" + person icon + "הגדר העדפות תוך 30 שניות" + subtitle
  2. Circle "2" + swipe icon + "החלק על דירות שמתאימות לך" + subtitle
  3. Circle "3" + document icon + "Match, שוחח, חתום על חוזה דיגיטלי" + subtitle

SECTION 5 — FOR LANDLORDS (split layout):
- Right (RTL): screenshot mockup of Landlord Dashboard
- Left: "למשכירים" teal badge + H2 "נהל את הנכסים שלך בקלות" + bullet points:
  ✓ "לידים מאומתים עם Trust Score"
  ✓ "חוזים דיגיטליים — בלי ניירת"
  ✓ "צ'ק-אין / צ'ק-אאוט עם תיעוד מלא"
  ✓ "לדג'ר תשלומים עם אישור אוטומטי"
  + "התחל עכשיו בחינם" CTA button

SECTION 6 — CTA (id="cta"):
- Background: Action Teal #00cba9
- H2: "מוכן/ה לדירה הבאה?" (white, centered)
- Email input (white bg) + "הצטרפו" button (#002045 bg)
- "ללא ספאם · ניתן להסרה בכל עת" note

FOOTER:
- 4 columns: מוצר | חברה | משפטי | קהילה
- Social icons row
- "© 2026 DirApp. כל הזכויות שמורות." + language toggle עברית/English
```

---

## FLOW W2: Web Auth (3 pages)

```
PLATFORM: Web Desktop (1440×900). Browser-based.
DIRECTION: RTL (Hebrew)
FONT: Rubik (Google Fonts)
COLORS: Primary #002045, CTA #00cba9, Background #f8f9ff, Text #0b1c30
LAYOUT: Split-screen (50/50). NO sidebar.

Design 3 auth pages. Each uses a split layout: right half = branding, left half = form.

PAGE W2-1 — LOGIN:
- RIGHT HALF (50%, #002045 gradient bg):
  - DirApp logo (white, large, centered vertically)
  - "הדרך החכמה לשכור דירה" tagline (white)
  - Abstract apartment illustration (silhouette style)
  - 3 rotating feature cards (dots navigation, fade animation)
- LEFT HALF (50%, white bg):
  - Centered form card (400px max width):
    - "ברוך הבא" H2 (#002045)
    - "התחבר לחשבון שלך" subtitle (gray)
    - Email input (mail icon right, placeholder "אימייל")
    - Password input (lock icon right, show/hide toggle left)
    - Row: "זכור אותי" checkbox ← → "שכחת סיסמה?" link (Action Teal)
    - "התחבר" full-width button (Action Teal, 48px height)
    - Divider: "—— או ——"
    - Google Sign-In button (outline, Google icon)
    - Bottom: "אין לך חשבון? הרשם כאן" (Action Teal link)
- STATES: empty, filled, loading (button spinner), error ("אימייל או סיסמה שגויים" red text), success (redirect)

PAGE W2-2 — REGISTER:
- Same split layout
- LEFT HALF form:
  - "צור חשבון חדש" H2
  - Role toggle: "שוכר" | "משכיר" (pill toggle, Action Teal active)
  - 2-column row: First Name + Last Name inputs
  - Email input
  - Phone input (+972 prefix)
  - Password input + strength meter bar (weak red / medium yellow / strong green)
  - Confirm Password input
  - Checkbox: "אני מסכים/ה ל" + "תנאי השימוש" link + "ו" + "מדיניות הפרטיות" link
  - "צור חשבון" button (Action Teal, full width, 48px)
  - Bottom: "יש לך חשבון? התחבר" link
- STATES: empty, filling (validation), password mismatch, email taken, loading, success

PAGE W2-3 — EMAIL VERIFICATION:
- Centered layout (no split screen), #f8f9ff background
- White card (480px, shadow, centered):
  - Animated envelope icon (120px)
  - "אמת את כתובת האימייל שלך" H2
  - "שלחנו קוד אימות ל-" + email bold
  - 6-digit code inputs (individual boxes, 48×56px, auto-focus next)
  - Timer: "שלח שוב בעוד 0:45" (gray) → "שלח שוב" (Action Teal at 0:00)
  - "אמת" button (full width, Action Teal)
  - "שנה כתובת אימייל" link (bottom)
- STATES: waiting, timer running, timer expired, invalid code (shake + red), verifying, success (redirect)
```

---

## FLOW W3: Web App Shell + Tenant Dashboard (1 page)

```
PLATFORM: Web Desktop (1440×900). Browser-based SaaS dashboard.
DIRECTION: RTL (Hebrew)
FONT: Rubik (Google Fonts)
COLORS: Primary #002045, CTA #00cba9, Background #f8f9ff, Text #0b1c30
LAYOUT: Right sidebar (260px, fixed, #002045 bg) + Top bar (64px, white) + Main content

Design the main web app shell and tenant dashboard — 1 page that defines the app's layout structure.
ALL subsequent web pages use this same shell (sidebar + top bar).

SIDEBAR (260px, fixed right, #002045 bg):
- Top: DirApp logo (white, ™, 32px padding)
- Navigation (white text, Rubik Medium 15px, each item 44px height):
  - 🏠 "דף הבית" — active state: Action Teal left border (4px) + rgba(255,255,255,0.1) bg
  - 🔍 "חיפוש דירות"
  - 💚 "ההתאמות שלי" + badge "3" (red circle)
  - 💬 "הודעות" + badge "5" (red circle)
  - 📋 "החוזים שלי"
  - 💰 "תשלומים"
  - 🔧 "תקלות"
  - 📓 "היומן שלי"
  - 🏆 "נקודות ודירוג"
  - Divider (rgba white 20%)
  - ⚙️ "הגדרות"
- Bottom: user mini card (avatar 36px + name + role badge + "התנתק" link)

TOP BAR (64px, white bg, shadow-sm):
- Right (RTL): breadcrumb "דף הבית > ..."
- Center: search bar (480px, rounded 24px, placeholder "חפש דירות, חוזים, הודעות...")
- Left: notification bell 🔔 (red badge) + dark mode toggle 🌙 + avatar dropdown (name + role + logout)

MAIN CONTENT (1440 - 260 = 1180px, padding 32px):
- Welcome banner: "שלום, ישראל 👋" H2 + "מה תרצה לעשות היום?" subtitle
- 3 quick action cards (row, equal width):
  - "חפש דירה" (teal gradient bg, house icon, → link)
  - "צפה בהתאמות" (blue gradient bg, heart icon, → link)
  - "בדוק תשלומים" (green gradient bg, wallet icon, → link)
  - Hover: scale + shadow

- 2-column layout (60% + 40%):
  LEFT (60%):
  - "דירות מומלצות" section heading + "ראה הכל →" link
    - 3 apartment cards (horizontal row): image (200px height) + price + address + rooms + Trust Score
    - Hover: slight lift
  - "חוזים פעילים" section heading
    - Table: כתובת | סטטוס | תאריכים | שכ"ד | פעולות
    - Status badges (colored)
    - Max 3 rows + "ראה הכל"

  RIGHT (40%):
  - "Trust Score" card: circular 87/100 (120px, gradient ring) + 4 mini bars + "שפר →" link
  - "התראות אחרונות" card: 5 items (icon + text + time) + "ראה הכל →"
  - "יומן אחרון" card: 3 recent entries (mini timeline dots) + "ראה הכל →"

- STATES: loading (skeleton everywhere), loaded, empty (new user — onboarding prompt cards)
```

---

## FLOW W4: Web Guarantor Portal (1 page, 3 steps + end states)

```
PLATFORM: Web Desktop (1440×900). STANDALONE page — NO sidebar, NO login.
DIRECTION: RTL (Hebrew)
FONT: Rubik (Google Fonts)
COLORS: Primary #002045, CTA #00cba9, Background #f8f9ff, Text #0b1c30
LAYOUT: Split-screen (50/50). Accessed via unique secure link with token.

Design the COMPLETE guarantor verification portal — 1 page with 3 wizard steps + loading + error + decline + success states. Build ALL of them.

RIGHT HALF (50%, #002045 gradient bg, fixed):
- DirApp logo (white, top)
- Contract summary card (white, rounded 16px, 400px max, centered):
  - "סיכום חוזה שכירות" heading
  - Property image (placeholder, 200px, rounded top)
  - Badge: "#DIR-{token}" (reference number)
  - Details grid (2×2):
    - "המשכיר: דוד כהן"
    - "השוכר: ישראל ישראלי"
    - "דמי שכירות: ₪4,500/חודש"
    - "תקופה: 01.07.2026 — 30.06.2027"
  - Guarantee statement box (border-right 4px blue):
    - "הצהרת ערבות" heading
    - Legal text about guarantor obligations
- Trust badges: "🔒 חיבור מאובטח SSL 256-bit" + "⏳ תוקף: 5 ימים"
- Expiry countdown: "הקישור יפוג בעוד 4 ימים, 12 שעות"

LEFT HALF (50%, white bg, scrollable):
- Progress stepper (horizontal, 3 nodes connected by line):
  - ① "סקירה" → ② "אימות זהות" → ③ "חתימה"
  - Completed: green circle ✓ + green line
  - Current: Action Teal circle + pulsing
  - Future: gray circle + gray line

STEP 1 — CONTRACT REVIEW:
- Step badge "1"
- "סקירת פרטי החוזה" H2
- "שלום, {name}. הוזמנת להיות ערב לחוזה שכירות. אנא ודא שפרטי החוזה בצד ימין תקינים."
- Legal warning card (bordered, orange-tinted):
  - ⚖️ icon + "שים לב: אישור השלבים הבאים יהווה חתימה מחייבת בעלת תוקף משפטי"
- Full name input (pre-filled if known)
- Israeli ID input (9 digits, real-time validation with checksum)
- Phone input
- Email input
- Checkbox: "אני מאשר/ת שקראתי את פרטי החוזה"
- Buttons: "דחה הזמנה" (red outline, left) + "המשך לאימות זהות →" (Action Teal, right)

STEP 2 — IDENTITY VERIFICATION:
- Step badge "2"
- "אימות זהות מול משרד הפנים" H2
- ID document uploads (2-column grid):
  - Upload zone 1: "צילום צד קדמי" — dashed border, camera icon, drag or click
    - After upload: image preview + ✗ remove
  - Upload zone 2: "צילום צד אחורי" — same
- Security note card: 🛡️ "התמונות משמשות לאימות בלבד. מוצפנות AES-256. נמחקות אחרי 7 ימים."
- Buttons: "חזרה ←" (outline) + "המשך לחתימה →" (Action Teal, disabled until both photos uploaded + valid ID)
- KYC verification overlay (full-screen, triggered on continue):
  - Loading: spinner + "בודק נתוני זהות..." + "מאמתים מול מרשם האוכלוסין"
  - Success: green ✓ animation + "הזהות אומתה בהצלחה!" + auto-transition to Step 3

STEP 3 — DIGITAL SIGNATURE:
- Step badge "3"
- "חתימה דיגיטלית ואישור" H2
- Legal scroll box (bordered, 200px height, scrollable):
  - Full guarantee clause text (Hebrew legal)
  - "נספח ערבות לחוזה — סעיף 14.2"
- Digital signature hash card:
  - 🔐 icon + "קוד זיהוי חתימה: SHA-256: 8f2b..." (monospace, gray bg)
- Signature canvas (480×150px, bordered):
  - "חתום כאן" placeholder (gray, disappears on draw)
  - Mouse + touch drawing support, blue ink (#005db6)
  - "נקה לוח" link (top-left of canvas)
- OTP section:
  - "קוד אימות חד-פעמי (OTP)" heading
  - "שלח קוד אימות לנייד" button → after click:
    - "שלחנו קוד בן 6 ספרות למספר הרשום שלך"
    - 6 OTP input boxes (single digit each, auto-focus)
    - Timer: "שלח מחדש בעוד 59 שניות" → "שלח מחדש" link at 0
- Legal consent checkbox: "אני מסכים/ה לתנאי הערבות ומאשר/ת חתימה דיגיטלית"
- Buttons: "חזרה ←" + "אישור וחתימה על החוזה ✓" (Action Teal, disabled until: OTP filled + signature drawn + consent checked)

END STATE — DECLINED:
- Full page centered:
  - ❌ red icon (large)
  - "הבקשה נדחתה בהצלחה" H2
  - "הודעה נשלחה למשכיר בדבר סירובך לערוב לחוזה זה."
  - "סגור חלון" button

END STATE — SIGNED:
- Full page centered:
  - ✅ green check animation (large)
  - "הערבות נחתמה בהצלחה!" H2
  - "עותק של החוזה ישלח למייל שלך."
  - Summary: who + what + when
  - "סגור חלון" button

END STATE — ERROR (invalid/expired token):
- Full page centered:
  - ⚠️ icon
  - "שגיאה בגישה לחוזה" H2
  - Error message (missing token / expired / already used)
  - "חזור לדף הבית" link

LOADING STATE:
- Full page centered spinner
- "טוען פרטי הזמנת ערב מאובטחת..."

Build ALL states: loading, step 1, step 2, step 2 KYC overlay, step 3, declined, signed, error.
```

---

## FLOW W5: Web Admin Panel (3 pages)

```
PLATFORM: Web Desktop (1440×900). Browser-based admin panel.
DIRECTION: RTL (Hebrew)
FONT: Rubik (Google Fonts)
COLORS: Primary #002045, CTA #00cba9, Background #f8f9ff, Text #0b1c30
LAYOUT: Right sidebar (260px, #002045 darker bg) + Top bar (64px) + Main content.
ADMIN SIDEBAR has "ADMIN" red badge next to logo.

Design 3 admin pages with full content.
Admin sidebar navigation:
  📊 "דשבורד" | 👥 "משתמשים" | 🏠 "נכסים" | 📋 "חוזים" | 💰 "לדג'ר" | 🔧 "תקלות" | ⚙️ "הגדרות" | 📝 "לוגים" | 📱 "WhatsApp"

PAGE W5-1 — ADMIN DASHBOARD:
- 4 KPI cards (row, equal width):
  - "משתמשים: 1,247" + ↑12% green arrow + mini sparkline
  - "דירות: 834" + ↑8%
  - "חוזים פעילים: 412" + ↑5%
  - "תשלומים החודש: ₪1.8M" + ↑15%

- 2-column charts (50/50):
  - Left: "הרשמות — 30 ימים" line chart (gradient fill, Action Teal line)
  - Right: "סטטוס תשלומים" donut chart: שולם 78% green | ממתין 15% yellow | באיחור 7% red

- "פעילות אחרונה" full-width table (real-time feed):
  | זמן | משתמש | פעולה | פרטים |
  | 14:32 | דני לוי | חתם על חוזה | רוטשילד 42 |
  | 14:28 | שרה כהן | דיווח תשלום | ₪4,500 — יוני |
  | 14:15 | מערכת | KYC אושר | ישראל ישראלי |
  - 20 rows + "ראה הכל" link

- Bottom 2 cards:
  - "תקלות פתוחות" (red badge count) — 5 mini ticket rows
  - "חוזים שפגים בקרוב" (orange) — expiring in 60 days list

PAGE W5-2 — ADMIN USER MANAGEMENT:
- Header: "ניהול משתמשים" H2 + "סה״כ: 1,247"
- Search bar (wide): "חפש לפי שם, אימייל, טלפון, ID..."
- Filter row: role dropdown | KYC status dropdown | Trust Score range | date range | "סנן" button + "נקה" link

- Users table (full width):
  | ✓ | שם | אימייל | טלפון | תפקיד | KYC | Trust Score | נרשם | סטטוס | פעולות |
  - Checkbox column (bulk select)
  - Role badges: שוכר (blue) | משכיר (green) | אדמין (red)
  - KYC badges: מאומת ✓ (green) | ממתין ⏳ (yellow) | נכשל ✗ (red) | לא התחיל — (gray)
  - Trust Score: number with color (green >70, yellow 40-70, red <40)
  - Status: "פעיל" (green) / "נעול" (red)
  - Actions "⋯" dropdown menu:
    - "ערוך פרטים" → opens edit modal
    - "עקוף KYC" (orange) → confirm dialog
    - "אפס Trust Score" → confirm
    - "שלח התראה" → notification modal
    - "חסום/שחרר" toggle
    - "מחק משתמש" (red) → cascading delete confirm dialog
  - Row hover: light bg highlight
  - Sortable columns (click header)

- Bulk actions bar (appears when checkboxes selected):
  - "נבחרו: 5" + "שלח הודעה" + "ייצוא CSV" + "מחק נבחרים" (red)

- Pagination: "מציג 1-25 מתוך 1,247" + page buttons

- Edit user modal (560px):
  - First/Last name inputs
  - Email (read-only)
  - Phone input
  - Role selector: שוכר / משכיר / אדמין (dropdown)
  - Active role selector
  - Trust Score: number input (0-100)
  - Premium toggle
  - Locked toggle
  - Verified toggle
  - "שמור" + "ביטול" buttons

PAGE W5-3 — ADMIN CONFIG PANEL:
- Header: "הגדרות מערכת" H2 + "52 הגדרות" badge + "שמור הכל" button (Action Teal, sticky top)
- "עודכן לאחרונה: 01.06.2026 14:32 ע"י admin@dirapp.com"

- 9 accordion sections (each: title + count badge + expand/collapse):

  ⚙️ "כללי" (expanded):
  | הגדרה | ערך | תיאור |
  | app_name | [DirApp] | שם האפליקציה |
  | default_language | [he] | שפת ברירת מחדל |
  | maintenance_mode | [☐] | חסום כניסת משתמשים |

  🛡️ "KYC":
  | kyc_timeout_hours | [24] | שעות עד timeout |
  | kyc_image_retention_days | [7] | ימי שמירת תמונות |
  | kyc_renewal_years | [5] | שנים עד חידוש |

  💰 "תשלומים":
  | payment_autoconfirm_hours | [48] | שעות עד אישור אוטומטי |
  | overdue_grace_days | [5] | ימי חסד |
  | cpi_enabled_default | [☑] | הצמדת מדד ברירת מחדל |

  💚 "התאמות":
  | match_daily_swipe_limit | [50] | מגבלת החלקות |
  | superlike_daily_limit | [3] | מגבלת סופר-לייק |
  | match_expiry_days | [30] | תפוגת התאמה |

  📋 "חוזים":
  | check_in_window_days | [5] | חלון צ'ק-אין |
  | max_photos_per_room | [20] | תמונות/חדר |
  | max_fix_rounds | [3] | סבבי תיקון |

  💬 "צ'אט":
  | max_message_length | [2000] | אורך הודעה |
  | chat_image_max_size | [5] | MB מקסימום |

  🔔 "התראות":
  | email_digest_enabled | [☑] | סיכום יומי באימייל |
  | push_enabled | [☑] | פוש נוטיפיקציות |

  🏆 "גיימיפיקציה":
  | points_per_swipe | [1] | נקודות להחלקה |
  | points_per_match | [10] | נקודות להתאמה |
  | points_per_contract | [50] | נקודות לחוזה |

  🔒 "אבטחה":
  | api_rate_limit | [10] | בקשות/דקה |
  | max_login_attempts | [5] | ניסיונות כניסה |
  | lockout_duration_minutes | [30] | דקות חסימה |
  | min_password_length | [8] | אורך סיסמה מינימלי |

  - Each config row: key label (bold) + input (number/text/toggle matching type) + description (caption gray)
  - Changed values: yellow left border highlight
  - "שמור הכל" button bottom too
  - STATES: loading configs, loaded, editing (yellow highlights), saving (spinner), saved success (green flash)
```

---

## FLOW W6: Web Discovery, Matches & Chat (reuse app shell from W3)

```
PLATFORM: Web Desktop (1440×900). Uses sidebar shell from W3.
DIRECTION: RTL (Hebrew)
FONT: Rubik
COLORS: Primary #002045, CTA #00cba9, Background #f8f9ff, Text #0b1c30

Design 5 web content pages that fit inside the app shell (sidebar + top bar).

PAGE W6-1 — SWIPE VIEW:
- Center column (640px): large apartment card
  - Image: 640×400px, rounded 12px, gradient overlay bottom
  - Below: price + address + "3 חדרים · 75 מ²" + feature chips + compatibility bar + Trust Score
- Below card: 3 action buttons (72px circles): ❌ | ⭐ | 💚
  - Keyboard hints: "← דלג | → אהבתי | ↑ סופר לייק"
- Right panel (320px): mini queue of next 3 apartments (stacked small cards)
- STATES: loading, swiping, empty, quota modal, match celebration modal

PAGE W6-2 — SEARCH / GRID VIEW:
- Sticky filter bar: location multi-select + price dual slider + rooms + more filters dropdown + NLP toggle + view toggle (grid/list/map) + sort
- Results: 3-column grid, 4 rows per page
  - Card: image (200px) + hover scale + heart favorite + price badge + address + rooms/size + True Monthly Cost + landlord mini + "פרטים" / "אני מעוניין" buttons
- Results count + pagination
- STATES: loading, results, empty, NLP search active (AI parsed badge)

PAGE W6-3 — APARTMENT DETAIL (full width):
- Image gallery: main (800×450) + 4 thumbnails, click → lightbox
- 2-column (65% + 35%):
  - Left: H1 address + tags + description + True Monthly Cost table + features grid (4 cols) + map embed + TAMA38
  - Right (sticky): landlord card + compatibility card + CTA card ("₪4,500/חודש" + "אני מעוניין/ת" button + "שמור" + "דווח")
- STATES: loading, loaded, owner view (edit button), already liked

PAGE W6-4 — MATCHES (cards/table toggle):
- Tabs: "ממתין" | "אושר" | "נדחה" + view toggle cards/table
- Cards: 3-column grid (image + address + price + compatibility + status + actions)
- Table: sortable columns
- Landlord view: approve/reject buttons on pending
- STATES: loading, empty, populated, confirm dialogs

PAGE W6-5 — CHAT (3-panel layout):
- Left panel (320px): conversations list (search + items with avatar/name/preview/time/unread)
- Center panel (flex): active conversation (header + property banner + messages + input bar)
  - Sent: right-aligned Action Teal bubbles
  - Received: left-aligned #eff4ff bubbles
  - Read receipts, typing indicator, date separators
- Right panel (280px, collapsible): conversation details (property + contact + shared files + block)
- STATES: loading, empty inbox, conversation selected, typing, sending, message states
```

---

## FLOW W7: Web Contracts, Payments, Maintenance (reuse shell)

```
PLATFORM: Web Desktop (1440×900). Uses sidebar shell from W3.
DIRECTION: RTL (Hebrew)
FONT: Rubik
COLORS: Primary #002045, CTA #00cba9, Background #f8f9ff, Text #0b1c30

Design 6 web content pages for contract, payment, and maintenance management.

PAGE W7-1 — CONTRACTS LIST:
- Header: "החוזים שלי" H2 + "העלה חוזה" button (Action Teal)
- 4 stat cards: פעילים (green) | ממתין לחתימה (yellow) | פג בקרוב (orange) | הסתיימו (gray)
- Table: נכס | כתובת | שוכר/משכיר | תחילה | סיום | שכ"ד | סטטוס | פעולות
  - Status badges colored by state
  - Actions: צפה | חתום | ⋯ dropdown (amendment, renew, download)
- Filters + pagination

PAGE W7-2 — CONTRACT DETAIL:
- Breadcrumb + status banner
- Timeline: הועלה → ממתין → חתום שוכר → חתום משכיר → פעיל
- 2-column (60%+40%):
  - Left: contract info table + AI analysis card + amendments list
  - Right: signatures card + actions card + KYC status card
- STATES: all statuses, signing modal, amendment modal, KYC gate

PAGE W7-3 — CONTRACT UPLOAD WIZARD (3 steps):
- Step 1: drop zone (dashed, 400×250) + progress bar
- Step 2: AI analysis results (editable extracted fields with confidence badges)
- Step 3: assign tenant + guarantor + send
- STATES: upload, analyzing, results, assigning, success

PAGE W7-4 — LEDGER:
- Property selector + 4 summary cards (paid/pending/overdue/yearly total)
- Table: חודש | סכום | פירעון | תשלום | סטטוס | קבלה | פעולות
  - Badges: שולם/דווח/ממתין/באיחור/אושר-אוטומטית
  - Receipt thumbnail → lightbox
  - Tenant: "דווח תשלום" button per row
  - Landlord: "אשר ✓" / "דחה ✗" per reported row + auto-confirm countdown
- Bar chart: 12-month payment history
- Report payment modal (560px): month + amount + date + method + reference + receipt upload + notes

PAGE W7-5 — MAINTENANCE:
- Header + "פתח תקלה" button
- Filter tabs: הכל | פתוח | בטיפול | נסגר + search + sort
- Table: # | קטגוריה (icon) | תיאור | נכס | נפתח | סטטוס | זמן פתוח (red if >24h) | פעולות
- Side panel (slides from left, 480px): full ticket detail + timeline + photos + comments + actions
  - Tenant: "אשר סגירה" / "עדיין לא טופל"
  - Landlord: "אני מטפל" / "שלח טכנאי" / "midrag.co.il" / upload invoice / close
  - Admin: force-close
- New ticket modal (600px): property + category grid + title + description + urgency + photos (up to 5) + submit

PAGE W7-6 — CHECK-IN/CHECK-OUT:
- Header + progress bar "4/6 חדרים"
- Room tabs (horizontal)
- 2-column: photo grid (3-col, 60%) + notes/rating (40%)
- For check-out: side-by-side comparison with check-in photos
- Bottom: tenant submit / landlord approve+fix-request (round counter)
- STATES: photographing, submitted, reviewing, approved, fix-requested, auto-confirmed
```

---

## FLOW W8: Web Profile, Journal, Gamification, Landlord Dashboard (reuse shell)

```
PLATFORM: Web Desktop (1440×900). Uses sidebar shell from W3.
DIRECTION: RTL (Hebrew)
FONT: Rubik
COLORS: Primary #002045, CTA #00cba9, Background #f8f9ff, Text #0b1c30

Design 5 web content pages.

PAGE W8-1 — PROFILE / SETTINGS:
- 2-column (65% + 35%):
  - Left: profile header card (avatar 96px + name + email + phone + role toggle + save) + preferences section (budget/rooms/areas/amenities) + lifestyle questionnaire (8 sliders) + privacy section (change password + 2FA + delete account + GDPR export)
  - Right: KYC status card + Trust Score card + notification preferences (toggle matrix: category × channel)

PAGE W8-2 — RENTER JOURNAL:
- Header + property filter + date range
- Stats row: months | amount paid | tickets | late payments
- Vertical timeline (center-aligned, entries alternating left/right):
  - Type icons on timeline + cards with: type label + date + title + details + "צפה →"

PAGE W8-3 — GAMIFICATION:
- Hero card: large circular Trust Score "87" + rank + percentile
- 4 breakdown cards (row)
- Level progress + badge gallery (horizontal)
- Leaderboard table (top 10, current user highlighted)
- Points history list

PAGE W8-4 — LANDLORD DASHBOARD:
- Landlord sidebar nav: דשבורד | נכסים | לידים | התאמות | הודעות | חוזים | תשלומים | תקלות | צ'ק-אין/אאוט | הגדרות
- KPIs: נכסים (blue) | לידים (teal) | תשלומים ממתינים (orange) | תקלות (red)
- 2-column: properties grid + pending payments table (left 60%) | income chart + recent leads + urgent tickets (right 40%)
- Properties: card with image + address + status (rented/vacant) + tenant + rent + contract expiry + quick action links
- "הוסף נכס +" card (dashed)

PAGE W8-5 — LEADS MANAGEMENT:
- Tabs: חדשים | אושרו | נדחו + view toggle cards/table
- Card: tenant avatar + name + Trust Score + compatibility % + AI qualification badge + property + approve/reject buttons
- Table: sortable columns + bulk actions
- Side panel (480px): full tenant profile + Trust Score breakdown + compatibility details + journal summary + approve/reject/message buttons
```

---

## FLOW W9: Web Notifications (reuse shell)

```
PLATFORM: Web Desktop (1440×900). Uses sidebar shell from W3.
DIRECTION: RTL (Hebrew)
FONT: Rubik
COLORS: Primary #002045, CTA #00cba9, Background #f8f9ff, Text #0b1c30

Design 2 web content pages.

PAGE W9-1 — NOTIFICATIONS CENTER:
- Header: "מרכז ההתראות" + "סמן הכל כנקרא" link
- Filter tabs: הכל | תשלומים | חוזים | תחזוקה | התאמות | מערכת
- List (800px max, centered): each notification = unread dot + type icon (colored circle) + title (bold if unread) + body (1 line gray) + timestamp + action link
  - Hover: bg highlight + "⋯" menu (mark read, delete)
- Date separators: היום | אתמול | השבוע
- "טען עוד" button (or infinite scroll)
- STATES: loading, empty per tab, populated, all read

PAGE W9-2 — NOTIFICATION PREFERENCES:
- Master toggles card: פוש | אימייל | WhatsApp
- Detailed table:
  | קטגוריה | פוש | אימייל | WhatsApp |
  - Each cell = toggle switch
  - 9 category rows (payments reminders, payment confirmations, contracts expiry, contracts signatures, maintenance updates, maintenance 24h, new matches, chat messages, system)
- WhatsApp opt-in card (if disabled): green gradient + WA icon + benefits + phone input + "הפעל" button
- "שמור העדפות" button
```

---

# APPENDIX: Component Library Reference

```
For all screens above, use these shared components consistently:

BUTTONS:
- Primary: #00cba9 bg, white text, rounded 24px, 48px height, Rubik SemiBold 16px
- Secondary: transparent bg, #00cba9 border + text, rounded 24px
- Danger: transparent bg, #ba1a1a border + text
- Ghost: transparent, #43474e text
- Disabled: #c4c6cf bg, #74777f text
- Sizes: sm (32px), md (40px), lg (48px)

INPUTS:
- Height: 48px, border 1px #c4c6cf, rounded 8px, focus border #00cba9
- Error: border #ba1a1a, red error text below
- Icon: inside right (RTL), 20px, gray

CARDS:
- White bg, rounded 12px, shadow 0 2px 8px rgba(0,32,69,0.06), padding 16-24px

BADGES/CHIPS:
- Small: 24px height, rounded 12px, 12px font, 8px horizontal padding
- Colors: green (#00cba9/#e6fff9), yellow (#f59e0b/#fef3c7), red (#ba1a1a/#ffdad6), blue (#002045/#e5eeff), gray (#74777f/#f0f0f0)

TABLE (web only):
- Header: #eff4ff bg, Rubik SemiBold 14px, #43474e text
- Rows: white bg, hover #f8f9ff, border-bottom 1px #e5eeff
- Pagination: 25 per page default

AVATARS:
- Circular, sizes: 32/40/48/64/96px
- Border: 2px white, shadow-sm
- Online dot: 12px green circle, border 2px white, position bottom-right

MODALS (web):
- Centered, backdrop rgba(0,0,0,0.5)
- Sizes: sm (400px), md (560px), lg (720px)
- White bg, rounded 16px, shadow-lg, padding 32px
- Header + ✗ close button

BOTTOM SHEETS (mobile):
- Rounded 16px top corners
- Handle bar: 40×4px, centered, gray, top
- Backdrop: semi-transparent
- Max height: 85% screen

SKELETON LOADERS:
- Gray shimmer animation, matches final layout shape
- Duration: 1.5s pulse
```
