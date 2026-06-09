# M3: Matches & Chat Flow (Tenant + Landlord)

PLATFORM: Mobile App (390×844). RTL Hebrew. Font: Rubik.
COLORS: Primary #002045, CTA #00cba9, Bg #f8f9ff, Text #0b1c30

Build 5 screens. Both tenant AND landlord perspectives. All states required.

---

## Screen 1 — Matches List (TENANT view)
- Header: "ההתאמות שלי"
- Tabs: "הכל" | "ממתין" | "אושר" (#00cba9 underline active)
- Match cards: property thumbnail (80×80) + address + price "₪4,500/חודש" + date "הותאם לפני 2 ימים"
- Status badge: "ממתין לאישור" (yellow) | "אושר ✓" (green) | "נדחה" (red)
- Unread badge: red circle "3"
- Tap → Chat
- **States:** loading (skeleton), empty ("!עוד אין התאמות — המשך להחליק 🏠"), populated

## Screen 2 — Matches List (LANDLORD view, same screen different content)
- Same header/tabs
- Card shows: tenant avatar (48px) + name + "מעוניין ב: רוטשילד 42" + compatibility "התאמה: 87%" bar + AI score badge (green "ליד איכותי" / yellow "בינוני" / red "חלש") + Trust Score "87"
- PENDING tab: "אשר ✓" green + "דחה ✗" red buttons per card → confirm dialog
- ACCEPTED tab: "פתח צ'אט" button
- **States:** loading, empty ("אין לידים חדשים"), populated, confirm dialogs

## Screen 3 — Chat List (Both actors)
- Header: "הודעות"
- Search bar: "...חפש שיחה"
- Conversation items: avatar (48px) + online dot (green 12px) + name (bold if unread) + last message (1 line, gray, truncated) + timestamp (top-left RTL: "14:32" / "אתמול") + unread count badge + "לגבי: רוטשילד 42" (small gray)
- Tap → Chat screen
- **States:** loading, empty ("!אין שיחות — אשר התאמה כדי להתחיל"), populated, search filtered

## Screen 4 — Chat Conversation (Both actors)
- Header: back arrow (right RTL) + avatar (32px) + name + "מחובר" green / "לא מחובר" gray + "⋯" menu (block, view profile)
- Property context banner: mini apartment card (image + address + price) → tap to ApartmentDetail
- Messages:
  - Date separators: "היום" | "אתמול" | "12 ביוני" (centered pill)
  - Sent (right, RTL): #00cba9 bg, white text, 16px radius, sharp bottom-right. Below: "14:32" + ✓✓ (blue=read, gray=delivered)
  - Received (left): #e5eeff bg, dark text, sharp bottom-left. Below: "14:30"
  - Typing: 3 animated dots in bubble
- Input bar (56px): 📎 attachment | text input "...הקלד הודעה" (expandable, max 2000) | send button (#00cba9 circle, ➤, disabled when empty)
- **States:** loading, empty ("!שלח הודעה ראשונה 👋"), populated, typing visible, sending (clock icon), sent (✓), delivered (✓✓ gray), read (✓✓ blue), error ("שגיאה — נסה שוב")

## Screen 5 — Lead Detail (LANDLORD only, bottom sheet)
- Tenant avatar (80px) + name + age
- Trust Score: large "87/100" circular gradient ring
- AI: "ליד איכותי — 92%" green badge
- Compatibility bars: תקציב 90% | מיקום 85% | אורח חיים 80% | העדפות 88%
- Journal summary: "3 חוזים קודמים" | "0 איחורים" | "24 חודשים ותק"
- Contact: phone + email
- Actions (sticky bottom):
  - "אשר והמשך לצ'אט" (#00cba9, full width, 48px)
  - "דחה" (red outline, full width)
  - "שלח הודעה קודם" (gray outline)
- **States:** loading, loaded, approve confirm, reject confirm
