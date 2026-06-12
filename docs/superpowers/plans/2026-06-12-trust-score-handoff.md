# HANDOFF — Trust Score Core (feat/trust-score-core)
> נכתב ע"י Claude Code (Orchestrator) לפני סיום session. ההמשך: session חדש של Claude Code (או Cursor).
> מקור אמת לאפיון: `docs/superpowers/plans/2026-06-12-onboarding-trust-score-plan.md` (deltas ב-§3, API ב-§4).

## מצב נוכחי
- Branch `feat/trust-score-core` נוצר ב-`C:\apartmentapp` מ-main עדכני. **אפס קוד נכתב** — בוצע סיור קוד בלבד.
- Uncommitted: עדכוני MASTER.md + ROADMAP.md (שיבוץ NF3/V2-9) + שני מסמכי plan. לקמט בנפרד: `docs: NF3 plan + roadmap`.
- ראן אישר את התוכנית כולל ההחלטה: **ניתוק trustScore ממערכת הנקודות** (נקודות MongoDB נשארות ל-levels/badges/leaderboard בלבד).

## ממצאי סיור קוד (חוסך חיפוש)
| מה | איפה | הערה |
|---|---|---|
| Sync שצריך להסיר | `backend/src/services/gamificationService.js:84` | `User.update({trustScore: doc.points})` — למחוק. גם seeding מ-trustScore בשורות 58-67 ושם וב-`routes/gamification.js:63-76,103` — להחליף בהתחלה קבועה של 50 נק' engagement |
| KYC APPROVED hook | `backend/src/services/kycServiceV3.js:52-60` | שם כבר קוראים ל-gamification — להוסיף שם `applyTrustEvent(userId,'kyc_approved')` |
| חתימה דיגיטלית hook | `backend/src/routes/agreements.js:187-208` | בלוק `targetStatus==='SIGNED'` — להוסיף `digital_signing` לשני הצדדים (tenantId + landlordId) |
| WhatsApp opt-in | `users.whatsapp_opt_in` (User model) | ה-toggle בפרופיל — למצוא איפה מעודכן (כנראה routes/auth.js או profile) |
| מודל לחיקוי (טבלה חדשה) | `backend/src/models/pg/ScheduledNotification.js` | UUID PK, dedupeKey UNIQUE, tableName snake_case, indexes. טבלאות חדשות נוצרות אוטומטית ב-`sequelize.sync()` — **לא** צריך ensure helper |
| עמודות חדשות על users | `backend/src/config/database.js:37-51` (`USER_V3_COLUMNS`) | להוסיף `onboarding_state JSONB default {}` + שדה `onboardingState` ב-User.js |
| רישום מודל + אסוציאציות | `backend/src/models/index.js` | דפוס בשורות 84-86 |
| Mount routes | `backend/src/app.js:186-199` | להוסיף `/api/v3/trust` + `/api/v3/onboarding` |
| דפוס טסט אינטגרציה | `backend/tests/change-password.test.js` | mock redis, sequelize.sync, supertest register. להריץ `--runInBand`. Postgres מקומי נדרש; ~21 suites נכשלות baseline (אין Mongo) — לא להיבהל |
| KYC status לצ'קליסט | `UserKycProfile.status === 'APPROVED'` | — |
| נכס ראשון לצ'קליסט | `Apartment.count({where:{landlordId}})` | — |
| לדגר בזמן | `LedgerRow`: `status==='PAID'`, `confirmedByLandlord <= dueDate` | dueDate הוא DATEONLY |
| OwnershipVerification קיים | מודל per-agreement של **שוכר** (choice verified/skipped) | ⚠️ זה לא אימות טאבו של משכיר — אימות טאבו למשכיר עדיין לא קיים כפיצ'ר; אירוע `ownership_verified` יחובר בעתיד, לא לחסום עליו |

## צעדי ביצוע (TDD, commit נפרד לכל שלב)
1. **מודל** `backend/src/models/pg/TrustScoreEvent.js`: id UUID, userId FK CASCADE, eventKey STRING(50), delta INT, meta JSONB, dedupeKey STRING(255) UNIQUE nullable, tableName `trust_score_events`, indexes user_id + event_key. רישום ב-models/index.js.
2. **Service** `backend/src/services/trustScoreService.js`:
   - קטלוג `TRUST_EVENTS` לפי plan §3: kyc_approved +20 once / income_verified +15 once / rent_paid_on_time +5 cap 30 / streak_6_months +10 / checkin_checkout_clean +10 per-contract / whatsapp_opt_in +5 once / ownership_verified +25 cap 25 / fast_lead_response +15 rolling / fast_maintenance +15 rolling / digital_signing +15 cap 15 / positive_reviews +15 rolling.
   - `applyTrustEvent(userId, eventKey, {meta, dedupeKey})`: טרנזקציה; once → dedupeKey אוטומטי `${eventKey}:${userId}`; cap מצטבר = sum(delta) קיים לאותו eventKey; delta נשמר = השינוי בפועל אחרי clamp [0,100]; unique violation → return null בשקט.
   - `revokeTrustEvent(userId, eventKey)`: ל-rolling — מוסיף אירוע שלילי בגובה הסכום הפעיל, clamp.
   - `getTrustStatus(userId, role)`: score, history (50 אחרונים), activeTasks (אירועים שטרם מומשו + כמה שווים, מסונן לפי תפקיד).
3. **ניתוק**: gamificationService + routes/gamification — להסיר כל קריאה/כתיבה ל-trustScore (התחלת points = 50 קבוע).
4. **Routes** `backend/src/routes/trust.js`: GET `/me` (authenticate), GET `/simulate?event=X` (read-only, clamp). `backend/src/routes/onboarding.js`: GET `/checklist` (role-aware לפי activeRole — שוכר: kyc/preferences(bio)/whatsapp; משכיר: first_property/contract_uploaded/whatsapp + completionPct), POST `/step/:key/dismiss` (כותב ל-onboardingState.dismissed). Mount ב-app.js תחת `/api/v3/`.
5. **Hooks שלי**: kycServiceV3 (`kyc_approved`), agreements SIGNED (`digital_signing` לשניים), whatsapp opt-in (`whatsapp_opt_in`). כולם עטופים try/catch — אסור שיפילו את ה-flow הראשי.
6. **טסטים** `backend/tests/trustScore.test.js`: clamp 0/100, once-dedupe, cap מצטבר (7 תשלומים = +30 לא +35), revoke rolling, simulate לא כותב, checklist לשני תפקידים, וטסט שמוכיח ש-award נקודות **לא** משנה trustScore.
7. עדכון `MASTER.md` (טבלת Next Features + Log) ואז merge ל-main ע"י Orchestrator בלבד.

## נשאר אצל אחרים (briefings מוכנים ב-plan §6)
- **Cursor**: hooks לדגר (PAID בזמן), קרונים (streak, response-time), WhatsApp reinforcement, סקריפט מיגרציה רטרואקטיבית. ⚠️ לעדכן את ה-briefing שלו: T1 (מודל+service) כבר נבנה כאן — שלא יבנה כפול.
- **Antigravity**: UI (wizard, completion widget, trust hub) — רק אחרי שה-API הזה merged.
