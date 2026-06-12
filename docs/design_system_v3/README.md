# DirApp UI Design System v3.0 (Emerald & Navy Theme)

> **Handoff Specification for All Agents (Claude Code, Cursor, Windsurf/Antigravity)**
> This directory serves as the source of truth for the updated design system. Use this specification to ensure all screens, buttons, components, and colors match the new Emerald & Navy visual identity.

---

## 🎨 Core Color Palette (Stitch alignment)

The design system has transitioned from the previous theme to a high-contrast, premium **Teal/Emerald & Trust Navy** theme. 

| Token Name | Hex Code | Usage |
| :--- | :--- | :--- |
| **primary** | `#00091b` | Base text color, high-level typography titles, icons. |
| **primary-container** | `#002045` | Main container background, deep navy elements. |
| **on-primary-container** | `#7089b3` | Muted blue/grey text inside dark panels. |
| **secondary** | `#006b5f` | Primary branding teal, borders, secondary CTAs. |
| **secondary-container** | `#9cefdf` | Active navigation background, highlight panels. |
| **on-secondary-container** | `#0b6f63` | Rich teal text on light teal containers. |
| **background** / **surface** | `#f8f9ff` | Application canvas background (soft icy tint). |
| **surface-container-lowest** | `#ffffff` | Card backgrounds, search inputs, container shapes. |
| **surface-container-low** | `#f2f3f9` | List items on hover, disabled inputs. |
| **surface-container** | `#eceef3` | Input backgrounds, divider lines. |
| **surface-container-high** | `#e7e8ee` | Borders, elevated surfaces. |
| **surface-container-highest** | `#e1e2e8` | Disabled text, icons, borders. |
| **outline** | `#74777f` | Standard label outline, placeholders. |
| **outline-variant** | `#c4c6cf` | Light borders. |
| **on-surface** | `#191c20` | Body text. |
| **on-surface-variant** | `#44474e` | Secondary body text / captions. |
| **action-cta** | `#00cba9` | **Primary call-to-action button color** (Bright Emerald/Mint). |
| **action-cta-hover** | `#00b598` | Hover state for primary buttons. |

---

## 📐 Shape & Spacing Language

- **Corner Radii (`BorderRadius`):**
  - Card Containers: `rounded-2xl` (16px) — *Used for property cards, chat list containers, onboarding pages.*
  - Inputs & Medium Elements: `rounded-xl` (12px) — *Used for text fields, login cards, dialog containers.*
  - Buttons: `rounded-full` (9999px) — *Used for primary pills (e.g. login, onboarding continuation).*
  - Small Elements: `rounded-lg` (8px) — *Used for small chips, status badges.*
- **Spacings:**
  - `xs`: 4px
  - `sm`: 8px
  - `md`: 12px
  - `lg`: 16px
  - `xl`: 20px
  - `2xl`: 24px
  - `3xl`: 32px
  - `4xl`: 40px
  - `5xl`: 48px

---

## ✍️ Typography (Rubik Font)

All typography must use the **Rubik** font family.
- **Hero Title (`hero`):** `fontSize: "28px"`, `lineHeight: "32px"`, `fontWeight: "700"`
- **Hero Title Mobile (`hero-mobile`):** `fontSize: "24px"`, `lineHeight: "28px"`, `fontWeight: "700"`
- **Section Heading (`heading`):** `fontSize: "20px"`, `lineHeight: "24px"`, `fontWeight: "600"`
- **Sub-headline (`subhead`):** `fontSize: "16px"`, `lineHeight: "22px"`, `fontWeight: "600"`
- **Body Text (`body`):** `fontSize: "16px"`, `lineHeight: "26px"`, `fontWeight: "400"`
- **Label / Small Bold (`label`):** `fontSize: "14px"`, `lineHeight: "16px"`, `fontWeight: "500"`
- **Caption (`caption`):** `fontSize: "12px"`, `lineHeight: "14px"`, `fontWeight: "400"`
- **Micro Text (`micro`):** `fontSize: "10px"`, `lineHeight: "12px"`, `fontWeight: "500"`

---

## 📱 React Native Implementation Patterns

To implement this design in React Native screens (`mobile/src/screens/`), use the local styles defined in `react_native_guide.md` in this directory. 

Never use hardcoded hex values; instead, copy the custom style blocks and references from the guide or create a local constant representing these colors in your screen code.

## 📂 Source Mockups

The mockups generated in Stitch are saved inside:
`scratch/stitch_screens/`
- [Chats.html](file:///c:/apartmentapp-windsurf/scratch/stitch_screens/Chats.html)
- [Login.html](file:///c:/apartmentapp-windsurf/scratch/stitch_screens/Login.html)
- [SmartMap.html](file:///c:/apartmentapp-windsurf/scratch/stitch_screens/SmartMap.html)
- [ApartmentDetails.html](file:///c:/apartmentapp-windsurf/scratch/stitch_screens/ApartmentDetails.html)
- [Discovery.html](file:///c:/apartmentapp-windsurf/scratch/stitch_screens/Discovery.html)
- [Conversation.html](file:///c:/apartmentapp-windsurf/scratch/stitch_screens/Conversation.html)
- [Splash.html](file:///c:/apartmentapp-windsurf/scratch/stitch_screens/Splash.html)
- [Onboarding.html](file:///c:/apartmentapp-windsurf/scratch/stitch_screens/Onboarding.html)
- [Register.html](file:///c:/apartmentapp-windsurf/scratch/stitch_screens/Register.html)
- [Verification.html](file:///c:/apartmentapp-windsurf/scratch/stitch_screens/Verification.html)

Inspect these HTML files to find the exact structure, icons, and spacing layout for the screen you are building.
