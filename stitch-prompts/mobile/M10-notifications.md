# M10: Notifications & Guarantor Invite

PLATFORM: Mobile App (390×844). RTL Hebrew. Font: Rubik.
COLORS: Primary #002045, CTA #00cba9, Bg #f8f9ff, Text #0b1c30

Build 3 screens. All states.

---

## Screen 1 — Notifications Center
- Header: "התראות" + "סמן הכל כנקרא" #00cba9 link
- Filter tabs: "הכל" | "תשלומים" | "חוזים" | "תחזוקה" | "התאמות" | "מערכת"
- Items:
  - Unread: blue dot (right RTL) + white bg
  - Read: no dot + #f8f9ff bg
  - Type icon (40px circle): 💰 teal | 📋 blue | 🔧 orange | 💚 green | ⚠️ red | 📱 WA green
  - Title (bold if unread) + body (1 line gray) + timestamp "לפני 3 שעות"
  - Tap → relevant screen
  - Swipe left → dismiss
- Date separators: "היום" | "אתמול" | "השבוע"
- **States:** loading, empty ("אין התראות 🔔"), populated, filtered, all read

## Screen 2 — Invite Guarantor (LANDLORD, bottom sheet from Contract Detail)
- "הזמנת ערב לחוזה" heading
- Contract: "רוטשילד 42 — ממתין"
- Inputs: email + name + phone (for OTP)
- Guarantee amount: pre-filled "₪13,500" (3× rent, editable)
- Expiry: "5 ימים"
- "שלח הזמנה" button (#00cba9)
- Note: "הערב יקבל לינק מאובטח. תקף 5 ימים."
- After: success card "ההזמנה נשלחה ✓"
- Status tracking: "ממתין ⏳" yellow | "אומת וחתם ✓" green | "סירב ✗" red | "פג תוקף" gray + "שלח מחדש"
- **States:** form, sending, sent, tracking, declined alert, expired + resend

## Screen 3 — Admin Screens (3 sub-screens in Admin tabs)
**AdminConfig tab:** 9 accordion sections (General, KYC, Payments, Matching, Contracts, Chat, Notifications, Gamification, Security). Each section: config rows with key label + input (number/text/toggle) + description. "שמור" button per section.
**AdminUsers tab:** paginated list (20/page), search + filter by role/KYC. User card: name + email + role badge + KYC badge + status. Edit modal: all fields editable + save. Block/unblock + KYC override buttons.
**AdminStats tab:** 4 KPI cards (users, listings, contracts, payments) + charts (growth, payment status donut, match rates) + top performers + system health.
- **States per tab:** loading, loaded, editing, saving, error
