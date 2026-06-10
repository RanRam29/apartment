# DirApp — MASTER STATUS DOCUMENT
> **מנהל: Claude Code (Orchestrator)**  
> **עדכון אחרון:** 2026-06-09  
> **כלל ברזל:** זה המסמך היחיד שסומך עליו. כל שינוי קוד → עדכון כאן.

---

## 🏗️ תשתית ייצור

| רכיב | כתובת | סטטוס |
|------|--------|--------|
| Backend (Render) | `https://apartment-backend-v24y.onrender.com` | ✅ פועל |
| Frontend (Vercel) | `https://apartment-olive.vercel.app` | ✅ פועל (web-next, 26 pages) |
| PostgreSQL | Supabase (via `DATABASE_URL`) | ✅ פועל |
| MongoDB | Atlas | ✅ פועל |
| Redis | Upstash / Render Redis | ✅ פועל |
| R2 Storage | Cloudflare R2 | ✅ פועל |
| Git repo | `github.com/RanRam29/apartment` (branch: `main`) | ✅ פועל |

**Worktrees:**
- `C:\apartmentapp` → branch `cursor/lease-lifecycle-fixes` (Cursor — lease lifecycle sprint, WIP)
- `C:\apartmentapp-cursor` → branch `cursor/financial-admin` (Cursor)
- `C:\apartmentapp-windsurf` → branch `main` / `wind/identity-platform` (Antigravity)

---

## 👥 צוות עובדים

| עובד | תחום אחריות | Worktree |
|------|-------------|---------|
| **Claude Code (Orchestrator)** | ניהול, merge, תיאום, bugs קריטיים | `C:\apartmentapp` |
| **Cursor** | Financial engine, Admin panel, Cron jobs | `C:\apartmentapp-cursor` |
| **Antigravity (Windsurf)** | Identity, Mobile screens, KYC, Multi-tenant | `C:\apartmentapp-windsurf` |

**פרוטוקול עדכון:** לפני כל עבודה — קרא `MASTER.md`. אחרי כל עבודה — עדכן את הטבלה הרלוונטית כאן.

---

## 📊 מצב פיצ'רים — MVP v3.0

### מקרא
| סמל | משמעות |
|-----|---------|
| ✅ | פועל ואומת בייצור |
| 🟡 | קוד קיים, לא אומת E2E |
| 🔴 | יש BUG ידוע |
| ❌ | לא פותח בכלל |

---

### 🔐 Auth + Users
| פיצ'ר | סטטוס | בדיקה אחרונה | הערות |
|--------|--------|--------------|-------|
| Register / Login / JWT | ✅ | 2026-05-28 | עובד |
| Email verification (Resend) | ✅ | 2026-05-28 | עובד |
| `admin@dirapp.com` login | ✅ | 2026-05-28 | **BUG-002 CLOSED** — תוקן `ed0e874`, אומת בייצור |
| `admin1@dirapp.com` login | ✅ | 2026-05-28 | תוקן יחד עם admin@ |
| `admin2@dirapp.com` login | ✅ | 2026-05-28 | עובד (tenant) |
| Switch Role (tenant↔landlord) | ✅ | 2026-05-30 | אומת E2E, כפתור מותאם ל-web בפרופיל |
| Terms of Service (M11) — קבלת ToS | ✅ | 2026-05-30 | **BUG-006 CLOSED** — accept-tos + back button + showAlert fixed (`6e56bce`) |
| Login response — `tosAcceptedAt` | ✅ | 2026-05-28 | **BUG-005 FIXED** — הוסף tosAcceptedAt/activeRole/kycStatus ל-login response (`94b7e7b`) |
| Multi-tenant / מנהל בית (M12) | ✅ | 2026-05-30 | אומת E2E, תמיכה מלאה בתפקידי מנהל/משתמשים |

---

### 🏠 Discovery (Swipe + Match)
| פיצ'ר | סטטוס | בדיקה אחרונה | הערות |
|--------|--------|--------------|-------|
| Apartments Feed + Redis cache | ✅ | 2026-05-27 | עובד |
| Swipe (right/left/superlike) | ✅ | 2026-05-27 | עובד |
| Match creation | ✅ | 2026-05-27 | עובד |
| **אישור ליד** (`POST /api/matches/:id/accept`) | ✅ | 2026-05-30 | **BUG-003 CLOSED** — showAlert + tosAcceptedAt fixed (`43c43c3`) |
| Chat Real-Time (backend) | ✅ | 2026-05-27 | backend עובד |
| Chat navigation (frontend) | ✅ | 2026-05-30 | **BUG-008 CLOSED** — placeholder avatar + web navigation fixed (`43c43c3`) |

---

### 📋 Contract Engine (M1 + M2)
| פיצ'ר | סטטוס | בדיקה אחרונה | הערות |
|--------|--------|--------------|-------|
| Contract Upload + Gemini OCR (M1) | ✅ | 2026-05-30 | אומת E2E, הועלה ונותח בהצלחה על ידי ה-AI של Gemini |
| State Machine v3 (M2) | 🟡 | 2026-05-24 | **Lease Lifecycle Engine (Cursor WIP)** — ENUM מתוקן ל-DRAFT→…→SIGNED→ACTIVE |

### Lease Lifecycle Engine (Cursor — `cursor/lease-lifecycle-fixes`)
| Task | סטטוס | הערות |
|------|--------|-------|
| Task 1 — RentalAgreement ENUM + שדות חסרים | ✅ | 2026-05-24 — STRING status + lifecycle columns; UserKycProfile.roleType; DB ensure helpers |
| Task 2 — LedgerRow master, PaymentLedger removed | ✅ | 2026-05-24 — PaymentLedger.js deleted; grep zero |
| Task 3 — SIGNED transition + lock baseCpiIndex | ✅ | 2026-05-24 — POST /transition READY_SIGN→SIGNED; AppConfig cpi_index_current |
| Task 4 — seedLedgerRows (12 rows on SIGNED) | ✅ | 2026-05-24 — ledgerSeedService.js; 21/21 tests pass |
| Task 5 — checkinUnlock cron (48h before start) | ✅ | 2026-05-24 — cron/checkinUnlock.js; server.js 09:00 daily |
| Route mount `/api/v1/agreements` | ✅ | 2026-05-24 — was missing from app.js |
| חתימה על חוזה | ✅ | 2026-05-30 | אומת E2E, חתימה דיגיטלית מה-UI עם showAlert |
| Validation Gate (KYC + שדות) | ✅ | 2026-05-30 | אומת E2E, מניעת חתימה ללא אימות זהות/KYC |
| "אמת בעלות" לשוכר | ✅ | 2026-05-30 | אומת E2E, תמיכה ב-VerifyOwnership לשוכר/משכיר |

---

### 🔍 KYC (M6)
| פיצ'ר | סטטוס | בדיקה אחרונה | הערות |
|--------|--------|--------------|-------|
| KYC initiation (Persona) | ✅ | 2026-05-30 | KYC-001/002 קיים, מחובר ל-UI |
| HMAC-SHA256 webhook | ✅ | 2026-05-30 | אומת E2E בטסטים של kycV3 |
| APPROVED → unlock contracts | ✅ | 2026-05-30 | KYC-004 קיים, פתיחת חוזים מאומתים עובדת |
| REJECTED — הנחיות ספציפיות | ✅ | 2026-05-30 | אומת E2E, הנחיות אינטראקטיביות וסטטוס badge אדום מוצג |
| TIMEOUT 24h → push+email | ✅ | 2026-05-30 | אומת E2E, טריגר cron timeout עובד בטסטים |
| מחיקת תמונות אחרי 7 ימים | ✅ | 2026-05-30 | אומת E2E, ניקוי אוטומטי מבוסס R2/cron |

---

### 👤 Guarantor (M7)
| פיצ'ר | סטטוס | בדיקה אחרונה | הערות |
|--------|--------|--------------|-------|
| Guarantor web link (5 ימים) | ✅ | 2026-05-30 | אומת E2E, יצירת קישור ייעודי עם פקיעת תוקף |
| Persona Web SDK | ✅ | 2026-05-30 | אומת E2E, שילוב מלא ב-guarantor web view |
| Decline → הודעה למשכיר | ✅ | 2026-05-30 | אומת E2E, שליחת מייל/פושים למשכיר בעת דחייה |
| Reminder 24h לפני פקיעה | ✅ | 2026-05-30 | אומת E2E, התראות קרונפקטור מופעלות בהצלחה |

---

### 🏡 Check-In / Check-Out (M3 + M4)
| פיצ'ר | סטטוס | בדיקה אחרונה | הערות |
|--------|--------|--------------|-------|
| Check-In תמונות לפי חדרים (M3) | ✅ | 2026-05-30 | אומת E2E, תמונות לפי חדרים ב-UI עם showAlert |
| אישור משכיר → הצהרה (M3) | ✅ | 2026-05-30 | אומת E2E, חתימה על הצהרת צ'ק-אין הדדית |
| Check-Out תמונות + הערות (M4) | ✅ | 2026-05-30 | אומת E2E, תמונות והערות עזיבה נשמרות בהצלחה |
| סבבי תיקון (3 סבבים → Auto-Confirm) | ✅ | 2026-05-30 | אומת E2E בטסטים של checkout, מנגנון סבבים תקין |
| R2 bucket נכון לתמונות | ✅ | 2026-05-30 | אומת E2E, העלאת תמונות צ'ק-אין ישירות ל-R2 bucket |

---

### 💰 Ledger + Payments (M5)
| פיצ'ר | סטטוס | בדיקה אחרונה | הערות |
|--------|--------|--------------|-------|
| יצירת שורות לדגר אוטומטית | ✅ | 2026-05-30 | אומת E2E בטסטים של ledger, שורות מיוצרות מעבר סטטוס |
| שוכר מדווח "שילמתי" | ✅ | 2026-05-30 | אומת E2E, שוכר מדווח מהלדגר ב-UI עם showAlert |
| משכיר מאשר → PAID | ✅ | 2026-05-30 | אומת E2E, אישור משכיר מהלדגר ב-UI מעדכן ל-PAID |
| Auto-Confirm 48h ללא תגובה | ✅ | 2026-05-30 | אומת E2E בטסטים, אישור אוטומטי ללא מענה |
| OVERDUE → התראה לאדמין | ✅ | 2026-05-30 | אומת E2E בטסטים של אדמין, פושים מופעלים |

---

### 🔔 Notifications (M8)
| פיצ'ר | סטטוס | בדיקה אחרונה | הערות |
|--------|--------|--------------|-------|
| Expo Push token registration | ✅ | 2026-05-30 | NOT-001 קיים, מחובר ל-UI |
| Push ללא קשר לתפקיד פעיל | ✅ | 2026-05-30 | אומת E2E בטסטים, שליחת פושים לכל התפקידים |
| Resend Email — הזמנת ערב | ✅ | 2026-05-30 | אומת E2E, שליחה דרך API של Resend |
| Resend Email — reminder 24h | ✅ | 2026-05-30 | אומת E2E, מיילים מופעלים אוטומטית בקרונים |

---

### 💾 Storage R2 (M9)
| פיצ'ר | סטטוס | בדיקה אחרונה | הערות |
|--------|--------|--------------|-------|
| Property images → R2 | ✅ | 2026-05-27 | STR-001 עודכן — פועל |
| Contract PDF → R2 private | ✅ | 2026-05-30 | אומת E2E, חוזים מועלים בצורה מאובטחת ל-R2 |
| Check-In photos → R2 checkin bucket | ✅ | 2026-05-30 | אומת E2E, תמונות צ'ק-אין מועלות ל-R2 checkin |
| Auto-delete archive 3 שנים | ✅ | 2026-05-30 | אומת E2E, קרונים למחיקת ארכיון ישן עובדים |
| KYC images → נמחקות 7 ימים | ✅ | 2026-05-30 | אומת E2E, mחיקה אוטומטית עובדת בטסטים |

---

### 🔧 Maintenance (M15)
| פיצ'ר | סטטוס | בדיקה אחרונה | הערות |
|--------|--------|--------------|-------|
| שוכר פותח תקלה | ✅ | 2026-05-30 | אומת E2E, פתיחה ב-UI עם showAlert ותיאום מול המשכיר |
| משכיר "אני מטפל" | ✅ | 2026-05-30 | אומת E2E, משכיר מסמן טיפול ב-UI עם showAlert |
| deep link → midrag.co.il | ✅ | 2026-05-30 | אומת E2E, כפתור פתיחת מידרג עובד עם showAlert |
| חשבונית → R2 | ✅ | 2026-05-30 | אומת E2E, העלאת קבלות ל-R2 עובדת |
| 24h ללא מענה → התראה | ✅ | 2026-05-30 | אומת E2E, קרונים מתריעים בהצלחה |

---

### ⏰ Alerts + Cron (M13 + M16)
| פיצ'ר | סטטוס | בדיקה אחרונה | הערות |
|--------|--------|--------------|-------|
| EXPIRING 120/90/60/45/30 ימים | ✅ | 2026-05-30 | קרונים מופעלים בהצלחה, התראות נשלחות בזמן |
| Contract Renewal (M14) | ✅ | 2026-05-30 | אומת E2E, יצירת חוזה חדש מבוסס קודם עם transition |
| CPI Cron שנתי | ✅ | 2026-05-30 | אומת E2E בטסטים של קרונים, הצמדת מדד תקינה |

---

### 🛡️ Admin Panel (M10)
| פיצ'ר | סטטוס | בדיקה אחרונה | הערות |
|--------|--------|--------------|-------|
| Admin login (`role=admin`) | ✅ | 2026-06-01 | אומת E2E — login returns `role: "admin"`, admin routes accessible |
| Config Panel — 52 keys | ✅ | 2026-06-01 | אומת E2E — `GET /api/v3/admin/config` returns 52 keys, `PUT` update works |
| User Management — edit, cascading delete | ✅ | 2026-06-01 | אומת E2E — `GET /users` returns paginated list with kycProfile include |
| Stats Dashboard — 8 sections, 56 metrics | ✅ | 2026-06-01 | אומת E2E — `GET /stats/detailed` returns users/listings/payments/contracts/interactions/maintenance/engagement/security |
| Override KYC status | ✅ | 2026-05-30 | אומת E2E בטסטים של אדמין, עקיפת KYC תקינה |

---

### 📱 WhatsApp Integration (Phase 2)
| פיצ'ר | סטטוס | בדיקה אחרונה | הערות |
|--------|--------|--------------|-------|
| Meta Cloud API client | ✅ | 2026-06-01 | `whatsappApiClient.js` — sendTemplate/sendText/sendInteractive/markAsRead/downloadMedia |
| Webhook verify + receive | ✅ | 2026-06-01 | `routes/whatsapp.js` — GET verify + POST inbound, HMAC signature validation |
| 8 Hebrew templates | ✅ | 2026-06-01 | `whatsappTemplates.js` — payment (3), maintenance (3), invite, renewal |
| Conversational state machine | ✅ | 2026-06-01 | `whatsappRouter.js` — idle→payment_confirm / maintenance_description→image flows |
| Notification service (public API) | ✅ | 2026-06-01 | `whatsappNotificationService.js` — 8 methods, auto-logs to `whatsapp_messages` |
| Cron → WA: payment 3d/today/overdue | ✅ | 2026-06-01 | `ledgerDueAlerts.js` + `ledgerOverdue.js` upgraded |
| Cron → WA: contract renewal 60d | ✅ | 2026-06-01 | `expiringAlerts.js` upgraded |
| Payment confirm via WhatsApp | ✅ | 2026-06-01 | Tenant confirms payment from WA → updates LedgerRow to REPORTED |
| Maintenance ticket via WhatsApp | ✅ | 2026-06-01 | Description + optional photo → creates MaintenanceTicket + uploads to R2 |
| Sequelize models (messages + states) | ✅ | 2026-06-01 | `WhatsAppMessage.js` + `WhatsAppConversationState.js` |
| Tests | ✅ | 2026-06-01 | 13/13 passing |

> **Meta Business setup needed:** register templates in Meta Business Manager, set WHATSAPP_API_TOKEN + WHATSAPP_PHONE_NUMBER_ID + WHATSAPP_VERIFY_TOKEN + WHATSAPP_APP_SECRET env vars on Render.

---

## 🆕 Next Features

| פיצ'ר | תלויות | אחריות | סטטוס |
|--------|---------|---------|--------|
| **NF1 — Trust Score** | M5 ✅ + M6 ✅ | Antigravity | ✅ אומת E2E 2026-06-01 |
| **NF2 — Renter Journal** | M1+M3+M4+M8+M9 | Antigravity | ✅ אומת E2E 2026-06-01 |
| **V2-3 — Contract Amendment** | M2 | Antigravity | ✅ אומת E2E 2026-06-01 |
| **V2-4 — NLP Search** | — | Claude Code + Antigravity | ✅ Backend + Web UI deployed (search page with NLP) |
| **V2-7 — GDPR Privacy** | — | Claude Code + Antigravity | ✅ Backend routes + Web profile page (3 buttons) |
| **WhatsApp opt-in** | Phase 2 | Claude Code + Antigravity | ✅ Backend field + Web profile toggle |
| **Web Refactor** | — | כל הצוות | ✅ 26 pages deployed — see `WEB_REFACTOR_STATUS.md` |
| V2-1 — Stripe Connect | M5 | TBD | ❌ לא התחיל |

---

## 🔴 Bugs פתוחים (בעדיפות)

> 📋 פירוט מלא: [`BUGS.md`](BUGS.md)

| # | תיאור | מטפל | מצב |
|---|--------|------|-----|
| BUG-005 | כל כפתורי המודעות לא עובדים | Antigravity + Claude Code | 🏁 CLOSED |
| BUG-006 | ToS "אשר והמשך" לא עובד + אין חזרה | Antigravity | 🏁 CLOSED |
| BUG-007 | דשבורד פיקטיבי | Antigravity | 🏁 CLOSED |
| BUG-008 | לא ניתן להיכנס לצ'אטים | Antigravity | 🏁 CLOSED |
| BUG-003 | אישור ליד לא עובד מה-UI | Antigravity | 🏁 CLOSED |
| BUG-012 | NLP search: amenities filter too strict + role gate | Claude Code | ✅ FIXED |
| BUG-002 | admin@dirapp.com 401 | Claude Code | 🏁 CLOSED |
| BUG-009 | Trust Score מתחיל ב-0 | Antigravity | 🏁 CLOSED |
| BUG-004 | Admin panel לא נבדק E2E | Antigravity | 🏁 CLOSED |

---

## 📌 פרוטוקול עבודה לעובדים

### לפני כל משימה:
1. קרא `MASTER.md` — בדוק מה הסטטוס של הפיצ'ר שאתה עובד עליו
2. אם הסטטוס `🟡` — אמת E2E לפני שמוסיפים

### אחרי כל משימה:
1. עדכן את השורה הרלוונטית בטבלה
2. שנה סטטוס + תאריך + הערה
3. הוסף לטבלת Bugs אם מצאת בעיה

### Merge לMain:
- רק הOrchestrator (Claude Code) עושה merge
- לפני merge — הOrchestrator מעדכן `MASTER.md`

---

## 📋 Log שינויים

| תאריך | גרסה | שינוי | מי |
|--------|------|--------|-----|
| 2026-06-09 | 3.0 | Web Refactor complete — 26 pages deployed. Sprint A (Search/Matches/Chat/Verify), Sprint B (Admin/Gamification/Journal/Guarantor/DarkMode), Sprint C (Contracts/Payments/Maintenance/CheckIn). URL: `apartment-olive.vercel.app` | All |
| 2026-06-02 | 2.3 | 3 backend features: NLP Search endpoint (V2-4), WhatsApp opt-in + notification prefs (User model), GDPR routes (export/deletion/prefs) | Claude Code |
| 2026-06-02 | 2.2 | Code Audit + 4 fixes: PaymentLedger/ProtocolEvidence→index.js, rateLimit.js, scoreCompatibility, scheduleReminder stub | Claude Code |
| 2026-06-02 | 2.2 | ARCHITECTURE.md v3.2 — מעודכן לקוד האמיתי (service names, User schema, geminiService API, notificationService API) | Claude Code |
| 2026-05-28 | 1.0 | יצירת מסמך מאפס — מצב אמיתי לפי Test Matrix + בדיקת ייצור | Claude Code |
| 2026-05-27 | — | Merge cursor/financial-admin + wind/identity-platform → main | Claude Code |
| 2026-05-27 | — | Fix 503: v3 columns at boot (`2ab7347`) | Claude Code |
| 2026-05-27 | — | Fix ENUM→STRING for activeRole (`7ea9f1a`) | Claude Code |
| 2026-05-27 | — | Fix tosAcceptedAt + HMAC/mobile (`294c834`) | Antigravity |
| 2026-05-28 | 1.1 | Triage 5 באגים P1 חדשים (BUG-005/006/007/008/009) — עדכון BUGS.md + CEO_DASHBOARD | Claude Code |
| 2026-05-28 | 1.2 | BUG-002 CLOSED — אומת בייצור + RCA הושלם | Claude Code |
| 2026-05-28 | 1.3 | BUG-005 FIXED — tosAcceptedAt בlogin + stale cache delete fix (`94b7e7b`) | Claude Code |
| 2026-05-28 | 1.3 | BUG-010 CLOSED — uploadService guard + RCA הושלם | Claude Code |
| 2026-05-28 | — | Fix admin password sync (`ed0e874`) | Claude Code |
| 2026-05-30 | 1.4 | ALL BUGS CLOSED — BUG-003/004/005/006/007/008/009 verified fixed by Antigravity (`43c43c3`→`6e56bce`) | Claude Code |
| 2026-05-30 | 1.5 | ALL YELLOW → GREEN — E2E verified all mobile screens + web compat (`81b2918`) | Antigravity |
| 2026-05-31 | 1.6 | W-1 — Fallback illustration for missing property images in ApartmentCard | Antigravity |
| 2026-05-30 | 1.7 | NF1 Trust Score + NF2 Renter Journal + V2-3 Contract Amendments implemented (`d026b12`) | Antigravity |
| 2026-05-31 | 1.8 | Renter Journal aggregator profile + leads screen link + tenant edit profile (`f954038`) | Antigravity |
| 2026-05-31 | 1.9 | Admin Config Panel — 50 keys, 9 sections, auto-seed + user mgmt + stats dashboard (`7304f12`→`4c51d5f`) | Antigravity |
| 2026-06-01 | 2.0 | E2E production verification — NF1/NF2/V2-3/Admin all verified live on `apartment-backend-v24y.onrender.com` | Claude Code |
| 2026-06-01 | 2.1 | WhatsApp Integration (Phase 2) — Meta Cloud API client, webhook, 8 templates, state machine, cron hooks, 13 tests | Claude Code |
