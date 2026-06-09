# DirApp — Global Context for Stitch
> Paste this ONCE at the start of your Stitch project as context. Then paste each flow prompt separately.

## App Identity
- **Name:** DirApp (דיראפ)
- **Type:** Israeli Smart Rental Marketplace
- **Direction:** RTL (Hebrew-first)
- **Font:** Rubik (Google Fonts, all weights)

## Color Tokens
| Token | Hex | Usage |
|-------|-----|-------|
| Primary (Trust Blue) | #002045 | Headers, sidebar bg, branding |
| Primary Container | #1a365d | Gradients, dark cards |
| Secondary | #006b5f | Secondary buttons |
| Action Teal | #00cba9 | CTAs, active tabs, links, FABs |
| Secondary Container | #62fae3 | Light teal accents |
| Background | #f8f9ff | Page backgrounds |
| Surface Container Low | #eff4ff | Table headers, light cards |
| Surface Container | #e5eeff | Received chat bubbles, hover |
| On Surface | #0b1c30 | Primary text |
| On Surface Variant | #43474e | Secondary text |
| Outline | #74777f | Input borders, dividers |
| Outline Variant | #c4c6cf | Disabled borders |
| Error | #ba1a1a | Error text, destructive actions |
| Error Container | #ffdad6 | Error backgrounds |
| White | #ffffff | Cards, buttons text |

## Typography
| Style | Weight | Size | Line Height |
|-------|--------|------|-------------|
| Display | 800 | 48/40px (web/mobile) | 56/48 |
| Hero/H1 | 700 | 36/28px | 44/32 |
| H2/Title | 700 | 28/22px | 36/26 |
| H3/Heading | 600 | 22/20px | 30/24 |
| H4/Subhead | 600 | 18/16px | 26/22 |
| Body | 400 | 16px | 26 |
| Label | 500 | 14px | 20/16 |
| Caption | 400 | 12px | 16/14 |

## Shared Components
- **Buttons:** Primary (#00cba9 bg, white text, 24px radius, 48px height) | Secondary (outline) | Danger (#ba1a1a outline) | Disabled (#c4c6cf)
- **Inputs:** 48px height, 8px radius, #c4c6cf border, focus #00cba9
- **Cards:** White bg, 12px radius, shadow rgba(0,32,69,0.06)
- **Badges:** 24px height, 12px radius — green/yellow/red/blue/gray
- **Avatars:** Circular, 2px white border, online dot 12px green

## Platform Layouts
- **Mobile (390×844):** Single column, bottom tab bar (5 tabs), FAB buttons, bottom sheets
- **Web (1440×900):** Right sidebar (260px, #002045), top bar (64px, white), multi-column content

## Key Actors
| Actor | Hebrew | Color |
|-------|--------|-------|
| Tenant (שוכר) | שוכר | Blue badge |
| Landlord (משכיר) | משכיר | Green badge |
| Admin (אדמין) | אדמין | Red badge |
| Guarantor (ערב) | ערב | Purple badge |

## Rules
1. Build ALL screens listed — never ask "should I add more?"
2. Build ALL states per screen (loading, empty, error, success, edge cases)
3. Build screens for ALL actors specified in each flow
4. RTL: sidebar RIGHT, back arrows point RIGHT, text aligns RIGHT
