# Handoff — Claude Code Session 2026-06-12 (ערב)
> **Orchestrator:** Claude Code | למפגש הבא: קרא MASTER.md (v3.5) ואת הקובץ הזה.

---

## מה נעשה במפגש הזה (merged + pushed to main)

| Commit | תוכן |
|--------|------|
| `afe8bf2` | Dead-End Audit — change-password endpoint+UI, notification prefs per-category persisted, fake WhatsApp OTP→opt-in אמיתי, fake 2FA disabled, stub route נמחק, JSON 404 ל-API, error boundaries ל-web-next, footer links |
| `225bf29` | Scheduled Notifications — `scheduled_notifications` table, `scheduleReminder`/`cancelReminder`, delivery cron כל 5 דק', safeCron wrapper לכל הקרונים, 7/7 tests |

**Deploy:** Vercel production READY (אומת דרך MCP, commit 225bf29). **Render לא אומת** —
הרשת הארגונית חוסמת CLI; אימות ידני בדפדפן: `GET /api/anything-fake` צריך להחזיר
`{"error":"Not found"}` (JSON, לא HTML) = הקוד החדש חי. + `GET /health`.

**ידוע:** ~21 סוויטות backend נכשלות מקומית בריצה מקבילה (אין Mongo מקומי) — לא רגרסיה.
database-schema.test.js + socket.test.js אדומות גם על main נקי (mock drift) — משימה אצל Cursor.

---

## תור משימות — Antigravity (Windsurf) — `C:\apartmentapp-windsurf`

> לכל משימה: branch נפרד `wind/<desc>`, main עדכני, בלי merge — Claude Code ממזג. עדכן MASTER.md בסיום.

| # | עדיפות | משימה | תמצית |
|---|--------|--------|--------|
| W1 | P1 | B4 — כפתורים מתים (סריקה סטטית) | `grep Alert.alert mobile/src` → showAlert(); onPress ריקים; API בלי catch. FINDINGS.md |
| W2 | P1 | Mobile change-password | endpoint חדש `POST /api/auth/change-password` {currentPassword,newPassword≥8}; מסך מ-ProfileScreen; בלי 2FA toggle |
| W3 | P1 | **Google Sign-In (web)** | בריף מלא נמסר לראן בצ'אט — תמצית בהמשך הקובץ ⬇ |
| W4 | P1 | **W5 — Forgot Password מלא** | אין route ואין מסך למרות ש-ROADMAP מסמן ✅. forgot-password + reset-password (דפוס hashVerificationToken קיים) + עמוד web |
| W5 | P2 | דפי privacy/terms | app/privacy + app/terms (עברית RTL) + חיבור לינקים בפוטר page.tsx |
| W6 | P2 | Notifications badge realtime | socket קיים → עדכון badge בניווט בלי refresh |
| W7 | P2 | Skeleton loading states | אין אף loading.tsx; הוסף ל-dashboard/search/contracts/payments/matches/chat |
| W8 | P3 | Trust Score UI למשכיר | הצג trustScore בכרטיס ליד + match (backend קיים) |
| W9 | P3 | Google Sign-In mobile | expo-auth-session; אחרי W3; דורש OAuth clients מראן |
| W10 | P3 | Dark-mode QA | מעבר על 26 דפי web-next במצב כהה; תקן טקסט/רקע לא קריאים |
| W11 | P3 | Empty states | search ללא תוצאות, matches ריק, contracts ריק — איור + CTA במקום עמוד ריק |

### W3 — Google Sign-In: הכרעת ארכיטקטורה
חיבור ראשון יוצר user בלי תפקיד מחויב → response מחזיר `needsRoleSelection:true` →
מסך בחירה חד-פעמי "אני שוכר / אני משכיר" → `POST /api/auth/set-role` (חד-פעמי, מחזיר JWT חדש
כי role בתוך הטוקן). Backend: עמודות `googleId`+`roleSelectedAt` (גם ב-USER_V3_COLUMNS!),
`POST /api/auth/google` מאמת credential מול `https://oauth2.googleapis.com/tokeninfo?id_token=`
(aud === GOOGLE_CLIENT_ID, email_verified), find-or-create לפי googleId/email,
passwordHash אקראי, isVerified:true. register רגיל מקבל roleSelectedAt:now.
Web: GIS script על הכפתור הקיים (login/page.tsx:172) + register. Env ידני של ראן:
GOOGLE_CLIENT_ID (Render) + NEXT_PUBLIC_GOOGLE_CLIENT_ID (Vercel) + origins ב-Google Console.

---

## תור משימות — Cursor — `C:\apartmentapp-cursor`

> לכל משימה: branch נפרד `cursor/<desc>`, Jest runInBand, בלי merge. עדכן MASTER.md בסיום.

| # | עדיפות | משימה | תמצית |
|---|--------|--------|--------|
| K1 | P1 | C4 — schema-drift guard | tests/schema-drift.test.js: attributes של כל מודל pg מול ensure*Columns() |
| K2 | P1 | C3 — smoke script | backend/scripts/smoke.js: health+login+apartments מול BASE_URL; exit 1 על כשל |
| K3 | P1 | תיקון 2 סוויטות אדומות | database-schema + socket: mock של queryInterface חסר addColumn (database.js:115). mocks בלבד |
| K4 | P2 | אימוץ scheduled notifications | scheduleReminder עם dedupeKey `ledger:{id}:due3d` + cancelReminder כששולם; תזכורת ערב 24h. תבנית: tests/scheduledNotifications.test.js |
| K5 | P2 | npm audit backend | High/Critical בלבד, בלי major bumps |
| K6 | P1 | **V2-5 Trust Score auto-calc** | trustScoreService.js: recalc על PAID/OVERDUE/checkout; hooks בלדגר+checkout; clamp 0-100; בלי UI |
| K7 | P2 | Admin scheduled-notifications | GET list (paginated) + POST /:id/cancel ב-routes/admin.js |
| K8 | P2 | V2-2 Guarantor Claims backend | warranty_claims model (STRING+isIn), routes /api/v3/claims, IDOR test חובה, notify() על מעברים |
| K9 | P3 | C2 — ניקוי ענפים | מחק merged; יעד <15; אל תיגע ב-worktree branches פעילים |
| K10 | P3 | Ledger CSV export | GET /api/v3/ledger/:agreementId/export.csv למשכיר (לרו"ח/מס); אותו actor-auth כמו שאר ledger |
| K11 | P3 | Audit retention 7y (V2-7) | cleanupOldAuditLogs קיים עם env שעות — יישר לקונפיג admin `audit_retention_days` (default 2555) |
| K12 | P3 | Stripe Connect RFC | docs/internal/RFC-stripe-connect.md בלבד (אין רישיון עיבוד) — סכמות, webhook flow, reconciliation |

---

## תור Orchestrator (Claude Code — מפגש הבא)

1. **A1** — אימות Render בדפדפן (JSON 404 + health + smoke login) → עדכן MASTER "אומת בייצור"
2. **A3** — secrets scan על היסטוריית git (הריפו PUBLIC!) — gitleaks/trufflehog
3. **B1** — QA sweep (skill `qa`) → triage ל-BUGS.md → גל 2 ל-Antigravity
4. **C1** — GitHub Actions CI (test+build על PR, חוסם merge)
5. Merge ענפי wind/* + cursor/* כשמדווחים מוכנים
6. פעולות ידניות בהמתנה אצל ראן: Google OAuth client + env vars; Meta WhatsApp env vars (C5)
