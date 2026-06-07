# -*- coding: utf-8 -*-
import sys
sys.stdout.reconfigure(encoding='utf-8')

content = """# DirApp — Technical Architecture
> **גרסה:** 3.2
> **עדכון אחרון:** 2026-06-02 (לאחר Code Audit)
> **מנהל:** Claude Code (CTO / Orchestrator)
> **גרסה זו מתארת את הקוד האמיתי בייצור — לא את המפרט המקורי**

---

## 1. Stack טכנולוגי

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Runtime** | Node.js | 20 LTS | Backend execution |
| **Framework** | Express.js | 4.22.2 | REST API |
| **Database — Primary** | PostgreSQL | 15+ | Structured data (Supabase) |
| **Database — Chat** | MongoDB | 7.x | Real-time messaging (Atlas) |
| **Cache** | Redis | 7.x | Session + feed cache (Upstash) |
| **Storage** | Cloudflare R2 | — | Files: images, contracts, receipts |
| **Mobile** | React Native + Expo | 51.x | iOS + Android |
| **Web (Guarantor)** | React | 18.x | Guarantor web flow |
| **Web (Admin)** | React | 18.x | Admin GODMODE panel |
| **WebSocket** | Socket.io | 4.x | Real-time chat |
| **AI / OCR** | Google Gemini | 1.5 Flash | Contract extraction, NLP, marketing copy |
| **KYC** | Persona | — | Identity verification |
| **Email** | Resend | — | Transactional emails (<3K/month free) |
| **Push** | Expo Push | — | Mobile notifications |
| **WhatsApp** | Meta Cloud API | — | Conversational notifications |
| **Backend Host** | Render | — | Auto-deploy from main |
| **Web Host** | Vercel | — | Guarantor + Admin SPA |
| **Mobile Deploy** | Expo EAS | — | App store distribution |
| **ORM (PG)** | Sequelize | 6.x | PostgreSQL models (UUID PKs) |
| **ORM (Mongo)** | Mongoose | 8.x | MongoDB models |

---

## 2. מבנה Backend (קוד אמיתי)

```
backend/
├── src/
│   ├── config/
│   │   ├── database.js          ← PostgreSQL (Supabase) + ensureUserVerificationColumns()
│   │   ├── mongodb.js           ← MongoDB (Atlas) connection
│   │   ├── redis.js             ← Redis (Upstash)
│   │   ├── r2.js                ← Cloudflare R2 SDK (שם אמיתי: r2.js)
│   │   ├── resend.js            ← Resend SMTP client
│   │   ├── socket.js            ← Socket.io server config (שם אמיתי: socket.js)
│   │   ├── corsOrigins.js       ← CORS whitelist
│   │   ├── security.js          ← Security helpers
│   │   └── kafka.js             ← Kafka config (קיים, לא במפרט המקורי)
│   │   gemini.js + persona.js אינם קבצים נפרדים —
│   │   מוגדרים inline בתוך geminiService.js ו-kycServiceV3.js
│   │
│   ├── models/
│   │   ├── index.js             ← Central export + כל ה-associations
│   │   ├── pg/                  ← Sequelize models (PostgreSQL, UUID PKs)
│   │   │   ├── User.js                    ← registered in index.js
│   │   │   ├── Apartment.js               ← registered
│   │   │   ├── Swipe.js                   ← registered
│   │   │   ├── Match.js                   ← registered
│   │   │   ├── AuditLog.js                ← registered
│   │   │   ├── UserKycProfile.js          ← registered (מכיל kyc_status, לא User!)
│   │   │   ├── RentalAgreement.js         ← registered (שם אמיתי, לא Agreement.js)
│   │   │   ├── AgreementParty.js          ← registered
│   │   │   ├── AgreementRoom.js           ← registered
│   │   │   ├── AgreementGuarantor.js      ← registered
│   │   │   ├── LedgerRow.js               ← registered
│   │   │   ├── OwnershipVerification.js   ← registered
│   │   │   ├── ContractAmendment.js       ← registered
│   │   │   ├── MaintenanceTicket.js       ← registered (PG version)
│   │   │   ├── TicketInvoice.js           ← registered
│   │   │   ├── AppConfig.js               ← registered (52 configurable keys)
│   │   │   ├── WhatsAppMessage.js         ← registered
│   │   │   ├── WhatsAppConversationState.js ← registered
│   │   │   ├── PaymentLedger.js           ← registered (תוקן 2026-06-02)
│   │   │   └── ProtocolEvidence.js        ← registered (תוקן 2026-06-02)
│   │   └── mongo/
│   │       ├── Message.js, UserPreferences.js, SystemEvent.js
│   │       └── [UserPoints, CommercialLease, IoTDevice, ...] — קיימים, לא ב-index
│   │
│   ├── middleware/
│   │   ├── auth.js              ← JWT + role: { authenticate, requireRole, requireVerified }
│   │   ├── errorHandler.js, auditCapture.js, requestContext.js
│   │   ├── requireTos.js, requireKycApproved.js
│   │   ├── authGuard.js, stateLockGuard.js
│   │   ├── geminiRateLimit.js   ← { geminiSearchLimiter, geminiMarketingLimiter }
│   │   └── rateLimit.js         ← { apiLimiter, authLimiter, strictLimiter } (נוצר 2026-06-02)
│   │
│   ├── routes/
│   │   auth.js, apartments.js, swipe.js, matches.js, chat.js
│   │   contracts.js, contractsV3.js, agreements.js, ledger.js, payments.js
│   │   kyc.js, kycV3.js, guarantor.js, verify.js
│   │   maintenance.js, maintenanceV3.js, landlord.js, leads.js, journal.js
│   │   gamification.js, recommendations.js, roommates.js
│   │   admin.js, adminStats.js, adminLogs.js, whatsapp.js
│   │   screening.js, commercial.js, services.js, iot.js
│   │
│   ├── services/
│   │   ├── kycServiceV3.js          ← initiateVerification, handleWebhook, checkAndUnlockContracts
│   │   ├── contractServiceV3.js     ← uploadAndExtract, validateGate, transitionState, renewContract
│   │   ├── ledgerService.js         ← generateLedger (נפרד מ-contractService)
│   │   ├── notificationService.js   ← notify, notifyMany, scheduleReminder (stub)
│   │   ├── pushService.js           ← sendPushNotification (internal)
│   │   ├── resendService.js, emailService.js
│   │   ├── geminiService.js         ← extractContractFields, generateMarketingCopy,
│   │   │                              parseSearchQuery, scoreCompatibility (נוסף 2026-06-02)
│   │   ├── uploadService.js, r2Service.js
│   │   ├── matchingService.js, gamificationService.js, auditLogService.js
│   │   ├── leadScoringService.js, landlordLeadRanking.js, recommendationEngineService.js
│   │   ├── contractUpload.js, systemEventService.js, aiServiceClient.js
│   │   ├── whatsappApiClient.js, whatsappTemplates.js, whatsappRouter.js
│   │   └── whatsappNotificationService.js
│   │
│   ├── cron/
│   │   ledgerDueAlerts.js, ledgerOverdue.js, paymentAutoConfirm.js
│   │   expiringAlerts.js, cpiAdjustment.js, kycRenewal.js
│   │   maintenanceAlerts.js, r2Cleanup.js
│   │
│   └── utils/ + index.js
│
├── tests/ (154 test cases)
└── package.json (Node.js 20 LTS)
```

---

## 3. הערות Schema חשובות

| נושא | מצב אמיתי | בעבר (שגוי במפרט) |
|------|-----------|-------------------|
| PKs | UUID (gen_random_uuid) | SERIAL |
| kyc_status | על UserKycProfile (1:1) | על users |
| שם טבלת חוזה | rental_agreements | agreements |
| שם מודל | RentalAgreement | Agreement |
| ledger service | ledgerService.js | contractService |

---

## 4. Database Schema — PostgreSQL

### users
```sql
id UUID PK, email UNIQUE, phone (nullable), passwordHash,
role (tenant|landlord|admin), activeRole,
trustScore (default 50), blockedCount (default 0), isLocked,
tosAcceptedAt, tosVersion, firstName, lastName, avatarUrl,
isVerified, isPremium, lastActiveAt
```

### user_kyc_profiles (1:1 with users — kyc_status כאן!)
```sql
id UUID PK, userId FK→users,
status (PENDING|PROCESSING|APPROVED|REJECTED|TIMEOUT),
personaInquiryId, idExpiry DATE
```

### rental_agreements (State Machine: 7 states)
```sql
id UUID PK, landlordId FK, apartmentId FK,
status (UPLOAD|PENDING_SIGN|ACTIVE|EXPIRING|PENDING_ACTIVATION|ENDED),
startDate, endDate, monthlyRent, paymentDay (default 1),
cpiEnabled (default false), r2DocKey
```

### ledger_rows
```sql
id UUID PK, agreementId FK,
period (YYYY-MM), dueDate, amount,
status (PENDING|REPORTED|PAID|OVERDUE),
reportedAt, confirmedAt, cpiAdj, notes, receiptR2Key
```

### payment_ledger (נפרד מ-ledger_rows!)
```sql
id UUID PK, agreementId FK, billingPeriod DATE,
baseAmountIls, cpiAdjustmentIls, totalDueIls,
status (PENDING|PAID|OVERDUE), paymentProofUrl, paidAt
```

### protocol_evidence (Check-In/Out photos with GPS)
```sql
id UUID PK, agreementId FK,
protocolType (CHECK_IN|CHECK_OUT),
roomZone, conditionTag (CLEAN|MINOR_WEAR|DAMAGED),
s3ImageKey, imageHash, gpsLatitude, gpsLongitude, capturedAt
```

### agreement_parties, agreement_rooms, contract_amendments,
### ownership_verifications, maintenance_tickets, ticket_invoices,
### agreement_guarantors, app_configs (52 keys),
### whatsapp_messages, whatsapp_conversation_states, audit_logs

---

## 5. Redis Keys

| Key | TTL | שימוש |
|-----|-----|-------|
| `feed:{userId}` | 1 hour | Swipe feed cache |
| `session:{token}` | 24 hours | JWT session |
| `nlp:{queryHash}` | 6 hours | parseSearchQuery cache |
| `kyc:lock:{userId}` | 10 minutes | KYC double-submit prevention |
| `push:token:{userId}` | — | Expo Push token |

---

## 6. Cloudflare R2 Buckets

| Bucket | גישה | Lifecycle |
|--------|------|-----------|
| property-images | public-read | Forever |
| contract-docs | private | Contract term |
| checkin-photos | private | Contract + 3 years |
| payment-receipts | private | Contract + 3 years |
| archive | private | 3 years → auto-delete |
| kyc-temp | private | 7 days → auto-delete (Tiquon 13) |

---

## 7. geminiService.js — API אמיתי

```javascript
extractContractFields(fileBuffer)
  // Output: { landlordName, landlordId, tenantName, tenantId,
  //            address, startDate, endDate, monthlyRent,
  //            paymentDay, cpiLinked, missingFields[], warnings[] }
  // Fallback: mock data if GEMINI_API_KEY missing

generateMarketingCopy(apartment, style)
  // style: 'professional' | 'friendly' | 'luxury'
  // Returns null on failure

generateListingSummary(apartment)
  // Alias for generateMarketingCopy(apartment, 'professional')

parseSearchQuery(query)  // שם אמיתי — לא parseNLPSearch!
  // Hybrid Gemini + heuristic, 21 Israeli cities
  // Output: { city?, minRooms?, maxPrice?, amenities[]?, petsAllowed? }

scoreCompatibility(tenant, apartment)  // נוסף 2026-06-02
  // Score 0-100. Gemini + heuristic fallback (price/rooms/pets)
```

---

## 8. notificationService.js — API אמיתי

```javascript
notify(userId, { title, body, data, emailSubject, emailHtml })
  // Push via Redis push:token:{userId} → Expo
  // Email via Resend (if emailSubject+emailHtml present)
  // Best-effort — שניהם ב-try/catch נפרד

notifyMany(userIds, payload)
  // Promise.allSettled on all userIds

scheduleReminder(userId, timestamp, payload)  // נוסף 2026-06-02
  // stub — TODO: persist to scheduled_notifications table
```

---

## 9. rateLimit.js — API אמיתי (נוצר 2026-06-02)

```javascript
const { apiLimiter, authLimiter, strictLimiter } = require('../middleware/rateLimit');

// apiLimiter    — 100 req / 15 min per user/IP  (env: RATE_LIMIT_MAX)
// authLimiter   — 10 req / 15 min per IP        (env: AUTH_RATE_LIMIT_MAX)
// strictLimiter — 30 req / min per user/IP      (env: STRICT_RATE_LIMIT_MAX)

// כל ה-limiters מדולגים (skip: true) ב-NODE_ENV=test
```

---

## 10. Cron Jobs (8)

| Job | Schedule | פעולה |
|-----|----------|-------|
| ledgerDueAlerts | Daily 08:00 | T-5 reminder Push+Email+WhatsApp |
| ledgerOverdue | Daily 23:59 | Mark OVERDUE, T+0 to T+5 escalation |
| paymentAutoConfirm | Hourly | 48h auto-confirm REPORTED→PAID |
| expiringAlerts | Daily 09:00 | 120/90/60/45/30d contract expiring |
| cpiAdjustment | Jan 1 annually | CPI recalculation |
| kycRenewal | Daily | 5-year KYC expiry alerts |
| maintenanceAlerts | Hourly | 24h + 3d ticket escalation |
| r2Cleanup | Monthly | Archive bucket 3-year auto-delete |

---

## 11. Security

| Layer | מנגנון |
|-------|--------|
| Auth | JWT 24h, role in payload |
| RBAC | tenant / landlord / admin / guarantor |
| Webhooks | HMAC-SHA256 (Persona + WhatsApp) |
| API Rate | rateLimit.js: 100/15min general, 10/15min auth |
| Gemini Rate | geminiRateLimit.js: 60/15min search, 40/15min marketing |
| File upload | resolveUploadFilePath + safeUnlinkUpload |
| Storage | Presigned URLs max 5 min |
| Data min. | KYC 7-day delete (Tiquon 13) |
| Audit | auditCapture.js middleware + AuditLog model |

---

## 12. Deploy & Conventions

```
git push main → Render auto-deploy (~3 min)
Health: GET /health → 200
Backend: https://apartment-backend-v24y.onrender.com
Web: https://apartment-olive.vercel.app
```

**Worktrees:**
| Agent | Path | Branch |
|-------|------|--------|
| Claude Code | C:\\apartmentapp | main |
| Cursor | C:\\apartmentapp-cursor | cursor/financial-admin |
| Antigravity | C:\\apartmentapp-windsurf | wind/* |

**Conventions:**
- Endpoints חדשים: `/api/v3/` prefix
- Auth: `const { authenticate, requireRole } = require('../middleware/auth')`
- Schema changes: עדכן `ensureUserVerificationColumns()` ב-`database.js`
- Branch: `fix/<desc>` | `feat/<desc>`
- Merge לmain: רק Claude Code

---

## 13. TODOs מ-Code Audit 2026-06-02

| # | מה | עדיפות | סטטוס |
|---|-----|--------|-------|
| 1 | PaymentLedger + ProtocolEvidence ב-index.js | P1 | ✅ תוקן |
| 2 | rateLimit.js כללי | P1 | ✅ תוקן |
| 3 | geminiService.scoreCompatibility | P2 | ✅ תוקן |
| 4 | notificationService.scheduleReminder | P2 | ✅ stub נוסף |
| 5 | scheduleReminder — DB persistence (scheduled_notifications) | P2 | 🔜 הבא |
| 6 | gemini.js config file נפרד | P3 | 🔜 עתידי |
| 7 | persona.js config file נפרד | P3 | 🔜 עתידי |
| 8 | MaintenanceTicket כפול (PG + Mongo) — לברר ולנקות | P2 | 🔜 הבא |

---

## 14. Environment Variables

```bash
# Database
DATABASE_URL=postgresql://...
MONGODB_URI=mongodb+srv://...
REDIS_URL=redis://...

# Storage
R2_ACCOUNT_ID=..., R2_ACCESS_KEY_ID=..., R2_SECRET_ACCESS_KEY=...
R2_BUCKET_PROPERTY_IMAGES=property-images
R2_BUCKET_CONTRACT_DOCS=contract-docs
R2_BUCKET_CHECKIN_PHOTOS=checkin-photos
R2_BUCKET_PAYMENT_RECEIPTS=payment-receipts
R2_BUCKET_ARCHIVE=archive

# AI
GEMINI_API_KEY=..., GEMINI_MODEL=gemini-flash-latest

# KYC
PERSONA_API_KEY=..., PERSONA_WEBHOOK_SECRET=...

# Email / Push / WhatsApp
RESEND_API_KEY=...
WHATSAPP_API_TOKEN=..., WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_VERIFY_TOKEN=..., WHATSAPP_APP_SECRET=...

# App
JWT_SECRET=..., NODE_ENV=production, PORT=10000

# Rate limits (optional overrides)
RATE_LIMIT_MAX=100, AUTH_RATE_LIMIT_MAX=10, STRICT_RATE_LIMIT_MAX=30
```
"""

with open('C:/apartmentapp/ARCHITECTURE.md', 'w', encoding='utf-8') as f:
    f.write(content)

print(f'Done. Lines: {content.count(chr(10))}')
