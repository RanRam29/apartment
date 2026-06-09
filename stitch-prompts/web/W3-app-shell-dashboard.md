# W3: App Shell + Tenant Dashboard

PLATFORM: Web Desktop (1440×900). SaaS dashboard layout.
DIRECTION: RTL (Hebrew). Font: Rubik.
COLORS: Primary #002045, CTA #00cba9, Bg #f8f9ff, Text #0b1c30

Build 1 page that defines the app shell (sidebar + top bar) used by ALL other web pages.

---

## Sidebar (260px, fixed RIGHT for RTL, #002045 bg)
- Top: DirApp logo (white, ™, 32px padding)
- Nav items (white text, Rubik Medium 15px, 44px height each):
  - 🏠 דף הבית — **active:** #00cba9 left border 4px + rgba(255,255,255,0.1) bg
  - 🔍 חיפוש דירות
  - 💚 ההתאמות שלי — badge "3" red
  - 💬 הודעות — badge "5" red
  - 📋 החוזים שלי
  - 💰 תשלומים
  - 🔧 תקלות
  - 📓 היומן שלי
  - 🏆 נקודות ודירוג
  - --- divider (rgba white 20%)
  - ⚙️ הגדרות
- Bottom: avatar 36px + name + role badge + "התנתק"

## Top Bar (64px, white, shadow-sm)
- Right (RTL): breadcrumb "דף הבית > ..."
- Center: search bar (480px, rounded 24px, "...חפש דירות, חוזים, הודעות")
- Left: 🔔 bell (red badge) + 🌙 dark mode toggle + avatar dropdown (name + role + logout)

## Main Content (1180px = 1440-260, padding 32px)
- Welcome: "שלום, ישראל 👋" H2 + "?מה תרצה לעשות היום"
- 3 quick action cards (row): "חפש דירה" teal gradient | "צפה בהתאמות" blue | "בדוק תשלומים" green. Hover: scale+shadow
- 2-column (60%+40%):
  **LEFT:**
  - "דירות מומלצות" + "→ ראה הכל": 3 apartment cards (image 200px + price + address + rooms + Trust Score)
  - "חוזים פעילים": table (address | status badge | dates | rent | actions). 3 rows + "ראה הכל"
  **RIGHT:**
  - Trust Score card: circular 87/100 (120px gradient ring) + 4 bars + "→ שפר"
  - "התראות אחרונות": 5 items (icon + text + time) + "→ ראה הכל"
  - "יומן אחרון": 3 timeline entries + "→ ראה הכל"
- **States:** loading (skeleton), loaded, empty (new user — onboarding cards)
