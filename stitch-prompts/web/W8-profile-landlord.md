# W8: Profile, Journal, Gamification & Landlord Dashboard (5 pages)

PLATFORM: Web Desktop (1440×900). Uses sidebar shell from W3.
DIRECTION: RTL (Hebrew). Font: Rubik.
COLORS: Primary #002045, CTA #00cba9, Bg #f8f9ff, Text #0b1c30

Build 5 pages. All states.

---

## Page 1 — Profile & Settings
- 2-col (65%+35%):
  - Left: profile card (avatar 96px + edit overlay + name + email verified ✓ + phone + role toggle + save) + preferences (budget slider + rooms + areas multi-select + amenities toggles 3-col grid) + lifestyle questionnaire (8 dimension sliders) + privacy (change password + strength meter + 2FA toggle + delete account red + GDPR export)
  - Right: KYC status card (badge + date + renew link) + Trust Score card (87/100 ring + bars) + notification prefs (toggle matrix: rows=categories × cols=push/email/WA)

## Page 2 — Renter Journal
- Header + property filter + date range picker
- Stats row: "12 חודשים" | "₪54,000" | "3 תקלות" | "0 איחורים"
- Vertical timeline (center-aligned, alternating left/right):
  - Date headers "יוני 2026"
  - Cards: type icon (📋📸💰🔧) + label + date + title + detail + "→ צפה"

## Page 3 — Gamification
- Hero: circular "87" (120px animated ring) + "שוכר מצטיין 🏆" + "גבוה מ-85%"
- 4 breakdown cards: תשלומים 95 | תחזוקה 88 | תקשורת 82 | ותק 75
- Level bar: "רמה 3 — 850 נקודות" → level 4 (1500) + badge icons
- Badge gallery (horizontal): earned colored | locked gray "?"
- Leaderboard table: top 10 (🥇🥈🥉) + highlighted current user row
- Points history: "+5 תשלום" "+50 חוזה" "+25 אימות" etc.

## Page 4 — Landlord Dashboard
- LANDLORD sidebar: 📊 דשבורד | 🏠 נכסים | 👥 לידים | 💚 התאמות | 💬 הודעות | 📋 חוזים | 💰 תשלומים | 🔧 תקלות | 📸 צ'ק-אין/אאוט | ⚙️ הגדרות
- KPIs: "נכסים: 3" blue | "לידים: 7" teal (badge "!חדש") | "תשלומים ממתינים: 2" orange | "תקלות: 1" red. Each clickable
- 2-col (60%+40%):
  - Left: properties grid (image + address + status rented/vacant + tenant + rent + contract expiry + quick links) + "הוסף נכס +" dashed card | pending payments table (tenant | property | month | amount | reported date | "אשר ✓" green / "דחה ✗" red + auto-confirm countdown)
  - Right: income bar chart (6 months) | recent leads card (5 items: avatar + name + Trust Score + compatibility + approve/reject) | urgent tickets card

## Page 5 — Leads Management
- Tabs: "חדשים (7)" | "אושרו (23)" | "נדחו (5)" + view toggle cards/table
- Cards 3-col: avatar (64px) + name + Trust Score circle + "87% התאמה" bar + AI badge ("ליד איכותי" green / "בינוני" yellow / "חלש" red) + property + "אשר ✓" green / "דחה ✗" red
- Table: sortable + bulk approve/reject
- Side panel (480px): full profile + avatar + name + Trust Score breakdown + 8-dimension compatibility + journal summary (contracts, payments, tickets) + "אשר → חוזה" #00cba9 + "דחה" red + "שלח הודעה" outline
