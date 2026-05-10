---
name: ui-ux-pro-max-plugin-setup
description: Registers the NextLevelBuilder GitHub marketplace and installs the UI/UX Pro Max Cursor plugin (design intelligence skill bundle). Use when the user wants UI UX Pro Max, nextlevelbuilder/ui-ux-pro-max-skill, uipro design system skill in Cursor, or mentions /add-plugin, /plugin marketplace add, or ui-ux-pro-max@ui-ux-pro-max-skill.
---

# UI/UX Pro Max — Cursor plugin setup

This skill is an **install and verify** guide for the [UI/UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) distribution in Cursor via the **plugin marketplace** flow. It does not replace the plugin’s own skill content; after installation, follow the plugin’s bundled skills for design workflows.

## When to use this skill

- The user asks to add **NextLevelBuilder**’s marketplace or install **UI/UX Pro Max** as a **Cursor plugin** (not only copying files into `.cursor/skills/`).
- The user pastes or references `/add-plugin`, `/plugin marketplace add`, or the install line and wants them applied or explained.

## Prerequisites

- Cursor build that supports **Plugins** and **plugin slash commands** such as `/add-plugin` or `/plugin` (if a command is missing, update Cursor or use the fallback in “Alternative install” below).
- Network access to resolve the GitHub-backed marketplace `nextlevelbuilder/ui-ux-pro-max-skill`.

## Install sequence (marketplace + plugin)

Run these **in Cursor Agent chat** in order (same chat is fine):

1. **Register the marketplace** (GitHub slug `owner/repo`). Use whichever command your Cursor build exposes:

   ```text
   /add-plugin nextlevelbuilder/ui-ux-pro-max-skill
   ```

   If that command is not available, try:

   ```text
   /plugin marketplace add nextlevelbuilder/ui-ux-pro-max-skill
   ```

2. **Install the plugin package** (plugin id `@` skill id from that marketplace):

   ```text
   /plugin install ui-ux-pro-max@ui-ux-pro-max-skill
   ```

If either command errors, capture the exact message; common fixes are updating Cursor, retrying after restart, or confirming the marketplace add succeeded before install.

## After install

1. Open **Cursor Settings → Rules** (or the **Rules / Skills** surface your build uses).
2. Confirm **skills** from the plugin appear and are set appropriately (for example **Agent Decides** vs **Always**), per [Plugins](https://cursor.com/docs/plugins).
3. For **UI/UX implementation work**, prefer invoking the **plugin’s** UI/UX Pro Max skill(s) so palettes, typography, and anti-patterns stay aligned with upstream.

## Alternative install (project files, no plugin)

If `/plugin` is unavailable, the upstream project documents a CLI init path for Cursor (for example `uipro init --ai cursor`), which materializes skill folders under the project. Use the official guide for your version: [UI/UX Pro Max — Cursor](https://mintlify.com/nextlevelbuilder/ui-ux-pro-max-skill/platforms/cursor).

## Reference

- Source repo: [github.com/nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)
- Cursor plugins overview: [cursor.com/docs/plugins](https://cursor.com/docs/plugins)
