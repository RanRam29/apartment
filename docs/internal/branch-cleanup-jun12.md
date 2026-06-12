# Branch Cleanup — 2026-06-12 (K9)

## Summary

| Metric | Before | After |
|--------|--------|-------|
| Remote branches | ~83 | **52** |
| Merged branches deleted | — | **31** |

## Protected (not deleted)

- `main`
- `cursor/financial-admin` — active Cursor worktree
- `fix/ledger-idor-gdpr` — merged but from last week (audit trail)
- `wind/web-refactor-ui` — active Antigravity worktree (local only)

## Deleted merged branches (31)

`cc/core-contracts`, `claude/rental-matching-platform-mKuSW`, `claude/review-roadmap-wajKn`, `feat/leads-tenant-contact`, `fix/ai-service-motor-mock`, `fix/bug-005-delete-and-alerts`, `fix/web-jwt-base64url`, all merged `cursor/critical-bug-*` (18), `wind/admin-config-panel`, `wind/admin-stats-redesign`, `wind/google-signin`, `wind/identity-platform`, `wind/qa-infrastructure`, `wind/renter-journal`.

`origin/HEAD` repointed to `origin/main`.

## Remaining 52 — Orchestrator decision needed (target <15)

**Stale unmerged (recommend delete):**
- `claude/phase4-swipe-match` … `claude/phase28-*` (25 branches)
- `claude/build-dirapp-ui-PB8Jz`, `claude/free-deploy-render-upstash`
- Unmerged `cursor/critical-bug-inspection-*` / `cursor/critical-bug-investigation-*` (19)
- `cursor/dev-environment-setup-1e70`
- `feat/mobile-dirapp-design-baseline-checkpoint`

**Possibly active:**
- `cursor/financial-admin`, `fix/ledger-idor-gdpr`, `wind/whatsapp-mobile-ui`

**New Cursor branches (Jun 12 — push before merge):**
- `cursor/trust-score-auto-calc` (K6)
- `cursor/admin-scheduled-notifications` (K7)
- `cursor/guarantor-claims` (K8)

Re-run cleanup: `backend/scripts/delete-merged-branches.ps1`
