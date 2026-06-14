# Deferred / deleted branches — 2026-06-13 cleanup

Orchestrator branch cleanup took the remote from **58 → main + active worktrees**
(54 branches deleted). Most were either already merged, superseded build history
(`claude/phase4-28`), or stale duplicate bug-investigation runs whose fixes already
landed in `main` (signed payment webhooks, redis in-memory fallback, demo-seed
disabled in prod, authorized chat rooms, listing-delete-with-open-contract guard,
service-review delete ordering).

The branches below were **deleted but carried unmerged ideas**. They were NOT
mergeable onto current `main` — each is built on a stale base with assumptions that
diverge from current code (the classic stale-base entanglement: old `socket.js`,
old `auth.js`, a different feed-cache key scheme, etc.). If the behaviour is still
wanted, **re-implement cleanly on `main`** — do not resurrect-and-merge. SHAs are
recorded so the original diffs remain recoverable from GitHub for a while.

| Branch | SHA | Unique idea | Why not merged | Re-impl value |
|--------|-----|-------------|----------------|---------------|
| `cursor/critical-bug-investigation-b1c2` | `a56f4ac` | Broader feed-cache invalidation — `scan`-based `cacheDelPattern` + in-memory `scan`/multi-`del`, invalidate all feed variants on listing change | Built on a `feed:v2:*` key scheme; current `main` keys feed as `feed:${city}` → graft would be a no-op + broke `redis.test.js` | Medium — only if feed cache gains filter/pagination dimensions beyond city |
| `cursor/critical-bug-investigation-9a92` | `c4f3918` | Email-verification gate inside `authenticate` via `isEmailVerificationEnforced()` toggle | `main` already gates verification (route-level `isVerified` 403s, e.g. swipe); branch rewrites the now-async `auth.js` from its old sync base | Low — verification gating already exists |
| `cursor/critical-bug-investigation-4fcb` | `c05837a` | "Close critical auth and listing regressions" — 24 files, mobile-heavy (CreateListing/EditListing/useAuthStore/israeliAddress) | Large diff on a stale mobile base; high conflict surface, no confirmed unique critical fix vs current `main` | Re-derive only if specific mobile bugs still reproduce |
| `wind/whatsapp-mobile-ui` | `ecbcbd7` | RN-web login card transition polish + old-`web/index.html` scroll-reveal animations | `web/` is superseded by deployed `web-next`; 88 commits behind; only the minor RN-web `LoginScreen` transition is salvageable | Cosmetic only |

**Already salvaged to `main`** during this cleanup: `382e` log-token redaction
(`sanitizeString` in `logSanitizer` + applied in `systemEventService`, 5/5 tests).
