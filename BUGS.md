# DirApp — Bug Tracker
> **מנהל:** Claude Code (CTO)
> **עדכון אחרון:** 2026-06-04
>
> 📋 **איך לדווח באג:** כתוב בצ'אט (לי או לאנטיגרביטי) — אני מוסיף לפה עם BUG-ID מיידית.
> 📖 **RCA:** חובה למלא אחרי כל תיקון. זה הזיכרון הארגוני שלנו.

---

## 📊 סיכום מהיר

| סטטוס | כמות |
|--------|------|
| 🔴 OPEN | 2 |
| 🔵 IN_PROGRESS | 0 |
| ✅ FIXED (ממתין אימות) | 8 |
| 🏁 CLOSED (RCA הושלם) | 17 |
| **סה"כ** | **27** |

> 🆕 **2026-06-14 — BUG-020:** לא ניתן ליצור נכסים חדשים ב-web. עמוד `/properties` הוא `PlaceholderPage` ("בפיתוח"). הבאקאנד מוכן (`POST /api/apartments`). פער frontend בלבד → Antigravity.

> 🆕 **2026-06-13 — BUG-019:** מייל אימות לא מגיע בפרודקשן. שורש הבעיה = קונפיג Resend ב-Render (לא קוד). תיקוני קוד נלווים נדחפו; ממתין לפעולת קונפיג של ראן.

> 🆕 **2026-06-13 — Debug session (NF3 Trust Score + cron code review):** 6 באגים לוגיים חדשים נמצאו (BUG-013..018). ראה למטה.

---

## 🗂️ כל הבאגים

| ID | כותרת | עדיפות | סטטוס | מדווח | מטפל | תאריך פתיחה |
|----|--------|---------|--------|--------|------|-------------|
| [BUG-020](#bug-020) | לא ניתן ליצור נכסים חדשים ב-web (עמוד `/properties` = placeholder) | P1 | 🔴 OPEN | ראן | Antigravity | 2026-06-14 |
| [BUG-019](#bug-019) | מייל אימות לא מגיע בפרודקשן (Resend config) | P1 | 🔴 OPEN | ראן | ראן (config) + Claude Code (code) | 2026-06-13 |
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
| [BUG-011](#bug-011) | Login fails on Render cold start (timeout) | P2 | ✅ FIXED | ראן | Claude Code | 2026-06-01 |
| [BUG-012](#bug-012) | NLP search returns 0 results — amenities filter too strict + role gate | P1 | ✅ FIXED | ראן | Claude Code | 2026-06-04 |
| [SEC-001](#sec-001) | Contracts V3 IDOR — any user can read any contract | P0 | 🏁 CLOSED | Security Review | Claude Code | 2026-06-11 |
| [SEC-002](#sec-002) | Ledger IDOR — any user can confirm/reject payments | P0 | 🏁 CLOSED | Security Review | Cursor | 2026-06-11 |
| [SEC-003](#sec-003) | Rate limit behind proxy — all users share one bucket | P1 | 🏁 CLOSED | Security Review | Claude Code | 2026-06-12 |
| [SEC-004](#sec-004) | GDPR deletion never executes — Redis TTL expires unprocessed | P1 | 🏁 CLOSED | Security Review | Claude Code + Cursor | 2026-06-12 |
| [SEC-005](#sec-005) | Verification token plaintext + no expiry | P1 | 🏁 CLOSED | Security Review | Claude Code | 2026-06-12 |
| [SEC-006](#sec-006) | Chat imageUrl stored XSS vector | P1 | 🏁 CLOSED | Security Review | Claude Code | 2026-06-12 |
| [SEC-007](#sec-007) | Frontend JWT base64url decode → random logouts | P1 | 🏁 CLOSED | Security Review | Antigravity | 2026-06-12 |
| [BUG-013](#bug-013) | SIGNED transition — TOCTOU race seeds duplicate ledger rows | P1 | ✅ FIXED | Debug session | Claude Code | 2026-06-13 |
| [BUG-014](#bug-014) | Revoked `isOnce` trust event can never be re-granted | P2 | ✅ FIXED | Debug session | Claude Code | 2026-06-13 |
| [BUG-018](#bug-018) | accountDeletion cron — no per-user error isolation | P2 | ✅ FIXED | Debug session | Claude Code | 2026-06-13 |
| [BUG-015](#bug-015) | Trust `cap` accounting uses score-clamped delta | P3 | ✅ FIXED | Debug session | Claude Code | 2026-06-13 |
| [BUG-016](#bug-016) | Admin user-edit writes unvalidated `parseInt` (NaN / no clamp) | P3 | ✅ FIXED | Debug session | Claude Code | 2026-06-13 |
| [BUG-017](#bug-017) | Onboarding `dismiss` accepts arbitrary keys → JSONB growth | P3 | ✅ FIXED | Debug session | Claude Code | 2026-06-13 |

---

## 🔵 IN_PROGRESS

---

### BUG-020
**כותרת:** לא ניתן ליצור נכסים חדשים ב-web (עמוד `/properties` = placeholder)
**עדיפות:** P1 — פיצ'ר מרכזי למשכיר חסום לחלוטין
**סטטוס:** 🔴 OPEN
**מדווח על ידי:** ראן | **תאריך:** 2026-06-14
**מטפל:** Antigravity (frontend)

**תיאור:**
משכיר נכנס ל"ניהול נכסים" ומקבל מסך "עמוד זה נמצא כעת בפיתוח כחלק מגרסה MVP v3.0". אין דרך ליצור/לערוך מודעה ב-web. גם ה-FAB (+) וגם "צפה בכל הנכסים" בדשבורד מצביעים ל-`/properties`.

**Root Cause:**
`web-next/app/(app)/properties/page.tsx` מרנדר `<PlaceholderPage>` במקום מסך אמיתי. **באקאנד מוכן לחלוטין** — `POST /api/apartments` (`apartments.js:106`, multipart + images + geocoding), `PATCH /:id`, `DELETE /:id`. פער frontend בלבד.

**Fix נדרש (Antigravity):** ראה briefing מלא בצ'אט — בנה מסך ניהול נכסים אמיתי (רשימה + מודאל יצירה) מחובר ל-`apiUpload`.

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

### BUG-013
**כותרת:** SIGNED transition — TOCTOU race seeds duplicate ledger rows
**עדיפות:** P1 — data corruption בפרודקשן תחת מקביליות
**סטטוס:** ✅ FIXED (ממתין deploy + אימות פרודקשן)
**מדווח על ידי:** Debug session (Claude Code) | **תאריך:** 2026-06-13
**מטפל:** Claude Code

**🔬 RCA — Root Cause:**
`seedLedgerRows` היה אידמפוטנטי *סדרתית* בלבד (בדיקת `findOne`+skip per period) — TOCTOU שלא מחזיק תחת מקביליות. שני seeds מקבילים מריצים את כל בדיקות ה-`findOne` לפני ה-`create`, שניהם רואים "ריק", שניהם יוצרים → עד 24 שורות. לא היה אכיפת ייחודיות ברמת ה-DB על `(agreementId, period)`.

**Fix שיושם (TDD — RED→GREEN):**
| קובץ | שינוי |
|------|--------|
| `backend/tests/ledgerSeedService.test.js` | RED: בדיקת מקביליות — שני `seedLedgerRows` ב-`Promise.all` → ציפייה ל-12 שורות (נכשל ב-22 לפני התיקון) |
| `backend/src/models/pg/LedgerRow.js` | unique index מורכב `ledger_rows_agreement_period_unique` על `(agreement_id, period)` |
| `backend/src/services/ledgerSeedService.js` | `create` עטוף ב-try/catch — `SequelizeUniqueConstraintError` → `continue` (המפסיד ב-race מדלג בשקט) |
| `backend/src/config/database.js` | `ensureLedgerRowPeriodUniqueIndex()` — dedup הגנתי של נתונים קיימים (keep earliest by ctid) + `CREATE UNIQUE INDEX IF NOT EXISTS`, מחווט ל-`initPostgres` (טבלה קיימת לא מקבלת index מ-`sync({alter:false})`) |

**אימות:** 3/3 ב-`ledgerSeedService.test.js`, 31/31 ב-`ledger`+`agreements`+`ledger-idor`. הלוג מאשר split 11+1=12 ב-seed מקבילי.

**מניעה עתידית:**
- [ ] לשקול הוספת row lock (`SELECT … FOR UPDATE`) על ה-agreement במעבר ה-SIGNED ב-`agreements.js` כהגנה נוספת (defense-in-depth)
- [x] DB unique constraint הוא מקור האמת לייחודיות שורות לדגר

**תיאור:**
מעבר `READY_SIGN → SIGNED` ב-`backend/src/routes/agreements.js:120-201` קורא את ה-agreement, מוודא את המעבר (שורה 136), ואז מריץ `seedLedgerRows` (שורה 201) — הכל **ללא טרנזקציה ו/או נעילת שורה**. שתי בקשות POST במקביל קוראות שתיהן `status='READY_SIGN'`, עוברות את השומר, וזורעות 12 שורות לדגר כל אחת.

**שלבים לשחזור:**
1. agreement במצב `READY_SIGN` שעבר את כל ולידציות ה-KYC/habitability
2. שלח שתי בקשות `POST /api/v1/agreements/:id/transition` במקביל עם `targetStatus: SIGNED`
3. שתיהן מצליחות

**צפוי:** 12 שורות לדגר, מעבר אחד ל-SIGNED
**קיבלנו:** 24 שורות לדגר כפולות (+ פעמיים אירוע `digital_signing`; ה-cap מגן על ה-trust score אך לא על הלדגר)

**השפעה על משתמשים:** לדגר תשלומים משובש — חיובים כפולים לשוכר.

**Fix מוצע:**
- [ ] לעטוף את המעבר ב-`sequelize.transaction` עם `RentalAgreement.findByPk(id, { lock: true, transaction })` (SELECT … FOR UPDATE)
- [ ] בנוסף/חלופי: להפוך את `seedLedgerRows` לאידמפוטנטי — לדלג אם כבר קיימות שורות ל-agreement

---

### BUG-014
**כותרת:** Revoked `isOnce` trust event can never be re-granted
**עדיפות:** P2 — מלכודת רדומה (אין קוראים ל-`revokeTrustEvent` כרגע)
**סטטוס:** ✅ FIXED (TDD)
**מדווח על ידי:** Debug session (Claude Code) | **תאריך:** 2026-06-13
**מטפל:** Claude Code

**Fix שיושם:** ב-`revokeTrustEvent` ([trustScoreService.js](backend/src/services/trustScoreService.js)) — `UPDATE ... SET dedupeKey = NULL` לכל אירועי ה-(userId, eventKey) שבוטלו, כדי לשחרר את האינדקס הייחודי ולאפשר הענקה מחדש. בדיקת RED: apply→revoke→apply של `kyc_approved` מצפה לשחזור הניקוד (`trustScoreService.test.js`). 8/8 + 17/17 ב-trustScore.test.js.

**תיאור:**
ב-`backend/src/services/trustScoreService.js`, `applyTrustEvent` קובע `dedupeKey = ${eventKey}:${userId}` לאירועי `isOnce` (שורות 24-26) ונשען על האינדקס הייחודי כדי למנוע כפילות (catch שורה 63). `revokeTrustEvent` (שורות 70-108) יוצר אירוע מקזז שלילי אבל **משאיר את שורת ה-dedupeKey המקורית**. הענקה חוזרת תיתקל באינדקס הייחודי → `null` בשקט → המשתמש לא מקבל בחזרה את הנקודות.

**שלבים לשחזור (תיאורטי — revoke עוד לא מחובר):**
1. KYC אושר → +20, נוצרת שורת dedupeKey
2. KYC נדחה → `revokeTrustEvent` → -20 (שורת dedupeKey נשארת)
3. KYC אושר שוב → unique violation → null → אין +20

**Fix מוצע:**
- [ ] ב-`revokeTrustEvent` למחוק/לנטרל את שורת ה-dedupeKey, או
- [ ] בהענקה חוזרת לזהות מצב נטו-אפס (sum ≤ 0) ולאפשר הענקה מחדש

---

### BUG-018
**כותרת:** accountDeletion (GDPR) cron — no per-user error isolation
**עדיפות:** P2 — כשל אחד מפיל את כל ה-batch
**סטטוס:** ✅ FIXED (TDD)
**מדווח על ידי:** Debug session (Claude Code) | **תאריך:** 2026-06-13
**מטפל:** Claude Code

**Fix שיושם:** כל איטרציה ב-[accountDeletion.js](backend/src/cron/accountDeletion.js) עטופה ב-try/catch — כשל מתועד כ-error וממשיך לבא בתור; ה-return משקף כעת מספר הצלחות בפועל. בדיקת RED: `accountDeletionIsolation.test.js` מזריק throw ב-`logAudit` ומוודא שהמשתמש השני עדיין מאונונם. 5/5. **נותר פתוח להחלטת מוצר:** היקף האנונימיזציה (כרגע שורת User בלבד; PII בטבלאות קשורות לא נוגעות).

**תיאור:**
ב-`backend/src/cron/accountDeletion.js:19-42`, הלולאה על המשתמשים למחיקה אינה עטופה ב-try/catch per-user. אם `user.update` או `logAudit` זורקים לאחד המשתמשים (collision, DB error), כל הריצה קורסת והמשתמשים הנותרים לא מעובדים — חשבונות שעברו את תקופת החסד נשארים לא-אנונימיים.

**הערה נלווית (GDPR scope):** האנונימיזציה מנקה את שורת ה-`User` בלבד. PII בטבלאות קשורות (`UserKycProfile`, הודעות chat, `RentalAgreement`, `WhatsAppMessage`) עלול להישאר. להחלטת מוצר/משפט אם נדרש לטיפול במחיקה אמיתית.

**Fix מוצע:**
- [ ] לעטוף כל איטרציה ב-try/catch; להמשיך לבא בתור ולספור כשלים
- [ ] לשקול הרחבת היקף האנונימיזציה לטבלאות PII קשורות

---

### BUG-019
**כותרת:** מייל אימות לא מגיע בפרודקשן (verification email never arrives)
**עדיפות:** P1 — חוסם הרשמת משתמשים אמיתיים
**סטטוס:** 🔴 OPEN — קוד תוקן, ממתין לפעולת קונפיג
**מדווח על ידי:** ראן (screenshot, `randram@gmail.com`) | **תאריך:** 2026-06-13
**מטפל:** ראן (Render/Resend config) + Claude Code (code)

**שורש הבעיה (לא קוד):** נתיב השליחה תקין — `register` → `issueVerificationTokenForUser` → `sendVerificationEmail` (Resend). השליחה **נכשלת בשקט בפרודקשן**: `resend.emails.send` זורק, השגיאה נתפסת ב-`logger.warn` ([auth.js](backend/src/routes/auth.js)) + `logger.error` ([emailService.js](backend/src/services/emailService.js)) — ההרשמה מצליחה אבל המייל לא יוצא. שני חשודים:
1. `RESEND_API_KEY` לא מוגדר ב-Render → `new Resend(undefined)` → "Missing API key" (ראינו בדיוק את ההודעה בלוגי הטסטים). לא היה מתועד ב-`render.yaml`.
2. דומיין `dirapp.co.il` לא מאומת ב-Resend → Resend מאפשר לשלוח רק לכתובת בעל החשבון, דוחה נמענים אחרים.

**ראיה מכריעה:** השורה `Error sending verification email via Resend` כבר בלוגי Render — ההודעה שם מבדילה בין החשודים.

**תיקוני קוד שיושמו ונדחפו:**
- `65a8d2a` — `resolveWebBaseUrl()` קורא גם `CLIENT_ORIGINS` (היה `APP_BASE_URL || CLIENT_ORIGIN` בלבד → קישור האימות נפל ל-`http://localhost:3000` בפרודקשן). 23/23.
- `68a5aa7` — תיעוד `RESEND_API_KEY`/`RESEND_FROM_EMAIL`/`APP_BASE_URL` ב-`render.yaml` (`sync:false`).

**פעולה פתוחה (ראן):**
- [ ] להזין `RESEND_API_KEY` אמיתי ב-Render Dashboard
- [ ] להזין `RESEND_FROM_EMAIL` מדומיין מאומת (זמני: `onboarding@resend.dev`)
- [ ] לאמת את דומיין `dirapp.co.il` ב-Resend (DNS) להפקת מייל מהמותג
- [ ] לאחר deploy — לנסות הרשמה ולוודא הגעת מייל; לסגור באג

---

### BUG-015
**כותרת:** Trust `cap` accounting uses score-clamped delta
**עדיפות:** P3 — אי-דיוק שמתקן את עצמו
**סטטוס:** ✅ FIXED (TDD)
**מדווח על ידי:** Debug session (Claude Code) | **תאריך:** 2026-06-13
**מטפל:** Claude Code

**Fix שיושם:** שדה חדש `cappedDelta` ב-`TrustScoreEvent` שמאחסן את ה-delta המכוון (לפני clamp ל-100). `applyTrustEvent`/`getTrustStatus`/`revokeTrustEvent` סופרים caps ו-tasks לפי `cappedDelta`, בעוד `delta` נשאר התרומה המיושמת לניקוד. `ensureTrustScoreEventCappedDeltaColumn` ב-boot מוסיף עמודה + backfill מ-`delta`. בדיקת RED: אירוע מוגבל ליד תקרת 98 — task points מצפה ל-25 (cap 30 − intended 5), לא 28. 9/9.

**תיאור:**
ב-`backend/src/services/trustScoreService.js:46-55`, האירוע נשמר עם `actualDelta` (אחרי clamp ל-0–100), אבל בדיקת ה-`cap` (שורות 35-43) סוכמת את ה-delta השמור. ליד תקרת 100 נרשם פחות מ-`config.delta`, ה-cap נספר בחסר והאירוע יכול לירות שוב. הניקוד הסופי נכון, אך ה-cap אינו נאכף לפי הכוונה.

**Fix מוצע:**
- [ ] לסכום cap מול `deltaToApply` המבוקש (לפני clamp), או לאחסן `intendedDelta` נפרד

---

### BUG-016
**כותרת:** Admin user-edit writes unvalidated `parseInt` (NaN / no clamp)
**עדיפות:** P3 — admin-only
**סטטוס:** ✅ FIXED (TDD)
**מדווח על ידי:** Debug session (Claude Code) | **תאריך:** 2026-06-13
**מטפל:** Claude Code

**Fix שיושם:** ב-[admin.js](backend/src/routes/admin.js) — `trustScore` מוודא `Number.isInteger` + clamp 0–100, `blockedCount` מוודא integer ≥0; קלט לא תקין → 422. בדיקת RED: `trustScore: 5000` ו-`'abc'` מצפים ל-422 + ערך ב-DB ללא שינוי. 4/4 ב-adminUsersV3.test.js.

**תיאור:**
ב-`backend/src/routes/admin.js:116,120`, `trustScore`/`blockedCount` נכתבים עם `parseInt(...)` ללא בדיקת NaN וללא clamp. `trustScore: 5000` עוקף את תקרת 0–100; `"abc"` → `NaN` → Postgres דוחה ל-INTEGER → 500.

**Fix מוצע:**
- [ ] `Number.isInteger` + clamp 0–100 ל-trustScore; להחזיר 422 על קלט לא תקין

---

### BUG-017
**כותרת:** Onboarding `dismiss` accepts arbitrary keys → unbounded JSONB growth
**עדיפות:** P3 — abuse vector קל
**סטטוס:** ✅ FIXED (TDD)
**מדווח על ידי:** Debug session (Claude Code) | **תאריך:** 2026-06-13
**מטפל:** Claude Code

**Fix שיושם:** `VALID_STEP_KEYS` (איחוד שתי ה-checklists) ב-[onboarding.js](backend/src/routes/onboarding.js); `dismiss` מחזיר 400 על מפתח לא מוכר. בדיקת RED: dismiss של `not-a-real-key` מצפה ל-400. 18/18 ב-trustScore.test.js.

**תיאור:**
ב-`backend/src/routes/onboarding.js:91-105`, `POST /step/:key/dismiss` כותב כל `:key` שרירותי ל-`onboardingState.dismissed` (JSONB) בלי לוודא מול ה-checklist. לקוח זדוני יכול לנפח את ה-JSONB.

**Fix מוצע:**
- [ ] whitelist של מפתחות חוקיים; להחזיר 400 על מפתח לא מוכר

> **הערה (לא BUG פורמלי):** `whatsapp_opt_in` מעניק +5 קבוע (isOnce) על toggle בוליאני ללא דרישת טלפון/אימות — וקטור gaming קל. ייתכן שזה בכוונת התכנון; להחלטת מוצר.

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


### BUG-012
**כותרת:** NLP search returns 0 results — amenities filter too strict + role gate
**עדיפות:** P1
**סטטוס:** ✅ FIXED (ממתין deploy)
**מדווח על ידי:** ראן | **תאריך:** 2026-06-04
**מטפל:** Claude Code

**תיאור:**
חיפוש "סטודיו בירושלים עם מעלית קרוב לרכבת" מחזיר 0 תוצאות למרות שקיימת מודעה "סטודיו עם גלריה" בירושלים.

**Root Cause (שני גורמים):**

**גורם 1 — Amenities filter too strict:**
Gemini NLP parsed "מעלית" → `amenities: ["elevator"]`. Backend uses `Op.contains` which requires ALL listed amenities to exist on the apartment. If the listing doesn't have "elevator" tagged → 0 results. No fallback to relaxed search.

**גורם 2 — `requireRole('tenant')` blocks landlord search:**
`POST /api/recommendations/search` had `requireRole('tenant')` middleware. Landlords switching role to test search or comparing market listings would get 403.

**Fix שיושם:**

| קובץ | שינוי |
|------|--------|
| `backend/src/routes/recommendations.js` | Removed `requireRole('tenant')` from search route. Added two-pass search: strict first, then relaxes amenities+petsAllowed filters if 0 results. Returns `relaxed: true` flag. |
| `mobile/src/screens/SearchScreen.tsx` | Shows hint "לא נמצאו דירות עם כל המתקנים — מוצגות תוצאות קרובות" when relaxed results shown |

**Tests:** 5/5 recommendations tests pass, 3/3 screening tests pass.

---

### BUG-011
**כותרת:** Login fails on Render cold start — timeout 15s too short
**עדיפות:** P2
**סטטוס:** ✅ FIXED (ממתין deploy)
**מדווח על ידי:** ראן | **תאריך:** 2026-06-01
**מטפל:** Claude Code

**תיאור:**
Login button shows "לא ניתן להתחבר לשרת" when Render free-tier instance is cold (spun down after ~15 min inactivity). Cold starts take 30-60 seconds; Axios timeout was only 15 seconds → request times out → no response → generic error message.

**Root Cause:**
`mobile/src/services/api.ts` had `timeout: 15000` (15s). Render free-tier cold start takes 30-60s. Axios aborts with `ECONNABORTED` before backend wakes up.

**Fix שיושם:**

| קובץ | שינוי |
|------|--------|
| `mobile/src/services/api.ts` | Increased Axios timeout from 15s → 30s |
| `mobile/src/utils/networkUtils.ts` | NEW — `isTimeoutError()` utility |
| `mobile/src/utils/authErrors.ts` | Detect timeout → show "server waking up" message instead of generic error |
| `mobile/src/screens/LoginScreen.tsx` | Auto-retry once on timeout with "שרת מתעורר" UX feedback |
| `mobile/src/screens/RegisterScreen.tsx` | Timeout-specific error message |

**למה זה קרה — Design Gap:**
Free-tier Render sleeps after inactivity. The default 15s timeout was set for normal operation, not cold starts.

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

## 🔐 Security Review — 2026-06-11/12

### SEC-001
**כותרת:** Contracts V3 IDOR — any authenticated user can read/modify any contract
**עדיפות:** P0 | **סטטוס:** 🏁 CLOSED | **תאריך:** 2026-06-11
**מטפל:** Claude Code | **Commits:** `4aedec3`

**RCA:** No ownership check on any `/:id` route in `contractsV3.js`. Any authenticated user could `GET /api/v3/contracts/:id` with any agreement UUID and receive the full contract including presigned document URL.
**Fix:** Created `agreementAccess.js` middleware (`loadAgreement` + `requireAgreementLandlord`), applied to all 13 `/:id` routes. Outsiders get 404 (not 403). 18/18 IDOR tests pass.

### SEC-002
**כותרת:** Ledger IDOR — any user can report/confirm/reject payments on any agreement
**עדיפות:** P0 | **סטטוס:** 🏁 CLOSED | **תאריך:** 2026-06-11
**מטפל:** Cursor | **Commits:** `5569dbe`

**RCA:** `reportPayment`/`confirmPayment`/`rejectPayment` in `ledgerService.js` accepted any caller. `GET /agreement/:id` had no ownership check. `generateLedger` could be called by any landlord for any agreement and was not idempotent.
**Fix:** Actor authorization in service layer (party check for report, landlord check for confirm/reject). `loadAgreement` on GET/generate routes. Idempotency guard on generate. 9/9 tests pass.

### SEC-003
**כותרת:** Rate limit behind Render proxy — all users share one IP bucket
**עדיפות:** P1 | **סטטוס:** 🏁 CLOSED | **תאריך:** 2026-06-12
**מטפל:** Claude Code | **Commits:** `bd9128d`

**RCA:** No `trust proxy` set — `req.ip` was always the Render proxy address. All users shared one rate-limit bucket; one hostile client could lock out production. The auth limiter keyed on `ip:path:email` gave each email its own budget, enabling credential spraying.
**Fix:** `app.set('trust proxy', 1)` + new `authIpLimiter` (30/min per IP) layered before the existing per-email limiter.

### SEC-004
**כותרת:** GDPR deletion never executes — request stored in Redis only, expires at 30d
**עדיפות:** P1 | **סטטוס:** 🏁 CLOSED | **תאריך:** 2026-06-12
**מטפל:** Claude Code + Cursor | **Commits:** `bd9128d`, `61382bf`

**RCA:** Deletion request stored only in Redis with 30-day TTL. No cron processed it — the entry expired exactly when it was due to execute.
**Fix:** `deletionRequestedAt` column in Postgres. Daily cron at 02:00 anonymizes accounts past 30-day grace (email→`deleted-{id}@...`, random password, lock, null PII). UUID preserved for FK integrity.

### SEC-005
**כותרת:** Email verification tokens stored plaintext with no expiry
**עדיפות:** P1 | **סטטוס:** 🏁 CLOSED | **תאריך:** 2026-06-12
**מטפל:** Claude Code | **Commits:** `bd9128d`

**RCA:** `User.verificationToken` stored raw hex. No expiry — Redis copy had 24h TTL but DB fallback matched forever.
**Fix:** Store SHA-256 hash + `verificationTokenExpiresAt`. Legacy plaintext fallback for in-flight tokens. Expired tokens rejected at verify time. Token + expiry cleared on successful verification.

### SEC-006
**כותרת:** Chat imageUrl stored XSS — javascript:/data: URLs persisted and broadcast
**עדיפות:** P1 | **סטטוס:** 🏁 CLOSED | **תאריך:** 2026-06-12
**מטפל:** Claude Code | **Commits:** `bd9128d`

**RCA:** `imageUrl` field in chat messages persisted and broadcast verbatim via REST and Socket.io. A `javascript:` URL would be stored XSS in any client rendering it as `<img>` or `<a>`. Socket path also skipped the 2000-char content limit.
**Fix:** `isSafeImageUrl()` validator (https-only, max 2048 chars) applied on both REST `POST /:matchId` and socket `send_message`. Content length check added to socket path.

### SEC-007
**כותרת:** Frontend JWT base64url decode failure causes random logouts
**עדיפות:** P1 | **סטטוס:** 🏁 CLOSED | **תאריך:** 2026-06-12
**מטפל:** Antigravity | **Commits:** `83afaf3`

**RCA:** `decodeToken` in `web-next/lib/auth.ts` used `atob(payload)` directly. JWT uses base64url encoding (`-`/`_`, no padding). Tokens with these characters threw `InvalidCharacterError` → treated as expired → user logged out.
**Fix:** `base64UrlDecode` helper (replace `-`→`+`, `_`→`/`, pad with `=`) before `atob`. Frontend error handling added for 403/404/422 responses (`28d27e7`).

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
