# Briefing → Claude Code (Orchestrator) — Cursor Handoff Jun 12

> **Worktree:** `C:\apartmentapp-cursor`  
> **Base:** `main` @ `225bf29` (Scheduled Notifications — `afe8bf2` + `225bf29` already on main)  
> **Agent:** Cursor — **לא בוצע merge**; 4 ענפים מוכנים ל-review + merge  
> **MASTER.md:** עודכן ל-v3.6 על `cursor/branch-cleanup` בלבד — יש לוודא שהגרסה הסופית נכנסת ל-main עם המיזוגים

---

## 1. סיכום מנהלים

| # | עדיפות | משימה | ענף | Commit | Tests |
|---|--------|--------|-----|--------|-------|
| K6 | P1 | V2-5 Trust Score auto-calc | `cursor/trust-score-auto-calc` | `81f3033` | 5/5 |
| K7 | P2 | Admin scheduled notifications | `cursor/admin-scheduled-notifications` | `dc43efa` | 4/4 |
| K8 | P2 | V2-2 Guarantor Claims (backend) | `cursor/guarantor-claims` | `7d91466` | 7/7 |
| K9 | P3 | Branch cleanup (remote) + handoff brief | `cursor/branch-cleanup` | `9dfec98` | — |

**סה"כ tests חדשים:** 16/16 passing (runInBand).

---

## 2. K6 — Trust Score auto-calc (V2-5)

**בעיה:** `users.trustScore` default 50 — אין workflow שמעדכן אחרי התנהגות אמיתית.

**פתרון:**
- `backend/src/services/trustScoreService.js`
  - `recalcTrustScore(userId)` — base מ-`AppConfig.initial_trust_score` (50)
  - **+2** תשלום בזמן (PAID + `confirmedByLandlord` ≤ dueDate)
  - **−5** כל שורת OVERDUE
  - **+5** checkout הושלם בלי `checkoutNotes` בחדרים
  - **+2** לכל תקלת תחזוקה CLOSED עם `landlordResponse` (landlord)
  - clamp 0–100 (`max_trust_score`)
- **Hooks:**
  - `ledgerService.confirmPayment` + `autoConfirmStalePayments`
  - `POST /api/v3/contracts/:id/checkout/complete` (`contractsV3.js`)

**UI:** לא נגע — Antigravity מציג.

**Verify:**
```bash
cd backend && npx jest tests/trustScoreService.test.js --runInBand
```

---

## 3. K7 — Admin Scheduled Notifications

**תלות:** `225bf29` — `scheduled_notifications`, `scheduleReminder`, `cancelReminder` כבר על main.

**Endpoints חדשים** (`backend/src/routes/admin.js`):
| Method | Path | תיאור |
|--------|------|--------|
| GET | `/api/v3/admin/scheduled-notifications?status=&page=&limit=` | paginated + `user.email` |
| POST | `/api/v3/admin/scheduled-notifications/:id/cancel` | רק `SCHEDULED` → `cancelReminder({ id })` |

**Verify:**
```bash
cd backend && npx jest tests/adminScheduledNotifications.test.js --runInBand
```

---

## 4. K8 — V2-2 Guarantor Claims (backend)

**מודל:** `backend/src/models/pg/WarrantyClaim.js` → `warranty_claims`  
**שדות:** UUID PK, `agreementId`, `guarantorId`, `amount`, `reason`, `status` STRING + `isIn: [FILED, ACCEPTED, DISPUTED, RESOLVED]`, `filedByUserId`, `resolutionNote`

**Routes:** `backend/src/routes/claimsV3.js` → mount `app.use('/api/v3/claims', ...)`

| Action | Route | Auth |
|--------|-------|------|
| Landlord file | `POST /api/v3/claims` | landlord, agreement owner only (**IDOR → 404**) |
| List | `GET /api/v3/claims` | landlord (own) / admin (all) |
| Guarantor accept | `POST /api/v3/claims/:id/guarantor/accept` | `{ invitationToken }` |
| Guarantor dispute | `POST /api/v3/claims/:id/guarantor/dispute` | `{ invitationToken }` |
| Admin resolve | `POST /api/v3/claims/:id/resolve` | admin |

**notify()** על כל מעבר סטטוס → landlord.

**Verify:**
```bash
cd backend && npx jest tests/warrantyClaims.test.js --runInBand --forceExit
```

**DB:** Sequelize sync יוצר `warranty_claims` ב-boot; אין migration נפרד.

---

## 5. K9 — Branch cleanup

**בוצע על remote (GitHub):**
- **31** ענפי merged נמחקו (83 → **52** remote branches)
- `origin/HEAD` → `origin/main`
- **Protected (לא נמחקו):** `main`, `cursor/financial-admin`, `fix/ledger-idor-gdpr`

**לא הגענו ליעד <15** — נשארו **52** unmerged/stale. פירוט: `docs/internal/branch-cleanup-jun12.md`

**המלצה ל-Orchestrator — מחיקה בטוחה (unmerged stale):**
- 25× `origin/claude/phase4-*` … `phase28-*`
- 19× unmerged `origin/cursor/critical-bug-inspection-*` / `critical-bug-investigation-*`
- `origin/claude/build-dirapp-ui-PB8Jz`, `origin/claude/free-deploy-render-upstash`
- `origin/cursor/dev-environment-setup-1e70`
- `origin/feat/mobile-dirapp-design-baseline-checkpoint`

**Script לעתיד:** `backend/scripts/delete-merged-branches.ps1`

---

## 6. עבודה שלא מוזגה (Stash)

```
stash@{0}: On cursor/backlog-jun12: backlog-jun12 wip
```

**תוכן (tracked):** תיקוני `database-schema.test.js`, `socket.test.js`, אימוץ `scheduleReminder` ב-`ledgerDueAlerts`/`guarantor`/`ledgerService`, `npm run smoke`.

**Untracked ב-stash:** `schema-drift.test.js`, `scripts/smoke.js`, `financialScheduledReminders.test.js`, `RFC-stripe-connect.md`

**המלעה:** אחרי merge K6–K8, pop stash על ענף `cursor/backlog-jun12` (או ענף backlog חדש) — **לא** חובה למיזוג מיידי; P1 backlog נפרד מהסprint הזה.

---

## 7. סדר merge מומלץ

```
main (225bf29)
  ├── merge cursor/trust-score-auto-calc      # K6 — אין conflict צפוי
  ├── merge cursor/admin-scheduled-notifications  # K7
  ├── merge cursor/guarantor-claims           # K8 — מודל + route חדש
  └── merge cursor/branch-cleanup             # K9 — MASTER v3.6 + docs בלבד
```

**Push branches לפני PR (אם לא על remote):**
```bash
git push -u origin cursor/trust-score-auto-calc
git push -u origin cursor/admin-scheduled-notifications
git push -u origin cursor/guarantor-claims
git push -u origin cursor/branch-cleanup
```

---

## 8. Regression suite (לפני promote)

```bash
cd backend
npx jest tests/trustScoreService.test.js \
         tests/adminScheduledNotifications.test.js \
         tests/warrantyClaims.test.js \
         tests/scheduledNotifications.test.js \
         --runInBand --forceExit
```

**צפוי:** 5 + 4 + 7 + 7 = **23/23** (בנוסף ל-suite הקיים).

---

## 9. MASTER.md — שינויים v3.6

על `cursor/branch-cleanup`:
- NF1 Trust Score → auto-calc backend ✅
- שורות חדשות: V2-2, V2-5, Admin scheduled notifications
- Changelog 3.6

**אחריות Orchestrator:** לאחר merge כל הענפים — `MASTER.md` על main = מקור אמת יחיד.

---

## 10. המשך לצוותים אחרים

| נושא | מי | הערה |
|------|-----|------|
| Trust Score UI | Antigravity | Backend מוכן; הצג `trustScore` מעודכן |
| Stripe Connect | TBD | RFC ב-stash: `docs/internal/RFC-stripe-connect.md` — לא מימוש (רישיון) |
| Backlog P1 tests/smoke | Cursor stash | schema-drift + smoke + test fixes |
| Branch <15 | Claude Code | מחק 44 stale unmerged (רשימה §5) |

---

## 11. Worktrees פעילים (אל תמחק)

| Path | Branch |
|------|--------|
| `C:\apartmentapp` | main (Orchestrator) |
| `C:\apartmentapp-cursor` | `cursor/branch-cleanup` (Cursor) |
| `C:\apartmentapp-windsurf` | `wind/web-refactor-ui` (Antigravity) |

---

*Prepared by Cursor — 2026-06-12*
