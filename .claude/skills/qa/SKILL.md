---
name: qa
description: Run full manual QA test suite against DirApp production using Chrome browser automation. Tests all critical flows — login, listings, leads, chat, contracts, dashboard, profile, admin. Generates a pass/fail report.
---

# QA — Full Manual Test Suite

## Overview

This skill runs a complete QA sweep of DirApp production using Chrome browser automation (Claude in Chrome MCP). It simulates a real user navigating every critical flow, verifying UI elements render correctly, API calls succeed, and features work end-to-end.

## Prerequisites

- Chrome browser connected via Claude in Chrome MCP
- Production app accessible at `https://apartment-olive.vercel.app`
- Test credentials: `admin2@dirapp.com` / `Admin1234!`

## Execution Protocol

**This is a RIGID skill — follow exactly. Do not skip steps.**

### Step 0: Setup

1. Call `tabs_context_mcp` with `createIfEmpty: true` to get/create a tab
2. Create a new tab with `tabs_create_mcp`
3. Navigate to `https://apartment-olive.vercel.app`
4. Take a screenshot to confirm the app loaded
5. Initialize the results tracker:

```
QA Results = {
  timestamp: <now>,
  environment: "production",
  url: "https://apartment-olive.vercel.app",
  tests: []
}
```

### Step 1: Login Flow

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 1.1 | Login page loads | Navigate to /login | Email + password fields visible |
| 1.2 | Login with valid credentials | Enter `admin2@dirapp.com` / `Admin1234!`, submit | Redirect to main app, no errors |
| 1.3 | User session active | Check for user avatar/menu in header | User name or avatar visible |

**How to execute:**
- Use `find` to locate email input, password input, login button
- Use `form_input` or `computer` type action to fill credentials
- Use `computer` click to submit
- Take screenshot after each step
- Check `read_console_messages` for errors after login

### Step 2: Dashboard (Landlord)

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 2.1 | Dashboard loads | Navigate to dashboard/home | Dashboard screen renders |
| 2.2 | Stats are real numbers | Read stats cards | No "150%", no NaN, no hardcoded values |
| 2.3 | Leads count matches | Compare displayed lead count | Number >= 0, matches API |

**How to execute:**
- Take screenshot of dashboard
- Use `read_page` to extract stat values
- Check console for API errors
- Verify no "undefined", "NaN", or impossible percentages

### Step 3: Listings (My Properties)

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 3.1 | Listings page loads | Navigate to listings | Property cards visible OR "no listings" message |
| 3.2 | Action buttons visible | Check each listing card | Delete, pause, edit buttons present |
| 3.3 | Delete button works | Tap delete on a listing | Confirmation dialog appears (DO NOT confirm — cancel) |

**How to execute:**
- Navigate to listings screen
- Screenshot + read_page for button elements
- If listings exist, test one action button (cancel the dialog — don't actually delete)

### Step 4: Leads Screen

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 4.1 | Leads page loads | Navigate to leads | Lead cards visible OR "no leads" message |
| 4.2 | Tenant contact info | Check a lead card | Phone/email/WhatsApp buttons visible |
| 4.3 | Accept button present | Check lead actions | "Accept" / "אשר" button visible |
| 4.4 | Verified badge | Check tenant avatar | "מאומת ✓" badge if tenant is verified |

### Step 5: Chat

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 5.1 | Chat list loads | Navigate to chats | Chat list renders, no crash |
| 5.2 | No placeholder images | Check avatars | No `via.placeholder.com` errors in console |
| 5.3 | Chat opens | Tap a chat (if exists) | Chat screen opens with message input |

### Step 6: Profile

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 6.1 | Profile loads | Navigate to profile | User info displayed |
| 6.2 | Role switch button | Check for switch role button | Button visible and labeled |
| 6.3 | Trust score displayed | Check trust score section | Score >= 50, not 0 |

### Step 7: Contract Flow (Read-Only Check)

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 7.1 | Contracts page loads | Navigate to contracts | Contract list or "no contracts" |
| 7.2 | Contract detail | Tap a contract (if exists) | Detail screen with status, dates, parties |

### Step 8: Console & Network Health

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 8.1 | No JS errors | Read console messages | No uncaught errors or exceptions |
| 8.2 | No failed API calls | Read network requests | No 4xx/5xx on core endpoints |
| 8.3 | No broken images | Check console for image errors | No ERR_CONNECTION_CLOSED on images |

**How to execute:**
- `read_console_messages` with `onlyErrors: true`
- `read_network_requests` and filter for failed status codes

### Step 9: Generate Report

After all tests, compile results into a formatted report:

```markdown
# QA Report — DirApp Production
**Date:** <timestamp>
**Tester:** Claude Code (AI QA)
**Environment:** Production (apartment-olive.vercel.app)

## Summary
- Total tests: X
- ✅ Passed: X
- ❌ Failed: X
- ⚠️ Skipped: X (reason)

## Results by Section
### 1. Login
- [✅/❌] 1.1 Login page loads — <notes>
- [✅/❌] 1.2 Login with valid credentials — <notes>
...

## Failed Tests (Detail)
### ❌ X.X — <test name>
- **Expected:** ...
- **Got:** ...
- **Screenshot:** (describe what was seen)
- **Console errors:** (if any)
- **Suggested fix:** ...

## Recommendations
- ...
```

Output the report as a text response to the user. If any test fails, flag it clearly with suggested next steps.

## Important Rules

1. **NEVER delete real data** — if testing delete, always cancel the confirmation dialog
2. **NEVER submit forms that create real records** — read-only verification only
3. **Screenshot every screen** — visual evidence for the report
4. **Check console after every navigation** — catch silent errors
5. **If the app is down** — report immediately, don't try to continue
6. **If login fails** — stop and report, all other tests depend on auth
7. **RTL awareness** — the app is in Hebrew, buttons may be right-aligned
