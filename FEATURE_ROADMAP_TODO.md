# Feature Roadmap TODO Tracker

Use this file to track roadmap delivery. Update each row only after evidence exists (PR merged, product approval).

Status flow:
- `planned` -> `in_progress` -> `merged` -> `approved`

Last updated: 2026-05-09 (ALL 15 features merged to main)

| ID | Phase | Feature | Owner | PR/Link | Status | Merged Date | Approved Date | Notes |
|---|---|---|---|---|---|---|---|---|
| F1 | Phase 1 (Months 1-4) | Discovery Engine (swipe + signal capture) | mobile-team | - | merged | 2026-05-09 | - | SwipeScreen + swipe.js: daily quota, superlike, dwell-time signal; matchingService wired |
| F2 | Phase 1 (Months 1-4) | Digital Storefront (broker landing pages) | backend-team | - | merged | 2026-05-09 | - | LandlordDashboard + ListingsScreen + landlord.js analytics route |
| F3 | Phase 1 (Months 1-4) | Property Upload Engine | backend-team | - | merged | 2026-05-09 | - | CreateListingScreen + apartments.js + Cloudinary uploadService |
| F4 | Phase 1 (Months 1-4) | True Monthly Cost Calculator | mobile-team | - | merged | 2026-05-09 | - | Rent + Arnona estimate + building fee; costBreakdown field on GET /api/apartments/:id |
| F5 | Phase 2 (Months 5-8) | AI Lead Qualification Bot | ai-team | - | merged | 2026-05-09 | - | lead_scoring.py + LeadsScreen + landlord leads endpoint |
| F6 | Phase 2 (Months 5-8) | Smart Map + Urban Renewal Layer | mobile-team | #43 | merged | 2026-05-09 | - | MapScreen: WebView+Leaflet, apartment price-label markers, TAMA 38 GeoJSON toggle (data.gov.il); Map tab in TenantTabs |
| F7 | Phase 2 (Months 5-8) | GenAI Marketing Copy Generator | ai-team | #38 | merged | 2026-05-09 | - | generateMarketingCopy with professional/friendly/luxury styles; POST /api/apartments/:id/marketing-copy; sparkle modal in ListingsScreen |
| F8 | Phase 2 (Months 5-8) | Roommate Compatibility Score | mobile-team | #43 | merged | 2026-05-09 | - | Lifestyle questionnaire (sleep/cleanliness/noise/guests/smoking/pets/WFH); weighted score 0-100; RoommateScreen accessible from Profile |
| F9 | Phase 3 (Months 9-12) | Screening & Verification (BDI/Gov) | backend-team | #43 | merged | 2026-05-09 | - | IdentityVerification model; POST /api/screening/identity (SHA-256 hashed ID); GET status + landlord-view; VerifyIdentityScreen in mobile |
| F10 | Phase 3 (Months 9-12) | Digital Contracts + Deposit Management | backend-team | #43 | merged | 2026-05-09 | - | RentalContract model; CRUD + e-sign + deposit lifecycle; ContractsScreen with full-text view, sign button, deposit actions |
| F11 | Phase 3 (Months 9-12) | Payments (Bit/PayBox automation) | backend-team | #43 | merged | 2026-05-09 | - | Meshulam premium upgrade + RentPayment model + /api/payments/rent CRUD; Bit/PayBox deep links; RentPaymentsScreen in mobile |
| F12 | Phase 3 (Months 9-12) | Commercial Real Estate Module | backend-team | #46 | merged | 2026-05-09 | - | CommercialLease model; /api/commercial CRUD + CAM reconciliation + critical date alerts; CommercialScreen in mobile |
| F13 | Phase 4 (Year 2+) | Gamification Layer | mobile-team | #46 | merged | 2026-05-09 | - | UserPoints model; /api/gamification (award/me/leaderboard); auto-badges; GamificationScreen with progress bar + leaderboard |
| F14 | Phase 4 (Year 2+) | Services Marketplace | backend-team | #46 | merged | 2026-05-09 | - | ServiceListing + ServiceReview models; /api/services CRUD + review + avg-rating; ServicesScreen with category filters + phone-to-call + star picker |
| F15 | Phase 4 (Year 2+) | IoT for Commercial Tenants | backend-team | #46 | merged | 2026-05-09 | - | IoTDevice + MaintenanceTicket models; /api/iot devices + access + tickets; IoTScreen tabbed UI |

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
