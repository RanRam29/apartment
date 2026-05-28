# DirApp — MASTER STATUS DOCUMENT
> **מנהל: Claude Code (Orchestrator)**  
> **עדכון אחרון:** 2026-05-28  
> **כלל ברזל:** זה המסמך היחיד שסומך עליו. כל שינוי קוד → עדכון כאן.

---

## 🏗️ תשתית ייצור

| רכיב | כתובת | סטטוס |
|------|--------|--------|
| Backend (Render) | `https://apartment-backend-v24y.onrender.com` | ✅ פועל |
| Frontend (Vercel) | `https://apartment-olive.vercel.app` | ✅ פועל |
| PostgreSQL | Supabase (via `DATABASE_URL`) | ✅ פועל |
| MongoDB | Atlas | ✅ פועל |
| Redis | Upstash / Render Redis | ✅ פועל |
| R2 Storage | Cloudflare R2 | ✅ פועל |
| Git repo | `github.com/RanRam29/apartment` (branch: `main`) | ✅ פועל |

**Worktrees:**
- `C:\apartmentapp` → branch `main` (Orchestrator — Claude Code)
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
| `admin@dirapp.com` login | 🔴 | 2026-05-28 | password sync — תוקן בעדכון `ed0e874`, ממתין לרידיפלוי |
| `admin1@dirapp.com` login | 🔴 | 2026-05-28 | אותה בעיה |
| `admin2@dirapp.com` login | ✅ | 2026-05-28 | עובד (tenant) |
| Switch Role (tenant↔landlord) | 🟡 | — | UI קיים, לא נבדק E2E |
| Terms of Service (M11) | ✅ | 2026-05-28 | `tosAcceptedAt` מוגדר ב-autoSeed |
| Multi-tenant / מנהל בית (M12) | 🟡 | — | קוד קיים, לא נבדק E2E |

---

### 🏠 Discovery (Swipe + Match)
| פיצ'ר | סטטוס | בדיקה אחרונה | הערות |
|--------|--------|--------------|-------|
| Apartments Feed + Redis cache | ✅ | 2026-05-27 | עובד |
| Swipe (right/left/superlike) | ✅ | 2026-05-27 | עובד |
| Match creation | ✅ | 2026-05-27 | עובד |
| **אישור ליד** (`POST /api/matches/:id/accept`) | 🔴 | 2026-05-28 | API קיים; **הודלק מה-UI — צריך בדיקה** |
| Chat Real-Time | ✅ | 2026-05-27 | עובד |

---

### 📋 Contract Engine (M1 + M2)
| פיצ'ר | סטטוס | בדיקה אחרונה | הערות |
|--------|--------|--------------|-------|
| Contract Upload + Gemini OCR (M1) | 🟡 | — | `/api/contracts/upload` קיים, לא נבדק E2E |
| State Machine v3 (M2) | 🟡 | — | UPLOAD→PENDING_SIGN→ACTIVE→EXPIRING→ENDED |
| חתימה על חוזה | 🟡 | — | `/api/contracts/:id/sign` קיים |
| Validation Gate (KYC + שדות) | 🟡 | — | SM-006/007 לא נבדק |
| "אמת בעלות" לשוכר | 🟡 | — | OV-001/002 לא נבדק |

---

### 🔍 KYC (M6)
| פיצ'ר | סטטוס | בדיקה אחרונה | הערות |
|--------|--------|--------------|-------|
| KYC initiation (Persona) | ✅ | — | KYC-001/002 קיים |
| HMAC-SHA256 webhook | 🟡 | — | עודכן, לא אומת ב-production |
| APPROVED → unlock contracts | ✅ | — | KYC-004 קיים |
| REJECTED — הנחיות ספציפיות | 🟡 | — | KYC-005/006 חדש |
| TIMEOUT 24h → push+email | 🟡 | — | KYC-007 חדש |
| מחיקת תמונות אחרי 7 ימים | 🟡 | — | KYC-009 חדש |

---

### 👤 Guarantor (M7)
| פיצ'ר | סטטוס | בדיקה אחרונה | הערות |
|--------|--------|--------------|-------|
| Guarantor web link (5 ימים) | 🟡 | — | GUA-001 חדש |
| Persona Web SDK | 🟡 | — | GUA-001 חדש |
| Decline → הודעה למשכיר | 🟡 | — | GUA-003 חדש |
| Reminder 24h לפני פקיעה | 🟡 | — | GUA-004 חדש |

---

### 🏡 Check-In / Check-Out (M3 + M4)
| פיצ'ר | סטטוס | בדיקה אחרונה | הערות |
|--------|--------|--------------|-------|
| Check-In תמונות לפי חדרים (M3) | 🟡 | — | CI-001→004 חדש |
| אישור משכיר → הצהרה (M3) | 🟡 | — | CI-002 חדש |
| Check-Out תמונות + הערות (M4) | 🟡 | — | CO-001→004 חדש |
| סבבי תיקון (3 סבבים → Auto-Confirm) | 🟡 | — | CO-003 חדש |
| R2 bucket נכון לתמונות | 🟡 | — | STR-003 חדש |

---

### 💰 Ledger + Payments (M5)
| פיצ'ר | סטטוס | בדיקה אחרונה | הערות |
|--------|--------|--------------|-------|
| יצירת שורות לדגר אוטומטית | 🟡 | — | LED-001/002 חדש |
| שוכר מדווח "שילמתי" | 🟡 | — | PAY-001 חדש |
| משכיר מאשר → PAID | 🟡 | — | PAY-003 חדש |
| Auto-Confirm 48h ללא תגובה | 🟡 | — | PAY-005 חדש |
| OVERDUE → התראה לאדמין | 🟡 | — | ALT-004 חדש |

---

### 🔔 Notifications (M8)
| פיצ'ר | סטטוס | בדיקה אחרונה | הערות |
|--------|--------|--------------|-------|
| Expo Push token registration | ✅ | — | NOT-001 קיים |
| Push ללא קשר לתפקיד פעיל | 🟡 | — | NOT-002 חדש |
| Resend Email — הזמנת ערב | 🟡 | — | NOT-003 חדש |
| Resend Email — reminder 24h | 🟡 | — | NOT-004 חדש |

---

### 💾 Storage R2 (M9)
| פיצ'ר | סטטוס | בדיקה אחרונה | הערות |
|--------|--------|--------------|-------|
| Property images → R2 | ✅ | 2026-05-27 | STR-001 עודכן — פועל |
| Contract PDF → R2 private | 🟡 | — | STR-002 חדש |
| Check-In photos → R2 checkin bucket | 🟡 | — | STR-003 חדש |
| Auto-delete archive 3 שנים | 🟡 | — | STR-004 חדש |
| KYC images → נמחקות 7 ימים | 🟡 | — | STR-005 חדש |

---

### 🔧 Maintenance (M15)
| פיצ'ר | סטטוס | בדיקה אחרונה | הערות |
|--------|--------|--------------|-------|
| שוכר פותח תקלה | 🟡 | — | MNT-001 חדש |
| משכיר "אני מטפל" | 🟡 | — | MNT-002 חדש |
| deep link → midrag.co.il | 🟡 | — | MNT-003 חדש |
| חשבונית → R2 | 🟡 | — | MNT-004 חדש |
| 24h ללא מענה → התראה | 🟡 | — | MNT-005 חדש |

---

### ⏰ Alerts + Cron (M13 + M16)
| פיצ'ר | סטטוס | בדיקה אחרונה | הערות |
|--------|--------|--------------|-------|
| EXPIRING 120/90/60/45/30 ימים | 🟡 | — | Cron ממוזג, לא נבדק |
| Contract Renewal (M14) | 🟡 | — | RN-001→004 חדש |
| CPI Cron שנתי | 🟡 | — | חדש |

---

### 🛡️ Admin Panel (M10)
| פיצ'ר | סטטוס | בדיקה אחרונה | הערות |
|--------|--------|--------------|-------|
| Admin login (`role=admin`) | 🔴 | 2026-05-28 | הרשאות admin קיימות, אבל admin accounts צריך password sync |
| שינוי config | 🟡 | — | ADM-002 חדש |
| ביטול נעילת משתמש | 🟡 | — | ADM-003 חדש |
| Override KYC status | 🟡 | — | ADM-004 חדש |

---

## 🆕 Next Features — לא התחיל

| פיצ'ר | תלויות | אחריות | סטטוס |
|--------|---------|---------|--------|
| **NF1 — Trust Score** | M5 ✅ קוד + M6 ✅ קוד | TBD | ❌ לא התחיל |
| **NF2 — Renter Journal** | M1+M3+M4+M8+M9 | TBD | ❌ לא התחיל |
| V2-1 — Stripe Connect | M5 | TBD | ❌ לא התחיל |
| V2-3 — Contract Amendment | M2 | TBD | ❌ לא התחיל |

---

## 🔴 Bugs פתוחים (בעדיפות)

| # | תיאור | גורם | מצב |
|---|--------|------|-----|
| BUG-001 | `admin@dirapp.com` + `admin1@dirapp.com` לא נכנסים | password hash לא מסונכרן ב-DB | 🟡 Fix בקוד `ed0e874`, ממתין לרידיפלוי Render |
| BUG-002 | אישור ליד לא עובד מה-UI | לא ידוע — API קיים, בעיית frontend? | 🔴 פתוח — צריך בדיקה |
| BUG-003 | Admin panel endpoints — לא נבדקו | טסטים "חדש" | 🔴 פתוח |

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
| 2026-05-28 | 1.0 | יצירת מסמך מאפס — מצב אמיתי לפי Test Matrix + בדיקת ייצור | Claude Code |
| 2026-05-27 | — | Merge cursor/financial-admin + wind/identity-platform → main | Claude Code |
| 2026-05-27 | — | Fix 503: v3 columns at boot (`2ab7347`) | Claude Code |
| 2026-05-27 | — | Fix ENUM→STRING for activeRole (`7ea9f1a`) | Claude Code |
| 2026-05-27 | — | Fix tosAcceptedAt + HMAC/mobile (`294c834`) | Antigravity |
| 2026-05-28 | — | Fix admin password sync (`ed0e874`) | Claude Code |
