# Feature Roadmap TODO Tracker

Use this file to track roadmap delivery. Update each row only after evidence exists (PR merged, product approval).

Status flow:
- `planned` -> `in_progress` -> `merged` -> `approved`

Last updated: 2026-05-09 (F7 style variants implemented)

| ID | Phase | Feature | Owner | PR/Link | Status | Merged Date | Approved Date | Notes |
|---|---|---|---|---|---|---|---|---|
| F1 | Phase 1 (Months 1-4) | Discovery Engine (swipe + signal capture) | mobile-team | - | in_progress | - | - | SwipeScreen + swipe.js: daily quota, superlike, dwell-time signal; matchingService wired |
| F2 | Phase 1 (Months 1-4) | Digital Storefront (broker landing pages) | backend-team | - | in_progress | - | - | LandlordDashboard + ListingsScreen + landlord.js analytics route |
| F3 | Phase 1 (Months 1-4) | Property Upload Engine | backend-team | - | in_progress | - | - | CreateListingScreen + apartments.js + Cloudinary uploadService |
| F4 | Phase 1 (Months 1-4) | True Monthly Cost Calculator | mobile-team | - | in_progress | - | - | Rent + Arnona estimate + building fee; costBreakdown field on GET /api/apartments/:id |
| F5 | Phase 2 (Months 5-8) | AI Lead Qualification Bot | ai-team | - | in_progress | - | - | lead_scoring.py + LeadsScreen + landlord leads endpoint |
| F6 | Phase 2 (Months 5-8) | Smart Map + Urban Renewal Layer | TBD | - | planned | - | - | TAMA 38 / urban renewal overlays |
| F7 | Phase 2 (Months 5-8) | GenAI Marketing Copy Generator | ai-team | #38 | in_progress | - | - | generateMarketingCopy with professional/friendly/luxury styles; POST /api/apartments/:id/marketing-copy; sparkle modal in ListingsScreen |
| F8 | Phase 2 (Months 5-8) | Roommate Compatibility Score | mobile-team | #39 | in_progress | - | - | Lifestyle questionnaire (sleep/cleanliness/noise/guests/smoking/pets/WFH); weighted score 0-100; RoommateScreen accessible from Profile |
| F9 | Phase 3 (Months 9-12) | Screening & Verification (BDI/Gov) | TBD | - | planned | - | - | Only email verify exists; BDI/gov identity check not started |
| F10 | Phase 3 (Months 9-12) | Digital Contracts + Deposit Management | TBD | - | planned | - | - | Standard contracts + e-sign |
| F11 | Phase 3 (Months 9-12) | Payments (Bit/PayBox automation) | backend-team | #34 | in_progress | - | - | Meshulam premium upgrade done; webhook secured in PR #34; rent collection not started |
| F12 | Phase 3 (Months 9-12) | Commercial Real Estate Module | TBD | - | planned | - | - | CAM and critical date alerts |
| F13 | Phase 4 (Year 2+) | Gamification Layer | TBD | - | planned | - | - | Points, trust badges, visit rewards |
| F14 | Phase 4 (Year 2+) | Services Marketplace | TBD | - | planned | - | - | Movers/cleaning/painting integrations |
| F15 | Phase 4 (Year 2+) | IoT for Commercial Tenants | TBD | - | planned | - | - | Smart access + maintenance reporting |

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

