# DirApp — Agent Protocol
> **קהל יעד:** Claude Code, Cursor, Antigravity (כל עובד)
> **מנהל:** Claude Code (CTO / Orchestrator)
> **כלל ברזל:** אתה קורא את זה לפני כל משימה. אתה מעדכן MASTER.md אחרי כל שינוי.

---

## 🗂️ מסמכי הצוות

| מסמך | קהל | תוכן |
|------|-----|-------|
| `CEO_DASHBOARD.md` | ראן (מנכ"ל) | מצב כללי, תקלות, ETA, עלויות |
| `MASTER.md` | כל הצוות | סטטוס מפורט לכל פיצ'ר |
| `AGENT_PROTOCOL.md` | כל העובדים | השפה והפרוטוקול — המסמך הזה |
| `CLAUDE.md` | Claude Code | הגדרת תפקיד + conventions |

---

## 📋 שפה אחידה — Status Codes

| קוד | סמל | משמעות |
|-----|-----|---------|
| `WORKING` | ✅ | פועל ואומת בייצור |
| `CODE_EXISTS` | 🟡 | קוד ממוזג, לא נבדק E2E בייצור |
| `BUG` | 🔴 | ידועה תקלה שמונעת שימוש |
| `NOT_STARTED` | ❌ | לא נגעו בו בכלל |
| `WIP` | 🔵 | עובד עכשיו |
| `BLOCKED` | ⛔ | חסום — מחכה למשהו אחר |

---

## 📏 פרוטוקול לפני כל משימה

```
1. קרא MASTER.md → מצא את הפיצ'ר שאתה עובד עליו
2. בדוק שאין BLOCKED או BUG אחר שקודם לו
3. שנה סטטוס → WIP (🔵) ב-MASTER.md
4. כתוב בLog: "STARTED: <תיאור> | AGENT: <שמך> | EST: <זמן> | EST_TOKENS: <כמות>"
```

---

## 📏 פרוטוקול אחרי כל משימה

```
1. שנה סטטוס ב-MASTER.md לסטטוס האמיתי
2. עדכן "בדיקה אחרונה" לתאריך היום
3. הוסף הערה קצרה מה עשית
4. אם מצאת bug → הוסף לטבלת Bugs
5. כתוב בLog: "DONE: <תיאור> | AGENT: <שמך> | TOKENS: <כמות> | TIME: <זמן>"
6. Commit עם הפורמט הנכון (ראה למטה)
```

---

## 📝 פורמט Commit Messages

```
<type>(<scope>): <תיאור קצר בעברית או אנגלית>

AGENT: <שמך>
TOKENS: ~<כמות>K
TIME: <כמה לקח>
TESTS: <עבר/נכשל/לא נבדק>

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
```

### סוגי Type:
| type | מתי |
|------|-----|
| `feat` | פיצ'ר חדש |
| `fix` | תיקון bug |
| `test` | הוספת/תיקון טסטים |
| `docs` | עדכון מסמכים |
| `refactor` | שיפור קוד ללא שינוי פונקציה |
| `perf` | שיפור ביצועים |

### דוגמה:
```
fix(auth): sync admin account passwords on every startup

AGENT: Claude Code
TOKENS: ~35K
TIME: 45 min
TESTS: 13/13 passed (auth.test.js)

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
```

---

## 🐛 פורמט דיווח Bug

כשמוצאים bug → מוסיפים שורה לטבלה ב-MASTER.md:

```
| BUG-XXX | <תיאור קצר> | 🔴/🟡 גבוה/בינוני | <שם העובד> | <ETA או "פתוח"> |
```

**רמות חומרה:**
| רמה | משמעות |
|-----|---------|
| 🔴 קריטי | משתמשים לא יכולים להשתמש בפיצ'ר |
| 🟡 בינוני | פיצ'ר פועל חלקית |
| 🟢 נמוך | אסתטי / edge case |

---

## ⏱️ הערכת זמן + טוקנים לפני משימה

**חובה להעריך לפני שמתחילים** — זה עוזר למנכ"ל לתכנן.

| סוג משימה | טוקנים | זמן |
|-----------|---------|-----|
| Bug fix פשוט (< 5 קבצים) | 20-60K | 30-60 דק' |
| Bug fix מורכב | 60-200K | 2-4 שעות |
| Endpoint חדש + טסטים | 100-200K | 3-5 שעות |
| Feature flow שלם | 300-600K | יום שלם |
| Feature גדול (NF) | 600-1000K | 2-4 ימים |

**כיצד להעריך:**
- ספור קבצים שייגעו בהם → כל קובץ ~10-20K
- ספור טסטים שצריך לכתוב → כל טסט ~5K
- הוסף 30% buffer

---

## 🌿 כללי Branch

| מי | branch |
|----|--------|
| Claude Code | `fix/<desc>` או `feat/<desc>` מ-`main` |
| Cursor | `cursor/<desc>` |
| Antigravity | `wind/<desc>` |
| **Merge לmain** | **רק Claude Code (Orchestrator)** |

---

## 🔄 Flow עבודה מלא

```
CEO → מגדיר עדיפות
  ↓
CTO (Claude Code) → מעדכן MASTER.md + מקצה לעובד
  ↓
עובד → קורא MASTER.md → משנה ל-WIP → עושה עבודה → מעדכן MASTER.md → commit
  ↓
CTO → code review → merge לmain → עדכון CEO_DASHBOARD.md
  ↓
CEO → רואה תוצאה ב-CEO_DASHBOARD.md
```

---

## 📊 דוגמה — עדכון MASTER.md

**לפני:**
```
| Check-In תמונות לפי חדרים (M3) | 🟡 CODE_EXISTS | — | CI-001→004 חדש |
```

**אחרי שהתחלת:**
```
| Check-In תמונות לפי חדרים (M3) | 🔵 WIP | 2026-05-28 | Antigravity עובד — EST 6h |
```

**אחרי שסיימת:**
```
| Check-In תמונות לפי חדרים (M3) | ✅ WORKING | 2026-05-29 | CI-001/002 עוברים, bucket נכון |
```

---

## 🚫 דברים שאסורים

- ❌ Merge לmain בלי אישור Claude Code
- ❌ לסיים משימה בלי לעדכן MASTER.md
- ❌ לפתוח feature חדש כשיש BUG קריטי פתוח באותו flow
- ❌ לדלג על כתיבת טסטים ל-P0/P1 features
- ❌ לשנות `.env.production` בלי לתאם עם Claude Code
