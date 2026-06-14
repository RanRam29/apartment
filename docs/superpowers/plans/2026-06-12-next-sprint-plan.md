# Sprint Plan — 2026-06-12 → Security Round 2 + Dead Buttons + Workflow

> **Orchestrator:** Claude Code | **אושר ע"י:** ראן (בהמתנה)
> שלושה workstreams במקביל. כל משימה עם owner, עדיפות, ו-Definition of Done.

---

## מצב פתיחה (אומת 2026-06-12)

- `main` == `origin/main` — כל תיקוני SEC-001→007 merged + pushed → Render auto-deploy רץ.
- 44/44 טסטי אבטחה עוברים מקומית. **אימות פרודקשן E2E טרם בוצע** (רשת ארגונית חוסמת CLI — נדרש דפדפן).
- BUG-011 (cold-start timeout) + BUG-012 (NLP search) — ✅ FIXED, כבר ב-main → ממתינים לאימות פרודקשן + סגירת RCA.
- אין באגים פתוחים ב-BUGS.md, אבל ראן מדווח על כפתורים לא פעילים → נדרש QA sweep לאיתור ותיעוד.

---

## Workstream A — אבטחה: סבב 2 (Owner: Claude Code)

| # | משימה | עדיפות | DoD |
|---|--------|--------|-----|
| A1 | **אימות פרודקשן של SEC-001→007** — דרך דפדפן: stranger מקבל 404 על contract/ledger זר, rate-limit per-IP פעיל, verify-token ישן נדחה | P0 | צילומי תגובות + עדכון MASTER.md "אומת בייצור" |
| A2 | **אימות + סגירת BUG-011/BUG-012** בפרודקשן (login אחרי cold start; חיפוש "סטודיו בירושלים עם מעלית") | P1 | סטטוס → CLOSED + RCA ב-BUGS.md |
| A3 | **Secrets scan** — הריפו PUBLIC מאז 2026-06-11; סריקת היסטוריית git מלאה (gitleaks/trufflehog) לוודא שאין מפתחות בהיסטוריה | P0 | דו"ח סריקה נקי או רוטציה של כל ממצא |
| A4 | **npm audit + עדכון תלויות** ב-backend, web-next, mobile — תיקון High/Critical בלבד בסבב זה | P1 | `npm audit` ללא High/Critical |
| A5 | **Security headers** — helmet מלא ב-backend (CSP, HSTS, X-Frame-Options) + headers ב-web-next | P1 | טסט `security-config.test.js` מורחב עובר |
| A6 | **Refresh tokens / JWT expiry קצר** — כיום JWT ארוך-חיים; לתכנן refresh flow (לא ליישם בסבב זה — RFC בלבד) | P2 | מסמך RFC קצר ב-docs/internal |
| A7 | **Admin 2FA** (TOTP) — הצעת עיצוב בלבד | P3 | סעיף ב-RFC של A6 |

## Workstream B — כפתורים לא פעילים (Owner: Antigravity, תיאום: Claude Code)

| # | משימה | עדיפות | DoD |
|---|--------|--------|-----|
| B1 | **QA sweep מלא** — הרצת skill `qa` נגד פרודקשן: כל 26 דפי ה-web, לחיצה על כל כפתור, תיעוד כל כפתור מת/שגיאת קונסול | P0 | דו"ח pass/fail מלא |
| B2 | **Triage** — כל ממצא מ-B1 נרשם כ-BUG-0XX ב-BUGS.md עם עדיפות + briefing ל-Antigravity | P0 | BUGS.md מעודכן |
| B3 | **תיקון הכפתורים** — לפי דפוסים מוכרים: `showAlert()` במקום `Alert.alert()`, ניווט web, `tosAcceptedAt`, שגיאות 403/404 שקטות | P1 | כל באג CLOSED עם commit + אימות |
| B4 | **בדיקת רגרסיה גורפת** — סריקה סטטית: `grep Alert.alert mobile/src` + קומפוננטות עם `onPress` שלא מחובר | P2 | אפס מופעי Alert.alert ישירים |

## Workstream C — שיפור תהליכי עבודה (Owner: Claude Code)

| # | משימה | עדיפות | DoD |
|---|--------|--------|-----|
| C1 | **CI ב-GitHub Actions** — `npm test` (backend) + `npm run build` (web-next) על כל PR ל-main; חוסם merge אדום | P0 | workflow ירוק על PR דמה |
| C2 | **ניקוי ענפים** — ‎80+ ענפי remote ישנים (cursor/critical-bug-* , claude/phase*) ; מחיקת merged, ארכוב השאר | P2 | פחות מ-15 ענפי remote |
| C3 | **Deploy verification אוטומטי** — סקריפט post-deploy שמריץ smoke (login, feed, health) ומדווח | P1 | סקריפט + תיעוד ב-MASTER.md |
| C4 | **Schema-drift guard** — טסט שמוודא שכל עמודות המודלים קיימות ב-`ensure*Columns()` (מניעת BUG-001 חוזר) | P1 | טסט עובר ונכשל בהשמטת עמודה |
| C5 | **Meta WhatsApp env vars** — רישום templates + הגדרת 4 משתני env ב-Render (פעולה ידנית של ראן, Claude Code מכין הוראות) | P2 | WhatsApp E2E עובד |
| C6 | **עדכון AGENT_PROTOCOL.md** — חובת בדיקת `Alert.alert`/web-nav בכל PR של frontend; חובת טסט IDOR לכל route חדש עם `/:id` | P1 | מסמך מעודכן |

---

## סדר ביצוע מומלץ

1. **היום:** A1 + A3 (אימות פרודקשן + סריקת סודות — שניהם קריטיים כי הריפו public) → B1 (QA sweep)
2. **מחר:** B2/B3 (triage + תיקוני כפתורים אצל Antigravity) במקביל ל-C1 (CI) אצל Claude Code
3. **השבוע:** A4, A5, C3, C4, C6
4. **Backlog:** A6, A7, B4, C2, C5

## הקצאות — 2026-06-12 (גל 1, יצא לפועל)

| מי | משימות | תלות |
|----|---------|------|
| Antigravity | B4 (סריקה סטטית + תיקון מיידי) | ללא — מתחיל עכשיו; ממצאי B1 יתווספו כגל 2 |
| Cursor | C4 (schema-drift guard) + C3 (smoke script) | ללא — מתחיל עכשיו |
| Claude Code | A1 (אימות פרודקשן), A3 (secrets scan), B1 (QA sweep), C1 (CI), merges | B1 חוסם את גל 2 של Antigravity |

**גל 2 (אחרי B1+triage):** Antigravity מקבל רשימת BUG-IDs לתיקון. Cursor מקבל A4 (npm audit backend) אם יתפנה.

### Briefing → Antigravity (גל 1)
```
DirApp. Worktree: C:\apartmentapp-windsurf. קרא MASTER.md לפני הכל.
git checkout main && git pull && git checkout -b wind/dead-buttons-static
(חובה main עדכני — נכנסו תיקוני אבטחה גדולים ב-2a341cb)

משימה: סריקה סטטית של כפתורים מתים ב-mobile/src + web-next, ותיקונם.
1. grep -rn "Alert.alert" mobile/src — כל מופע ישיר הוא באג על web. החלף ב-showAlert() (utils קיים).
2. סרוק onPress/onClick שמפנים לפונקציות ריקות, TODO, או navigation שלא קיים ב-web.
3. סרוק כפתורים שקוראים ל-API בלי טיפול בשגיאה (catch ריק/שקט) — הוסף showAlert על כשל.
4. תעד כל ממצא בקובץ FINDINGS.md בשורש ה-worktree: קובץ, שורה, תיאור, תוקן/לא.
commit לכל תיקון לוגי בנפרד. הרץ build של web-next לפני סיום. אל תעשה merge — Claude Code ממזג.
בסיום: עדכן את הטבלה שלך ב-MASTER.md ודווח כמה תוקנו.
```

### Briefing → Cursor (גל 1)
```
DirApp. Worktree: C:\apartmentapp-cursor. קרא MASTER.md לפני הכל.
git checkout main && git pull && git checkout -b cursor/schema-guard-smoke
(חובה main עדכני — נכנסו תיקוני אבטחה גדולים ב-2a341cb)

משימה 1 — Schema-drift guard (מונע הישנות BUG-001):
כתוב backend/tests/schema-drift.test.js: לכל מודל ב-backend/src/models/pg —
השווה את attributes של המודל מול העמודות ש-ensure*Columns() ב-config/database.js מבטיח.
הטסט חייב להיכשל אם מוסיפים שדה למודל בלי עמודה תואמת. אמת שהוא נכשל בהשמטה מכוונת לפני commit.

משימה 2 — Post-deploy smoke script:
צור backend/scripts/smoke.js: בדיקות נגד BASE_URL (env): GET /health == 200,
POST /api/auth/login עם SMOKE_EMAIL/SMOKE_PASSWORD == 200, GET /api/apartments עם הטוקן == 200.
exit code 1 על כל כשל. הוסף npm script "smoke". בלי credentials בקוד.

Jest runInBand. commit נפרד לכל משימה. אל תעשה merge — Claude Code ממזג.
בסיום: עדכן MASTER.md ודווח.
```
