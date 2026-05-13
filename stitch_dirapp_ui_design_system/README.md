# DirApp UI Design System

This directory contains the extracted UI design artifacts for DirApp.

## Canonical Source

- Canonical version: `stitch_dirapp_ui_design_system1`
- Legacy duplicate: `stitch_dirapp_ui_design_system2` (do not edit for new work)

## What Was Standardized

- Added centralized design tokens in `tokens/design-tokens.json`
- Added shared Tailwind preset in `tokens/tailwind.preset.js`
- Added browser preset entrypoint in `tokens/tailwind.browser.js`
- Added componentization plan in `components/component-plan.md`
- Added accessibility rollout checklist in `accessibility/a11y-checklist.md`
- Wired all canonical screens in `stitch_dirapp_ui_design_system1` to `tokens/tailwind.browser.js`

## Migration Guidance

Current screens still include inline `tailwind.config` blocks. For future edits:

1. Keep `tokens/tailwind.browser.js` as the only runtime token source for static HTML previews.
2. Remove legacy inline token blocks after final visual QA.
3. For framework integration, use `tokens/tailwind.preset.js`.
4. Replace repeated UI patterns with shared components from `components/component-plan.md`.

## Screen Inventory (Canonical)

- `startup_splash_screen/code.html`
- `user_type_selection/code.html`
- `login_screen_rebuilt/code.html`
- `signup_screen/code.html`
- `onboarding/code.html`
- `apartment_detail/code.html`
- `my_matches/code.html`
- `login_screen/code.html`
- `_/code.html`
- `home_feed/code.html`
- `chat_window/code.html`
- `match_screen/code.html`
- `user_profile/code.html`
