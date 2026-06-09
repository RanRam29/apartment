# M5: Payments & Ledger (Tenant + Landlord + System)

PLATFORM: Mobile App (390×844). RTL Hebrew. Font: Rubik.
COLORS: Primary #002045, CTA #00cba9, Bg #f8f9ff, Text #0b1c30

Build 4 screens. All actors. All states.

---

## Screen 1 — Ledger (Both actors)
- Header: "תשלומי שכירות" + property address
- Contract selector dropdown (if multiple)
- Summary card: Tenant: "יתרה: ₪4,500" + "פירעון: 1 ביולי" + circular progress. Landlord: "ממתין לאישור: 1" + "הכנסה: ₪4,500"
- Monthly rows (expandable):
  - Month "יולי 2026" | amount "₪4,500" | due "01.07" | status badge
  - Badges: "שולם ✓" green | "דווח" yellow | "ממתין" gray | "באיחור" red bold | "אושר אוטומטית" blue
  - Expanded: payment date + receipt thumbnail (tap enlarge) + method + notes
  - Tenant: "דווח על תשלום" button per pending row
  - Landlord: "אשר ✓" green + "דחה ✗" red per reported row
  - Auto-confirm: "אישור אוטומטי בעוד 36 שעות" caption
- **States:** loading, populated, empty ("אין שורות — החוזה טרם הופעל"), error

## Screen 2 — Report Payment (TENANT, bottom sheet)
- Header: "דווח על תשלום" + ✗ close
- Month: auto-filled pending (editable dropdown)
- Amount: pre-filled "₪4,500" (editable)
- Date: date picker (default today)
- Method chips: "העברה" | "צ'ק" | "מזומן" | "Bit" | "אחר"
- Reference: text input (optional)
- Receipt upload: dashed zone (camera icon + "צלם או בחר קבלה") → thumbnail + ✗. "JPG, PNG, PDF — עד 5MB"
- Notes textarea (optional)
- "שלח דיווח" button (#00cba9)
- Note: "אם המשכיר לא יגיב תוך 48 שעות — אישור אוטומטי"
- **States:** empty, filling, uploading receipt, submitting, success ("!דיווח נשלח ✓"), error

## Screen 3 — Confirm/Reject Payment (LANDLORD, bottom sheet)
- Header: "אישור תשלום" + ✗
- Details: month + amount + date + method + reference + receipt thumbnail (tap → full viewer)
- Countdown: "אישור אוטומטי בעוד 36 שעות ⏳"
- "אשר תשלום ✓" green button (full width, 48px)
- "דחה — בקש הוכחה נוספת" red outline
- If rejecting: textarea "...סיבת דחייה" + "שלח דחייה"
- **States:** loaded, confirming, confirmed, rejecting (notes), rejected, receipt viewer

## Screen 4 — Payment Rejected (TENANT view)
- Push notification: "המשכיר דחה את דיווח התשלום ליוני"
- Red alert card: "התשלום נדחה ✗"
- Reason: "הקבלה לא ברורה, נא תמונה חדשה"
- "דווח שוב" button (#00cba9) → opens Report Payment same month
- "צור קשר עם המשכיר" outline → Chat
- **States:** loaded, navigating to report, navigating to chat
