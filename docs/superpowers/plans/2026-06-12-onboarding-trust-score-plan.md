# Feature Plan — Smart Onboarding + Trust Score v2 (NF3)
> **Orchestrator:** Claude Code | **תאריך:** 2026-06-12 | **סטטוס:** ממתין לאישור ראן
> מקור: מסמך אפיון "אונבורדינג חכם ומדריך דירוג אמינות" (ראן, 2026-06-12)

---

## 1. Gap Analysis — מה קיים מול מה שהאפיון דורש

| רכיב באפיון | מצב קיים | פער |
|---|---|---|
| Trust Score 0-100, בסיס 50 | ⚠️ `users.trustScore` קיים אבל מסונכרן מנקודות MongoDB **ללא תקרה** (swipe +1, match +10...) — יכול לעבור 100 | **קונפליקט ארכיטקטוני** — ראה החלטה §2 |
| TrustScoreService מבוסס אירועים | ❌ לא קיים (`gamificationService.js` הוא מערכת נקודות, לא ציון אמינות) | בנייה מאפס |
| היסטוריית שינויים בציון | ❌ אין טבלת אירועים | טבלה חדשה `trust_score_events` |
| Onboarding Wizard (web) | ❌ אין onboarding ב-web-next בכלל | בנייה מאפס |
| Onboarding (mobile) | 🟡 OnboardingScreen בסיסי (לוגו + pills) | הרחבה למסלולי תפקיד |
| Profile Completion widget | ❌ לא קיים | חדש + endpoint checklist |
| Trust Score Hub page | 🟡 קיים דף gamification ב-web (leaderboard/points) | דף חדש או הסבה |
| ווידג'ט סימולציה | ❌ | חדש (frontend בלבד, מחושב מטבלת deltas) |
| WhatsApp חיזוק חיובי | ✅ תשתית מלאה (`whatsappNotificationService`) | hook אחד + template |
| KYC Persona, טאבו/Gemini, לדגר, צ'ק-אין/אאוט | ✅ הכל קיים ועובד | רק event hooks |

## 2. החלטה ארכיטקטונית: הפרדת Points מ-Trust Score

**הבעיה:** היום `gamificationService.awardPoints` מסנכרן נקודות engagement (ללא תקרה) אל `users.trustScore` ([gamificationService.js:84](../../backend/src/services/gamificationService.js)). שוכר שעושה 60 swipes מקבל "אמינות" כמו מי שעבר KYC. זה סותר את האפיון וגם מטעה משכירים.

**ההחלטה (Claude Code):** שתי מערכות נפרדות:
- **Engagement Points** (MongoDB, קיים) — נשאר כמו שהוא: levels, badges, leaderboard. מנותק מ-trustScore.
- **Trust Score** (PG `users.trustScore`, 0-100, בסיס 50) — מחושב רק ע"י `TrustScoreService` החדש מאירועי אמינות. הסנכרון בשורה 84 מוסר.
- **מיגרציה:** משתמשים קיימים מאופסים ל-50 + זיכוי רטרואקטיבי על אירועים שכבר קרו (KYC approved → +20, חוזה חתום → +15 וכו') — ניתן לגזירה מה-DB.

## 3. מודל אירועים (deltas מהאפיון)

### שוכר
| eventKey | delta | trigger | dedupe |
|---|---|---|---|
| `kyc_approved` | +20 | Persona webhook APPROVED | פעם אחת |
| `income_verified` | +15 | העלאת תלוש/דירוג אשראי (פיצ'ר חדש, R2 מוצפן) | פעם אחת |
| `rent_paid_on_time` | +5 | LedgerRow → PAID לפני dueDate | per ledgerRow, תקרה מצטברת 30 |
| `streak_6_months` | +10 | cron חודשי — 6 רצופים | per streak |
| `checkin_checkout_clean` | +10 | check-out approved ללא סבבי תיקון | per contract |
| `whatsapp_opt_in` | +5 | `whatsappOptIn=true` | פעם אחת |

### משכיר
| eventKey | delta | trigger | dedupe |
|---|---|---|---|
| `ownership_verified` | +25 | אימות טאבו (Gemini) | per property, תקרה 25 |
| `fast_lead_response` | +15 | cron — ממוצע מענה < 12h על 5+ לידים | rolling, ניתן לאיבוד |
| `fast_maintenance` | +15 | "אני מטפל" < 24h, ממוצע rolling | rolling |
| `digital_signing` | +15 | חוזה נחתם דיגיטלית end-to-end | per contract, תקרה 15 |
| `positive_reviews` | +15 | דירוג ממוצע 4.5+ מ-2+ שוכרים שסיימו חוזה | rolling |

**כללים:** clamp ל-[0,100]; כל אירוע נרשם ב-`trust_score_events` (UUID PK, userId, eventKey, delta, meta JSONB, dedupeKey UNIQUE, createdAt); badge "פרימיום אמין" ב-85+; boost בפיד (200%/300%) — שלב 2, לא בספרינט הזה.

## 4. API חדש (תחת `/api/v3/`)

- `GET /api/v3/trust/me` — score, history (events), activeTasks (מה חסר + כמה שווה)
- `GET /api/v3/trust/simulate?event=X` — ציון היפותטי (read-only)
- `GET /api/v3/onboarding/checklist` — role-aware: רשימת שלבים + completed + completionPct
- `POST /api/v3/onboarding/step/:key/dismiss` — דילוג על שלב

## 5. חלוקת עבודה

| משימה | Owner | עדיפות |
|---|---|---|
| T1 — `TrustScoreService` + מודל `TrustScoreEvent` + ensure columns + ניתוק sync הישן + מיגרציה רטרואקטיבית | **Cursor** | P1 |
| T2 — Event hooks: ledger PAID, KYC webhook, ownership, signing, maintenance, opt-in | **Cursor** (ledger/cron) + **Claude Code** (KYC/contracts — קוד קריטי) | P1 |
| T3 — Crons: streak חודשי, response-time יומי + WhatsApp "הציון שלך עלה" | **Cursor** | P2 |
| T4 — `GET /trust/me` + `simulate` + onboarding checklist endpoints | **Claude Code** | P1 |
| T5 — Onboarding Wizard web-next (מסלול שוכר + משכיר) | **Antigravity** | P1 |
| T6 — Profile Completion widget בדשבורד | **Antigravity** | P1 |
| T7 — Trust Score Hub page (ציון מעגלי + היסטוריה + משימות + סימולציה) | **Antigravity** | P2 |
| T8 — Mobile onboarding upgrade | **Antigravity** | P3 |

**תזמון:** אחרי סגירת ה-P0 של ספרינט 2026-06-12 (A1 אימות פרודקשן, A3 secrets scan, B1 QA sweep, C1 CI). Backend (T1-T4) לפני Frontend (T5-T7) — ה-UI צריך את ה-endpoints.

**לא בספרינט:** feed boost לפי ציון, income verification flow מלא (דורש אפיון פרטיות), appeal process.

---

## 6. Briefings (להעתקה כשמתחילים)

### Briefing → Cursor (T1-T3)
```
DirApp. Worktree: C:\apartmentapp-cursor. קרא MASTER.md לפני הכל.
git checkout main && git pull && git checkout -b cursor/trust-score-service

משימה: Trust Score v2 — ציון אמינות 0-100 (בסיס 50), מנותק ממערכת הנקודות.
מקור אמת: docs/superpowers/plans/2026-06-12-onboarding-trust-score-plan.md (טבלאות deltas ב-§3).

1. מודל pg/TrustScoreEvent.js: UUID PK, userId FK, eventKey STRING, delta INT,
   meta JSONB, dedupeKey STRING UNIQUE nullable, createdAt. עדכן ensure*Columns ב-database.js.
2. services/trustScoreService.js: applyTrustEvent(userId, eventKey, {meta, dedupeKey}) —
   טרנזקציה: insert event (דלג בשקט על dedupe כפול), עדכן users.trustScore עם clamp [0,100].
   טבלת TRUST_EVENTS עם deltas + caps מה-plan. revokeTrustEvent לאירועי rolling.
3. הסר את sync trustScore ב-gamificationService.js:84 (נקודות נשארות MongoDB בלבד).
4. Hooks: LedgerRow→PAID לפני dueDate → rent_paid_on_time (cap 30); whatsappOptIn → whatsapp_opt_in.
5. Crons: streak חודשי (6 רצופים → streak_6_months); response-time יומי למשכירים
   (avg<12h על 5+ לידים → fast_lead_response, אחרת revoke). על עלייה — whatsappNotificationService.
6. סקריפט מיגרציה scripts/migrateTrustScores.js: כולם ל-50 + רטרו (KYC approved +20,
   חוזה חתום +15 וכו' מה-DB). לא להריץ — Claude Code מריץ בפרודקשן.
טסטים Jest (runInBand): clamp, dedupe, cap מצטבר, ניתוק מנקודות. commit נפרד לכל שלב.
אל תעשה merge — Claude Code ממזג. בסיום עדכן MASTER.md ודווח.
```

### Briefing → Antigravity (T5-T7, אחרי שה-API מוכן)
```
DirApp. Worktree: C:\apartmentapp-windsurf. קרא MASTER.md לפני הכל.
git checkout main && git pull && git checkout -b wind/onboarding-trust-ui

משימה: Onboarding Wizard + Trust Score Hub ב-web-next. עברית, RTL, dark-mode, dirAppTokens.
API מוכן: GET /api/v3/trust/me, GET /api/v3/trust/simulate?event=X,
GET /api/v3/onboarding/checklist, POST /api/v3/onboarding/step/:key/dismiss.
אפיון מלא: docs/superpowers/plans/2026-06-12-onboarding-trust-score-plan.md

1. Onboarding Wizard — נפתח אחרי הרשמה/בחירת תפקיד (role_selected_at):
   שוכר: העדפות חיפוש → הזמנת KYC → tutorial החלקה → WhatsApp opt-in.
   משכיר: פרסום נכס → אימות טאבו → העלאת חוזה. כל שלב ניתן לדילוג, progress pills.
2. Profile Completion widget בדשבורד: % השלמה + הצעד הבא כלינק ("השלם KYC וקבל +20").
3. Trust Score Hub (דף חדש /trust): ציון 0-100 באנימציה מעגלית, היסטוריית אירועים,
   משימות אקטיביות, ווידג'ט סימולציה (קריאה ל-simulate, אנימציית קפיצת ציון).
לא לגעת בדף ה-gamification הקיים (נקודות/leaderboard) — אלו שתי מערכות נפרדות עכשיו.
build web-next לפני סיום. אל תעשה merge — Claude Code ממזג. עדכן MASTER.md ודווח.
```
