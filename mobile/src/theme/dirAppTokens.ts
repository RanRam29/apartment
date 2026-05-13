/**
 * DirApp Design System — canonical tokens from DESIGN.md under .cursor dirapp_design_system folders.
 * Single source for Stitch/Figma alignment (Trust Blue + Action Teal + Rubik).
 */
export const dirApp = {
  surface: '#f8f9ff',
  surfaceDim: '#cbdbf5',
  surfaceBright: '#f8f9ff',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#eff4ff',
  surfaceContainer: '#e5eeff',
  surfaceContainerHigh: '#dce9ff',
  surfaceContainerHighest: '#d3e4fe',
  onSurface: '#0b1c30',
  onSurfaceVariant: '#43474e',
  inverseSurface: '#213145',
  inverseOnSurface: '#eaf1ff',
  outline: '#74777f',
  outlineVariant: '#c4c6cf',
  surfaceTint: '#455f88',
  primary: '#002045',
  onPrimary: '#ffffff',
  primaryContainer: '#1a365d',
  onPrimaryContainer: '#86a0cd',
  inversePrimary: '#adc7f7',
  secondary: '#006b5f',
  onSecondary: '#ffffff',
  secondaryContainer: '#62fae3',
  onSecondaryContainer: '#007165',
  /** Handoff “Action Teal” — interactive accent (tabs, links, key CTAs) */
  actionTeal: '#00cba9',
  tertiary: '#321b00',
  onTertiary: '#ffffff',
  error: '#ba1a1a',
  onError: '#ffffff',
  errorContainer: '#ffdad6',
  background: '#f8f9ff',
  onBackground: '#0b1c30',
} as const;

export type DirAppColorKey = keyof typeof dirApp;
