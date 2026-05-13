import type { ColorSchemeName } from 'react-native';
import { dirApp } from './theme/dirAppTokens';

/**
 * DirApp — global palette (tier 1).
 * Anchored to `dirApp` tokens (DESIGN.md). Use semantic exports in UI instead of raw hex.
 */
export const C = {
  // ── Brand palette (DirApp) ────────────────────────────
  /** Trust Blue — headings / chrome (alias: primary container) */
  navy: dirApp.primaryContainer,
  navyMid: '#2C3E50',
  /** Deep primary — large surfaces, swipe-like CTA fill */
  primary: dirApp.primary,
  primaryContainer: dirApp.primaryContainer,
  secondaryTeal: dirApp.secondary,
  /** Action Teal — tabs, links, conversion accents (replaces neon cyan) */
  cyan: dirApp.actionTeal,
  coral: '#FF7F7F',
  bg: dirApp.background,
  bgCard: dirApp.surfaceContainerLowest,

  // ── Text ─────────────────────────────────────────────
  text: dirApp.onBackground,
  textSub: dirApp.onSurfaceVariant,
  textMut: dirApp.outline,

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
    tabBarLight: 'rgba(248, 249, 255, 0.94)',
    tabBarDark: 'rgba(33, 49, 69, 0.94)',
  },

  // ── Glass surface tokens (for React Native) ──────────
  glass: {
    lightBg: 'rgba(255, 255, 255, 0.82)',
    lightBorder: 'rgba(255, 255, 255, 0.60)',
    navyBg: 'rgba(22, 40, 57, 0.72)',
    navyBorder: 'rgba(22, 40, 57, 0.15)',
    surfaceBg: 'rgba(22, 40, 57, 0.05)',
    surfaceBorder: 'rgba(22, 40, 57, 0.10)',
    shadowColor: dirApp.primary,
    shadowLight: {
      shadowColor: dirApp.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
      elevation: 4,
    },
    shadowMedium: {
      shadowColor: dirApp.primary,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 24,
      elevation: 8,
    },
    shadowStrong: {
      shadowColor: dirApp.primary,
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

  navyAlpha: (opacity: number) => `rgba(26,54,93,${opacity})`,
  navyMidAlpha: (opacity: number) => `rgba(44,62,80,${opacity})`,
  cyanAlpha: (opacity: number) => `rgba(0,203,169,${opacity})`,
  coralAlpha: (opacity: number) => `rgba(255,127,127,${opacity})`,
  violetAlpha: (opacity: number) => `rgba(124,58,237,${opacity})`,
  successAlpha: (opacity: number) => `rgba(16,185,129,${opacity})`,
  goldAlpha: (opacity: number) => `rgba(245,158,11,${opacity})`,
  negativeAlpha: (opacity: number) => `rgba(239,68,68,${opacity})`,
  dangerMutedAlpha: (opacity: number) => `rgba(186,26,26,${opacity})`,
} as const;

/** Typography scale — Rubik; aligns with DESIGN.md type ramp */
export const typography = {
  size: {
    xs: 10,
    sm: 12,
    md: 14,
    base: 13,
    body: 16,
    lg: 18,
    xl: 16,
    '2xl': 17,
    '3xl': 24,
    title: 20,
    hero: 26,
    display: 40,
  },
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
  bg: dirApp.inverseSurface,
  surface: C.navyMid,
  inset: dirApp.inverseSurface,
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
        tabBarShadow: dirApp.inverseSurface,
        headerBackground: Dark.surface,
        headerTint: C.onInverse.primary,
      },
    };
  }
  return {
    colorScheme,
    colors: {
      shellBackground: dirApp.background,
      tabBarBackground: C.chrome.tabBarLight,
      tabBarShadow: dirApp.primary,
      headerBackground: dirApp.surfaceContainerLowest,
      headerTint: dirApp.primaryContainer,
    },
  };
}
