# DirApp Componentization Plan

This plan maps repeated screen patterns into reusable components.

## Core Components (Phase 1)

1. `AppTopBar`
   - Variants: `default`, `chat`, `detail-overlay`
   - Slots: leading action, title block, trailing actions

2. `BottomNavDock`
   - Variants: `standard`, `hidden-on-task-screen`
   - Item states: `default`, `active`

3. `PrimaryCtaButton`
   - Variants: `primary`, `secondary`, `glass`, `danger`
   - States: `default`, `hover`, `pressed`, `disabled`, `loading`

4. `IconActionButton`
   - Variants: `filled`, `outlined`, `glass`
   - Requirement: always pass `ariaLabel`

5. `InputField`
   - Variants: `email`, `password`, `search`, `message`
   - Features: prefix icon, validation state, helper/error text

6. `PropertyCard`
   - Variants: `feed`, `compact`, `detail-hero`
   - Regions: media, indicators, metadata, chips, overlays

7. `PropertyChip`
   - Variants: `outlined`, `glass`, `solid`

8. `PhotoStackIndicator`
   - Inputs: total, current, activeColor, inactiveColor

## Screen Mapping

- `home_feed`: `AppTopBar`, `PropertyCard`, `IconActionButton`, `BottomNavDock`, `PhotoStackIndicator`
- `apartment_detail`: `AppTopBar` (overlay), `PropertyCard(detail)`, `PropertyChip`, `PrimaryCtaButton`
- `chat_window`: `AppTopBar(chat)`, `InputField(message)`, `IconActionButton`
- Auth screens: `InputField`, `PrimaryCtaButton`

## Implementation Rules

- No per-screen token definitions.
- No icon-only button without `aria-label`.
- All component colors and spacing must come from shared tokens.
