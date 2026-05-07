# Feature Roadmap TODO Tracker

Use this file to track roadmap delivery. Update each row only after evidence exists (PR merged, product approval).

Status flow:
- `planned` -> `in_progress` -> `merged` -> `approved`

Last updated: 2026-05-05

| ID | Phase | Feature | Owner | PR/Link | Status | Merged Date | Approved Date | Notes |
|---|---|---|---|---|---|---|---|---|
| F1 | Phase 1 (Months 1-4) | Discovery Engine (swipe + signal capture) | TBD | - | planned | - | - | Track dwell time, gallery open, save/share |
| F2 | Phase 1 (Months 1-4) | Digital Storefront (broker landing pages) | TBD | - | planned | - | - | Inventory, reviews, contact actions |
| F3 | Phase 1 (Months 1-4) | Property Upload Engine | TBD | - | planned | - | - | Upload images, specs, descriptions |
| F4 | Phase 1 (Months 1-4) | True Monthly Cost Calculator | TBD | - | planned | - | - | Rent + Arnona + estimated building fee |
| F5 | Phase 2 (Months 5-8) | AI Lead Qualification Bot | TBD | - | planned | - | - | Budget/pets/move-in triage + scoring |
| F6 | Phase 2 (Months 5-8) | Smart Map + Urban Renewal Layer | TBD | - | planned | - | - | TAMA 38 / urban renewal overlays |
| F7 | Phase 2 (Months 5-8) | GenAI Marketing Copy Generator | TBD | - | planned | - | - | Professional/friendly/luxury styles |
| F8 | Phase 2 (Months 5-8) | Roommate Compatibility Score | TBD | - | planned | - | - | Lifestyle questionnaire matching |
| F9 | Phase 3 (Months 9-12) | Screening & Verification (BDI/Gov) | TBD | - | planned | - | - | Fraud prevention, identity checks |
| F10 | Phase 3 (Months 9-12) | Digital Contracts + Deposit Management | TBD | - | planned | - | - | Standard contracts + e-sign |
| F11 | Phase 3 (Months 9-12) | Payments (Bit/PayBox automation) | TBD | - | planned | - | - | Rent collection + related fees |
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

