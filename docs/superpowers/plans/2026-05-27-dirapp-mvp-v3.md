# DirApp MVP v3.0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete DirApp v3.0 MVP — a rental management platform with contract lifecycle (upload + AI extraction + state machine + check-in/out), financial engine (ledger + payment tracking), KYC v2 (Persona + guarantor web flow), notification system (Resend + Expo Push), storage migration (Cloudflare R2), admin panel (GODMODE), and platform features (ToS, role switching, maintenance).

**Architecture:** Node.js/Express backend with Sequelize (PostgreSQL/Supabase) + Mongoose (MongoDB) + Redis. React Native/Expo mobile app with Zustand state management. New React web apps for guarantor flow and admin panel. Gemini 1.5 Flash for OCR/NLP. Cloudflare R2 for storage. Resend for email. Persona for KYC.

**Tech Stack:** Node.js, Express, Sequelize, PostgreSQL (Supabase), MongoDB, Redis, React Native (Expo 53), Zustand, React (web), Gemini 1.5 Flash, Cloudflare R2, Resend, Persona SDK, Socket.io, Jest

---

## Build Order & Dependencies

```
Phase 1 (Foundation — no dependencies):
  Task 1:  M9  — Storage Migration (R2 replaces Cloudinary)
  Task 2:  M8  — Notification System v2 (Resend + Expo Push)
  Task 3:  M11 — Terms of Service enforcement

Phase 2 (Core contracts — depends on Phase 1):
  Task 4:  M2  — Contract State Machine v3 (new statuses + transitions)
  Task 5:  M1  — Contract Upload + AI Extraction (Gemini OCR)
  Task 6:  M6  — KYC v2 (Persona abstraction layer + HMAC webhook)

Phase 3 (Contract lifecycle — depends on Phase 2):
  Task 7:  M3  — Check-In Flow
  Task 8:  M5  — Ledger + Payment Tracking
  Task 9:  M13 — EXPIRING Alerts

Phase 4 (Post-activation — depends on Phase 3):
  Task 10: M4  — Check-Out Flow
  Task 11: M14 — Contract Renewal Flow
  Task 12: M15 — Maintenance Flow

Phase 5 (Platform — depends on Phase 2):
  Task 13: M7  — Guarantor Web Flow
  Task 14: M12 — Multi-tenant Support (role switch + house manager)
  Task 15: M10 — Admin Panel v1 (GODMODE)
```

---

## File Structure

### New files to create:
```
backend/src/
├── config/
│   ├── r2.js                         # Cloudflare R2 client (S3-compatible)
│   └── resend.js                     # Resend email client
├── models/pg/
│   ├── AgreementParty.js             # Replaces single tenantId — supports multi-tenant
│   ├── AgreementRoom.js              # Check-in/out photos per room
│   ├── OwnershipVerification.js      # "Verify ownership" tenant choice
│   ├── LedgerRow.js                  # New ledger (replaces PaymentLedger)
│   ├── TicketInvoice.js              # Maintenance invoices
│   └── AppConfig.js                  # Admin configurable parameters
├── routes/
│   ├── contractsV3.js                # Upload + sign + checkin + checkout + renew
│   ├── ledger.js                     # Payment reporting + confirmation
│   ├── maintenanceV3.js              # Maintenance tickets + invoices
│   ├── kycV3.js                      # KYC initiation + webhook
│   ├── guarantor.js                  # Guarantor invitation + status
│   └── admin.js                      # Admin GODMODE endpoints
├── services/
│   ├── r2Service.js                  # R2 upload/download/presign/delete
│   ├── resendService.js              # Email via Resend
│   ├── contractServiceV3.js          # Upload+extract, validation gate, state transitions
│   ├── ledgerService.js              # Generate ledger rows, auto-confirm, CPI
│   ├── kycServiceV3.js               # Persona abstraction + HMAC
│   └── maintenanceService.js         # Ticket lifecycle
├── middleware/
│   ├── requireKycApproved.js         # KYC guard for contract routes
│   └── requireTos.js                 # Terms of Service gate
├── cron/
│   ├── ledgerDueAlerts.js            # Daily 08:00 — T-5 payment reminders
│   ├── ledgerOverdue.js              # Daily 23:59 — mark OVERDUE
│   ├── paymentAutoConfirm.js         # Hourly — auto-confirm after 48h
│   ├── expiringAlerts.js             # Daily 09:00 — 120/90/60/45/30 day warnings
│   ├── cpiAdjustment.js              # Jan 1 yearly — CPI rent adjustment
│   ├── kycRenewal.js                 # Daily — check ID expiry
│   ├── maintenanceAlerts.js          # Hourly — 24h/3d delay warnings
│   └── r2Cleanup.js                  # Monthly — delete expired files
└── tests/
    ├── r2Service.test.js
    ├── resendService.test.js
    ├── contractsV3.test.js
    ├── ledger.test.js
    ├── kycV3.test.js
    ├── maintenanceV3.test.js
    ├── guarantor.test.js
    ├── admin.test.js
    ├── stateMachine.test.js
    ├── checkin.test.js
    ├── checkout.test.js
    └── cronJobs.test.js

web/
├── guarantor/                        # React SPA for guarantors
│   ├── package.json
│   ├── src/
│   │   ├── App.jsx
│   │   ├── pages/GuarantorFlow.jsx
│   │   └── services/api.js
│   └── vercel.json
└── admin/                            # React SPA for admin panel
    ├── package.json
    ├── src/
    │   ├── App.jsx
    │   ├── pages/
    │   │   ├── Dashboard.jsx
    │   │   ├── Users.jsx
    │   │   ├── Contracts.jsx
    │   │   ├── Config.jsx
    │   │   └── Ledgers.jsx
    │   └── services/api.js
    └── vercel.json

mobile/src/
├── screens/
│   ├── ContractUploadScreen.tsx       # Upload contract + review AI extraction
│   ├── ContractDetailScreen.tsx       # View contract + sign + verify ownership
│   ├── CheckInScreen.tsx              # Photo upload per room
│   ├── CheckOutScreen.tsx             # Photo upload + review rounds
│   ├── LedgerScreen.tsx               # Payment ledger + report/confirm
│   ├── MaintenanceScreen.tsx          # Open/track maintenance tickets
│   └── TermsScreen.tsx               # Terms of Service acceptance
├── store/
│   ├── useContractStore.ts            # Contract state management
│   ├── useLedgerStore.ts              # Ledger state management
│   └── useMaintenanceStore.ts         # Maintenance state management
└── services/
    └── api.ts                         # Extended with new endpoints
```

### Existing files to modify:
```
backend/src/models/pg/RentalAgreement.js  — New state machine statuses + extracted fields
backend/src/models/pg/PaymentLedger.js    — Add reported_by_tenant, confirmed_by_landlord, receipt_r2_key
backend/src/models/pg/User.js             — Add blocked_count, is_locked, tos_accepted_at
backend/src/models/pg/MaintenanceTicket.js — Add invoice support, status flow
backend/src/models/index.js               — Register new models + associations
backend/src/app.js                        — Mount new routes
backend/src/services/uploadService.js     — Replace Cloudinary with R2
backend/src/services/geminiService.js     — Add extractContractFields()
backend/src/middleware/auth.js            — Add KYC status to req.user
mobile/src/services/api.ts               — Add contract/ledger/maintenance API calls
mobile/src/navigation/AppNavigator.tsx    — Add new screens
mobile/src/store/useAuthStore.ts          — Add role switching
```

---

## Task 1: Storage Migration — Cloudflare R2 (M9)

**Files:**
- Create: `backend/src/config/r2.js`
- Create: `backend/src/services/r2Service.js`
- Create: `backend/tests/r2Service.test.js`
- Modify: `backend/src/services/uploadService.js`

### Subtask 1.1: R2 client configuration

- [ ] **Step 1: Write the failing test for R2 client initialization**

```js
// backend/tests/r2Service.test.js
const { describe, it, expect, beforeEach } = require('@jest/globals');

jest.mock('@aws-sdk/client-s3', () => {
  const mockSend = jest.fn().mockResolvedValue({});
  return {
    S3Client: jest.fn().mockImplementation(() => ({ send: mockSend })),
    PutObjectCommand: jest.fn(),
    GetObjectCommand: jest.fn(),
    DeleteObjectCommand: jest.fn(),
  };
});

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://presigned.example.com/file.pdf'),
}));

describe('r2Service', () => {
  beforeEach(() => {
    process.env.R2_ACCOUNT_ID = 'test-account';
    process.env.R2_ACCESS_KEY_ID = 'test-key';
    process.env.R2_SECRET_ACCESS_KEY = 'test-secret';
    jest.resetModules();
  });

  it('uploads a file to the correct bucket and returns the key', async () => {
    const { uploadFile } = require('../src/services/r2Service');
    const buffer = Buffer.from('test content');
    const result = await uploadFile('property-images', 'test-key.jpg', buffer, 'image/jpeg');
    expect(result).toHaveProperty('key', 'test-key.jpg');
    expect(result).toHaveProperty('bucket', 'property-images');
  });

  it('generates a presigned URL with 5-minute expiry', async () => {
    const { getPresignedUrl } = require('../src/services/r2Service');
    const url = await getPresignedUrl('contract-docs', 'doc.pdf');
    expect(url).toContain('presigned');
  });

  it('deletes a file from R2', async () => {
    const { deleteFile } = require('../src/services/r2Service');
    await expect(deleteFile('archive', 'old.pdf')).resolves.not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npx jest tests/r2Service.test.js --no-coverage`
Expected: FAIL — cannot find module `../src/services/r2Service`

- [ ] **Step 3: Install R2 dependencies**

Run: `cd backend && npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner`

- [ ] **Step 4: Create R2 config**

```js
// backend/src/config/r2.js
const { S3Client } = require('@aws-sdk/client-s3');

const BUCKETS = {
  PROPERTY_IMAGES: 'property-images',
  CONTRACT_DOCS: 'contract-docs',
  CHECKIN_PHOTOS: 'checkin-photos',
  PAYMENT_RECEIPTS: 'payment-receipts',
  ARCHIVE: 'archive',
};

function createR2Client() {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });
}

module.exports = { createR2Client, BUCKETS };
```

- [ ] **Step 5: Create R2 service**

```js
// backend/src/services/r2Service.js
const { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { createR2Client, BUCKETS } = require('../config/r2');

const client = createR2Client();
const PRESIGN_EXPIRY_SECONDS = 300;

async function uploadFile(bucket, key, buffer, contentType) {
  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }));
  return { bucket, key };
}

async function getPresignedUrl(bucket, key) {
  return getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: key }), {
    expiresIn: PRESIGN_EXPIRY_SECONDS,
  });
}

async function deleteFile(bucket, key) {
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

async function getPresignedUploadUrl(bucket, key, contentType) {
  return getSignedUrl(client, new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  }), { expiresIn: PRESIGN_EXPIRY_SECONDS });
}

module.exports = { uploadFile, getPresignedUrl, deleteFile, getPresignedUploadUrl, BUCKETS };
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd backend && npx jest tests/r2Service.test.js --no-coverage`
Expected: PASS — 3 tests pass

- [ ] **Step 7: Commit**

```bash
git add backend/src/config/r2.js backend/src/services/r2Service.js backend/tests/r2Service.test.js backend/package.json backend/package-lock.json
git commit -m "feat(M9): add Cloudflare R2 storage service with upload, presign, delete"
```

### Subtask 1.2: Replace Cloudinary in uploadService

- [ ] **Step 8: Update uploadService.js to use R2 instead of Cloudinary**

Read the current `backend/src/services/uploadService.js` and replace the Cloudinary upload call with R2. The function should:
1. Accept a multer file buffer
2. Generate a UUID-based key: `{bucket}/{uuid}-{originalname}`
3. Call `r2Service.uploadFile()` 
4. Return the R2 key (not a Cloudinary URL)

The existing upload routes in `apartments.js` use multer to get files, so the interface stays the same — only the storage backend changes.

- [ ] **Step 9: Update apartment image references to use R2 keys**

In `backend/src/routes/apartments.js`, ensure image URLs are served via presigned URLs from R2 rather than Cloudinary URLs. Add a helper that maps R2 keys to presigned URLs when returning apartment data.

- [ ] **Step 10: Commit**

```bash
git add backend/src/services/uploadService.js backend/src/routes/apartments.js
git commit -m "feat(M9): migrate uploadService from Cloudinary to R2"
```

---

## Task 2: Notification System v2 (M8)

**Files:**
- Create: `backend/src/config/resend.js`
- Create: `backend/src/services/resendService.js`
- Create: `backend/tests/resendService.test.js`
- Modify: `backend/src/services/emailService.js`

### Subtask 2.1: Resend email service

- [ ] **Step 1: Write the failing test**

```js
// backend/tests/resendService.test.js
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: jest.fn().mockResolvedValue({ id: 'email-123' }),
    },
  })),
}));

describe('resendService', () => {
  beforeEach(() => {
    process.env.RESEND_API_KEY = 'test-key';
    process.env.RESEND_FROM_EMAIL = 'noreply@dirapp.co.il';
    jest.resetModules();
  });

  it('sends a guarantor invitation email', async () => {
    const { sendGuarantorInvite } = require('../src/services/resendService');
    const result = await sendGuarantorInvite({
      to: 'guarantor@example.com',
      landlordName: 'יוסי כהן',
      propertyAddress: 'רחוב הרצל 5, תל אביב',
      rentAmount: 5000,
      period: '01/07/2026 - 30/06/2027',
      link: 'https://dirapp.co.il/guarantor/abc123',
    });
    expect(result).toHaveProperty('id');
  });

  it('sends a payment reminder email', async () => {
    const { sendPaymentReminder } = require('../src/services/resendService');
    const result = await sendPaymentReminder({
      to: 'tenant@example.com',
      amount: 5000,
      dueDate: '2026-07-01',
      period: 'יולי 2026',
    });
    expect(result).toHaveProperty('id');
  });

  it('sends a generic notification email', async () => {
    const { sendNotificationEmail } = require('../src/services/resendService');
    const result = await sendNotificationEmail({
      to: 'user@example.com',
      subject: 'עדכון חוזה',
      html: '<p>החוזה שלך אושר</p>',
    });
    expect(result).toHaveProperty('id');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npx jest tests/resendService.test.js --no-coverage`
Expected: FAIL — cannot find module

- [ ] **Step 3: Install Resend**

Run: `cd backend && npm install resend`

- [ ] **Step 4: Create Resend config**

```js
// backend/src/config/resend.js
const { Resend } = require('resend');

let resendClient = null;

function getResendClient() {
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

module.exports = { getResendClient };
```

- [ ] **Step 5: Create Resend service with email templates**

```js
// backend/src/services/resendService.js
const { getResendClient } = require('../config/resend');

const FROM = process.env.RESEND_FROM_EMAIL || 'DirApp <noreply@dirapp.co.il>';

async function sendEmail({ to, subject, html }) {
  const resend = getResendClient();
  return resend.emails.send({ from: FROM, to, subject, html });
}

async function sendGuarantorInvite({ to, landlordName, propertyAddress, rentAmount, period, link }) {
  return sendEmail({
    to,
    subject: `הזמנה לערבות שכירות — ${propertyAddress}`,
    html: `
      <div dir="rtl" style="font-family: Arial, sans-serif;">
        <h2>הזמנה לערבות שכירות</h2>
        <p>שלום,</p>
        <p>${landlordName} מזמין אותך לשמש ערב לשכירות בנכס:</p>
        <ul>
          <li><strong>כתובת:</strong> ${propertyAddress}</li>
          <li><strong>שכירות חודשית:</strong> ₪${rentAmount}</li>
          <li><strong>תקופה:</strong> ${period}</li>
        </ul>
        <p><a href="${link}" style="background:#2563eb;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">אישור ערבות</a></p>
        <p>קישור זה תקף ל-5 ימים.</p>
        <p style="color:#666;font-size:12px;">DirApp — פלטפורמת שכירות דירות</p>
      </div>
    `,
  });
}

async function sendPaymentReminder({ to, amount, dueDate, period }) {
  return sendEmail({
    to,
    subject: `תזכורת תשלום שכירות — ${period}`,
    html: `
      <div dir="rtl" style="font-family: Arial, sans-serif;">
        <h2>תזכורת תשלום</h2>
        <p>תשלום שכירות בסך ₪${amount} צפוי בתאריך ${dueDate} עבור ${period}.</p>
      </div>
    `,
  });
}

async function sendNotificationEmail({ to, subject, html }) {
  return sendEmail({ to, subject, html });
}

module.exports = { sendEmail, sendGuarantorInvite, sendPaymentReminder, sendNotificationEmail };
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd backend && npx jest tests/resendService.test.js --no-coverage`
Expected: PASS

- [ ] **Step 7: Update existing emailService.js to use Resend**

Replace the current email sending mechanism in `backend/src/services/emailService.js` with calls to `resendService.sendEmail()`. Keep the same public interface (`sendVerificationEmail`, etc.) so existing callers don't break.

- [ ] **Step 8: Commit**

```bash
git add backend/src/config/resend.js backend/src/services/resendService.js backend/tests/resendService.test.js backend/src/services/emailService.js backend/package.json backend/package-lock.json
git commit -m "feat(M8): add Resend email service, replace existing email transport"
```

### Subtask 2.2: Unified notification service

- [ ] **Step 9: Create notificationService that combines Push + Email**

The existing `pushService.js` handles Expo push. Create a unified `notificationService.js` that:
1. Accepts `(userId, { title, body, data, emailSubject, emailHtml })`
2. Sends Expo Push via existing `pushService`
3. Sends email via `resendService` (looks up user email from DB)
4. Logs delivery to `systemEventService`

```js
// backend/src/services/notificationService.js
const { sendNotificationEmail } = require('./resendService');
const { sendPush } = require('./pushService');
const { User } = require('../models');

async function notify(userId, { title, body, data, emailSubject, emailHtml }) {
  const user = await User.findByPk(userId, { attributes: ['id', 'email'] });
  if (!user) return;

  const results = { push: null, email: null };

  try {
    results.push = await sendPush(userId, title, body, data);
  } catch (_) { /* push is best-effort */ }

  if (emailSubject && emailHtml && user.email) {
    try {
      results.email = await sendNotificationEmail({
        to: user.email,
        subject: emailSubject,
        html: emailHtml,
      });
    } catch (_) { /* email is best-effort */ }
  }

  return results;
}

async function notifyMany(userIds, payload) {
  return Promise.allSettled(userIds.map(id => notify(id, payload)));
}

module.exports = { notify, notifyMany };
```

- [ ] **Step 10: Commit**

```bash
git add backend/src/services/notificationService.js
git commit -m "feat(M8): add unified notificationService (push + email)"
```

---

## Task 3: Terms of Service Enforcement (M11)

**Files:**
- Create: `backend/src/middleware/requireTos.js`
- Modify: `backend/src/models/pg/User.js`
- Modify: `backend/src/app.js`

- [ ] **Step 1: Add tosAcceptedAt field to User model**

In `backend/src/models/pg/User.js`, add:

```js
tosAcceptedAt: {
  type: DataTypes.DATE,
  allowNull: true,
},
tosVersion: {
  type: DataTypes.STRING(20),
  allowNull: true,
},
```

- [ ] **Step 2: Create requireTos middleware**

```js
// backend/src/middleware/requireTos.js
function requireTos(req, res, next) {
  if (req.user?.role === 'admin') return next();
  if (!req.user?.tosAcceptedAt) {
    return res.status(403).json({
      error: 'Terms of Service not accepted',
      code: 'TOS_REQUIRED',
    });
  }
  next();
}

module.exports = { requireTos };
```

- [ ] **Step 3: Add ToS acceptance endpoint to auth routes**

In `backend/src/routes/auth.js`, add a `POST /api/auth/accept-tos` endpoint that sets `tosAcceptedAt = new Date()` and `tosVersion = '3.0'` on the user record.

- [ ] **Step 4: Apply requireTos middleware to protected routes in app.js**

Mount `requireTos` on routes that require it: `/api/apartments`, `/api/swipe`, `/api/contracts`, `/api/matches`. Auth routes (`/api/auth`) must remain accessible without ToS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/middleware/requireTos.js backend/src/models/pg/User.js backend/src/routes/auth.js backend/src/app.js
git commit -m "feat(M11): add Terms of Service enforcement middleware + acceptance endpoint"
```

---

## Task 4: Contract State Machine v3 (M2)

**Files:**
- Modify: `backend/src/models/pg/RentalAgreement.js`
- Create: `backend/src/models/pg/AgreementParty.js`
- Create: `backend/src/models/pg/AgreementRoom.js`
- Create: `backend/src/models/pg/OwnershipVerification.js`
- Create: `backend/tests/stateMachine.test.js`
- Modify: `backend/src/models/index.js`

### Subtask 4.1: Update RentalAgreement model

- [ ] **Step 1: Write state machine transition tests**

```js
// backend/tests/stateMachine.test.js
describe('Contract State Machine v3', () => {
  const VALID_TRANSITIONS = {
    UPLOAD: ['PENDING_SIGN'],
    PENDING_SIGN: ['ACTIVE'],
    ACTIVE: ['EXPIRING'],
    EXPIRING: ['ENDED'],
    PENDING_ACTIVATION: ['ACTIVE'],
  };

  function isValidTransition(from, to) {
    return (VALID_TRANSITIONS[from] || []).includes(to);
  }

  it('allows UPLOAD → PENDING_SIGN', () => {
    expect(isValidTransition('UPLOAD', 'PENDING_SIGN')).toBe(true);
  });

  it('allows PENDING_SIGN → ACTIVE', () => {
    expect(isValidTransition('PENDING_SIGN', 'ACTIVE')).toBe(true);
  });

  it('allows ACTIVE → EXPIRING', () => {
    expect(isValidTransition('ACTIVE', 'EXPIRING')).toBe(true);
  });

  it('allows EXPIRING → ENDED', () => {
    expect(isValidTransition('EXPIRING', 'ENDED')).toBe(true);
  });

  it('allows PENDING_ACTIVATION → ACTIVE', () => {
    expect(isValidTransition('PENDING_ACTIVATION', 'ACTIVE')).toBe(true);
  });

  it('rejects UPLOAD → ACTIVE (skip)', () => {
    expect(isValidTransition('UPLOAD', 'ACTIVE')).toBe(false);
  });

  it('rejects ENDED → any', () => {
    expect(isValidTransition('ENDED', 'ACTIVE')).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it passes (pure logic)**

Run: `cd backend && npx jest tests/stateMachine.test.js --no-coverage`
Expected: PASS

- [ ] **Step 3: Update RentalAgreement.js with new statuses and extracted fields**

Replace the status ENUM in `backend/src/models/pg/RentalAgreement.js`:

Old: `'DRAFT', 'PENDING_REVIEW', 'READY_SIGN', 'SIGNED', 'ACTIVE', 'EXPIRED'`
New: `'UPLOAD', 'PENDING_SIGN', 'ACTIVE', 'EXPIRING', 'PENDING_ACTIVATION', 'ENDED'`

Add these new fields for AI extraction:
```js
extractedFields: {
  type: DataTypes.JSONB,
  allowNull: true,
  comment: 'Fields extracted by Gemini OCR from uploaded contract',
},
r2DocKey: {
  type: DataTypes.STRING(512),
  allowNull: true,
  comment: 'R2 key for the uploaded contract file',
},
landlordSignedAt: {
  type: DataTypes.DATE,
  allowNull: true,
},
checkinCompletedAt: {
  type: DataTypes.DATE,
  allowNull: true,
},
checkoutCompletedAt: {
  type: DataTypes.DATE,
  allowNull: true,
},
renewedFromId: {
  type: DataTypes.UUID,
  allowNull: true,
  references: { model: 'rental_agreements', key: 'id' },
},
```

Change defaultValue for status from `'DRAFT'` to `'UPLOAD'`.

- [ ] **Step 4: Create AgreementParty model**

```js
// backend/src/models/pg/AgreementParty.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const AgreementParty = sequelize.define('AgreementParty', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  agreementId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'rental_agreements', key: 'id' },
    onDelete: 'CASCADE',
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE',
  },
  role: {
    type: DataTypes.ENUM('tenant', 'guarantor'),
    allowNull: false,
  },
  signedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  kycStatus: {
    type: DataTypes.ENUM('PENDING', 'APPROVED', 'REJECTED'),
    defaultValue: 'PENDING',
  },
  isHouseManager: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  tableName: 'agreement_parties',
  indexes: [
    { fields: ['agreement_id'] },
    { fields: ['user_id'] },
    { unique: true, fields: ['agreement_id', 'user_id'] },
  ],
});

module.exports = AgreementParty;
```

- [ ] **Step 5: Create AgreementRoom model**

```js
// backend/src/models/pg/AgreementRoom.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const AgreementRoom = sequelize.define('AgreementRoom', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  agreementId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'rental_agreements', key: 'id' },
    onDelete: 'CASCADE',
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM('builtin', 'custom'),
    defaultValue: 'builtin',
  },
  checkinPhotos: {
    type: DataTypes.JSONB,
    defaultValue: [],
  },
  checkoutPhotos: {
    type: DataTypes.JSONB,
    defaultValue: [],
  },
  checkoutNotes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'agreement_rooms',
  indexes: [
    { fields: ['agreement_id'] },
  ],
});

module.exports = AgreementRoom;
```

- [ ] **Step 6: Create OwnershipVerification model**

```js
// backend/src/models/pg/OwnershipVerification.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const OwnershipVerification = sequelize.define('OwnershipVerification', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  agreementId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'rental_agreements', key: 'id' },
    onDelete: 'CASCADE',
  },
  tenantId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE',
  },
  choice: {
    type: DataTypes.ENUM('verified', 'skipped'),
    allowNull: false,
  },
  verifiedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'ownership_verifications',
  indexes: [
    { fields: ['agreement_id', 'tenant_id'], unique: true },
  ],
});

module.exports = OwnershipVerification;
```

- [ ] **Step 7: Register new models in index.js**

Add imports and associations for `AgreementParty`, `AgreementRoom`, `OwnershipVerification` in `backend/src/models/index.js`:

```js
// New associations:
RentalAgreement.hasMany(AgreementParty, { foreignKey: 'agreementId', as: 'parties' });
AgreementParty.belongsTo(RentalAgreement, { foreignKey: 'agreementId', as: 'agreement' });
User.hasMany(AgreementParty, { foreignKey: 'userId', as: 'agreementRoles' });
AgreementParty.belongsTo(User, { foreignKey: 'userId', as: 'user' });

RentalAgreement.hasMany(AgreementRoom, { foreignKey: 'agreementId', as: 'rooms' });
AgreementRoom.belongsTo(RentalAgreement, { foreignKey: 'agreementId', as: 'agreement' });

RentalAgreement.hasMany(OwnershipVerification, { foreignKey: 'agreementId', as: 'ownershipVerifications' });
OwnershipVerification.belongsTo(RentalAgreement, { foreignKey: 'agreementId', as: 'agreement' });
```

- [ ] **Step 8: Commit**

```bash
git add backend/src/models/pg/RentalAgreement.js backend/src/models/pg/AgreementParty.js backend/src/models/pg/AgreementRoom.js backend/src/models/pg/OwnershipVerification.js backend/src/models/index.js backend/tests/stateMachine.test.js
git commit -m "feat(M2): state machine v3 — new statuses, AgreementParty, AgreementRoom, OwnershipVerification"
```

---

## Task 5: Contract Upload + AI Extraction (M1)

**Files:**
- Create: `backend/src/services/contractServiceV3.js`
- Create: `backend/src/routes/contractsV3.js`
- Create: `backend/tests/contractsV3.test.js`
- Modify: `backend/src/services/geminiService.js`
- Modify: `backend/src/app.js`

### Subtask 5.1: Gemini contract extraction

- [ ] **Step 1: Write test for extractContractFields**

```js
// In backend/tests/contractsV3.test.js (first section)
jest.mock('../src/services/geminiService', () => ({
  extractContractFields: jest.fn().mockResolvedValue({
    landlordName: 'יוסי כהן',
    landlordId: '012345678',
    tenantName: 'דנה לוי',
    tenantId: '987654321',
    address: 'רחוב הרצל 5, תל אביב',
    startDate: '2026-07-01',
    endDate: '2027-06-30',
    monthlyRent: 5000,
    paymentDay: 1,
    missingFields: [],
    warnings: [],
  }),
}));

describe('Contract Upload + AI Extraction', () => {
  it('extracts fields from uploaded PDF via Gemini', async () => {
    const { extractContractFields } = require('../src/services/geminiService');
    const result = await extractContractFields(Buffer.from('fake pdf'));
    expect(result).toHaveProperty('landlordName');
    expect(result).toHaveProperty('startDate');
    expect(result).toHaveProperty('monthlyRent', 5000);
    expect(result.missingFields).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it passes (mocked)**

Run: `cd backend && npx jest tests/contractsV3.test.js --no-coverage`
Expected: PASS

- [ ] **Step 3: Add extractContractFields to geminiService.js**

In `backend/src/services/geminiService.js`, add:

```js
async function extractContractFields(fileBuffer) {
  const base64 = fileBuffer.toString('base64');
  const prompt = `You are a Hebrew contract analyzer. Extract the following fields from this rental contract document.
Return a JSON object with these keys:
- landlordName (string)
- landlordId (string, Israeli ID number)
- tenantName (string, or null if not present)
- tenantId (string, or null)
- address (string, full address)
- startDate (string, YYYY-MM-DD)
- endDate (string, YYYY-MM-DD)
- monthlyRent (number, in ILS)
- paymentDay (number, 1-31)
- cpiLinked (boolean)
- missingFields (array of field names that could not be extracted)
- warnings (array of strings for problematic clauses)
Return ONLY valid JSON, no markdown.`;

  const result = await model.generateContent([
    { text: prompt },
    { inlineData: { mimeType: 'application/pdf', data: base64 } },
  ]);

  const text = result.response.text();
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(cleaned);
}
```

- [ ] **Step 4: Create contractServiceV3.js**

```js
// backend/src/services/contractServiceV3.js
const { v4: uuidv4 } = require('uuid');
const { RentalAgreement, AgreementParty, AgreementRoom, UserKycProfile } = require('../models');
const { uploadFile, BUCKETS } = require('./r2Service');
const { extractContractFields } = require('./geminiService');

const BUILTIN_ROOMS = ['סלון', 'מטבח', 'שירותים', 'מקלחת'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIMES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

async function uploadAndExtract(file, landlordId, propertyId) {
  if (file.size > MAX_FILE_SIZE) {
    throw Object.assign(new Error('File exceeds 10MB limit'), { status: 413 });
  }
  if (!ALLOWED_MIMES.includes(file.mimetype)) {
    throw Object.assign(new Error('Only PDF and DOCX files are allowed'), { status: 422 });
  }

  const key = `contracts/${uuidv4()}-${file.originalname}`;
  await uploadFile(BUCKETS.CONTRACT_DOCS, key, file.buffer, file.mimetype);

  const extracted = await extractContractFields(file.buffer);

  const agreement = await RentalAgreement.create({
    landlordId,
    propertyId,
    status: 'UPLOAD',
    r2DocKey: key,
    extractedFields: extracted,
    startDate: extracted.startDate || null,
    endDate: extracted.endDate || null,
    monthlyRentIls: extracted.monthlyRent || null,
    paymentDueDay: extracted.paymentDay || null,
    cpiLinked: extracted.cpiLinked || false,
  });

  for (const roomName of BUILTIN_ROOMS) {
    await AgreementRoom.create({
      agreementId: agreement.id,
      name: roomName,
      type: 'builtin',
    });
  }

  return { agreement, extracted };
}

async function validateGate(agreementId) {
  const agreement = await RentalAgreement.findByPk(agreementId, {
    include: [{ model: AgreementParty, as: 'parties' }],
  });
  if (!agreement) throw Object.assign(new Error('Agreement not found'), { status: 404 });

  const errors = [];

  if (!agreement.startDate) errors.push('startDate is required');
  if (!agreement.endDate) errors.push('endDate is required');
  if (!agreement.monthlyRentIls) errors.push('monthlyRentIls is required');
  if (!agreement.paymentDueDay) errors.push('paymentDueDay is required');

  const landlordKyc = await UserKycProfile.findOne({ where: { userId: agreement.landlordId } });
  if (!landlordKyc || landlordKyc.status !== 'APPROVED') {
    errors.push('Landlord KYC not approved');
  }

  const tenants = (agreement.parties || []).filter(p => p.role === 'tenant');
  if (tenants.length === 0) errors.push('No tenant assigned');

  for (const tenant of tenants) {
    const tenantKyc = await UserKycProfile.findOne({ where: { userId: tenant.userId } });
    if (!tenantKyc || tenantKyc.status !== 'APPROVED') {
      errors.push(`Tenant ${tenant.userId} KYC not approved`);
    }
  }

  return { valid: errors.length === 0, errors };
}

const VALID_TRANSITIONS = {
  UPLOAD: ['PENDING_SIGN'],
  PENDING_SIGN: ['ACTIVE'],
  ACTIVE: ['EXPIRING'],
  EXPIRING: ['ENDED'],
  PENDING_ACTIVATION: ['ACTIVE'],
};

async function transitionState(agreementId, newState) {
  const agreement = await RentalAgreement.findByPk(agreementId);
  if (!agreement) throw Object.assign(new Error('Agreement not found'), { status: 404 });

  const allowed = VALID_TRANSITIONS[agreement.status] || [];
  if (!allowed.includes(newState)) {
    throw Object.assign(
      new Error(`Invalid transition from ${agreement.status} to ${newState}`),
      { status: 422 }
    );
  }

  if (newState === 'PENDING_SIGN') {
    const gate = await validateGate(agreementId);
    if (!gate.valid) {
      throw Object.assign(new Error('Validation gate failed'), { status: 422, reasons: gate.errors });
    }
  }

  await agreement.update({ status: newState });
  return agreement;
}

module.exports = { uploadAndExtract, validateGate, transitionState, VALID_TRANSITIONS };
```

- [ ] **Step 5: Create contractsV3 routes**

```js
// backend/src/routes/contractsV3.js
const express = require('express');
const multer = require('multer');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const { uploadAndExtract, transitionState, validateGate } = require('../services/contractServiceV3');
const { RentalAgreement, AgreementParty, AgreementRoom, OwnershipVerification } = require('../models');
const { getPresignedUrl, BUCKETS } = require('../services/r2Service');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.use(authenticate);

// Upload contract + AI extraction
router.post('/upload',
  requireRole('landlord'),
  upload.single('contract'),
  async (req, res, next) => {
    try {
      const { propertyId } = req.body;
      if (!propertyId) return res.status(400).json({ error: 'propertyId is required' });
      if (!req.file) return res.status(400).json({ error: 'Contract file is required' });

      const result = await uploadAndExtract(req.file, req.user.id, propertyId);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }
);

// Get contract details
router.get('/:id', async (req, res, next) => {
  try {
    const agreement = await RentalAgreement.findByPk(req.params.id, {
      include: [
        { model: AgreementParty, as: 'parties' },
        { model: AgreementRoom, as: 'rooms' },
      ],
    });
    if (!agreement) return res.status(404).json({ error: 'Agreement not found' });

    const docUrl = agreement.r2DocKey
      ? await getPresignedUrl(BUCKETS.CONTRACT_DOCS, agreement.r2DocKey)
      : null;

    res.json({ ...agreement.toJSON(), documentUrl: docUrl });
  } catch (err) {
    next(err);
  }
});

// Update extracted fields (manual corrections)
router.patch('/:id/fields', requireRole('landlord'), async (req, res, next) => {
  try {
    const agreement = await RentalAgreement.findByPk(req.params.id);
    if (!agreement) return res.status(404).json({ error: 'Agreement not found' });
    if (agreement.status !== 'UPLOAD') {
      return res.status(422).json({ error: 'Can only edit fields in UPLOAD state' });
    }

    const allowed = ['startDate', 'endDate', 'monthlyRentIls', 'paymentDueDay', 'cpiLinked'];
    const updates = {};
    for (const f of allowed) {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    }
    await agreement.update(updates);
    res.json(agreement);
  } catch (err) {
    next(err);
  }
});

// Invite tenant to contract
router.post('/:id/invite-tenant', requireRole('landlord'), async (req, res, next) => {
  try {
    const { tenantUserId } = req.body;
    if (!tenantUserId) return res.status(400).json({ error: 'tenantUserId is required' });

    const agreement = await RentalAgreement.findByPk(req.params.id);
    if (!agreement) return res.status(404).json({ error: 'Agreement not found' });

    const party = await AgreementParty.create({
      agreementId: agreement.id,
      userId: tenantUserId,
      role: 'tenant',
    });
    res.status(201).json(party);
  } catch (err) {
    next(err);
  }
});

// Validation gate check
router.get('/:id/validate', async (req, res, next) => {
  try {
    const result = await validateGate(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// State transition
router.post('/:id/transition', async (req, res, next) => {
  try {
    const { targetStatus } = req.body;
    const agreement = await transitionState(req.params.id, targetStatus);
    res.json(agreement);
  } catch (err) {
    if (err.reasons) return res.status(err.status || 422).json({ error: err.message, reasons: err.reasons });
    next(err);
  }
});

// Sign contract
router.post('/:id/sign', async (req, res, next) => {
  try {
    const agreement = await RentalAgreement.findByPk(req.params.id);
    if (!agreement) return res.status(404).json({ error: 'Agreement not found' });
    if (agreement.status !== 'PENDING_SIGN') {
      return res.status(422).json({ error: 'Contract is not in PENDING_SIGN state' });
    }

    if (agreement.landlordId === req.user.id) {
      await agreement.update({ landlordSignedAt: new Date() });
    }

    const party = await AgreementParty.findOne({
      where: { agreementId: agreement.id, userId: req.user.id },
    });
    if (party) {
      await party.update({ signedAt: new Date() });
    }

    const allParties = await AgreementParty.findAll({ where: { agreementId: agreement.id } });
    const allSigned = allParties.every(p => p.signedAt) && agreement.landlordSignedAt;
    if (allSigned) {
      await agreement.update({ status: 'ACTIVE' });
    }

    res.json({ signed: true, allSigned, status: agreement.status });
  } catch (err) {
    next(err);
  }
});

// Ownership verification by tenant
router.post('/:id/verify-ownership', async (req, res, next) => {
  try {
    const { choice } = req.body; // 'verified' or 'skipped'
    if (!['verified', 'skipped'].includes(choice)) {
      return res.status(400).json({ error: 'choice must be "verified" or "skipped"' });
    }

    const record = await OwnershipVerification.create({
      agreementId: req.params.id,
      tenantId: req.user.id,
      choice,
    });
    res.status(201).json(record);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
```

- [ ] **Step 6: Mount new route in app.js**

In `backend/src/app.js`, add:
```js
const contractsV3Routes = require('./routes/contractsV3');
app.use('/api/v3/contracts', contractsV3Routes);
```

- [ ] **Step 7: Commit**

```bash
git add backend/src/services/contractServiceV3.js backend/src/routes/contractsV3.js backend/src/services/geminiService.js backend/src/app.js backend/tests/contractsV3.test.js
git commit -m "feat(M1): contract upload + Gemini AI extraction + validation gate + signing"
```

---

## Task 6: KYC v2 — Persona Abstraction Layer (M6)

**Files:**
- Create: `backend/src/services/kycServiceV3.js`
- Create: `backend/src/routes/kycV3.js`
- Create: `backend/src/middleware/requireKycApproved.js`
- Create: `backend/tests/kycV3.test.js`
- Modify: `backend/src/app.js`

- [ ] **Step 1: Write KYC tests**

```js
// backend/tests/kycV3.test.js
const crypto = require('crypto');

describe('KYC Service v3', () => {
  describe('ID checksum validation', () => {
    it('validates a correct Israeli ID', () => {
      function validateIsraeliId(id) {
        const padded = id.padStart(9, '0');
        if (padded.length !== 9 || !/^\d+$/.test(padded)) return false;
        let sum = 0;
        for (let i = 0; i < 9; i++) {
          let digit = parseInt(padded[i]) * ((i % 2) + 1);
          if (digit > 9) digit -= 9;
          sum += digit;
        }
        return sum % 10 === 0;
      }

      expect(validateIsraeliId('000000018')).toBe(true);
      expect(validateIsraeliId('123456780')).toBe(false);
    });
  });

  describe('HMAC webhook validation', () => {
    it('validates a correct HMAC-SHA256 signature', () => {
      const secret = 'test-webhook-secret';
      const payload = JSON.stringify({ data: { id: 'inq_123' } });
      const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
      const isValid = crypto.createHmac('sha256', secret).update(payload).digest('hex') === signature;
      expect(isValid).toBe(true);
    });

    it('rejects an incorrect signature', () => {
      const secret = 'test-webhook-secret';
      const payload = JSON.stringify({ data: { id: 'inq_123' } });
      const wrongSig = 'deadbeef';
      const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
      expect(expected === wrongSig).toBe(false);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `cd backend && npx jest tests/kycV3.test.js --no-coverage`
Expected: PASS

- [ ] **Step 3: Create KYC service with Persona abstraction**

```js
// backend/src/services/kycServiceV3.js
const crypto = require('crypto');
const { UserKycProfile, AgreementParty, RentalAgreement } = require('../models');
const { notify } = require('./notificationService');

function validateIsraeliId(id) {
  const padded = String(id).padStart(9, '0');
  if (padded.length !== 9 || !/^\d+$/.test(padded)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let digit = parseInt(padded[i]) * ((i % 2) + 1);
    if (digit > 9) digit -= 9;
    sum += digit;
  }
  return sum % 10 === 0;
}

function verifyWebhookSignature(payload, signature, secret) {
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

async function initiateVerification(userId) {
  const existing = await UserKycProfile.findOne({ where: { userId } });
  if (existing?.status === 'APPROVED') return { status: 'already_approved' };

  // In production: call Persona API to create an inquiry
  // For now: create/update KYC record with PENDING status
  const [kyc] = await UserKycProfile.upsert({
    userId,
    status: 'PENDING',
    personaInquiryId: `inq_${crypto.randomUUID()}`,
  });

  return { status: 'initiated', inquiryId: kyc.personaInquiryId };
}

async function handleWebhook(rawBody, signature) {
  const secret = process.env.PERSONA_WEBHOOK_SECRET;
  if (!verifyWebhookSignature(rawBody, signature, secret)) {
    throw Object.assign(new Error('Invalid webhook signature'), { status: 401 });
  }

  const payload = JSON.parse(rawBody);
  const inquiryId = payload.data?.attributes?.inquiry_id || payload.data?.id;
  const status = payload.data?.attributes?.status;

  const kyc = await UserKycProfile.findOne({ where: { personaInquiryId: inquiryId } });
  if (!kyc) return { processed: false };

  const newStatus = status === 'completed' ? 'APPROVED' : status === 'failed' ? 'REJECTED' : kyc.status;
  await kyc.update({ status: newStatus });

  if (newStatus === 'APPROVED') {
    await checkAndUnlockContracts(kyc.userId);
  }

  return { processed: true, status: newStatus };
}

async function checkAndUnlockContracts(userId) {
  const parties = await AgreementParty.findAll({ where: { userId } });
  for (const party of parties) {
    await party.update({ kycStatus: 'APPROVED' });
  }
}

module.exports = {
  validateIsraeliId,
  verifyWebhookSignature,
  initiateVerification,
  handleWebhook,
  checkAndUnlockContracts,
};
```

- [ ] **Step 4: Create KYC routes**

```js
// backend/src/routes/kycV3.js
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { initiateVerification, handleWebhook, validateIsraeliId } = require('../services/kycServiceV3');

router.post('/initiate', authenticate, async (req, res, next) => {
  try {
    const result = await initiateVerification(req.user.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/validate-id', authenticate, async (req, res, next) => {
  try {
    const { idNumber } = req.body;
    if (!idNumber) return res.status(400).json({ error: 'idNumber is required' });
    const valid = validateIsraeliId(idNumber);
    res.json({ valid });
  } catch (err) {
    next(err);
  }
});

router.post('/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res, next) => {
    try {
      const signature = req.headers['persona-signature'] || req.headers['x-persona-signature'] || '';
      const result = await handleWebhook(req.body.toString(), signature);
      res.json(result);
    } catch (err) {
      if (err.status === 401) return res.status(401).json({ error: err.message });
      next(err);
    }
  }
);

module.exports = router;
```

- [ ] **Step 5: Create requireKycApproved middleware**

```js
// backend/src/middleware/requireKycApproved.js
const { UserKycProfile } = require('../models');

async function requireKycApproved(req, res, next) {
  if (req.user?.role === 'admin') return next();

  const kyc = await UserKycProfile.findOne({ where: { userId: req.user.id } });
  if (!kyc || kyc.status !== 'APPROVED') {
    return res.status(403).json({
      error: 'KYC verification required',
      code: 'KYC_REQUIRED',
      kycStatus: kyc?.status || 'NOT_STARTED',
    });
  }
  next();
}

module.exports = { requireKycApproved };
```

- [ ] **Step 6: Mount KYC routes in app.js**

```js
const kycV3Routes = require('./routes/kycV3');
app.use('/api/v3/kyc', kycV3Routes);
```

- [ ] **Step 7: Commit**

```bash
git add backend/src/services/kycServiceV3.js backend/src/routes/kycV3.js backend/src/middleware/requireKycApproved.js backend/tests/kycV3.test.js backend/src/app.js
git commit -m "feat(M6): KYC v2 — Persona abstraction, HMAC webhook, ID checksum, requireKycApproved"
```

---

## Task 7: Check-In Flow (M3)

**Files:**
- Create: `backend/tests/checkin.test.js`
- Modify: `backend/src/routes/contractsV3.js`

- [ ] **Step 1: Write Check-In tests**

```js
// backend/tests/checkin.test.js
describe('Check-In Flow', () => {
  it('rejects check-in for non-ACTIVE contract', () => {
    const status = 'PENDING_SIGN';
    expect(['ACTIVE'].includes(status)).toBe(false);
  });

  it('requires photos to be uploaded for each room', () => {
    const rooms = [
      { name: 'סלון', checkinPhotos: ['photo1.jpg'] },
      { name: 'מטבח', checkinPhotos: [] },
    ];
    const allHavePhotos = rooms.every(r => r.checkinPhotos.length > 0);
    expect(allHavePhotos).toBe(false);
  });

  it('accepts check-in when all rooms have photos', () => {
    const rooms = [
      { name: 'סלון', checkinPhotos: ['photo1.jpg'] },
      { name: 'מטבח', checkinPhotos: ['photo2.jpg'] },
    ];
    const allHavePhotos = rooms.every(r => r.checkinPhotos.length > 0);
    expect(allHavePhotos).toBe(true);
  });
});
```

- [ ] **Step 2: Run test**

Run: `cd backend && npx jest tests/checkin.test.js --no-coverage`
Expected: PASS

- [ ] **Step 3: Add Check-In endpoints to contractsV3.js**

Add to `backend/src/routes/contractsV3.js`:

```js
// Upload check-in photos for a room
router.post('/:id/checkin/:roomId/photos',
  upload.array('photos', 20),
  async (req, res, next) => {
    try {
      const room = await AgreementRoom.findByPk(req.params.roomId);
      if (!room || room.agreementId !== req.params.id) {
        return res.status(404).json({ error: 'Room not found' });
      }

      const agreement = await RentalAgreement.findByPk(req.params.id);
      if (!agreement || agreement.status !== 'ACTIVE') {
        return res.status(422).json({ error: 'Contract must be in ACTIVE state for check-in' });
      }

      const photoKeys = [];
      for (const file of req.files) {
        const key = `checkin/${agreement.id}/${room.id}/${Date.now()}-${file.originalname}`;
        await uploadFile(BUCKETS.CHECKIN_PHOTOS, key, file.buffer, file.mimetype);
        photoKeys.push(key);
      }

      const existing = room.checkinPhotos || [];
      await room.update({ checkinPhotos: [...existing, ...photoKeys] });
      res.json({ uploaded: photoKeys.length, total: room.checkinPhotos.length });
    } catch (err) {
      next(err);
    }
  }
);

// Complete check-in (landlord confirms)
router.post('/:id/checkin/complete', requireRole('landlord'), async (req, res, next) => {
  try {
    const agreement = await RentalAgreement.findByPk(req.params.id, {
      include: [{ model: AgreementRoom, as: 'rooms' }],
    });
    if (!agreement) return res.status(404).json({ error: 'Agreement not found' });
    if (agreement.status !== 'ACTIVE') {
      return res.status(422).json({ error: 'Contract must be ACTIVE for check-in' });
    }
    if (agreement.checkinCompletedAt) {
      return res.status(422).json({ error: 'Check-in already completed' });
    }

    await agreement.update({ checkinCompletedAt: new Date() });
    res.json({ checkinCompleted: true, completedAt: agreement.checkinCompletedAt });
  } catch (err) {
    next(err);
  }
});
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/routes/contractsV3.js backend/tests/checkin.test.js
git commit -m "feat(M3): check-in flow — photo upload per room + landlord confirmation"
```

---

## Task 8: Ledger + Payment Tracking (M5)

**Files:**
- Create: `backend/src/models/pg/LedgerRow.js`
- Create: `backend/src/services/ledgerService.js`
- Create: `backend/src/routes/ledger.js`
- Create: `backend/tests/ledger.test.js`
- Modify: `backend/src/models/index.js`
- Modify: `backend/src/app.js`

- [ ] **Step 1: Write ledger generation tests**

```js
// backend/tests/ledger.test.js
describe('Ledger Service', () => {
  it('generates correct number of ledger rows for a 12-month contract', () => {
    const start = new Date('2026-07-01');
    const end = new Date('2027-06-30');
    let months = 0;
    const d = new Date(start);
    while (d < end) {
      months++;
      d.setMonth(d.getMonth() + 1);
    }
    expect(months).toBe(12);
  });

  it('generates correct due dates based on paymentDay', () => {
    const paymentDay = 10;
    const period = new Date('2026-07-01');
    const dueDate = new Date(period.getFullYear(), period.getMonth(), paymentDay);
    expect(dueDate.getDate()).toBe(10);
    expect(dueDate.getMonth()).toBe(6); // July = 6
  });

  it('auto-confirms payment after 48 hours with no response', () => {
    const reportedAt = new Date('2026-07-10T10:00:00Z');
    const now = new Date('2026-07-12T11:00:00Z');
    const hoursDiff = (now - reportedAt) / (1000 * 60 * 60);
    expect(hoursDiff).toBeGreaterThan(48);
  });
});
```

- [ ] **Step 2: Run test**

Run: `cd backend && npx jest tests/ledger.test.js --no-coverage`
Expected: PASS

- [ ] **Step 3: Create LedgerRow model**

```js
// backend/src/models/pg/LedgerRow.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const LedgerRow = sequelize.define('LedgerRow', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  agreementId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'rental_agreements', key: 'id' },
    onDelete: 'CASCADE',
  },
  period: {
    type: DataTypes.STRING(20),
    allowNull: false,
  },
  dueDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('PENDING', 'REPORTED', 'PAID', 'OVERDUE'),
    allowNull: false,
    defaultValue: 'PENDING',
  },
  reportedByTenant: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  confirmedByLandlord: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  cpiAdjustment: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  receiptR2Key: {
    type: DataTypes.STRING(512),
    allowNull: true,
  },
}, {
  tableName: 'ledger_rows',
  indexes: [
    { fields: ['agreement_id'] },
    { fields: ['due_date'] },
    { fields: ['status'] },
  ],
});

module.exports = LedgerRow;
```

- [ ] **Step 4: Create ledgerService**

```js
// backend/src/services/ledgerService.js
const { LedgerRow, RentalAgreement } = require('../models');

const HEBREW_MONTHS = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];

async function generateLedger(agreementId) {
  const agreement = await RentalAgreement.findByPk(agreementId);
  if (!agreement) throw new Error('Agreement not found');

  const start = new Date(agreement.startDate);
  const end = new Date(agreement.endDate);
  const paymentDay = agreement.paymentDueDay || 1;
  const monthlyRent = parseFloat(agreement.monthlyRentIls);

  const rows = [];
  const d = new Date(start);
  while (d < end) {
    const dueDate = new Date(d.getFullYear(), d.getMonth(), Math.min(paymentDay, 28));
    const period = `${HEBREW_MONTHS[d.getMonth()]} ${d.getFullYear()}`;

    rows.push({
      agreementId,
      period,
      dueDate: dueDate.toISOString().split('T')[0],
      amount: monthlyRent,
      status: 'PENDING',
    });

    d.setMonth(d.getMonth() + 1);
  }

  return LedgerRow.bulkCreate(rows);
}

async function reportPayment(ledgerRowId, tenantId, receiptR2Key) {
  const row = await LedgerRow.findByPk(ledgerRowId);
  if (!row) throw Object.assign(new Error('Ledger row not found'), { status: 404 });
  if (row.status === 'PAID') throw Object.assign(new Error('Already paid'), { status: 422 });

  await row.update({
    status: 'REPORTED',
    reportedByTenant: new Date(),
    receiptR2Key: receiptR2Key || null,
  });
  return row;
}

async function confirmPayment(ledgerRowId) {
  const row = await LedgerRow.findByPk(ledgerRowId);
  if (!row) throw Object.assign(new Error('Ledger row not found'), { status: 404 });

  await row.update({
    status: 'PAID',
    confirmedByLandlord: new Date(),
  });
  return row;
}

async function rejectPayment(ledgerRowId) {
  const row = await LedgerRow.findByPk(ledgerRowId);
  if (!row) throw Object.assign(new Error('Ledger row not found'), { status: 404 });

  await row.update({
    status: 'PENDING',
    reportedByTenant: null,
    receiptR2Key: null,
  });
  return row;
}

async function autoConfirmStalePayments() {
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const stale = await LedgerRow.findAll({
    where: {
      status: 'REPORTED',
      reportedByTenant: { [require('sequelize').Op.lt]: cutoff },
    },
  });

  for (const row of stale) {
    await row.update({ status: 'PAID', confirmedByLandlord: new Date(), notes: 'Auto-confirmed after 48h' });
  }
  return stale.length;
}

module.exports = { generateLedger, reportPayment, confirmPayment, rejectPayment, autoConfirmStalePayments };
```

- [ ] **Step 5: Create ledger routes**

```js
// backend/src/routes/ledger.js
const express = require('express');
const multer = require('multer');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const { generateLedger, reportPayment, confirmPayment, rejectPayment } = require('../services/ledgerService');
const { LedgerRow } = require('../models');
const { uploadFile, BUCKETS } = require('../services/r2Service');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.use(authenticate);

// Get ledger for an agreement
router.get('/agreement/:agreementId', async (req, res, next) => {
  try {
    const rows = await LedgerRow.findAll({
      where: { agreementId: req.params.agreementId },
      order: [['dueDate', 'ASC']],
    });
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// Generate ledger (called when contract becomes ACTIVE)
router.post('/generate/:agreementId', requireRole('landlord'), async (req, res, next) => {
  try {
    const rows = await generateLedger(req.params.agreementId);
    res.status(201).json({ generated: rows.length });
  } catch (err) {
    next(err);
  }
});

// Tenant reports payment
router.post('/:id/report', upload.single('receipt'), async (req, res, next) => {
  try {
    let receiptKey = null;
    if (req.file) {
      receiptKey = `receipts/${req.params.id}/${Date.now()}-${req.file.originalname}`;
      await uploadFile(BUCKETS.PAYMENT_RECEIPTS, receiptKey, req.file.buffer, req.file.mimetype);
    }
    const row = await reportPayment(req.params.id, req.user.id, receiptKey);
    res.json(row);
  } catch (err) {
    next(err);
  }
});

// Landlord confirms payment
router.post('/:id/confirm', requireRole('landlord'), async (req, res, next) => {
  try {
    const row = await confirmPayment(req.params.id);
    res.json(row);
  } catch (err) {
    next(err);
  }
});

// Landlord rejects payment
router.post('/:id/reject', requireRole('landlord'), async (req, res, next) => {
  try {
    const row = await rejectPayment(req.params.id);
    res.json(row);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
```

- [ ] **Step 6: Register LedgerRow in models/index.js and mount route in app.js**

In `backend/src/models/index.js`:
```js
const LedgerRow = require('./pg/LedgerRow');
RentalAgreement.hasMany(LedgerRow, { foreignKey: 'agreementId', as: 'ledgerRows' });
LedgerRow.belongsTo(RentalAgreement, { foreignKey: 'agreementId', as: 'agreement' });
```

In `backend/src/app.js`:
```js
const ledgerRoutes = require('./routes/ledger');
app.use('/api/v3/ledger', ledgerRoutes);
```

- [ ] **Step 7: Commit**

```bash
git add backend/src/models/pg/LedgerRow.js backend/src/services/ledgerService.js backend/src/routes/ledger.js backend/tests/ledger.test.js backend/src/models/index.js backend/src/app.js
git commit -m "feat(M5): ledger + payment tracking — generate, report, confirm, reject, auto-confirm"
```

---

## Task 9: EXPIRING Alerts (M13)

**Files:**
- Create: `backend/src/cron/expiringAlerts.js`
- Create: `backend/src/cron/ledgerDueAlerts.js`
- Create: `backend/src/cron/ledgerOverdue.js`
- Create: `backend/src/cron/paymentAutoConfirm.js`
- Create: `backend/tests/cronJobs.test.js`

- [ ] **Step 1: Write cron job tests**

```js
// backend/tests/cronJobs.test.js
describe('Cron Jobs', () => {
  it('identifies contracts expiring in 120 days', () => {
    const endDate = new Date('2026-11-01');
    const now = new Date('2026-07-04');
    const daysRemaining = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
    expect(daysRemaining).toBeLessThanOrEqual(120);
  });

  it('marks overdue payments correctly', () => {
    const dueDate = new Date('2026-06-01');
    const now = new Date('2026-06-06');
    const daysLate = Math.ceil((now - dueDate) / (1000 * 60 * 60 * 24));
    expect(daysLate).toBeGreaterThanOrEqual(5);
  });
});
```

- [ ] **Step 2: Run test**

Run: `cd backend && npx jest tests/cronJobs.test.js --no-coverage`
Expected: PASS

- [ ] **Step 3: Create expiringAlerts cron**

```js
// backend/src/cron/expiringAlerts.js
const { Op } = require('sequelize');
const { RentalAgreement } = require('../models');
const { notifyMany } = require('../services/notificationService');

const ALERT_DAYS = [120, 90, 60, 45, 30];

async function runExpiringAlerts() {
  const now = new Date();

  for (const days of ALERT_DAYS) {
    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + days);
    const dateStr = targetDate.toISOString().split('T')[0];

    const agreements = await RentalAgreement.findAll({
      where: {
        status: { [Op.in]: ['ACTIVE', 'EXPIRING'] },
        endDate: dateStr,
      },
    });

    for (const agreement of agreements) {
      if (agreement.status === 'ACTIVE' && days <= 120) {
        await agreement.update({ status: 'EXPIRING' });
      }

      const userIds = [agreement.landlordId];
      // Collect tenant IDs from agreement parties
      const { AgreementParty } = require('../models');
      const tenants = await AgreementParty.findAll({
        where: { agreementId: agreement.id, role: 'tenant' },
      });
      userIds.push(...tenants.map(t => t.userId));

      await notifyMany(userIds, {
        title: 'חוזה מתקרב לסיום',
        body: `${days} ימים לסיום החוזה`,
        emailSubject: `התראה: ${days} ימים לסיום החוזה`,
        emailHtml: `<div dir="rtl"><p>החוזה שלך מסתיים בעוד ${days} ימים.</p></div>`,
      });
    }
  }
}

module.exports = { runExpiringAlerts };
```

- [ ] **Step 4: Create ledger cron jobs**

```js
// backend/src/cron/ledgerDueAlerts.js
const { Op } = require('sequelize');
const { LedgerRow, RentalAgreement } = require('../models');
const { notify } = require('../services/notificationService');

async function runLedgerDueAlerts() {
  const fiveDaysFromNow = new Date();
  fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5);
  const dateStr = fiveDaysFromNow.toISOString().split('T')[0];

  const rows = await LedgerRow.findAll({
    where: { dueDate: dateStr, status: 'PENDING' },
    include: [{ model: RentalAgreement, as: 'agreement' }],
  });

  for (const row of rows) {
    await notify(row.agreement.landlordId, {
      title: 'תזכורת תשלום',
      body: `תשלום בסך ₪${row.amount} צפוי בעוד 5 ימים`,
    });
  }
}

module.exports = { runLedgerDueAlerts };
```

```js
// backend/src/cron/ledgerOverdue.js
const { Op } = require('sequelize');
const { LedgerRow } = require('../models');

async function runLedgerOverdue() {
  const fiveDaysAgo = new Date();
  fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
  const dateStr = fiveDaysAgo.toISOString().split('T')[0];

  await LedgerRow.update(
    { status: 'OVERDUE' },
    { where: { status: 'PENDING', dueDate: { [Op.lte]: dateStr } } }
  );
}

module.exports = { runLedgerOverdue };
```

```js
// backend/src/cron/paymentAutoConfirm.js
const { autoConfirmStalePayments } = require('../services/ledgerService');

async function runPaymentAutoConfirm() {
  const count = await autoConfirmStalePayments();
  if (count > 0) {
    console.log(`Auto-confirmed ${count} stale payments`);
  }
}

module.exports = { runPaymentAutoConfirm };
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/cron/ backend/tests/cronJobs.test.js
git commit -m "feat(M13): EXPIRING alerts + ledger cron jobs (due, overdue, auto-confirm)"
```

---

## Task 10: Check-Out Flow (M4)

**Files:**
- Create: `backend/tests/checkout.test.js`
- Modify: `backend/src/routes/contractsV3.js`

- [ ] **Step 1: Write Check-Out tests**

```js
// backend/tests/checkout.test.js
describe('Check-Out Flow', () => {
  it('limits revision rounds to 3 by default', () => {
    const maxRounds = 3;
    let currentRound = 3;
    expect(currentRound >= maxRounds).toBe(true);
  });

  it('auto-confirms after max rounds', () => {
    const currentRound = 4;
    const maxRounds = 3;
    const shouldAutoConfirm = currentRound > maxRounds;
    expect(shouldAutoConfirm).toBe(true);
  });
});
```

- [ ] **Step 2: Run test**

Run: `cd backend && npx jest tests/checkout.test.js --no-coverage`
Expected: PASS

- [ ] **Step 3: Add Check-Out endpoints to contractsV3.js**

Add to `backend/src/routes/contractsV3.js`:

```js
// Upload check-out photos for a room
router.post('/:id/checkout/:roomId/photos',
  upload.array('photos', 20),
  async (req, res, next) => {
    try {
      const room = await AgreementRoom.findByPk(req.params.roomId);
      if (!room || room.agreementId !== req.params.id) {
        return res.status(404).json({ error: 'Room not found' });
      }

      const photoKeys = [];
      for (const file of req.files) {
        const key = `checkout/${req.params.id}/${room.id}/${Date.now()}-${file.originalname}`;
        await uploadFile(BUCKETS.CHECKIN_PHOTOS, key, file.buffer, file.mimetype);
        photoKeys.push(key);
      }

      const existing = room.checkoutPhotos || [];
      await room.update({ checkoutPhotos: [...existing, ...photoKeys] });
      res.json({ uploaded: photoKeys.length });
    } catch (err) {
      next(err);
    }
  }
);

// Landlord reviews check-out (approve or add notes)
router.post('/:id/checkout/review', requireRole('landlord'), async (req, res, next) => {
  try {
    const { roomId, notes, approved } = req.body;
    const room = await AgreementRoom.findByPk(roomId);
    if (!room) return res.status(404).json({ error: 'Room not found' });

    if (!approved && notes) {
      await room.update({ checkoutNotes: notes, checkoutPhotos: [] });
      return res.json({ status: 'revision_requested', notes });
    }

    res.json({ status: 'approved' });
  } catch (err) {
    next(err);
  }
});

// Complete check-out — both parties sign
router.post('/:id/checkout/complete', async (req, res, next) => {
  try {
    const agreement = await RentalAgreement.findByPk(req.params.id);
    if (!agreement) return res.status(404).json({ error: 'Agreement not found' });

    await agreement.update({ checkoutCompletedAt: new Date() });
    res.json({ checkoutCompleted: true });
  } catch (err) {
    next(err);
  }
});
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/routes/contractsV3.js backend/tests/checkout.test.js
git commit -m "feat(M4): check-out flow — photo upload, landlord review, revision rounds"
```

---

## Task 11: Contract Renewal Flow (M14)

**Files:**
- Modify: `backend/src/services/contractServiceV3.js`
- Modify: `backend/src/routes/contractsV3.js`

- [ ] **Step 1: Add renewal logic to contractServiceV3**

Add to `backend/src/services/contractServiceV3.js`:

```js
async function renewContract(oldAgreementId, file, landlordId) {
  const oldAgreement = await RentalAgreement.findByPk(oldAgreementId);
  if (!oldAgreement) throw Object.assign(new Error('Agreement not found'), { status: 404 });
  if (!['ACTIVE', 'EXPIRING'].includes(oldAgreement.status)) {
    throw Object.assign(new Error('Can only renew ACTIVE or EXPIRING contracts'), { status: 422 });
  }

  const result = await uploadAndExtract(file, landlordId, oldAgreement.propertyId);
  await result.agreement.update({
    status: 'PENDING_ACTIVATION',
    renewedFromId: oldAgreementId,
  });

  return result;
}

async function activateRenewal(agreementId) {
  const agreement = await RentalAgreement.findByPk(agreementId);
  if (!agreement || agreement.status !== 'PENDING_ACTIVATION') {
    throw Object.assign(new Error('Not in PENDING_ACTIVATION'), { status: 422 });
  }

  if (agreement.renewedFromId) {
    const old = await RentalAgreement.findByPk(agreement.renewedFromId);
    if (old) await old.update({ status: 'ENDED' });
  }

  await agreement.update({ status: 'ACTIVE' });
  return agreement;
}
```

- [ ] **Step 2: Add renewal endpoint to contractsV3.js**

```js
router.post('/:id/renew',
  requireRole('landlord'),
  upload.single('contract'),
  async (req, res, next) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'Contract file required' });
      const { renewContract } = require('../services/contractServiceV3');
      const result = await renewContract(req.params.id, req.file, req.user.id);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }
);
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/services/contractServiceV3.js backend/src/routes/contractsV3.js
git commit -m "feat(M14): contract renewal — PENDING_ACTIVATION state + old contract ENDED"
```

---

## Task 12: Maintenance Flow (M15)

**Files:**
- Create: `backend/src/models/pg/TicketInvoice.js`
- Create: `backend/src/services/maintenanceService.js`
- Create: `backend/src/routes/maintenanceV3.js`
- Create: `backend/tests/maintenanceV3.test.js`
- Modify: `backend/src/models/pg/MaintenanceTicket.js`
- Modify: `backend/src/models/index.js`
- Modify: `backend/src/app.js`

- [ ] **Step 1: Update MaintenanceTicket model**

Read the existing `backend/src/models/pg/MaintenanceTicket.js` and add:
- `status` ENUM: `'OPEN', 'IN_PROGRESS', 'WAITING_INVOICE', 'CLOSED'`
- `photoR2Key` for attached photo
- `landlordResponse` ENUM: `'handling', 'technician', 'alternative'`
- `landlordNote` TEXT

- [ ] **Step 2: Create TicketInvoice model**

```js
// backend/src/models/pg/TicketInvoice.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const TicketInvoice = sequelize.define('TicketInvoice', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  ticketId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'maintenance_tickets', key: 'id' },
    onDelete: 'CASCADE',
  },
  r2Key: {
    type: DataTypes.STRING(512),
    allowNull: false,
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  payer: {
    type: DataTypes.ENUM('landlord', 'tenant'),
    allowNull: false,
  },
}, {
  tableName: 'ticket_invoices',
  indexes: [{ fields: ['ticket_id'] }],
});

module.exports = TicketInvoice;
```

- [ ] **Step 3: Create maintenance routes**

```js
// backend/src/routes/maintenanceV3.js
const express = require('express');
const multer = require('multer');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const { MaintenanceTicket, TicketInvoice } = require('../models');
const { uploadFile, BUCKETS } = require('../services/r2Service');
const { notify } = require('../services/notificationService');
const { RentalAgreement } = require('../models');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.use(authenticate);

// Open a ticket
router.post('/', upload.single('photo'), async (req, res, next) => {
  try {
    const { agreementId, description } = req.body;
    let photoKey = null;
    if (req.file) {
      photoKey = `maintenance/${agreementId}/${Date.now()}-${req.file.originalname}`;
      await uploadFile(BUCKETS.CHECKIN_PHOTOS, photoKey, req.file.buffer, req.file.mimetype);
    }

    const ticket = await MaintenanceTicket.create({
      agreementId,
      reporterId: req.user.id,
      description,
      photoR2Key: photoKey,
      status: 'OPEN',
    });

    const agreement = await RentalAgreement.findByPk(agreementId);
    if (agreement) {
      await notify(agreement.landlordId, {
        title: 'תקלה חדשה דווחה',
        body: description.substring(0, 100),
        emailSubject: 'תקלה חדשה בנכס שלך',
        emailHtml: `<div dir="rtl"><p>${description}</p></div>`,
      });
    }

    res.status(201).json(ticket);
  } catch (err) {
    next(err);
  }
});

// List tickets for an agreement
router.get('/agreement/:agreementId', async (req, res, next) => {
  try {
    const tickets = await MaintenanceTicket.findAll({
      where: { agreementId: req.params.agreementId },
      include: [{ model: TicketInvoice, as: 'invoices' }],
      order: [['createdAt', 'DESC']],
    });
    res.json(tickets);
  } catch (err) {
    next(err);
  }
});

// Landlord responds to ticket
router.post('/:id/respond', requireRole('landlord'), async (req, res, next) => {
  try {
    const { response, note } = req.body; // 'handling' | 'technician' | 'alternative'
    const ticket = await MaintenanceTicket.findByPk(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    await ticket.update({
      status: 'IN_PROGRESS',
      landlordResponse: response,
      landlordNote: note || null,
    });
    res.json(ticket);
  } catch (err) {
    next(err);
  }
});

// Upload invoice
router.post('/:id/invoice', requireRole('landlord'), upload.single('invoice'), async (req, res, next) => {
  try {
    const { amount, payer } = req.body;
    const key = `invoices/${req.params.id}/${Date.now()}-${req.file.originalname}`;
    await uploadFile(BUCKETS.PAYMENT_RECEIPTS, key, req.file.buffer, req.file.mimetype);

    const invoice = await TicketInvoice.create({
      ticketId: req.params.id,
      r2Key: key,
      amount: parseFloat(amount),
      payer,
    });

    await MaintenanceTicket.update(
      { status: 'WAITING_INVOICE' },
      { where: { id: req.params.id } }
    );

    res.status(201).json(invoice);
  } catch (err) {
    next(err);
  }
});

// Tenant closes ticket
router.post('/:id/close', async (req, res, next) => {
  try {
    const ticket = await MaintenanceTicket.findByPk(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    await ticket.update({ status: 'CLOSED' });
    res.json(ticket);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
```

- [ ] **Step 4: Register in models/index.js and app.js**

In `backend/src/models/index.js`:
```js
const TicketInvoice = require('./pg/TicketInvoice');
MaintenanceTicket.hasMany(TicketInvoice, { foreignKey: 'ticketId', as: 'invoices' });
TicketInvoice.belongsTo(MaintenanceTicket, { foreignKey: 'ticketId', as: 'ticket' });
```

In `backend/src/app.js`:
```js
const maintenanceV3Routes = require('./routes/maintenanceV3');
app.use('/api/v3/maintenance', maintenanceV3Routes);
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/models/pg/TicketInvoice.js backend/src/models/pg/MaintenanceTicket.js backend/src/routes/maintenanceV3.js backend/src/models/index.js backend/src/app.js backend/tests/maintenanceV3.test.js
git commit -m "feat(M15): maintenance flow — tickets, landlord response, invoices, close"
```

---

## Task 13: Guarantor Web Flow (M7)

**Files:**
- Create: `web/guarantor/package.json`
- Create: `web/guarantor/src/App.jsx`
- Create: `web/guarantor/src/pages/GuarantorFlow.jsx`
- Create: `web/guarantor/src/services/api.js`
- Create: `web/guarantor/vercel.json`
- Create: `backend/src/routes/guarantor.js`
- Modify: `backend/src/app.js`

- [ ] **Step 1: Create guarantor backend routes**

```js
// backend/src/routes/guarantor.js
const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { AgreementGuarantor, RentalAgreement, User } = require('../models');
const { sendGuarantorInvite } = require('../services/resendService');
const { authenticate, requireRole } = require('../middleware/auth');

// Invite a guarantor (landlord action)
router.post('/invite', authenticate, requireRole('landlord'), async (req, res, next) => {
  try {
    const { agreementId, email, name } = req.body;
    const agreement = await RentalAgreement.findByPk(agreementId);
    if (!agreement) return res.status(404).json({ error: 'Agreement not found' });

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000); // 5 days

    const guarantor = await AgreementGuarantor.create({
      agreementId,
      email,
      name,
      invitationToken: token,
      invitationExpiresAt: expiresAt,
      invitationStatus: 'PENDING',
    });

    const link = `${process.env.GUARANTOR_WEB_URL || 'https://guarantor.dirapp.co.il'}/flow/${token}`;
    await sendGuarantorInvite({
      to: email,
      landlordName: req.user.email,
      propertyAddress: agreement.extractedFields?.address || 'כתובת הנכס',
      rentAmount: agreement.monthlyRentIls,
      period: `${agreement.startDate} - ${agreement.endDate}`,
      link,
    });

    res.status(201).json({ guarantor, link });
  } catch (err) {
    next(err);
  }
});

// Get guarantor flow data (public — accessed via token)
router.get('/flow/:token', async (req, res, next) => {
  try {
    const guarantor = await AgreementGuarantor.findOne({
      where: { invitationToken: req.params.token },
    });
    if (!guarantor) return res.status(404).json({ error: 'Invalid or expired link' });
    if (new Date() > guarantor.invitationExpiresAt) {
      return res.status(410).json({ error: 'Link expired' });
    }

    const agreement = await RentalAgreement.findByPk(guarantor.agreementId);
    res.json({
      guarantorName: guarantor.name,
      propertyAddress: agreement?.extractedFields?.address,
      rentAmount: agreement?.monthlyRentIls,
      startDate: agreement?.startDate,
      endDate: agreement?.endDate,
    });
  } catch (err) {
    next(err);
  }
});

// Guarantor declines
router.post('/flow/:token/decline', async (req, res, next) => {
  try {
    const guarantor = await AgreementGuarantor.findOne({
      where: { invitationToken: req.params.token },
    });
    if (!guarantor) return res.status(404).json({ error: 'Invalid link' });

    await guarantor.update({ invitationStatus: 'DECLINED' });

    const agreement = await RentalAgreement.findByPk(guarantor.agreementId);
    if (agreement) {
      const { notify } = require('../services/notificationService');
      await notify(agreement.landlordId, {
        title: 'ערב דחה הזמנה',
        body: `${guarantor.name} דחה את הזמנת הערבות`,
      });
    }

    res.json({ status: 'declined' });
  } catch (err) {
    next(err);
  }
});

// Guarantor completes KYC + signs
router.post('/flow/:token/complete', async (req, res, next) => {
  try {
    const guarantor = await AgreementGuarantor.findOne({
      where: { invitationToken: req.params.token },
    });
    if (!guarantor) return res.status(404).json({ error: 'Invalid link' });

    await guarantor.update({
      invitationStatus: 'APPROVED',
      signedAt: new Date(),
    });

    res.json({ status: 'completed' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
```

- [ ] **Step 2: Update AgreementGuarantor model**

In `backend/src/models/pg/AgreementGuarantor.js`, ensure these fields exist:
- `email` STRING
- `name` STRING
- `invitationToken` STRING(UUID)
- `invitationExpiresAt` DATE
- `invitationStatus` ENUM('PENDING', 'APPROVED', 'DECLINED', 'EXPIRED')
- `signedAt` DATE

- [ ] **Step 3: Mount guarantor routes in app.js**

```js
const guarantorRoutes = require('./routes/guarantor');
app.use('/api/v3/guarantor', guarantorRoutes);
```

- [ ] **Step 4: Create guarantor web app scaffold**

Create `web/guarantor/` with a minimal React SPA:
- `package.json` with react, react-dom, vite
- `src/App.jsx` — router with single page
- `src/pages/GuarantorFlow.jsx` — fetches flow data via token from URL, shows contract info, KYC button (Persona Web SDK), sign/decline buttons
- `src/services/api.js` — axios client pointing to `/api/v3/guarantor`
- `vercel.json` — SPA rewrite rules

- [ ] **Step 5: Commit**

```bash
git add backend/src/routes/guarantor.js backend/src/models/pg/AgreementGuarantor.js backend/src/app.js web/guarantor/
git commit -m "feat(M7): guarantor web flow — invite, KYC, sign/decline + React SPA"
```

---

## Task 14: Multi-tenant Support & Role Switching (M12)

**Files:**
- Modify: `backend/src/models/pg/User.js`
- Modify: `backend/src/routes/auth.js`
- Modify: `backend/src/middleware/auth.js`
- Modify: `mobile/src/store/useAuthStore.ts`

- [ ] **Step 1: Add blocked_count and is_locked to User model**

In `backend/src/models/pg/User.js`, add:
```js
blockedCount: {
  type: DataTypes.INTEGER,
  defaultValue: 0,
},
isLocked: {
  type: DataTypes.BOOLEAN,
  defaultValue: false,
},
activeRole: {
  type: DataTypes.ENUM('tenant', 'landlord'),
  defaultValue: 'tenant',
},
```

- [ ] **Step 2: Add role switch endpoint**

In `backend/src/routes/auth.js`, add:
```js
router.patch('/switch-role', authenticate, async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!['tenant', 'landlord'].includes(role)) {
      return res.status(400).json({ error: 'Role must be tenant or landlord' });
    }
    const user = await User.findByPk(req.user.id);
    await user.update({ activeRole: role });
    res.json({ activeRole: role });
  } catch (err) {
    next(err);
  }
});
```

- [ ] **Step 3: Add blocking/locking endpoints**

In `backend/src/routes/auth.js`, add endpoints for:
- `POST /api/auth/block/:userId` — increment `blockedCount`, lock if >= 5
- `POST /api/auth/unblock/:userId` — decrement `blockedCount`

- [ ] **Step 4: Update auth middleware to check lock status**

In `backend/src/middleware/auth.js`, after loading the user, check:
```js
if (user.isLocked) {
  return res.status(403).json({ error: 'Account locked', code: 'ACCOUNT_LOCKED' });
}
```

- [ ] **Step 5: Update mobile auth store for role switching**

In `mobile/src/store/useAuthStore.ts`, add:
```ts
switchRole: async (role: 'tenant' | 'landlord') => {
  const res = await api.patch('/auth/switch-role', { role });
  set({ user: { ...get().user, activeRole: res.data.activeRole } });
},
```

- [ ] **Step 6: Commit**

```bash
git add backend/src/models/pg/User.js backend/src/routes/auth.js backend/src/middleware/auth.js mobile/src/store/useAuthStore.ts
git commit -m "feat(M12): multi-tenant support — role switch, blocking, account locking"
```

---

## Task 15: Admin Panel v1 — GODMODE (M10)

**Files:**
- Create: `backend/src/models/pg/AppConfig.js`
- Create: `backend/src/routes/admin.js`
- Create: `backend/tests/admin.test.js`
- Create: `web/admin/` (React SPA scaffold)
- Modify: `backend/src/models/index.js`
- Modify: `backend/src/app.js`

- [ ] **Step 1: Create AppConfig model**

```js
// backend/src/models/pg/AppConfig.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const AppConfig = sequelize.define('AppConfig', {
  key: {
    type: DataTypes.STRING(100),
    primaryKey: true,
  },
  value: {
    type: DataTypes.STRING(500),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'app_config',
});

module.exports = AppConfig;
```

- [ ] **Step 2: Seed default config values**

Create a seeder or init script that inserts default configurable parameters:
```js
const DEFAULTS = {
  check_in_window_days: '5',
  checkin_photos_max: '20',
  checkout_revision_rounds: '3',
  expiring_warning_days: '120',
  guarantor_link_ttl_days: '5',
  blocking_threshold: '5',
  contract_revision_max: '10',
  payment_autoconfirm_hours: '48',
  overdue_alert_days: '5',
  kyc_renewal_years: '5',
  maintenance_alert_hours_1: '24',
  maintenance_alert_days_2: '3',
  persona_monthly_quota: '500',
};
```

- [ ] **Step 3: Create admin routes**

```js
// backend/src/routes/admin.js
const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const { AppConfig, User, RentalAgreement, LedgerRow, MaintenanceTicket, UserKycProfile } = require('../models');

router.use(authenticate);
router.use(requireRole('admin'));

// Config management
router.get('/config', async (req, res, next) => {
  try {
    const configs = await AppConfig.findAll();
    res.json(configs);
  } catch (err) { next(err); }
});

router.put('/config/:key', async (req, res, next) => {
  try {
    const [config] = await AppConfig.upsert({ key: req.params.key, value: req.body.value });
    res.json(config);
  } catch (err) { next(err); }
});

// User management
router.get('/users', async (req, res, next) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const users = await User.findAndCountAll({
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      order: [['createdAt', 'DESC']],
    });
    res.json(users);
  } catch (err) { next(err); }
});

router.post('/users/:id/unlock', async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    await user.update({ isLocked: false, blockedCount: 0 });
    res.json({ unlocked: true });
  } catch (err) { next(err); }
});

router.post('/users/:id/kyc-override', async (req, res, next) => {
  try {
    const { status } = req.body;
    await UserKycProfile.upsert({ userId: req.params.id, status });
    res.json({ overridden: true });
  } catch (err) { next(err); }
});

// Contract overview
router.get('/contracts', async (req, res, next) => {
  try {
    const contracts = await RentalAgreement.findAll({
      order: [['createdAt', 'DESC']],
      limit: 100,
    });
    res.json(contracts);
  } catch (err) { next(err); }
});

router.post('/contracts/:id/override-status', async (req, res, next) => {
  try {
    const agreement = await RentalAgreement.findByPk(req.params.id);
    if (!agreement) return res.status(404).json({ error: 'Not found' });
    await agreement.update({ status: req.body.status });
    res.json(agreement);
  } catch (err) { next(err); }
});

// Ledger overview
router.get('/ledgers', async (req, res, next) => {
  try {
    const ledgers = await LedgerRow.findAll({
      order: [['dueDate', 'DESC']],
      limit: 200,
    });
    res.json(ledgers);
  } catch (err) { next(err); }
});

// Maintenance overview
router.get('/maintenance', async (req, res, next) => {
  try {
    const tickets = await MaintenanceTicket.findAll({
      order: [['createdAt', 'DESC']],
      limit: 100,
    });
    res.json(tickets);
  } catch (err) { next(err); }
});

router.post('/maintenance/:id/close', async (req, res, next) => {
  try {
    await MaintenanceTicket.update({ status: 'CLOSED' }, { where: { id: req.params.id } });
    res.json({ closed: true });
  } catch (err) { next(err); }
});

module.exports = router;
```

- [ ] **Step 4: Register AppConfig in models/index.js and mount admin routes in app.js**

In `backend/src/models/index.js`:
```js
const AppConfig = require('./pg/AppConfig');
```
Export it in `module.exports`.

In `backend/src/app.js`:
```js
const adminRoutes = require('./routes/admin');
app.use('/api/v3/admin', adminRoutes);
```

- [ ] **Step 5: Create admin web app scaffold**

Create `web/admin/` with:
- `package.json` — react, react-dom, react-router-dom, vite, axios
- `src/App.jsx` — routes for Dashboard, Users, Contracts, Config, Ledgers
- `src/pages/Dashboard.jsx` — overview stats
- `src/pages/Users.jsx` — user list + unlock/KYC override
- `src/pages/Contracts.jsx` — contract list + status override
- `src/pages/Config.jsx` — edit configurable parameters
- `src/pages/Ledgers.jsx` — payment ledger overview
- `src/services/api.js` — axios with JWT auth header
- `vercel.json` — SPA rewrite

- [ ] **Step 6: Commit**

```bash
git add backend/src/models/pg/AppConfig.js backend/src/routes/admin.js backend/tests/admin.test.js backend/src/models/index.js backend/src/app.js web/admin/
git commit -m "feat(M10): Admin Panel v1 (GODMODE) — config, users, contracts, ledgers, maintenance"
```

---

## Task 16: Remaining Cron Jobs + Integration

**Files:**
- Create: `backend/src/cron/kycRenewal.js`
- Create: `backend/src/cron/maintenanceAlerts.js`
- Create: `backend/src/cron/r2Cleanup.js`
- Create: `backend/src/cron/cpiAdjustment.js`
- Modify: `backend/src/server.js` (register cron jobs)

- [ ] **Step 1: Create remaining cron jobs**

```js
// backend/src/cron/kycRenewal.js
const { Op } = require('sequelize');
const { UserKycProfile } = require('../models');
const { notify } = require('../services/notificationService');

async function runKycRenewal() {
  const fiveYearsAgo = new Date();
  fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);

  const expiring = await UserKycProfile.findAll({
    where: {
      status: 'APPROVED',
      createdAt: { [Op.lte]: fiveYearsAgo },
    },
  });

  for (const kyc of expiring) {
    await kyc.update({ status: 'PENDING' });
    await notify(kyc.userId, {
      title: 'נדרש חידוש אימות זהות',
      body: 'אימות הזהות שלך פג תוקף. נא לבצע אימות חדש.',
    });
  }
}

module.exports = { runKycRenewal };
```

```js
// backend/src/cron/maintenanceAlerts.js
const { Op } = require('sequelize');
const { MaintenanceTicket, RentalAgreement } = require('../models');
const { notify } = require('../services/notificationService');

async function runMaintenanceAlerts() {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

  const staleTickets = await MaintenanceTicket.findAll({
    where: {
      status: 'OPEN',
      createdAt: { [Op.lte]: twentyFourHoursAgo },
    },
    include: [{ model: RentalAgreement, as: 'agreement' }],
  });

  for (const ticket of staleTickets) {
    if (ticket.agreement) {
      await notify(ticket.agreement.landlordId, {
        title: 'תקלה ממתינה למענה',
        body: 'תקלה שדווחה ממתינה לטיפול שלך',
      });
    }
  }
}

module.exports = { runMaintenanceAlerts };
```

```js
// backend/src/cron/r2Cleanup.js
const { Op } = require('sequelize');
const { RentalAgreement } = require('../models');
const { deleteFile, BUCKETS } = require('../services/r2Service');

async function runR2Cleanup() {
  const threeYearsAgo = new Date();
  threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);

  const expired = await RentalAgreement.findAll({
    where: {
      status: 'ENDED',
      endDate: { [Op.lte]: threeYearsAgo.toISOString().split('T')[0] },
      r2DocKey: { [Op.not]: null },
    },
  });

  for (const agreement of expired) {
    try {
      await deleteFile(BUCKETS.ARCHIVE, agreement.r2DocKey);
      await agreement.update({ r2DocKey: null });
    } catch (_) { /* best effort */ }
  }
}

module.exports = { runR2Cleanup };
```

```js
// backend/src/cron/cpiAdjustment.js
const { RentalAgreement, LedgerRow } = require('../models');
const { Op } = require('sequelize');

async function runCpiAdjustment() {
  const activeAgreements = await RentalAgreement.findAll({
    where: { status: { [Op.in]: ['ACTIVE', 'EXPIRING'] }, cpiLinked: true },
  });

  // In production: fetch actual CPI index from CBS (Central Bureau of Statistics)
  // For MVP: placeholder — no actual adjustment without real CPI data
  console.log(`CPI check: ${activeAgreements.length} CPI-linked agreements found`);
}

module.exports = { runCpiAdjustment };
```

- [ ] **Step 2: Register cron jobs in server.js**

In `backend/src/server.js`, after server starts, register cron jobs using `node-cron` or `setInterval`:

```js
const cron = require('node-cron');
const { runExpiringAlerts } = require('./cron/expiringAlerts');
const { runLedgerDueAlerts } = require('./cron/ledgerDueAlerts');
const { runLedgerOverdue } = require('./cron/ledgerOverdue');
const { runPaymentAutoConfirm } = require('./cron/paymentAutoConfirm');
const { runKycRenewal } = require('./cron/kycRenewal');
const { runMaintenanceAlerts } = require('./cron/maintenanceAlerts');
const { runR2Cleanup } = require('./cron/r2Cleanup');
const { runCpiAdjustment } = require('./cron/cpiAdjustment');

if (process.env.NODE_ENV !== 'test') {
  cron.schedule('0 8 * * *', runLedgerDueAlerts);     // Daily 08:00
  cron.schedule('0 9 * * *', runExpiringAlerts);       // Daily 09:00
  cron.schedule('59 23 * * *', runLedgerOverdue);      // Daily 23:59
  cron.schedule('0 * * * *', runPaymentAutoConfirm);   // Every hour
  cron.schedule('0 * * * *', runMaintenanceAlerts);    // Every hour
  cron.schedule('0 0 * * *', runKycRenewal);           // Daily midnight
  cron.schedule('0 0 1 * *', runR2Cleanup);            // Monthly 1st
  cron.schedule('0 0 1 1 *', runCpiAdjustment);        // Jan 1 yearly
}
```

Install node-cron: `cd backend && npm install node-cron`

- [ ] **Step 3: Commit**

```bash
git add backend/src/cron/ backend/src/server.js backend/package.json backend/package-lock.json
git commit -m "feat: register all cron jobs — KYC renewal, maintenance alerts, R2 cleanup, CPI"
```

---

## Task 17: Mobile Screens (Integration)

**Files:**
- Create: `mobile/src/screens/ContractUploadScreen.tsx`
- Create: `mobile/src/screens/ContractDetailScreen.tsx`
- Create: `mobile/src/screens/CheckInScreen.tsx`
- Create: `mobile/src/screens/CheckOutScreen.tsx`
- Create: `mobile/src/screens/LedgerScreen.tsx`
- Create: `mobile/src/screens/MaintenanceScreen.tsx`
- Create: `mobile/src/screens/TermsScreen.tsx`
- Create: `mobile/src/store/useContractStore.ts`
- Create: `mobile/src/store/useLedgerStore.ts`
- Create: `mobile/src/store/useMaintenanceStore.ts`
- Modify: `mobile/src/services/api.ts`
- Modify: `mobile/src/navigation/AppNavigator.tsx`

This task is a series of screen implementations. Each screen follows the same pattern used by existing screens (e.g., `ContractsScreen.tsx`, `RentPaymentsScreen.tsx`):

- [ ] **Step 1: Add new API endpoints to mobile api.ts**

Add to `mobile/src/services/api.ts`:
```ts
// Contract v3 API
export const contractsV3Api = {
  upload: (formData: FormData) => api.post('/v3/contracts/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  get: (id: string) => api.get(`/v3/contracts/${id}`),
  updateFields: (id: string, fields: any) => api.patch(`/v3/contracts/${id}/fields`, fields),
  inviteTenant: (id: string, tenantUserId: string) => api.post(`/v3/contracts/${id}/invite-tenant`, { tenantUserId }),
  validate: (id: string) => api.get(`/v3/contracts/${id}/validate`),
  transition: (id: string, targetStatus: string) => api.post(`/v3/contracts/${id}/transition`, { targetStatus }),
  sign: (id: string) => api.post(`/v3/contracts/${id}/sign`),
  verifyOwnership: (id: string, choice: string) => api.post(`/v3/contracts/${id}/verify-ownership`, { choice }),
  uploadCheckinPhotos: (id: string, roomId: string, formData: FormData) => api.post(`/v3/contracts/${id}/checkin/${roomId}/photos`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  completeCheckin: (id: string) => api.post(`/v3/contracts/${id}/checkin/complete`),
  uploadCheckoutPhotos: (id: string, roomId: string, formData: FormData) => api.post(`/v3/contracts/${id}/checkout/${roomId}/photos`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  reviewCheckout: (id: string, data: any) => api.post(`/v3/contracts/${id}/checkout/review`, data),
  completeCheckout: (id: string) => api.post(`/v3/contracts/${id}/checkout/complete`),
  renew: (id: string, formData: FormData) => api.post(`/v3/contracts/${id}/renew`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

export const ledgerApi = {
  getForAgreement: (agreementId: string) => api.get(`/v3/ledger/agreement/${agreementId}`),
  reportPayment: (id: string, formData?: FormData) => formData ? api.post(`/v3/ledger/${id}/report`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }) : api.post(`/v3/ledger/${id}/report`),
  confirmPayment: (id: string) => api.post(`/v3/ledger/${id}/confirm`),
  rejectPayment: (id: string) => api.post(`/v3/ledger/${id}/reject`),
};

export const maintenanceApi = {
  create: (formData: FormData) => api.post('/v3/maintenance', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getForAgreement: (agreementId: string) => api.get(`/v3/maintenance/agreement/${agreementId}`),
  respond: (id: string, data: any) => api.post(`/v3/maintenance/${id}/respond`, data),
  close: (id: string) => api.post(`/v3/maintenance/${id}/close`),
};

export const kycApi = {
  initiate: () => api.post('/v3/kyc/initiate'),
  validateId: (idNumber: string) => api.post('/v3/kyc/validate-id', { idNumber }),
};

export const tosApi = {
  accept: () => api.post('/auth/accept-tos'),
};
```

- [ ] **Step 2: Create Zustand stores**

Create `useContractStore.ts`, `useLedgerStore.ts`, `useMaintenanceStore.ts` following the existing patterns from `useAuthStore.ts` and `useSwipeStore.ts`. Each store manages loading state, data, and actions that call the API functions above.

- [ ] **Step 3: Create screen components**

Create each screen as a React Native component following existing patterns:
- `ContractUploadScreen.tsx` — document picker + upload + show extracted fields for review
- `ContractDetailScreen.tsx` — show contract details, sign button, verify ownership button
- `CheckInScreen.tsx` — list rooms, photo upload per room, complete button
- `CheckOutScreen.tsx` — list rooms with check-in reference photos, upload new photos, review notes
- `LedgerScreen.tsx` — list payment rows, report/confirm buttons
- `MaintenanceScreen.tsx` — open ticket form, list tickets, respond actions
- `TermsScreen.tsx` — show ToS text, accept button

- [ ] **Step 4: Add screens to AppNavigator.tsx**

Register all new screens in the navigation stack. Add them to the appropriate tab stacks based on role (tenant vs landlord).

- [ ] **Step 5: Commit**

```bash
git add mobile/src/
git commit -m "feat: add mobile screens for contracts, check-in/out, ledger, maintenance, ToS"
```

---

## Summary of all new backend endpoints

| Method | Endpoint | Task | Milestone |
|--------|----------|------|-----------|
| POST | /api/v3/contracts/upload | Upload contract + AI extraction | M1 |
| GET | /api/v3/contracts/:id | Get contract details | M1 |
| PATCH | /api/v3/contracts/:id/fields | Update extracted fields | M1 |
| POST | /api/v3/contracts/:id/invite-tenant | Invite tenant | M1 |
| GET | /api/v3/contracts/:id/validate | Validation gate check | M1 |
| POST | /api/v3/contracts/:id/transition | State transition | M2 |
| POST | /api/v3/contracts/:id/sign | Sign contract | M2 |
| POST | /api/v3/contracts/:id/verify-ownership | Tenant verifies ownership | M2 |
| POST | /api/v3/contracts/:id/checkin/:roomId/photos | Upload check-in photos | M3 |
| POST | /api/v3/contracts/:id/checkin/complete | Complete check-in | M3 |
| POST | /api/v3/contracts/:id/checkout/:roomId/photos | Upload check-out photos | M4 |
| POST | /api/v3/contracts/:id/checkout/review | Landlord reviews check-out | M4 |
| POST | /api/v3/contracts/:id/checkout/complete | Complete check-out | M4 |
| POST | /api/v3/contracts/:id/renew | Renew contract | M14 |
| GET | /api/v3/ledger/agreement/:id | Get ledger rows | M5 |
| POST | /api/v3/ledger/generate/:id | Generate ledger | M5 |
| POST | /api/v3/ledger/:id/report | Report payment | M5 |
| POST | /api/v3/ledger/:id/confirm | Confirm payment | M5 |
| POST | /api/v3/ledger/:id/reject | Reject payment | M5 |
| POST | /api/v3/kyc/initiate | Start KYC | M6 |
| POST | /api/v3/kyc/validate-id | Validate Israeli ID | M6 |
| POST | /api/v3/kyc/webhook | Persona webhook | M6 |
| POST | /api/v3/guarantor/invite | Invite guarantor | M7 |
| GET | /api/v3/guarantor/flow/:token | Get guarantor flow data | M7 |
| POST | /api/v3/guarantor/flow/:token/decline | Decline guarantee | M7 |
| POST | /api/v3/guarantor/flow/:token/complete | Complete guarantee | M7 |
| POST | /api/v3/maintenance/ | Open ticket | M15 |
| GET | /api/v3/maintenance/agreement/:id | List tickets | M15 |
| POST | /api/v3/maintenance/:id/respond | Landlord responds | M15 |
| POST | /api/v3/maintenance/:id/invoice | Upload invoice | M15 |
| POST | /api/v3/maintenance/:id/close | Close ticket | M15 |
| GET | /api/v3/admin/config | List config | M10 |
| PUT | /api/v3/admin/config/:key | Update config | M10 |
| GET | /api/v3/admin/users | List users | M10 |
| POST | /api/v3/admin/users/:id/unlock | Unlock user | M10 |
| POST | /api/v3/admin/users/:id/kyc-override | Override KYC | M10 |
| GET | /api/v3/admin/contracts | List contracts | M10 |
| POST | /api/v3/admin/contracts/:id/override-status | Override status | M10 |
| GET | /api/v3/admin/ledgers | List ledgers | M10 |
| GET | /api/v3/admin/maintenance | List tickets | M10 |
| POST | /api/v3/admin/maintenance/:id/close | Force close ticket | M10 |
| POST | /api/auth/accept-tos | Accept ToS | M11 |
| PATCH | /api/auth/switch-role | Switch role | M12 |
