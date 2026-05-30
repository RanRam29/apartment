# DirApp — CEO Dashboard
> **קהל יעד:** ראן (מנכ"ל / יזם)
> **מנהל מידע:** Claude Code (CTO)
> **קריאה:** 30 שניות — מצב עדכני תמיד

---

## 🚦 מצב כללי: 🟢 GREEN — כל הבאגים תוקנו, פרודקשן יציב

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

## ✅ תקלות — הכל סגור
> 📋 **פירוט מלא + RCA:** [`BUGS.md`](BUGS.md)

| # | תיאור | סטטוס | מי תיקן | תאריך סגירה |
|---|--------|--------|---------|-------------|
| BUG-001 | Admin login 503 | 🏁 CLOSED | Claude Code | 2026-05-27 |
| BUG-002 | Admin login 401 | 🏁 CLOSED | Claude Code | 2026-05-28 |
| BUG-003 | אישור ליד לא עובד | 🏁 CLOSED | Antigravity | 2026-05-30 |
| BUG-004 | Admin panel E2E | 🏁 CLOSED | Antigravity | 2026-05-30 |
| BUG-005 | כפתורי מודעות שבורים | 🏁 CLOSED | Antigravity + Claude Code | 2026-05-30 |
| BUG-006 | ToS לא עובד | 🏁 CLOSED | Antigravity | 2026-05-30 |
| BUG-007 | דשבורד פיקטיבי | 🏁 CLOSED | Antigravity | 2026-05-30 |
| BUG-008 | צ'אטים לא נפתחים | 🏁 CLOSED | Antigravity | 2026-05-30 |
| BUG-009 | Trust Score = 0 | 🏁 CLOSED | Antigravity | 2026-05-30 |
| BUG-010 | פרסום מודעה 500 | 🏁 CLOSED | Claude Code | 2026-05-28 |

---

## 🏗️ בפיתוח עכשיו

| משימה | עובד | התחיל | ETA | סטטוס |
|--------|------|--------|-----|-------|
| כל 10 הבאגים | כולם | 2026-05-27 | 2026-05-30 | ✅ הושלם |
| **הבא:** NF1 Trust Score | TBD | — | — | ❌ לא התחיל |
| **הבא:** NF2 Renter Journal | TBD | — | — | ❌ לא התחיל |

---

## 📤 הוראות לעובדים — מה לעשות עכשיו

**אין באגים פתוחים.** הצוות פנוי לפיצ'רים חדשים.

**הבא ברודמאפ:**
1. NF1 — Trust Score (Cursor, ~2 ימים)
2. NF2 — Renter Journal (Antigravity, ~3 ימים)
3. V2-1 — Stripe Connect (TBD, ~שבוע)

---

## 📅 רודמאפ

| שלב | פיצ'ר | עובד | זמן משוער | עלות טוקנים |
|-----|--------|------|-----------|-------------|
| ~~עכשיו~~ | ~~תיקון באגים~~ | ~~כולם~~ | ~~1-2 ימים~~ | ✅ הושלם |
| **הבא** | NF1 — Trust Score | Cursor | 2 ימים | ~500K |
| **הבא** | NF2 — Renter Journal | Antigravity | 3 ימים | ~700K |
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

*עדכון אחרון: 2026-05-30 | הבא: NF1 Trust Score + NF2 Renter Journal*
