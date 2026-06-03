# DirApp — Product Roadmap (Full)
> **עדכון אחרון:** 2026-06-02  
> **גרסה:** 3.1  
> **מנהל:** Claude Code (CTO / Orchestrator)

---

## מקרא סטטוס

| סמל | משמעות |
|-----|---------|
| ✅ | פועל ואומת בייצור |
| 🟡 | קוד קיים, לא אומת E2E |
| 🔵 | בפיתוח עכשיו |
| ❌ | לא התחיל |
| ⛔ | חסום — תלוי בדבר אחר |

---

## Phase 1 — MVP Core (v3.0) ✅ הושלם

כל ה-Milestones של ה-MVP הושלמו ואומתו בייצור נכון ל-2026-06-01.

### M1 — Auth & Onboarding ✅
| פיצ'ר | סטטוס | הערות |
|--------|--------|-------|
| Register / Login / JWT (24h) | ✅ | Role: tenant/landlord/admin |
| Email verification (Resend) | ✅ | — |
| Password reset | ✅ | — |
| Switch Role (tenant ↔ landlord) | ✅ | activeRole field, UI button |
| Terms of Service (ToS) acceptance | ✅ | tosAcceptedAt שמור ב-DB |
| Multi-tenant — מנהל בית (M12) | ✅ | תמיכה מלאה בתפקידי מנהל/משתמשים |

### M2 — Property Listing & Discovery ✅
| פיצ'ר | סטטוס | הערות |
|--------|--------|-------|
| Property upload (images → R2) | ✅ | עד 10 תמונות, 2MB each, public-read |
| Apartments feed (Redis cache 1h) | ✅ | 10 דירות בכל swipe session |
| Property details page | ✅ | כולל True Monthly Cost (שכירות + ארנונה + ועד בית) |
| Multi-room support | ✅ | kitchen/salon/bathroom/shower/custom |
| GenAI Marketing Copy | ✅ | Gemini 1.5 Flash, 3 סגנונות |

### M3 — Swipe & Matching Engine ✅
| פיצ'ר | סטטוס | הערות |
|--------|--------|-------|
| Swipe right/left/superlike | ✅ | Daily quota + dwell-time signal |
| Match creation | ✅ | כשהמשכיר מאשר |
| Landlord accepts/declines match | ✅ | BUG-003 CLOSED |
| Compatibility scoring (Gemini) | ✅ | Lifestyle questionnaire (8 dimensions) |
| Smart Map + Urban Renewal Layer | ✅ | Leaflet WebView, TAMA 38 GeoJSON |
| AI Lead Qualification | ✅ | lead_scoring, landlord leads endpoint |

### M4 — Real-Time Chat ✅
| פיצ'ר | סטטוס | הערות |
|--------|--------|-------|
| Chat (Socket.io + MongoDB) | ✅ | Backend עובד |
| Chat navigation (frontend) | ✅ | BUG-008 CLOSED |
| Message pagination (50/page) | ✅ | — |
| Chat archival (not deletion) | ✅ | — |
| Block user | ✅ | — |

### M5 — KYC (Know Your Customer) ✅
| פיצ'ר | סטטוס | הערות |
|--------|--------|-------|
| Persona Web SDK integration | ✅ | KYC-001/002 קיים, מחובר ל-UI |
| HMAC-SHA256 webhook validation | ✅ | אומת E2E |
| APPROVED → unlock contracts | ✅ | KYC-004 קיים |
| REJECTED → הנחיות ספציפיות | ✅ | Badge אדום + הנחיות אינטראקטיביות |
| TIMEOUT (24h) → push + email | ✅ | Cron timeout עובד |
| KYC image auto-delete (7 days) | ✅ | R2/cron cleanup |
| Admin KYC override | ✅ | GODMODE — ניתן לעקוף Persona |
| KYC renewal alert (5 שנים) | ✅ | Cron יומי |

### M6 — Digital Contract Lifecycle ✅
| פיצ'ר | סטטוס | הערות |
|--------|--------|-------|
| Contract upload (PDF/DOCX) + Gemini OCR | ✅ | max 10MB, Gemini 1.5 Flash |
| State Machine (7 states) | ✅ | UPLOAD→PENDING_SIGN→ACTIVE→EXPIRING→ENDED |
| Digital signature (tenant/landlord) | ✅ | StateLockGuard pattern |
| Validation gate (KYC + fields) | ✅ | חסימה ללא KYC approved |
| Ownership verification (tenant) | ✅ | VerifyOwnership flow |
| Contract amendments | ✅ | V2-3 — propose/approve/reject routes |
| Contract renewal | ✅ | חוזה חדש מבוסס קודם + ledger חדש |

### M7 — Guarantor Web Flow ✅
| פיצ'ר | סטטוס | הערות |
|--------|--------|-------|
| Guarantor web link (5 ימים TTL) | ✅ | קישור ייעודי עם פקיעת תוקף |
| Persona Web SDK (guarantor KYC) | ✅ | שילוב מלא ב-guarantor web view |
| Digital signature on guarantee doc | ✅ | — |
| Decline → הודעה למשכיר | ✅ | Email + Push |
| Auto-reminder 24h לפני פקיעה | ✅ | Cron |
| Re-invite mechanism | ✅ | — |

### M8 — Check-In & Room Inventory ✅
| פיצ'ר | סטטוס | הערות |
|--------|--------|-------|
| Check-In תמונות לפי חדרים | ✅ | עד 20 תמונות/חדר → R2 checkin bucket |
| אישור משכיר + הצהרה משותפת | ✅ | — |
| סבבי תיקון (3 rounds max) | ✅ | Auto-Confirm אחרי 3 סבבים |
| נעילת תמונות post-approval | ✅ | Immutable evidence |
| Check-In window (5 ימים configurable) | ✅ | Admin config: check_in_window_days |

### M9 — Check-Out & Damage Assessment ✅
| פיצ'ר | סטטוס | הערות |
|--------|--------|-------|
| Check-Out תמונות + הערות | ✅ | אותה מבנה כמו Check-In |
| סבבי תיקון (3 rounds) | ✅ | Auto-Confirm לאחר 3 סבבים |
| השוואה Check-In vs Check-Out | ✅ | — |
| R2 bucket (contract term + 3 years) | ✅ | — |

### M10 — Admin Panel & GODMODE ✅
| פיצ'ר | סטטוס | הערות |
|--------|--------|-------|
| Admin login (role=admin) | ✅ | JWT ADMIN role gating |
| Config Panel (52 keys, 9 sections) | ✅ | GET/PUT /api/v3/admin/config |
| User Management (edit, cascading delete) | ✅ | Paginated, kycProfile include |
| Stats Dashboard (8 sections, 56 metrics) | ✅ | users/listings/payments/contracts/interactions/maintenance/engagement/security |
| Override KYC status | ✅ | — |
| Contract state override | ✅ | Force state transition |
| Manual notification sending | ✅ | — |

### M11 — Digital Ledger & Payments ✅
| פיצ'ר | סטטוס | הערות |
|--------|--------|-------|
| יצירת שורות לדגר אוטומטית | ✅ | start_date → end_date, שורה/חודש |
| שוכר מדווח "שילמתי" | ✅ | Report + receipt upload |
| משכיר מאשר → PAID | ✅ | — |
| Auto-Confirm 48h (configurable) | ✅ | payment_autoconfirm_hours |
| OVERDUE → התראה לאדמין | ✅ | T+0 to T+5 escalation |
| Receipt upload → R2 | ✅ | payment-receipts bucket |
| CPI שנתי (Jan 1) | ✅ | cpi_enabled flag per contract |

### M12 — Maintenance & Service Tickets ✅
| פיצ'ר | סטטוס | הערות |
|--------|--------|-------|
| שוכר פותח תקלה + תמונה | ✅ | — |
| משכיר מסמן "אני מטפל" | ✅ | — |
| Deep link → midrag.co.il | ✅ | — |
| חשבונית → R2 | ✅ | ticket_invoices + R2 |
| 24h ללא מענה → התראה | ✅ | Cron hourly |
| 3 ימים ללא סגירה → escalation | ✅ | Cron |

### M13 — Notifications ✅
| פיצ'ר | סטטוס | הערות |
|--------|--------|-------|
| Expo Push (token registration) | ✅ | NOT-001 קיים |
| Push ללא קשר לתפקיד פעיל | ✅ | שליחה לכל התפקידים |
| Resend Email — הזמנת ערב | ✅ | HTML template Hebrew |
| Resend Email — reminder 24h | ✅ | Cron-driven |
| Contract EXPIRING (120/90/60/45/30 days) | ✅ | — |

### M14 — Storage & R2 Integration ✅
| פיצ'ר | סטטוס | הערות |
|--------|--------|-------|
| Property images → R2 (public-read) | ✅ | Forever TTL, Cloudinary replaced |
| Contract PDF → R2 private | ✅ | Contract term TTL |
| Check-In/Out photos → R2 | ✅ | Contract term + 3 years |
| Payment receipts → R2 | ✅ | Contract term + 3 years |
| Archive auto-delete (3 שנים) | ✅ | Monthly cron |
| KYC images → נמחקות 7 ימים | ✅ | — |
| Presigned URLs (5 min max) | ✅ | — |

### M15 — Security, Compliance & Audit ✅
| פיצ'ר | סטטוס | הערות |
|--------|--------|-------|
| JWT auth (24h + refresh) | ✅ | — |
| Role-based access control | ✅ | tenant/landlord/admin/guarantor |
| HMAC-SHA256 webhooks | ✅ | Persona + WhatsApp |
| Rate limiting (10 req/min per IP) | ✅ | — |
| Audit trail (state changes) | ✅ | auditCapture middleware |
| Data minimization (Tiquon 13) | ✅ | KYC 7-day deletion |
| Path traversal hardening | ✅ | resolveUploadFilePath / safeUnlinkUpload |
| Dependency security | ✅ | Express 4.22.2, ws 8.20.1 |

---

## Phase 1 Cross-Cutting Features ✅

### Design System & UX
| פיצ'ר | סטטוס | הערות |
|--------|--------|-------|
| DirApp Design System (Figma tokens) | ✅ | dirAppTokens.ts, textStyles.ts, ResponsiveContainer |
| Dark Mode | ✅ | ThemeContext, useColors(), 12 screens |
| SwipeScreen (enlarged buttons, match modal) | ✅ | — |
| ApartmentDetailScreen (carousel 380px, luxury badge, sticky CTA) | ✅ | — |
| OnboardingScreen (DirApp logo, progress pills) | ✅ | — |

### Trust & Gamification
| פיצ'ר | סטטוס | הערות |
|--------|--------|-------|
| Trust Score (starts at 50, scale 0-100) | ✅ | NF1 — /api/gamification/me |
| Points award system | ✅ | /api/gamification/award |
| Leaderboard | ✅ | /api/gamification/leaderboard |
| Renter Journal | ✅ | NF2 — /api/tenant/journal (contract+ledger+checkin+maintenance+checkout) |

---

## Phase 2 — WhatsApp Integration ✅ הושלם (2026-06-01)

| פיצ'ר | סטטוס | הערות |
|--------|--------|-------|
| Meta Cloud API client | ✅ | sendTemplate/sendText/sendInteractive/markAsRead/downloadMedia |
| Webhook verify + receive (HMAC) | ✅ | GET verify + POST inbound |
| 8 Hebrew templates | ✅ | payment (3), maintenance (3), invite, renewal |
| Conversational state machine | ✅ | idle→payment_confirm / maintenance_description→image flows |
| Notification service (public API) | ✅ | whatsappNotificationService.js — 8 methods |
| Cron → WA: payment 3d/today/overdue | ✅ | ledgerDueAlerts.js + ledgerOverdue.js upgraded |
| Cron → WA: contract renewal 60d | ✅ | expiringAlerts.js upgraded |
| Payment confirm via WhatsApp | ✅ | Tenant confirms → LedgerRow REPORTED |
| Maintenance ticket via WhatsApp | ✅ | Description + photo → ticket + R2 |
| Sequelize models | ✅ | WhatsAppMessage.js + WhatsAppConversationState.js |
| Tests | ✅ | 13/13 passing |

> ⚠️ **דרוש:** Meta Business setup — register templates, set env vars:
> `WHATSAPP_API_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET`

---

## Phase 3 — V2 Extensions (הבא בתור)

### V2-1 — Payment Gateway (Stripe Connect) ❌
| פיצ'ר | סטטוס | תלויות | אחריות |
|--------|--------|---------|---------|
| Stripe Connect integration | ❌ | V2-3 ✅ | Cursor |
| Automated ACH/Bank Transfer | ❌ | V2-1 | Cursor |
| Payment method storage (tokenized) | ❌ | V2-1 | Cursor |
| Webhook → auto-ledger update | ❌ | V2-1 | Cursor |
| Reconciliation (bank tx ↔ ledger) | ❌ | V2-1 | Cursor |
| Refunds & chargebacks | ❌ | V2-1 | Cursor |

**טבלאות חדשות נדרשות:**
- `payment_methods` (user_id, stripe_customer_id, last_4, created_at)
- `payment_gateway_transactions` (ledger_id, stripe_id, status, amount, created_at)

**הערה:** דורש רישיון ממשרד האוצר לעיבוד תשלומים. MVP — manual only.

---

### V2-2 — Tenant Guarantor Claims ❌
| פיצ'ר | סטטוס | תלויות | אחריות |
|--------|--------|---------|---------|
| Claim filing (landlord vs guarantor) | ❌ | M7 ✅ | Cursor |
| Guarantor response (accept/dispute) | ❌ | V2-2 | Cursor |
| Admin mediation workflow | ❌ | V2-2 | Cursor |
| Payment collection workflow | ❌ | V2-2 | Cursor |

**טבלאות חדשות:**
- `warranty_claims` (id, agreement_id, guarantor_id, amount, status, created_at)

---

### V2-3 — Contract Amendment Workflow ✅ הושלם
- propose/approve/reject routes — קיים
- GET /api/v3/contracts/:id כולל amendments — קיים
- אומת E2E 2026-06-01

---

### V2-4 — Advanced NLP Search 🟡
| פיצ'ר | סטטוס | הערות |
|--------|--------|-------|
| Natural language search | 🟡 | parseNLPSearch קיים ב-geminiService |
| Relevance ranking | 🟡 | — |
| Redis cache for NLP queries (6h) | 🟡 | nlp:{queryHash} pattern |

---

### V2-5 — Tenant Credit Scoring 🟡
| פיצ'ר | סטטוס | הערות |
|--------|--------|-------|
| Trust Score field | ✅ | users.trustScore = 50 default |
| Auto-calc post-checkout | 🟡 | Field קיים, workflow חסר |
| Landlord visibility | 🟡 | — |
| Appeal process | ❌ | — |

---

### V2-6 — Advanced Matching Intelligence 🟡
| פיצ'ר | סטטוס | הערות |
|--------|--------|-------|
| Lifestyle questionnaire (8 dimensions) | ✅ | F8 — קיים |
| Gemini compatibility scoring | ✅ | scoreCompatibility קיים |
| Smart feed ranking | 🟡 | — |
| ML-based ranking improvements | ❌ | — |

---

### V2-7 — GDPR Compliance & Data Governance ❌
| פיצ'ר | סטטוס | תלויות | אחריות |
|--------|--------|---------|---------|
| Data export (JSON) | ❌ | — | Claude Code |
| Right to deletion | ❌ | — | Claude Code |
| Notification opt-out | ❌ | — | Claude Code |
| Audit log retention (7 years) | ❌ | — | Cursor |
| DPA templates | ❌ | — | Legal |

**טבלאות חדשות:**
- `notification_preferences` (user_id, email_alerts, push_alerts, maintenance_alerts, payment_alerts)
- `deletion_requests` (user_id, requested_at, scheduled_for, status)

---

### V2-8 — Dispute Resolution ❌
| פיצ'ר | סטטוס | תלויות | אחריות |
|--------|--------|---------|---------|
| Formal dispute escalation | ❌ | — | Cursor |
| Admin mediation (SLA 48h) | ❌ | — | Cursor |
| Evidence presentation | ❌ | — | Cursor |

**הערה:** Explicitly excluded from MVP. DirApp neutral.

---

## Phase 4 — Enterprise V3.0 (Future)

### EV3-1 — Multi-Company / Multi-Tenant Platform ❌
| פיצ'ר | סטטוס | הערות |
|--------|--------|-------|
| Company tier | ❌ | companies table |
| Building groups | ❌ | buildings table |
| Property Manager role | ❌ | role_assignments table |
| Hierarchical permissions | ❌ | company→property_manager→building |
| Financial isolation per company | ❌ | — |

**טבלאות חדשות:**
- `companies` (id, name, tax_id, owner_user_id, created_at)
- `buildings` (id, company_id, name, address, units_count, created_at)
- `role_assignments` (user_id, company_id, role, created_at)
- properties מורחב עם `building_id`, `company_id`

---

### EV3-2 — SLA & Service Level Agreements ❌
| פיצ'ר | סטטוס | הערות |
|--------|--------|-------|
| SLA definition per landlord | ❌ | — |
| Auto-tracking (maintenance alerts) | ❌ | — |
| SLA breach notifications | ❌ | — |
| SLA performance dashboard | ❌ | — |

---

### EV3-3 — Insurance Integration ❌
| פיצ'ר | סטטוס | הערות |
|--------|--------|-------|
| Landlord insurance verification | ❌ | — |
| Damage claim → insurance | ❌ | — |
| Premium calculation | ❌ | — |

**הערה:** תלוי בשותפויות עם חברות ביטוח.

---

### EV3-4 — TI-1525 Compliance (Israeli Regulation) ❌
| פיצ'ר | סטטוס | הערות |
|--------|--------|-------|
| Mandatory clause enforcement | ❌ | — |
| Non-compliant terms flagging | ❌ | — |
| Contract template validation | ❌ | — |
| Legal review workflow | ❌ | — |
| Compliance attestation | ❌ | — |

**טבלאות חדשות:**
- `compliance_flags` (contract_id, flag_type, severity, resolved_at)
- `compliance_attestations` (contract_id, attested_at, attested_by)

---

### EV3-5 — Field App (Mobile for Property Managers) ❌
| פיצ'ר | סטטוס | הערות |
|--------|--------|-------|
| Separate native app (tablet-optimized) | ❌ | — |
| Property inspection workflow | ❌ | — |
| NFC/QR room tagging | ❌ | — |
| Offline mode (sync on reconnect) | ❌ | — |
| Integration with check-in/out | ❌ | — |

---

### EV3-6 — QR Code Room Labeling ❌
| פיצ'ר | סטטוס | הערות |
|--------|--------|-------|
| QR generation per room | ❌ | — |
| Scan QR → open room form | ❌ | — |
| Auto room_id linking | ❌ | — |

**טבלאות חדשות:**
- `qr_codes` (id, room_id, code_hash, printed_at, scanned_at)

---

### EV3-7 — Bank Reconciliation ❌
| פיצ'ר | סטטוס | הערות |
|--------|--------|-------|
| Bank transaction sync | ❌ | Stripe + Israeli banks |
| Ledger row matching | ❌ | — |
| General ledger export | ❌ | — |
| Tax report generation | ❌ | Israeli tax authority format |

---

### EV3-8 — Vendor Management ❌
| פיצ'ר | סטטוס | הערות |
|--------|--------|-------|
| Vendor registry | ❌ | electricians, plumbers, etc. |
| Vendor performance scoring | ❌ | — |
| Automated quotes | ❌ | maintenance → auto-quote |
| Work order tracking | ❌ | — |

**טבלאות חדשות:**
- `vendors` (id, company_id, type, rating, created_at)
- `work_orders` (id, ticket_id, vendor_id, status, quoted_amount, actual_amount, completed_at)

---

## סיכום מצב

| Phase | פיצ'רים | הושלמו | נשארו |
|-------|---------|---------|-------|
| MVP Core (v3.0) M1-M15 | 15 | **15** ✅ | 0 |
| WhatsApp (Phase 2) | 11 | **11** ✅ | 0 |
| Design & Gamification | 7 | **7** ✅ | 0 |
| V2 Extensions | 8 | 2 | 6 |
| Enterprise V3.0 | 8 | 0 | 8 |

**👉 הפרודקט המיידי הבא: V2-1 Stripe Connect (תלוי: רישיון + Cursor)**

---

## עקרונות עיצוב המוצר

1. **DirApp neutral** — לא מתערב בסכסוכים בין שוכר למשכיר
2. **Privacy-first** — מינימום שמירת מידע (Tiquon 13 compliant)
3. **Mobile-first** — Expo React Native, תמיכה iOS + Android
4. **Hebrew-first** — כל ה-UX בעברית
5. **Manual payments MVP** — Stripe בגרסה V2
6. **Admin configurability** — 52 פרמטרים ניתנים לשינוי ב-real-time ללא deploy
