# M6: Maintenance Tickets (Tenant + Landlord + Admin + System)

PLATFORM: Mobile App (390×844). RTL Hebrew. Font: Rubik.
COLORS: Primary #002045, CTA #00cba9, Bg #f8f9ff, Text #0b1c30

Build 6 screens. All actors. All states.

---

## Screen 1 — Tickets List (Both actors)
- Header: "תקלות ותחזוקה" + FAB "+" (#00cba9, tenant only)
- Filter tabs: "הכל (8)" | "פתוח (2)" | "בטיפול (3)" | "נסגר (3)" — #00cba9 underline
- Ticket cards:
  - Category icon (40px circle): 🔧 אינסטלציה blue | ⚡ חשמל yellow | 🌡️ מיזוג cyan | 🚪 דלתות brown | 🎨 צבע purple | 📦 כללי gray
  - Title "נזילה בחדר אמבטיה" + description (2 lines) + "📷 2 תמונות"
  - Badge: "פתוח" red | "בטיפול" yellow | "ממתין לחשבונית" orange | "נסגר" green
  - Time: "נפתח לפני 3 שעות" — red if >24h
  - Urgency: "🔴 דחוף" badge
- **States:** loading, empty ("!אין תקלות — מעולה 🎉"), populated, filtered

## Screen 2 — Create Ticket (TENANT, full screen)
- Header: "פתח תקלה חדשה" + ✗
- Property selector dropdown
- Category: 6 icon cards (2×3 grid), tap to select (#00cba9 border active)
- Title input (max 100)
- Description textarea (4 rows, max 500)
- Urgency: "דחוף 🔴" toggle switch
- Photos: horizontal scroll, up to 5 slots (dashed "+" box → camera). Uploaded: thumbnail + ✗
- WhatsApp checkbox: "שלח למשכיר ב-WhatsApp"
- "שלח תקלה" button (#00cba9)
- **States:** empty, category selected, filling, uploading photos, submitting, success ("!התקלה נפתחה"), error

## Screen 3 — Ticket Detail (Both actors)
- Header: back + ticket # + status badge
- Category icon + title
- Status timeline (vertical, right-aligned RTL):
  - 🟢 "נפתח — 15.06 14:32 — ישראל ישראלי"
  - 🟡 "בטיפול — 15.06 16:45 — דוד כהן: אני מטפל"
  - 🟠 "ממתין לחשבונית — 16.06"
  - ⚫ "נסגר — 16.06 14:00"
  - Current step: larger dot, pulsing
- Description full text
- Photos gallery: horizontal thumbnails → tap full-screen
- Updates thread (chat-like): name + role badge + text + timestamp
- **LANDLORD actions (OPEN):** "אני מטפל" (#00cba9) | "שלח טכנאי" | "הצע פתרון" | "פתח ב-midrag.co.il" (external link)
- **LANDLORD actions (IN_PROGRESS):** "העלה חשבונית" | "סגור תקלה"
- **TENANT actions:** "אשר סגירה" green | "עדיין לא טופל" red outline
- **ADMIN:** "סגור (אדמין)" red
- **States:** all statuses, photo viewer, response modal

## Screen 4 — Landlord Response (modal)
- Response type selector: "אני מטפל באופן אישי" (person) | "שולח טכנאי" (tool) | "פתרון חלופי" (lightbulb)
- Note textarea
- Estimated time dropdown: "היום" | "מחר" | "2-3 ימים" | "שבוע"
- "שלח תגובה" button
- **States:** selecting, adding note, sending, success

## Screen 5 — Upload Invoice (LANDLORD, bottom sheet)
- "העלה חשבונית" heading
- Amount: "₪___"
- Upload zone: dashed + camera → thumbnail + ✗
- Description textarea
- "שלח חשבונית" button
- **States:** empty, filling, uploading, submitted

## Screen 6 — Escalation Notice (SYSTEM → Landlord & Admin)
- Push: "⚠️ תקלה #42 — 24 שעות ללא מענה"
- In notifications: red border card + "נזילה בחדר אמבטיה" + "נפתחה לפני 24 שעות — טרם מענה" + "טפל עכשיו" button
- 3-day escalation: "⚠️⚠️ 3 ימים — הועבר לאדמין"
