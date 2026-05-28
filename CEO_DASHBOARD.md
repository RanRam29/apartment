# DirApp — CEO Dashboard
> **קהל יעד:** ראן (מנכ"ל / יזם)
> **מנהל מידע:** Claude Code (CTO)
> **קריאה:** 30 שניות — מצב עדכני תמיד

---

## 🚦 מצב כללי: 🔴 פרודקשן פעיל — יש 5 באגים P1 שחוסמים פיצ'רי ליבה

| רמה | משמעות |
|-----|---------|
| 🟢 GREEN | הכל פועל, לא נדרש תשומת לב |
| 🟡 YELLOW | פרודקשן פועל, יש עבודה פתוחה |
| 🔴 RED | יש תקלה קריטית שמשפיעה על משתמשים |

---

## ✅ מה עובד עכשיו בפרודקשן

| פיצ'ר | כתובת לבדיקה |
|--------|--------------|
| ✅ הרשמה + Login | [apartment-olive.vercel.app/login](https://apartment-olive.vercel.app/login) |
| ✅ Swipe | האפליקציה |
| ✅ Match creation | עובד |
| ✅ Apartments Feed | `/api/apartments/feed` |
| ✅ Storage R2 (תמונות נכסים) | עובד |
| ✅ KYC initiation (Persona) | עובד |

**כניסה לבדיקה:** `admin2@dirapp.com` / `Admin1234!` (tenant)

---

## 🔴 תקלות פתוחות (לפי עדיפות)
> 📋 **פירוט מלא + RCA:** [`BUGS.md`](BUGS.md)

| # | תיאור | השפעה | מי מטפל | ETA |
|---|--------|--------|---------|-----|
| BUG-005 | כל כפתורי המודעות לא עובדים | 🔴 גבוה — כל flow משכיר חסום | Antigravity + Claude Code | אותו יום |
| BUG-006 | ToS "אשר והמשך" לא עובד + אין כפתור חזרה | 🔴 גבוה — חוסם כניסה לאפליקציה | Antigravity | אותו יום |
| BUG-007 | דשבורד פיקטיבי — נתונים לא אמיתיים | 🔴 גבוה — לא ניתן לנהל | Antigravity | אותו יום |
| BUG-008 | לא ניתן להיכנס לצ'אטים | 🔴 גבוה — פיצ'ר ליבה שבור | Antigravity | אותו יום |
| BUG-003 | אישור ליד לא עובד מה-UI | 🔴 גבוה — flow חוזה חסום | Antigravity | אותו יום |
| ~~BUG-002~~ | ~~admin@dirapp.com לא נכנס~~ | ~~🟡~~ | ~~Claude Code~~ | 🏁 **CLOSED** |
| BUG-009 | Trust Score מתחיל ב-0 במקום 50 | 🟡 נמוך | Cursor | השבוע |
| BUG-004 | Admin panel לא נבדק E2E | 🟡 בינוני | Cursor | השבוע |

---

## 🏗️ בפיתוח עכשיו

| משימה | עובד | התחיל | ETA | עלות טוקנים |
|--------|------|--------|-----|-------------|
| תיעוד + Triage כל הבאגים (סשן זה) | Claude Code | 2026-05-28 | ✅ הושלם | ~15K |
| BUG-005+006+007+008+003 | Antigravity | — | להקצות | ~150K |
| BUG-002 admin login | Claude Code | 2026-05-28 | ✅ Fix יצא | ~30K |

---

## 📤 הוראות לעובדים — מה לעשות עכשיו

### 👉 Antigravity — 5 באגים P1

כל הבאגים הם **frontend** (React Native Web) + שינוי קטן ב-backend.

**עדיפות עבודה:**
1. **BUG-005 + BUG-006 + BUG-003** — גורם שורשי משותף: `tosAcceptedAt` + `Alert.alert()`
   - `backend/src/routes/auth.js` שורה 233-244: הוסף `tosAcceptedAt`, `activeRole`, `kycStatus` לlogin response
   - `mobile/src/screens/ListingsScreen.tsx`: החלף `Alert.alert()` ב-`showAlert()` helper עם Platform check
   - `mobile/src/screens/TermsScreen.tsx`: תקן כפתור "אשר והמשך" + הוסף כפתור "חזור"
   - בדוק גם: `mobile/src/screens/LeadsScreen.tsx` (אותה בעיה Alert + tosAcceptedAt)

2. **BUG-008** — Chat navigation
   - החלף `via.placeholder.com` ב-fallback avatar component
   - בדוק `navigation.navigate('Chat', ...)` על web

3. **BUG-007** — Dashboard stats
   - בדוק `GET /api/landlord/dashboard` — מה חוזר בפועל?
   - בדוק חישוב המרה: אם denominator=0 → division by zero → 150% הוא bug

### 👉 Cursor — 2 באגים P2

1. **BUG-009**: Trust Score — הוסף `defaultValue: 50` ל-User model / seeder
2. **BUG-004**: Admin panel endpoints — בדוק כל endpoint ב-E2E test

### 👉 Claude Code — 1 באג

1. **BUG-002**: אמת ש-admin@dirapp.com עובד אחרי רידיפלוי Render → כתוב RCA

---

## 📅 רודמאפ — לאחר תיקון הבאגים

| שלב | פיצ'ר | עובד | זמן משוער | עלות טוקנים |
|-----|--------|------|-----------|-------------|
| **עכשיו** | תיקון 5 באגים P1 | Antigravity | 1-2 ימים | ~150K |
| **שבוע הבא** | NF1 — Trust Score | Cursor | 2 ימים | ~500K |
| **שבוע הבא** | NF2 — Renter Journal | Antigravity | 3 ימים | ~700K |
| **לאחר מכן** | V2-1 — Stripe Connect | TBD | 1 שבוע | ~800K |

---

## 💰 עלויות פיתוח (הערכה)

### עלות לסוג משימה
| סוג משימה | טוקנים | עלות | זמן |
|-----------|---------|------|-----|
| Bug fix פשוט | 30-80K | ~$0.30 | 30 דק' |
| Bug fix מורכב | 80-200K | ~$1.50 | 2-3 שעות |
| Feature בינוני | 200-400K | ~$3 | חצי יום |
| Feature גדול (NF1/NF2) | 500-900K | ~$7-12 | 2-3 ימים |

---

## 👥 צוות

| עובד | תפקיד | זמינות | מה הוא עשה אחרון |
|------|--------|--------|-----------------|
| **Claude Code** | CTO + Orchestrator | תמיד | Triage כל הבאגים + BUGS.md |
| **Cursor** | Financial + Admin | לפי דרישה | T1/T8/T9/T15/T16 merged |
| **Antigravity** | Identity + Mobile | לפי דרישה | T2/T3/T6/T12/T13/T14/T17 merged |

---

*עדכון אחרון: 2026-05-28 | הבא: Antigravity מתחיל על BUG-005/006/008*
