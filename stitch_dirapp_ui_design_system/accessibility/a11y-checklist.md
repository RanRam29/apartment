# Accessibility Checklist

Use this checklist for all screens in `stitch_dirapp_ui_design_system1`.

## Controls

- Every icon-only `button` has a clear `aria-label`.
- Every input has an associated label or equivalent accessible name.
- Touch targets are at least 44x44 px for primary actions.

## Focus + Keyboard

- Interactive elements have visible focus styles.
- No keyboard traps in modal or overlay flows.
- Logical tab order: top bar -> content -> bottom controls.

## Semantics

- Use `header`, `main`, `nav`, `footer` landmarks consistently.
- Use heading levels in order (`h1` then `h2`, etc.).
- Ensure CTA buttons use `<button>` and links use `<a>`.

## Visual Accessibility

- Verify contrast for text over image overlays.
- Verify contrast for text over glassmorphism layers.
- Do not rely on color alone for critical status.

## QA Gate

- Run a manual screen-reader smoke test on key flows:
  - Login
  - Home feed interactions
  - Apartment detail CTA
  - Chat send message flow
