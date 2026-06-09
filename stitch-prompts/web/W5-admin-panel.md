# W5: Admin Panel (3 pages)

PLATFORM: Web Desktop (1440×900). Sidebar shell (same as W3 but ADMIN nav).
DIRECTION: RTL (Hebrew). Font: Rubik.
COLORS: Primary #002045, CTA #00cba9, Bg #f8f9ff, Text #0b1c30

Admin sidebar: logo + "ADMIN" red badge. Nav: 📊 דשבורד | 👥 משתמשים | 🏠 נכסים | 📋 חוזים | 💰 לדג'ר | 🔧 תקלות | ⚙️ הגדרות | 📝 לוגים | 📱 WhatsApp

Build 3 pages. All states.

---

## Page 1 — Dashboard
- 4 KPI cards: "משתמשים: 1,247" ↑12% sparkline | "דירות: 834" ↑8% | "חוזים: 412" ↑5% | "תשלומים: ₪1.8M" ↑15%
- 2-col charts: Left: "הרשמות 30 ימים" line chart (#00cba9 gradient fill). Right: "תשלומים" donut (78% green, 15% yellow, 7% red)
- "פעילות אחרונה" table: זמן | משתמש | פעולה | פרטים. 20 rows + "ראה הכל"
- Bottom 2 cards: "תקלות פתוחות" (red badge, 5 items) | "חוזים פגים" (orange, 60-day list)
- **States:** loading, loaded

## Page 2 — User Management
- Header: "ניהול משתמשים" + "סה"כ: 1,247"
- Search (wide) + filter row: role | KYC | Trust Score range | date range | "סנן" + "נקה"
- Table: ✓ | שם | אימייל | טלפון | תפקיד (badges: שוכר blue, משכיר green, אדמין red) | KYC (✓ green, ⏳ yellow, ✗ red, — gray) | Trust Score (color-coded) | נרשם | סטטוס (פעיל green / נעול red) | ⋯ actions
- Actions dropdown: ערוך | עקוף KYC (orange) | אפס Trust | שלח התראה | חסום/שחרר | מחק (red, cascading confirm)
- Bulk bar (on checkboxes): "נבחרו: 5" + שלח הודעה + ייצוא CSV + מחק (red)
- Pagination: "1-25 מתוך 1,247"
- Edit modal (560px): name + email (readonly) + phone + role dropdown + active role + Trust Score (0-100) + premium toggle + locked toggle + verified toggle + save/cancel
- **States:** loading, loaded, searching, filtering, editing, bulk actions, delete confirm

## Page 3 — Config Panel
- Header: "הגדרות מערכת" + "52 הגדרות" badge + "שמור הכל" (#00cba9, sticky top)
- "עודכן: 01.06.2026 14:32 admin@dirapp.com"
- 9 accordion sections (title + count + expand):
  - ⚙️ כללי: app_name [DirApp] | default_language [he] | maintenance_mode [☐]
  - 🛡️ KYC: timeout_hours [24] | image_retention_days [7] | renewal_years [5]
  - 💰 תשלומים: autoconfirm_hours [48] | grace_days [5] | cpi_default [☑]
  - 💚 התאמות: swipe_limit [50] | superlike_limit [3] | match_expiry [30]
  - 📋 חוזים: checkin_window [5] | photos_per_room [20] | fix_rounds [3]
  - 💬 צ'אט: msg_length [2000] | image_size [5]
  - 🔔 התראות: email_digest [☑] | push [☑]
  - 🏆 גיימיפיקציה: pts_swipe [1] | pts_match [10] | pts_contract [50]
  - 🔒 אבטחה: rate_limit [10] | login_attempts [5] | lockout_min [30] | password_min [8]
- Each row: key label + input (number/text/toggle) + description caption
- Changed values: yellow left border
- **States:** loading, loaded, editing (yellow highlights), saving (spinner), saved (green flash)
