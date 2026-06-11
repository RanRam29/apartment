# Feature Roadmap TODO Tracker

Use this file to track roadmap delivery. Update each row only after evidence exists (PR merged, product approval).

Status flow:
- `planned` -> `in_progress` -> `merged` -> `approved`

Last updated: 2026-05-24

| ID | Phase | Feature | Owner | PR/Link | Status | Merged Date | Approved Date | Notes |
|---|---|---|---|---|---|---|---|---|
| F1 | Phase 1 (Months 1-4) | Discovery Engine (swipe + signal capture) | mobile-team | commit `514bda4` | approved | 2026-05-09 | 2026-05-10 | SwipeScreen + swipe.js: daily quota, superlike, dwell-time signal; matchingService wired. Approved in roadmap review; evidence: swipe quota/superlike feature commit. |
| F2 | Phase 1 (Months 1-4) | Digital Storefront (broker landing pages) | backend-team | commit `1c0eab1` | approved | 2026-05-09 | 2026-05-10 | LandlordDashboard + ListingsScreen + landlord.js analytics route. Approved in roadmap review; evidence: phase commit adding landlord dashboards/screens. |
| F3 | Phase 1 (Months 1-4) | Property Upload Engine | backend-team | commit `2a8e6c2` | approved | 2026-05-09 | 2026-05-10 | CreateListingScreen + apartments.js + Cloudinary uploadService. Approved in roadmap review; evidence: web FormData upload fix over existing listing upload flow. |
| F4 | Phase 1 (Months 1-4) | True Monthly Cost Calculator | mobile-team | #37 | approved | 2026-05-09 | 2026-05-10 | Rent + Arnona estimate + building fee; costBreakdown field on GET /api/apartments/:id. Approved in roadmap review; evidence: dedicated feature PR/commit `2b3c980`. |
| F5 | Phase 2 (Months 5-8) | AI Lead Qualification Bot | ai-team | commit `c6b2bbc` | approved | 2026-05-09 | 2026-05-10 | lead_scoring.py + LeadsScreen + landlord leads endpoint. Approved in roadmap review; evidence: Phase 6 commit includes dashboard + leads + NLP stack. |
| F6 | Phase 2 (Months 5-8) | Smart Map + Urban Renewal Layer | mobile-team | #43 | approved | 2026-05-09 | 2026-05-10 | MapScreen: WebView+Leaflet, apartment price-label markers, TAMA 38 GeoJSON toggle (data.gov.il); Map tab in TenantTabs. Approved in roadmap review; evidence: grouped F6/F10/F11 implementation commit `f84a0f4`. |
| F7 | Phase 2 (Months 5-8) | GenAI Marketing Copy Generator | ai-team | #38 | approved | 2026-05-09 | 2026-05-10 | generateMarketingCopy with professional/friendly/luxury styles; POST /api/apartments/:id/marketing-copy; sparkle modal in ListingsScreen. Approved in roadmap review; evidence: feature PR commit `074b13b`. |
| F8 | Phase 2 (Months 5-8) | Roommate Compatibility Score | mobile-team | #40 | approved | 2026-05-09 | 2026-05-10 | Lifestyle questionnaire (sleep/cleanliness/noise/guests/smoking/pets/WFH); weighted score 0-100; RoommateScreen accessible from Profile. Approved in roadmap review; evidence: feature PR commit `ca01964`. |
| F9 | Phase 3 (Months 9-12) | Screening & Verification (BDI/Gov) | backend-team | #41 | approved | 2026-05-09 | 2026-05-10 | IdentityVerification model; POST /api/screening/identity (SHA-256 hashed ID); GET status + landlord-view; VerifyIdentityScreen in mobile. Approved in roadmap review; evidence: feature PR commit `6cf66f3`. |
| F10 | Phase 3 (Months 9-12) | Digital Contracts + Deposit Management | backend-team | #43 | approved | 2026-05-09 | 2026-05-10 | RentalContract model; CRUD + e-sign + deposit lifecycle; ContractsScreen with full-text view, sign button, deposit actions. Approved in roadmap review; evidence: grouped F6/F10/F11 implementation commit `f84a0f4`. |
| F11 | Phase 3 (Months 9-12) | Payments (Bit/PayBox automation) | backend-team | #43 | approved | 2026-05-09 | 2026-05-10 | Meshulam premium upgrade + RentPayment model + /api/payments/rent CRUD; Bit/PayBox deep links; RentPaymentsScreen in mobile. Approved in roadmap review; evidence: grouped F6/F10/F11 implementation commit `f84a0f4`. |
| F12 | Phase 3 (Months 9-12) | Commercial Real Estate Module | backend-team | #46 | approved | 2026-05-09 | 2026-05-10 | CommercialLease model; /api/commercial CRUD + CAM reconciliation + critical date alerts; CommercialScreen in mobile. Approved in roadmap review; evidence: grouped F12-F15 implementation + tests commit `76e0532`. |
| F13 | Phase 4 (Year 2+) | Gamification Layer | mobile-team | #46 | approved | 2026-05-09 | 2026-05-10 | UserPoints model; /api/gamification (award/me/leaderboard); auto-badges; GamificationScreen with progress bar + leaderboard. Approved in roadmap review; evidence: grouped F12-F15 implementation + tests commit `76e0532`. |
| F14 | Phase 4 (Year 2+) | Services Marketplace | backend-team | #46 | approved | 2026-05-09 | 2026-05-10 | ServiceListing + ServiceReview models; /api/services CRUD + review + avg-rating; ServicesScreen with category filters + phone-to-call + star picker. Approved in roadmap review; evidence: grouped F12-F15 implementation + tests commit `76e0532`. |
| F15 | Phase 4 (Year 2+) | IoT for Commercial Tenants | backend-team | #46 | approved | 2026-05-09 | 2026-05-10 | IoTDevice + MaintenanceTicket models; /api/iot devices + access + tickets; IoTScreen tabbed UI. Approved in roadmap review; evidence: grouped F12-F15 implementation + tests commit `76e0532`. |
| F16 | Cross-cutting | DirApp Design System + Figma UI Polish | mobile-team | #71, #72 | approved | 2026-05-24 | 2026-05-24 | `dirAppTokens.ts`, `textStyles.ts`, `ResponsiveContainer`; Figma design applied to SwipeScreen (enlarged action buttons, match modal), ApartmentDetailScreen (carousel 380px, luxury badge, sticky CTA bar), OnboardingScreen (DirApp logo header, progress pills). |
| F17 | Cross-cutting | Full Dark Mode Support | mobile-team | #73 | approved | 2026-05-24 | 2026-05-24 | `ThemeContext.tsx` with light/dark/system modes; `useColors()` hook; `App.tsx` wrapped with `ThemeProvider`; 12 screens updated with inline style overrides; ProfileScreen dark mode toggle (moon/sun icon, Hebrew label). |
| F18 | Cross-cutting | Security: Backend Dep Hardening | backend-team | #74 | approved | 2026-05-24 | 2026-05-24 | Express 4.18.2→4.22.2, ws 8.18.3→8.20.1; path-traversal hardening for contract file uploads via `resolveUploadFilePath` / `safeUnlinkUpload`; unit tests added. |

## Update Rules

1. Set `Status = merged` only after the PR is merged to the target branch.
2. Fill `Merged Date` on merge day (`YYYY-MM-DD`).
3. Set `Status = approved` only after product/business approval.
4. Fill `Approved Date` when approval is confirmed.
5. Add PR URL or ticket in `PR/Link` for traceability.

## 30-Second Update Commands

Use this helper script:

- Script path: `scripts/update-feature-status.ps1`

Examples:

- Mark feature merged (auto-fills `Merged Date` to today):
  - `powershell -ExecutionPolicy Bypass -File .\scripts\update-feature-status.ps1 -FeatureId F1 -Status merged -Owner "mobile-team" -PR "https://github.com/org/repo/pull/123"`
- Mark feature approved (auto-fills `Approved Date` to today):
  - `powershell -ExecutionPolicy Bypass -File .\scripts\update-feature-status.ps1 -FeatureId F1 -Status approved -Notes "Approved by product review 2026-05-05"`
- Move feature to in progress:
  - `powershell -ExecutionPolicy Bypass -File .\scripts\update-feature-status.ps1 -FeatureId F2 -Status in_progress -Owner "backend-team"`
