export const C = {
  // ── Brand palette (Aura Luxury) ──────────────────────
  navy:    '#162839',      // Deep Charcoal Blue (primary)
  navyMid: '#2C3E50',     // Mid navy for interactive states
  cyan:    '#00E5FF',      // Electric Light Blue (action)
  coral:   '#FF7F7F',      // Soft Coral (expressive actions)
  bg:      '#FBFAFA',      // Surface (Aura Luxury surface)
  bgCard:  '#FFFFFF',      // Surface container lowest

  // ── Text ─────────────────────────────────────────────
  text:    '#1B1C1D',      // on-surface
  textSub: '#43474C',      // on-surface-variant
  textMut: '#74777D',      // outline

  // ── Borders / dividers ───────────────────────────────
  border:      '#C4C6CD',  // outline-variant
  borderLight: '#E9E8E9',  // surface-container-high

  // ── Status / feedback ────────────────────────────────
  gold:    '#F59E0B',
  success: '#10B981',
  danger:  '#BA1A1A',      // Aura Luxury error color

  // ── Glass surface tokens (for React Native) ──────────
  glass: {
    // Light glass (translucent white — for floating elements)
    lightBg:     'rgba(255, 255, 255, 0.82)',
    lightBorder: 'rgba(255, 255, 255, 0.60)',

    // Navy glass (for dark overlays on images)
    navyBg:     'rgba(22, 40, 57, 0.72)',
    navyBorder: 'rgba(22, 40, 57, 0.15)',

    // Surface glass (for cards on white background)
    surfaceBg:     'rgba(22, 40, 57, 0.05)',
    surfaceBorder: 'rgba(22, 40, 57, 0.10)',

    // Shadows (React Native shadow props)
    shadowColor:   '#162839',
    shadowLight: {
      shadowColor: '#162839',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
      elevation: 4,
    },
    shadowMedium: {
      shadowColor: '#162839',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 24,
      elevation: 8,
    },
    shadowStrong: {
      shadowColor: '#162839',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.18,
      shadowRadius: 32,
      elevation: 12,
    },
  },

  // ── Animation durations (ms) ─────────────────────────
  duration: {
    fast:   150,
    normal: 300,
    slow:   500,
    spring: { tension: 100, friction: 10 }, // for Animated.spring
  },

  // ── Alpha helpers ─────────────────────────────────────
  navyAlpha:  (opacity: number) => `rgba(22,40,57,${opacity})`,
  navyMidAlpha: (opacity: number) => `rgba(44,62,80,${opacity})`,
  cyanAlpha:  (opacity: number) => `rgba(0,229,255,${opacity})`,
  coralAlpha: (opacity: number) => `rgba(255,127,127,${opacity})`,
} as const;
