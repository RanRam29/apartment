# DirApp — Bug Tracker
> **מנהל:** Claude Code (CTO)
> **עדכון אחרון:** 2026-05-28
>
> 📋 **איך לדווח באג:** כתוב בצ'אט (לי או לאנטיגרביטי) — אני מוסיף לפה עם BUG-ID מיידית.
> 📖 **RCA:** חובה למלא אחרי כל תיקון. זה הזיכרון הארגוני שלנו.

---

## 📊 סיכום מהיר

| סטטוס | כמות |
|--------|------|
| 🔴 OPEN | 2 |
| 🔵 IN_PROGRESS | 0 |
| ✅ FIXED (ממתין RCA) | 1 |
| 🏁 CLOSED (RCA הושלם) | 1 |
| **סה"כ** | **4** |

---

## 🗂️ כל הבאגים

| ID | כותרת | עדיפות | סטטוס | מדווח | מטפל | תאריך פתיחה |
|----|--------|---------|--------|--------|------|-------------|
| [BUG-001](#bug-001) | Admin login 503 — DB columns missing | P0 | 🏁 CLOSED | ראן | Claude Code | 2026-05-27 |
| [BUG-002](#bug-002) | Admin login 401 — password hash out of sync | P1 | ✅ FIXED | ראן | Claude Code | 2026-05-28 |
| [BUG-003](#bug-003) | אישור ליד לא עובד מה-UI | P1 | 🔴 OPEN | ראן | — | 2026-05-28 |
| [BUG-004](#bug-004) | Admin panel endpoints לא נבדקו E2E | P2 | 🔴 OPEN | Claude Code | Cursor | 2026-05-28 |

---

## 🔴 OPEN

---

### BUG-003
**כותרת:** אישור ליד לא עובד מה-UI
**עדיפות:** P1 — פיצ'ר מרכזי שבור, ללא workaround
**סטטוס:** 🔴 OPEN
**מדווח על ידי:** ראן | **תאריך:** 2026-05-28
**מטפל:** לא שויך

**תיאור:**
לחיצה על "אישור ליד" מה-UI לא מבצעת את הפעולה. הAPI `POST /api/matches/:id/accept` קיים בקוד.

**שלבים לשחזור:**
1. התחבר כמשכיר
2. כנס לדף Leads/Matches
3. לחץ על "אשר" / "Accept"
4. לא קורה כלום / שגיאה

**צפוי:** Match עובר ל-accepted, שני הצדדים מקבלים הודעה
**קיבלנו:** [לא ידוע — לא נבדק עדיין]

**השפעה:** משכירים לא יכולים לאשר שוכרים → כל flow החוזה חסום

**היפותזות ראשוניות:**
- [ ] Frontend לא שולח את ה-request נכון
- [ ] חסר token/header
- [ ] API endpoint שינה שם
- [ ] requireTos מחזיר 403

**לבדוק:**
- [ ] פתח DevTools → Network → לחץ Accept → מה הrequest?
- [ ] מה ה-status code שחוזר?

---

### BUG-004
**כותרת:** Admin panel endpoints לא נבדקו E2E
**עדיפות:** P2 — לא בשימוש יצרני עדיין
**סטטוס:** 🔴 OPEN
**מדווח על ידי:** Claude Code | **תאריך:** 2026-05-28
**מטפל:** Cursor (מוצע)

**תיאור:**
כל endpoints של Admin Panel (ADM-001 עד ADM-006) סומנו "חדש" ב-Test Coverage Matrix. קוד קיים אבל לא אומת בייצור.

**השפעה:** ראן לא יכול להשתמש ב-Admin Panel בביטחון.

---

## ✅ FIXED — ממתין להשלמת RCA

---

### BUG-002
**כותרת:** Admin login 401 — password hash out of sync
**עדיפות:** P1
**סטטוס:** ✅ FIXED | **תאריך תיקון:** 2026-05-28 | **Commit:** `ed0e874`
**מדווח:** ראן | **מטפל:** Claude Code

**תיאור:**
`admin@dirapp.com` ו-`admin1@dirapp.com` החזירו 401 "Invalid credentials" אחרי deploy מחודש. `admin2@dirapp.com` עבד תקין.

**שלבים לשחזור:**
1. נווט ל-apartment-olive.vercel.app/login
2. הכנס `admin@dirapp.com` / `Admin1234!`
3. מקבל: "אימייל או סיסמה שגויים"

**הFix שיצא:**
עדכון `autoSeed()` ב-`backend/src/seeders/demo.js` לסנכרן password hash בכל הרצה.

**ממתין:** רידיפלוי Render (push יצא ב-`ed0e874`) + אימות

**⚠️ RCA — חסר (למלא אחרי אימות הfix בייצור)**

---

## 🏁 CLOSED — RCA הושלם

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
