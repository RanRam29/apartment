# W9: Notifications & Preferences (2 pages)

PLATFORM: Web Desktop (1440×900). Uses sidebar shell from W3.
DIRECTION: RTL (Hebrew). Font: Rubik.
COLORS: Primary #002045, CTA #00cba9, Bg #f8f9ff, Text #0b1c30

Build 2 pages. All states.

---

## Page 1 — Notifications Center
- Header: "מרכז ההתראות" + "סמן הכל כנקרא" #00cba9 link
- Tabs: "הכל (23)" | "תשלומים (5)" | "חוזים (8)" | "תחזוקה (4)" | "התאמות (3)" | "מערכת (3)"
- List (800px centered):
  - Unread: blue dot right (RTL) + white bg. Read: no dot + #f8f9ff
  - Type icon (40px circle): 💰 teal | 📋 blue | 🔧 orange | 💚 green | ⚠️ red | 📱 WA green
  - Title (bold if unread) + body (1 line gray) + timestamp + action link "→ צפה"
  - Hover: bg highlight + ⋯ menu (mark read, delete)
- Separators: "היום" | "אתמול" | "השבוע"
- "טען עוד" button
- **States:** loading, empty ("אין התראות"), populated, filtered, all read

## Page 2 — Notification Preferences
- Master toggles card: "פוש נוטיפיקציות" toggle | "אימייל" toggle | "WhatsApp" toggle
- Table:
  | קטגוריה | פוש | אימייל | WhatsApp |
  | תשלומים — תזכורות | ☑ | ☑ | ☑ |
  | תשלומים — אישורים | ☑ | ☑ | ☐ |
  | חוזים — פג תוקף | ☑ | ☑ | ☑ |
  | חוזים — חתימות | ☑ | ☑ | ☐ |
  | תחזוקה — עדכונים | ☑ | ☐ | ☑ |
  | תחזוקה — 24 שעות | ☑ | ☑ | ☐ |
  | התאמות | ☑ | ☐ | ☐ |
  | הודעות צ'אט | ☑ | ☐ | ☐ |
  | מערכת ואבטחה | ☑ | ☑ | ☐ |
  Each cell = toggle switch
- "שמור העדפות" button (#00cba9)
- WhatsApp opt-in card (if disabled): green gradient + WA icon + "קבל עדכונים ב-WhatsApp" + benefits ("תזכורת 3 ימים", "עדכוני תחזוקה", "חידוש חוזה") + phone input + "הפעל" green button + "ניתן לבטל בכל עת"
