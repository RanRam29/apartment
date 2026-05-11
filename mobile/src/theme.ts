import type { ColorSchemeName } from 'react-native';

/**
 * DirApp — global palette (tier 1).
 * Use semantic exports (`onInverse`, `overlay`, `statusTone`) in UI instead of raw hex.
 */
export const C = {
  // ── Brand palette (DirApp) ────────────────────────────
  navy: '#162839',
  navyMid: '#2C3E50',
  cyan: '#00E5FF',
  coral: '#FF7F7F',
  bg: '#FBFAFA',
  bgCard: '#FFFFFF',

  // ── Text ─────────────────────────────────────────────
  text: '#1B1C1D',
  textSub: '#43474C',
  textMut: '#74777D',

  // ── Borders / dividers ───────────────────────────────
  border: '#C4C6CD',
  borderLight: '#E9E8E9',

  // ── Status / feedback (canonical) ────────────────────
  gold: '#F59E0B',
  success: '#10B981',
  danger: '#BA1A1A',

  /** Text & icons on dark / saturated surfaces */
  onInverse: {
    primary: '#FFFFFF',
    secondary: '#E8E8EC',
    tertiary: '#C8C8D4',
    muted: 'rgba(255,255,255,0.72)',
    faint: 'rgba(255,255,255,0.45)',
    subtle: 'rgba(255,255,255,0.65)',
  },

  /** Scrim & backdrop overlays */
  overlay: {
    scrim40: 'rgba(0,0,0,0.4)',
    scrim45: 'rgba(0,0,0,0.45)',
    scrim50: 'rgba(0,0,0,0.5)',
    scrim60: 'rgba(0,0,0,0.6)',
    scrim65: 'rgba(0,0,0,0.65)',
    scrim94: 'rgba(0,0,0,0.94)',
    imageGradientEnd: 'rgba(0,0,0,0.72)',
  },

  surface: {
    imageCarousel: '#111122',
  },

  /** Data viz & status chips — replaces scattered #F39C12 / #00C9A7 / #FF7675 */
  statusTone: {
    positive: '#10B981',
    caution: '#F59E0B',
    negative: '#EF4444',
    negativeSoft: '#FF7F7F',
  },

  accent: {
    violet: '#7C3AED',
    blue: '#0984E3',
    bronze: '#CD7F32',
  },

  /** Inputs on dark navy panels */
  field: {
    placeholder: '#8B8BA8',
  },

  /** Tab bar / chrome (ties to shell background) */
  chrome: {
    tabBarLight: 'rgba(251, 250, 250, 0.88)',
    tabBarDark: 'rgba(22, 40, 57, 0.92)',
  },

  // ── Glass surface tokens (for React Native) ──────────
  glass: {
    lightBg: 'rgba(255, 255, 255, 0.82)',
    lightBorder: 'rgba(255, 255, 255, 0.60)',
    navyBg: 'rgba(22, 40, 57, 0.72)',
    navyBorder: 'rgba(22, 40, 57, 0.15)',
    surfaceBg: 'rgba(22, 40, 57, 0.05)',
    surfaceBorder: 'rgba(22, 40, 57, 0.10)',
    shadowColor: '#162839',
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

  duration: {
    fast: 150,
    normal: 300,
    slow: 500,
    spring: { tension: 100, friction: 10 },
  },

  navyAlpha: (opacity: number) => `rgba(22,40,57,${opacity})`,
  navyMidAlpha: (opacity: number) => `rgba(44,62,80,${opacity})`,
  cyanAlpha: (opacity: number) => `rgba(0,229,255,${opacity})`,
  coralAlpha: (opacity: number) => `rgba(255,127,127,${opacity})`,
  violetAlpha: (opacity: number) => `rgba(124,58,237,${opacity})`,
  successAlpha: (opacity: number) => `rgba(16,185,129,${opacity})`,
  goldAlpha: (opacity: number) => `rgba(245,158,11,${opacity})`,
  negativeAlpha: (opacity: number) => `rgba(239,68,68,${opacity})`,
  dangerMutedAlpha: (opacity: number) => `rgba(186,26,26,${opacity})`,
} as const;

/** Typography scale (use for new / refactored UI) */
export const typography = {
  size: { xs: 10, sm: 11, md: 12, base: 13, body: 14, lg: 15, xl: 16, '2xl': 17, '3xl': 18, title: 20, hero: 22, display: 26 },
  weight: { normal: '400' as const, medium: '500' as const, semibold: '600' as const, bold: '700' as const, extrabold: '800' as const },
  lineHeight: { tight: 16, normal: 20, relaxed: 22 },
} as const;

/** Spacing scale (4px base) */
export const space = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 32,
  8: 40,
  9: 48,
} as const;

/**
 * Dark screens (navy + cyan). Replaces legacy purple (#6C5CE7) + violet-gray surfaces.
 */
export const Dark = {
  bg: C.navy,
  surface: C.navyMid,
  inset: C.navy,
  border: C.cyanAlpha(0.14),
  borderStrong: C.cyanAlpha(0.22),
  chipActive: C.cyanAlpha(0.18),
  periodActive: C.cyanAlpha(0.28),
  switchTrackOff: C.navyMidAlpha(0.95),
  switchTrackOn: C.cyanAlpha(0.5),
} as const;

export type AppColorScheme = 'light' | 'dark';

export type AppTheme = {
  colorScheme: AppColorScheme;
  colors: {
    shellBackground: string;
    tabBarBackground: string;
    tabBarShadow: string;
    headerBackground: string;
    headerTint: string;
  };
};

export function resolveColorScheme(scheme: ColorSchemeName | null | undefined): AppColorScheme {
  return scheme === 'dark' ? 'dark' : 'light';
}

export function buildAppTheme(scheme: ColorSchemeName | null | undefined): AppTheme {
  const colorScheme = resolveColorScheme(scheme);
  if (colorScheme === 'dark') {
    return {
      colorScheme,
      colors: {
        shellBackground: Dark.bg,
        tabBarBackground: C.chrome.tabBarDark,
        tabBarShadow: C.navy,
        headerBackground: Dark.surface,
        headerTint: C.onInverse.primary,
      },
    };
  }
  return {
    colorScheme,
    colors: {
      shellBackground: C.bg,
      tabBarBackground: C.chrome.tabBarLight,
      tabBarShadow: C.navy,
      headerBackground: C.bgCard,
      headerTint: C.navy,
    },
  };
}
