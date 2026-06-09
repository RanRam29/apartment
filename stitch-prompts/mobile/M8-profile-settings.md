# M8: Profile, Journal, Gamification & Settings

PLATFORM: Mobile App (390×844). RTL Hebrew. Font: Rubik.
COLORS: Primary #002045, CTA #00cba9, Bg #f8f9ff, Text #0b1c30

Build 5 screens. Different views for Tenant vs Landlord. All states.

---

## Screen 1 — Profile (TENANT view)
- DirApp logo (top center, small)
- Avatar (80px circular) + camera overlay for upload
- Name + pencil edit → edit modal (first/last name + save/cancel)
- Email + verified ✓ badge
- Role: "שוכר" blue pill + "החלף למשכיר" #00cba9 link
- Trust Score card (tappable): circular "87/100" gradient ring + "Trust Score" label + "→ לחץ לפרטים"
- Premium: "שדרג לפרימיום 👑" / "פרימיום פעיל ✓"
- Menu list (icon + label + chevron each):
  🏠 העדפות דירה | 👥 שותפים | 🛡️ אימות זהות (+status badge) | 📋 חוזים | 💰 תשלומים | 📓 יומן | 🏆 נקודות | 🔧 תקלות | --- | ⚙️ הגדרות פרטיות | 📜 תנאי שימוש | 🔔 התראות
- WhatsApp toggle + phone input
- Dark mode toggle 🌙
- "התנתק" red text button + confirm dialog
- Version "v3.0.1" bottom center
- **States:** loaded, edit modal, avatar uploading, WhatsApp toggling, logout confirm

## Screen 2 — Profile (LANDLORD view)
- Same structure, different menu:
  📊 דשבורד | 🏠 נכסים | 👥 לידים | 📋 חוזים | 💰 תשלומים | 🔧 תקלות | 🏆 נקודות | --- | same settings
- Role: "משכיר" green pill + "החלף לשוכר"

## Screen 3 — Renter Journal (TENANT)
- Header: "היומן שלי" + history icon
- Property filter dropdown
- Stats cards row: "12 חודשים" | "₪54,000 שולמו" | "3 תקלות" | "0 איחורים"
- Vertical timeline (right-aligned RTL): date dots + connecting line
  - Entry cards by type icon: 📋 contract | 📸 check-in | 💰 payment | 🔧 maintenance | 📸 check-out
  - Content: type label + date + title "חוזה נחתם — רוטשילד 42" + key detail + "→ צפה בפרטים" link
- **States:** loading, populated, empty ("אין רשומות"), filtered

## Screen 4 — Gamification / Trust Score
- Header: "נקודות ודירוג" + trophy
- Hero: circular "87" (120px animated gradient ring) + "שוכר מצטיין 🏆" gold + "גבוה מ-85%"
- Breakdown (4 bar cards): תשלומים 95 green | תחזוקה 88 blue | תקשורת 82 teal | ותק 75 purple
- Level: "רמה 3 — 850 נקודות" + progress to level 4 (1500). Badges: 🥉 מתחיל → 🥈 פעיל → 🥇 מנוסה → 💎 VIP
- Badge gallery (horizontal scroll): earned = colored + title. Locked = gray + "?" + unlock hint
- Points history (10 items): "+5 תשלום בזמן" | "+3 סופר לייק" | "+50 חוזה" | "+25 אימות"
- Leaderboard top 10: 🥇🥈🥉 name | score. Current user highlighted
- **States:** loading, loaded, empty (new user)

## Screen 5 — Privacy & Notification Settings
- Header: "הגדרות פרטיות" + lock
- "שינוי סיסמה": current + new (+ strength meter) + confirm + "עדכן" button
- "התראות" toggle matrix: rows (תשלומים|חוזים|תחזוקה|התאמות|מערכת) × columns (פוש|אימייל|WhatsApp)
- "נתונים": "ייצוא GDPR" outline button | "בקש מחיקת חשבון" red outline → confirm "יימחק תוך 30 יום"
- WhatsApp: opt-in toggle + phone + "נשלח עדכוני תשלום, תחזוקה, חידוש"
- **States:** loaded, password changing, exporting, deletion confirm + success, WA toggling
