---
name: Aura Luxury
colors:
  surface: '#fbf9fa'
  surface-dim: '#dbd9db'
  surface-bright: '#fbf9fa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f3f4'
  surface-container: '#efedef'
  surface-container-high: '#e9e8e9'
  surface-container-highest: '#e4e2e3'
  on-surface: '#1b1c1d'
  on-surface-variant: '#43474c'
  inverse-surface: '#303032'
  inverse-on-surface: '#f2f0f2'
  outline: '#74777d'
  outline-variant: '#c4c6cd'
  surface-tint: '#4e6073'
  primary: '#162839'
  on-primary: '#ffffff'
  primary-container: '#2c3e50'
  on-primary-container: '#96a9be'
  inverse-primary: '#b5c8df'
  secondary: '#a43a3d'
  on-secondary: '#ffffff'
  secondary-container: '#ff7f7f'
  on-secondary-container: '#74161e'
  tertiary: '#362308'
  on-tertiary: '#ffffff'
  tertiary-container: '#4e381c'
  on-tertiary-container: '#c1a17d'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d1e4fb'
  primary-fixed-dim: '#b5c8df'
  on-primary-fixed: '#091d2e'
  on-primary-fixed-variant: '#36485b'
  secondary-fixed: '#ffdad8'
  secondary-fixed-dim: '#ffb3b1'
  on-secondary-fixed: '#410007'
  on-secondary-fixed-variant: '#842228'
  tertiary-fixed: '#ffddb7'
  tertiary-fixed-dim: '#e3c19b'
  on-tertiary-fixed: '#291802'
  on-tertiary-fixed-variant: '#5a4225'
  background: '#fbf9fa'
  on-background: '#1b1c1d'
  surface-variant: '#e4e2e3'
typography:
  display-lg:
    fontFamily: Assistant
    fontSize: 32px
    fontWeight: '300'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Assistant
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Assistant
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Assistant
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  label-bold:
    fontFamily: Assistant
    fontSize: 14px
    fontWeight: '700'
    lineHeight: '1.2'
  caption:
    fontFamily: Assistant
    fontSize: 12px
    fontWeight: '400'
    lineHeight: '1.4'
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  grid-columns: '4'
  gutter: 20px
  margin: 24px
  section-gap: 48px
  thumb-zone-height: 33%
---

## Brand & Style

The design system is centered on "Effortless Opulence." It targets a high-net-worth demographic that values time, clarity, and aesthetic precision. The UI must evoke the feeling of a high-end editorial magazine—quiet, confident, and spacious. 

The visual style merges **Minimalism** with **Glassmorphism**. By prioritizing expansive negative space and a restricted color palette, the system ensures that the property photography remains the protagonist. Modernity is introduced through a floating navigation layer that uses frosted-glass effects, providing a sense of depth and physical presence without cluttering the viewport.

## Colors

The palette is designed to balance authority with digital energy. 
- **Deep Charcoal Blue** serves as the grounding force, used for all primary communication, branding, and high-level hierarchy. 
- **Electric Light Blue** acts as the "action" thread, highlighting the swiping mechanism and primary calls-to-action with a high-visibility, tech-forward glow.
- **Soft Coral** provides a sophisticated emotional counterpoint, reserved for expressive actions like liking or dismissing. 
- **Light Gray** and **White** are utilized extensively to create "breathing room," ensuring the interface feels light and premium rather than dense.

## Typography

The typography strategy leverages the **Assistant** typeface to achieve an "architectural" feel. 
- **Light weights** are the signature for property names and section headers, creating an elegant, airy aesthetic.
- **Bold weights** are used surgically for functional data points—specifically pricing and square footage—to ensure immediate legibility amidst the white space.
- **Letter spacing** should be slightly increased for captions and labels to enhance the premium, "gallery-style" feel.

## Layout & Spacing

This design system utilizes a **Fixed Mobile Grid** with high-density margins.
- **The 4-column grid** is paired with generous 24px outer margins to push content inward, framing it like a piece of art.
- **Negative Space:** Elements should never feel "packed." Vertical rhythm is driven by large gaps (48px+) between distinct content blocks to reduce cognitive load.
- **Thumb Zone Optimization:** All high-frequency interactions (Swiping, Favoriting, Contacting) are localized within the bottom 33% of the screen. The top of the screen is strictly for visual consumption and passive information.

## Elevation & Depth

Depth is used to signify "interactivity" versus "content."
- **Glassmorphism:** The floating bottom navigation bar and secondary action overlays use a 20px backdrop blur with a 15% white tint. This creates a "hovering" effect that maintains context of the property images behind it.
- **Ambient Shadows:** Action buttons (the swipe triggers) utilize a 12% opacity Deep Charcoal Blue shadow with a 20px blur and 8px Y-offset. This "soft lift" makes them feel tactile and pressable without the harshness of traditional drop shadows.
- **Flat Base:** The main property cards and background layers remain strictly flat to maintain the minimalist aesthetic.

## Shapes

The shape language combines "Hard-Soft" geometry.
- **Property Cards:** Use a 24px corner radius to soften the large photographic containers, making the app feel approachable.
- **CTAs & Actions:** Utilize pill-shaped (100px) rounding. The organic, circular nature of these buttons distinguishes them from the structural, rectangular layout of the property data.
- **Input Fields:** Use a subtle 8px radius to maintain a professional, clean edge.

## Components

- **Floating Navigation:** A glassmorphic dock at the bottom of the screen. Icons are minimalist 1.5pt line art. No labels; the iconography must be intuitive.
- **Action Buttons:** Large circular buttons for "Dismiss" (Coral) and "Save" (Electric Blue). These should have the defined soft shadows and be sized for easy thumb access.
- **Property Chips:** Small, transparent tags with a 1px Charcoal border used to display amenities (e.g., "Gym," "Pool").
- **Glass Cards:** Used for property details that overlay the main image. Must feature a blur effect to ensure text legibility over diverse photo backgrounds.
- **Interactive Indicators:** Subtle progress bars at the top of property images to indicate the number of photos available in the stack.