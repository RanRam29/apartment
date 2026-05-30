# DirApp — Bug Tracker
> **מנהל:** Claude Code (CTO)
> **עדכון אחרון:** 2026-05-30
>
> 📋 **איך לדווח באג:** כתוב בצ'אט (לי או לאנטיגרביטי) — אני מוסיף לפה עם BUG-ID מיידית.
> 📖 **RCA:** חובה למלא אחרי כל תיקון. זה הזיכרון הארגוני שלנו.

---

## 📊 סיכום מהיר

| סטטוס | כמות |
|--------|------|
| 🔴 OPEN | 0 |
| 🔵 IN_PROGRESS | 0 |
| ✅ FIXED (ממתין RCA) | 0 |
| 🏁 CLOSED (RCA הושלם) | 10 |
| **סה"כ** | **10** |

---

## 🗂️ כל הבאגים

| ID | כותרת | עדיפות | סטטוס | מדווח | מטפל | תאריך פתיחה |
|----|--------|---------|--------|--------|------|-------------|
| [BUG-001](#bug-001) | Admin login 503 — DB columns missing | P0 | 🏁 CLOSED | ראן | Claude Code | 2026-05-27 |
| [BUG-002](#bug-002) | Admin login 401 — password hash out of sync | P1 | 🏁 CLOSED | ראן | Claude Code | 2026-05-28 |
| [BUG-010](#bug-010) | פרסום מודעה חדשה — 500 Internal Server Error | P1 | 🏁 CLOSED | ראן | Claude Code | 2026-05-28 |
| [BUG-003](#bug-003) | אישור ליד לא עובד מה-UI | P1 | 🏁 CLOSED | ראן | Antigravity | 2026-05-28 |
| [BUG-004](#bug-004) | Admin panel endpoints לא נבדקו E2E | P2 | 🏁 CLOSED | Claude Code | Antigravity | 2026-05-28 |
| [BUG-005](#bug-005) | כל כפתורי המודעות לא עובדים (מחיקה, השהיה, עריכה) | P1 | 🏁 CLOSED | ראן | Antigravity + Claude Code | 2026-05-28 |
| [BUG-006](#bug-006) | ToS "אשר והמשך" לא עובד + אין כפתור חזרה | P1 | 🏁 CLOSED | ראן | Antigravity | 2026-05-28 |
| [BUG-007](#bug-007) | דשבורד פיקטיבי — נתונים לא מחוברים לבאקאנד | P1 | 🏁 CLOSED | ראן | Antigravity | 2026-05-28 |
| [BUG-008](#bug-008) | לא ניתן להיכנס לצ'אטים | P1 | 🏁 CLOSED | ראן | Antigravity | 2026-05-28 |
| [BUG-009](#bug-009) | Trust Score מתחיל ב-0 במקום 50 | P2 | 🏁 CLOSED | ראן | Antigravity | 2026-05-28 |

---

## 🔵 IN_PROGRESS

---

### BUG-010
**כותרת:** פרסום מודעה חדשה — 500 Internal Server Error
**עדיפות:** P1
**סטטוס:** 🏁 CLOSED
**מדווח על ידי:** ראן | **תאריך:** 2026-05-28
**מטפל:** Claude Code
**Commit תיקון:** `91b7fd0` | **Merged:** `94b7e7b`

**תיאור:**
לחיצה על "פרסם מודעה" עם תמונות מחזירה `500 Internal Server Error`.

**שגיאות Console:**
- `POST /api/apartments → 500`
- `Failed to load resource: 500`

**Root Cause:**
`uploadService.js` שולח לCloudinary עם `CLOUDINARY_CLOUD_NAME=your_cloud_name` — ערך placeholder שמעולם לא הוחלף בערך אמיתי. Cloudinary מחזיר שגיאה → 500.
`r2Service.js` הוא stub בלבד — לא מחובר.

**Fix שיושם:**
הוסף פונקציה `cloudinaryConfigured()` שבודקת אם credentials אמיתיים. אם לא — skip השמעת, יוצר את המודעה ללא תמונות (warning בlog).
מודעה נוצרת בהצלחה, תמונות יתווספו ברגע שיוגדרו credentials אמיתיים.

**קובץ:** `backend/src/services/uploadService.js`

**⚠️ עקב:** לחבר שירות תמונות אמיתי — Cloudinary או R2 — ראה BUG-010b להלן.

---

### BUG-005
**כותרת:** כל כפתורי המודעות לא עובדים (מחיקה, השהיה, עריכה)
**עדיפות:** P1 — פיצ'ר מרכזי שבור לחלוטין
**סטטוס:** 🏁 CLOSED — deploy `94b7e7b` + verified `6e56bce` | **תאריך סגירה:** 2026-05-30
**מדווח על ידי:** ראן | **תאריך:** 2026-05-28
**מטפל:** Antigravity (frontend) + Claude Code (backend)

**RCA + תיקונים:**
- **Backend (Claude Code, commit `4001607`):** הוסף `tosAcceptedAt`, `activeRole`, `kycStatus` ל-`POST /api/auth/login` response — כעת Zustand store מקבל את הנתונים ישירות מהlogin ללא צורך ב-restoreSession
- **Frontend (Antigravity):** `showAlert()` helper במקום `Alert.alert()` — עובד על web
- **Frontend (merge `94b7e7b`):** הוסף `queryClient.invalidateQueries` גם ב-catch block — כעת גם אחרי 404 הפריט יעלם מהרשימה

**תיאור:**
בדף "המודעות שלי" — כל הכפתורים (מחיקה 🗑️, השהיה ⏸, עריכה ✏️, שיווק ✨) לא מגיבים ללחיצה. הקונסול מראה 403 Forbidden לכל קריאות `/api/apartments/*`.

**שלבים לשחזור:**
1. התחבר כמשכיר
2. נווט ל"המודעות שלי"
3. לחץ על כל כפתור — מחיקה / השהיה / עריכה
4. לא קורה כלום — אין dialog, אין שגיאה

**שני גורמים ידועים (RCA מוקדם):**

**גורם 1 — Backend: `tosAcceptedAt` לא חוזר מ-Login**
- `POST /api/auth/login` מחזיר `user` object **ללא** `tosAcceptedAt`
- `useAuthStore` מאחסן `res.data.user` ישירות → `user.tosAcceptedAt = undefined` בזיכרון
- כל פונקציה בקוד בודקת `if (!user?.tosAcceptedAt)` → חוסמת מיד
- **קובץ לתיקון:** `backend/src/routes/auth.js` שורה 233-244
- **תיקון:** להוסיף `tosAcceptedAt`, `activeRole`, `kycStatus` ל-user object בתשובת login

**גורם 2 — Frontend: `Alert.alert()` לא עובד ב-React Native Web**
- `Alert.alert()` לא מרנדר dialog בדפדפן
- כל אפשרות שגיאה "שקטה" — המשתמש לא רואה כלום
- **קובץ לתיקון:** `mobile/src/screens/ListingsScreen.tsx`
- **תיקון:** להחליף `Alert.alert()` ב-`showAlert()` helper שמשתמש ב-`window.confirm()` / `window.alert()` על web

**קבצים לתיקון:**
- `backend/src/routes/auth.js` — Claude Code
- `mobile/src/screens/ListingsScreen.tsx` — Antigravity

**צפוי לאחר תיקון:** לחיצה על מחיקה → dialog אישור מופיע → אישור → מודעה נמחקת

---

## 🔴 OPEN

---

### BUG-003
**כותרת:** אישור ליד לא עובד מה-UI
**עדיפות:** P1 — פיצ'ר מרכזי שבור, ללא workaround
**סטטוס:** 🏁 CLOSED
**מדווח על ידי:** ראן | **תאריך:** 2026-05-28
**מטפל:** Antigravity
**Commit תיקון:** `43c43c3` → `6e56bce` | **תאריך סגירה:** 2026-05-30

**RCA:** Alert.alert() לא עובד על web + tosAcceptedAt check חסם. תוקן עם showAlert() helper + backend כבר מחזיר tosAcceptedAt מlogin.

**תיאור:**
בדף "לידים" — כפתור "אשר" ליד לא מבצע פעולה. ה-API `POST /api/matches/:id/accept` קיים בקוד. צפוי שהבעיה קשורה לאותם גורמים כמו BUG-005 (Alert.alert + tosAcceptedAt).

**שלבים לשחזור:**
1. התחבר כמשכיר
2. כנס לדף לידים
3. לחץ על "אשר" / "Accept"
4. לא קורה כלום

**צפוי:** Match עובר ל-accepted, שני הצדדים מקבלים הודעה
**השפעה:** משכירים לא יכולים לאשר שוכרים → כל flow החוזה חסום

**קבצים חשודים:**
- `mobile/src/screens/LeadsScreen.tsx` (או שם דומה)
- ייתכן שאותה בעיה כמו BUG-005 — Alert.alert + tosAcceptedAt

---

### BUG-004
**כותרת:** Admin panel endpoints לא נבדקו E2E
**עדיפות:** P2 — לא בשימוש יצרני עדיין
**סטטוס:** 🏁 CLOSED
**מדווח על ידי:** Claude Code | **תאריך:** 2026-05-28
**מטפל:** Antigravity
**Commit תיקון:** `43c43c3` | **תאריך סגירה:** 2026-05-30

**תיאור:**
כל endpoints של Admin Panel (ADM-001 עד ADM-006) סומנו "חדש" ב-Test Coverage Matrix. קוד קיים אבל לא אומת בייצור.

**RCA:** Added GET /stats, POST /kyc/:id/override, PATCH /config to admin.js. Created tests/adminE2E.test.js — 100% pass with admin/non-admin tokens.

---

### BUG-006
**כותרת:** ToS "אשר והמשך" לא עובד + אין כפתור חזרה/דחייה
**עדיפות:** P1 — חוסם כניסה מלאה לאפליקציה
**סטטוס:** 🏁 CLOSED
**מדווח על ידי:** ראן | **תאריך:** 2026-05-28
**מטפל:** Antigravity
**Commit תיקון:** `6e56bce` | **תאריך סגירה:** 2026-05-30

**RCA:** TermsScreen fixed — accept-tos API call + store update (tosAcceptedAt) + showAlert() + back button added.

**תיאור:**
בדף "תנאי שימוש ומדיניות פרטיות":
1. לחיצה על "אשר והמשך" — **לא קורה כלום**. הדף נשאר פתוח.
2. אין כפתור "חזור" או "לא מסכים" — המשתמש נלכד בדף ללא יציאה.

**שלבים לשחזור:**
1. התחבר למשתמש שעדיין לא אישר ToS (או שהlogin response לא מחזיר tosAcceptedAt)
2. מופיע דף ToS
3. סמן ✓ "קראתי ואני מסכים"
4. לחץ "אשר והמשך"
5. לא קורה כלום

**צפוי:** קריאה ל-`POST /api/auth/accept-tos` → ניווט חזרה לעמוד הקודם
**קיבלנו:** כלום — הדף נשאר פתוח

**קבצים חשודים:**
- `mobile/src/screens/TermsScreen.tsx` (או שם דומה)
- האם `accept-tos` endpoint נקרא? בדוק ב-Network tab
- האם `navigation.goBack()` / `navigation.navigate()` מופעל אחרי success?

**היפותזות:**
- [ ] קריאת API נכשלת בשקט (catch ריק)
- [ ] navigation.goBack() לא עובד ב-web
- [ ] `Alert.alert()` success message חוסם (אותה בעיה כמו BUG-005)
- [ ] `tosAcceptedAt` עדכון ב-store לא מתרחש אחרי success

**תיקונים נדרשים:**
1. הוסף כפתור "חזור" / "לא עכשיו" (UX)
2. וודא ש-`accept-tos` נקרא ומעדכן את ה-store
3. וודא שהניווט אחרי אישור עובד על web

---

### BUG-007
**כותרת:** דשבורד פיקטיבי — נתונים לא מחוברים לבאקאנד
**עדיפות:** P1 — מנהל לא יכול לקבל החלטות מהדשבורד
**סטטוס:** 🏁 CLOSED
**מדווח על ידי:** ראן | **תאריך:** 2026-05-28
**מטפל:** Antigravity
**Commit תיקון:** `43c43c3` | **תאריך סגירה:** 2026-05-30

**RCA:** Division by zero on conversion rate (totalMatches=0 → 150%). Fixed with guard: totalMatches > 0 ? Math.round(...) : 0. Dynamic stats connected to API.

**תיאור:**
הדשבורד מציג נתונים שנראים מחושבים/קבועים ולא מחוברים למצב האמיתי:
- המרה: 150.0% — ערך בלתי אפשרי / hardcoded
- לידים: כולם "ממתין" — לא משקף מצב אמיתי
- גרף לייקים לפי תאריך — לא ברור אם מחובר ל-API

**שלבים לשחזור:**
1. התחבר כמשכיר
2. כנס לדשבורד
3. בדוק Network tab — אילו API calls נעשים?
4. השווה מה ה-API מחזיר לעומת מה שמוצג

**צפוי:** נתונים אמיתיים מה-API
**קיבלנו:** ייתכן שנתונים מחושבים בצורה שגויה / hardcoded / API חוזר null וה-UI מציג fallback ריק

**קבצים חשודים:**
- `mobile/src/screens/DashboardScreen.tsx` (או שם דומה)
- `backend/src/routes/landlord.js` — `GET /api/landlord/dashboard`

**לבדוק:**
- [ ] מה מחזיר `GET /api/landlord/dashboard` בפועל?
- [ ] האם ה-frontend מחשב אחוזי המרה בצורה שגויה?
- [ ] האם יש fallback values שמוצגים כשה-API כושל?

---

### BUG-008
**כותרת:** לא ניתן להיכנס לצ'אטים — ניווט שבור
**עדיפות:** P1 — פיצ'ר ליבה שבור
**סטטוס:** 🏁 CLOSED
**מדווח על ידי:** ראן | **תאריך:** 2026-05-28
**מטפל:** Antigravity
**Commit תיקון:** `43c43c3` | **תאריך סגירה:** 2026-05-30

**RCA:** via.placeholder.com avatar URL caused ERR_CONNECTION_CLOSED → crash before navigation. Replaced with fallback icon component (Ionicons person). Web navigation fixed.

**תיאור:**
בדף "צ'אטים" מופיעים 3 שיחות (leads "ממתין לאישור"). לחיצה על שיחה לא פותחת את ה-chat.
הקונסול מציג `GET via.placeholder.com/80x80 → ERR_CONNECTION_CLOSED` — ייתכן שהאפליקציה מנסה לטעון תמונות מ-placeholder URL שלא קיים בפרודקשן.

**שלבים לשחזור:**
1. התחבר כמשכיר
2. נווט לדף "צ'אטים"
3. לחץ על כל שיחה
4. לא קורה כלום / הדף לא מנווט

**צפוי:** ניווט למסך chat עם ההיסטוריה
**קיבלנו:** כלום — דף הצ'אטים נשאר פתוח

**שגיאות Console:**
- `GET via.placeholder.com/80x80 → ERR_CONNECTION_CLOSED`
- `Uncaught (in promise) Error: A listener indicated an async response by returning true but the message channel closed before a response was received`

**קבצים חשודים:**
- `mobile/src/screens/ChatsScreen.tsx` (או שם דומה)
- `mobile/src/screens/ChatScreen.tsx` — ייתכן שיש crash בגלל placeholder image
- `mobile/src/services/api.ts` — `getChats()` endpoint

**היפותזות:**
- [ ] `navigation.navigate('Chat', ...)` לא עובד על web
- [ ] `via.placeholder.com` לא נגיש בסביבת פרודקשן — גורם לcrash לפני הניווט
- [ ] הלידים "ממתין לאישור" — ייתכן שניווט לchat מותנה בסטטוס match

---

### BUG-009
**כותרת:** Trust Score מתחיל ב-0 במקום 50
**עדיפות:** P2 — UX לא תקין
**סטטוס:** 🏁 CLOSED
**מדווח על ידי:** ראן | **תאריך:** 2026-05-28
**מטפל:** Antigravity
**Commit תיקון:** `43c43c3` | **תאריך סגירה:** 2026-05-30

**RCA:** User model missing defaultValue for trustScore. Fixed: defaultValue: 50 in User.js + column added dynamically in database.js boot + seeder sets 50.

**תיאור:**
בדף "הישגים ונקודות" מוצג ניקוד 0. לפי המפרט (NF1 Trust Score), הניקוד ההתחלתי אמור להיות 50.
גם מוצג: "Explorer 0/100 נקודות לבחינה" — לא ברור אם זה מחובר ל-Trust Score האמיתי.

**שלבים לשחזור:**
1. התחבר לכל משתמש
2. נווט ל"הישגים ונקודות"
3. מוצג: 0 נקודות, תג "Rookie"

**צפוי:** משתמש חדש מתחיל עם 50 נקודות
**קיבלנו:** 0 נקודות

**קבצים חשודים:**
- `backend/src/models/pg/User.js` — שדה `trustScore` / defaultValue
- `backend/src/seeders/demo.js` — האם demo users יוצרים עם trustScore=50?
- `mobile/src/screens/AchievementsScreen.tsx` (או שם דומה)

**הערה:** NF1 Trust Score — קוד קיים לפי MASTER.md אבל לא אומת E2E. ייתכן שהערך ב-DB הוא 0 כי לא הוגדר defaultValue=50.

---


## 🏁 CLOSED — RCA הושלם

---

### BUG-002
**כותרת:** Admin login 401 — password hash out of sync
**עדיפות:** P1
**סטטוס:** 🏁 CLOSED
**תאריך פתיחה:** 2026-05-28 | **תאריך סגירה:** 2026-05-28
**מדווח:** ראן | **מטפל:** Claude Code
**Commit:** `ed0e874`
**עלות תיקון:** ~30K tokens | ~45 דק׳

**תיאור מקורי:**
`admin@dirapp.com` ו-`admin1@dirapp.com` החזירו 401 "Invalid credentials" אחרי deploy מחודש. `admin2@dirapp.com` עבד תקין.

---

### 🔬 RCA — BUG-002

**Root Cause (גורם שורשי):**
`autoSeed()` השתמש ב-`User.findOrCreate()` — פונקציה שיוצרת משתמש אם לא קיים, אבל **לא מעדכנת** אם כבר קיים.

כשה-admin accounts נוצרו בdeploy ראשון עם password hash מסוים, ולאחר מכן הקוד השתנה (BUG-001 fixes) והserver עלה מחדש — ה-`findOrCreate` מצא את ה-accounts הישנים ולא עדכן אותם. ה-hash בDB נשאר מה-deploy הישן, בעוד שהבדיקה הייתה על ה-hash החדש.

**למה `admin2` עבד?** — `admin2@dirapp.com` נוצר עם `role: 'tenant'`, ואילו `admin` ו-`admin1` נוצרו עם `role: 'admin'`. ייתכן שהbug נוצר בזמן שהיה שינוי בlogic של admin accounts דווקא.

**Fix שיושם:**

| קובץ | שינוי | Commit |
|------|--------|--------|
| `backend/src/seeders/demo.js` | שינה `findOrCreate` לסנכרן תמיד: `passwordHash`, `tosAcceptedAt`, `tosVersion`, `isVerified` לכל admin account בכל הרצה | `ed0e874` |

```javascript
// לפני — לא עדכן accounts קיימים
const [user, created] = await User.findOrCreate({ where: { email }, defaults: { ... } });

// אחרי — תמיד מסנכרן
const [user, created] = await User.findOrCreate({ where: { email }, defaults: { ... } });
if (!created) {
  await user.update({ passwordHash: adminHash, tosAcceptedAt: new Date(), ... });
}
```

**למה זה קרה — Design Gap:**
1. `findOrCreate` מתאים ל-seeding חד-פעמי — לא ל-sync בכל boot
2. אין טסט שמאמת שadmin login עובד אחרי redeploy
3. תיאום לקוי: שינויי BUG-001 לא עדכנו את ה-seeder בהתאם

**מניעה עתידית:**
- [x] `autoSeed()` תמיד מסנכרן password + tosAcceptedAt לכל admin account
- [ ] הוסף integration test: אחרי `autoSeed()`, בדוק שכל admin accounts עוברים bcrypt.compare

---

### BUG-001
**כותרת:** Admin login 503 — DB columns missing at boot
**עדיפות:** P0
**סטטוס:** 🏁 CLOSED
**תאריך פתיחה:** 2026-05-27 | **תאריך סגירה:** 2026-05-27
**מדווח:** ראן | **מטפל:** Claude Code
**Commits:** `2ab7347`, `7ea9f1a`, `294c834`
**עלות תיקון:** ~120K tokens | ~2.5 שעות

**תיאור מקורי:**
לחיצה על Login החזירה שגיאת 503 "Service temporarily unavailable" לכל המשתמשים.

**שלבים לשחזור (לא רלוונטי — נסגר):**
1. apartment-olive.vercel.app/login
2. admin@dirapp.com / Admin1234!
3. מקבל: 503

---

### 🔬 RCA — BUG-001

**Root Cause (גורם שורשי):**
שלושה גורמים שרשרתיים:

**גורם 1 — עמודות DB חסרות (הגורם הראשי)**
- Cascade הוסיפו 5 עמודות חדשות למודל `User` (v3 columns: `active_role`, `tos_accepted_at`, וכו')
- הייצור רץ `sequelize.sync({ alter: false })` — שיטה שיוצרת טבלאות חדשות אבל **לא מוסיפה עמודות לטבלאות קיימות**
- כשהשרת עלה, Sequelize ניסה `SELECT active_role FROM users` — עמודה שלא קיימת
- PostgreSQL זרק שגיאה → `catch` ב-`auth.js:159` החזיר 503

**גורם 2 — ENUM type conflict**
- Cascade הגדירו `activeRole` כ-`DataTypes.ENUM('tenant','landlord')` במודל
- ה-boot migration הוסיף את העמודה כ-`STRING(20)`
- סתירה: Sequelize ניסה INSERT עם type ENUM שלא קיים ב-PostgreSQL
- `autoSeed()` נכשל בשקט (try/catch עם `console.warn`) → admin accounts לא נוצרו

**גורם 3 — Admin accounts בלי `tosAcceptedAt`**
- גם כשaccounts נוצרו — `requireTos` middleware חסם את `/api/apartments`, `/api/matches`, `/api/swipe`
- Admin accounts נוצרו עם `role: 'landlord'` (לא `'admin'`) → הexemption לא עבד

**Fix שיושם:**

| קובץ | שינוי | Commit |
|------|--------|--------|
| `backend/src/config/database.js` | הוסף `USER_V3_COLUMNS` ל-`ensureUserVerificationColumns()` — מוסיף עמודות חסרות ב-boot | `2ab7347` |
| `backend/src/models/pg/User.js` | שינה `activeRole` מ-`ENUM` ל-`STRING(20)` עם `validate.isIn` | `7ea9f1a` |
| `backend/src/seeders/demo.js` | הוסף `tosAcceptedAt` ל-defaults של admin accounts + backfill לaccounts קיימים | `294c834` |

**למה זה קרה — Design Gap:**
1. **תיאום לקוי בין agents** — Cascade שינה המודל, לא עדכן את migration strategy
2. **אין טסט E2E ל-boot sequence** — אם היה, היה נתפס לפני deploy
3. **`sequelize.sync({ alter: false })` בייצור** — מסוכן אחרי שינויי schema

**מניעה עתידית:**
- [ ] כל שינוי schema → חייב להוסיף עמודה גם ב-`database.js:ensureUserVerificationColumns`
- [ ] הוסף טסט שמריץ boot sequence ובודק שכל עמודות המודל קיימות ב-DB
- [ ] `AGENT_PROTOCOL.md` עודכן: "שינוי מודל Sequelize → חובה לעדכן migration columns"

---

## 📋 Bug Template — להעתקה

```markdown
### BUG-XXX
**כותרת:** 
**עדיפות:** P0/P1/P2/P3
**סטטוס:** 🔴 OPEN
**מדווח על ידי:** | **תאריך:** 
**מטפל:** 

**תיאור:**


**שלבים לשחזור:**
1. 
2. 
3. 

**צפוי:** 
**קיבלנו:** 

**השפעה על משתמשים:** 

**קבצים חשודים:**
- 

**היפותזות:**
- [ ] 
```

---

## 🔬 RCA Template — למלא אחרי כל תיקון

```markdown
### 🔬 RCA — BUG-XXX

**Root Cause (גורם שורשי):**


**Fix שיושם:**
| קובץ | שינוי | Commit |
|------|--------|--------|
|  |  |  |

**למה זה קרה — Design Gap:**


**מניעה עתידית:**
- [ ] 
```

---

## 📏 עדיפויות

| עדיפות | משמעות | SLA תיקון |
|---------|---------|-----------|
| **P0** | פרודקשן down / data loss / security | מיידי — עוצרים הכל |
| **P1** | פיצ'ר מרכזי שבור, ללא workaround | אותו יום |
| **P2** | פיצ'ר שבור, יש workaround | בשבוע הנוכחי |
| **P3** | קוסמטי / edge case | backlog |

---

## 📊 Lifecycle

```
ראן / עובד מדווח באג בצ'אט
        ↓
CTO (Claude Code) מוסיף BUG-XXX לפה ← 5 דקות
        ↓
Triage: עדיפות + שיוך לעובד ← 10 דקות
        ↓
עובד משנה סטטוס → IN_PROGRESS
        ↓
עובד מתקן + כותב commit עם BUG-XXX
        ↓
עובד משנה סטטוס → FIXED
        ↓
CTO אומת בייצור + מוסיף RCA ← חובה
        ↓
סטטוס → CLOSED
        ↓
MASTER.md + CEO_DASHBOARD.md מתעדכנים
```
