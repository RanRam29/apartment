/**
 * DirApp Design System — canonical tokens from DESIGN.md under .cursor dirapp_design_system folders.
 * Single source for Stitch/Figma alignment (Trust Blue + Action Teal + Rubik).
 */
export const dirApp = {
  surface: '#f8fafc',
  surfaceDim: '#cbd5e1',
  surfaceBright: '#f8fafc',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#f1f5f9',
  surfaceContainer: '#e2e8f0',
  surfaceContainerHigh: '#cbd5e1',
  surfaceContainerHighest: '#94a3b8',
  onSurface: '#0f172a',
  onSurfaceVariant: '#475569',
  inverseSurface: '#1e293b',
  inverseOnSurface: '#f8fafc',
  outline: '#94a3b8',
  outlineVariant: '#e2e8f0',
  surfaceTint: '#475569',
  primary: '#0f172a',
  onPrimary: '#ffffff',
  primaryContainer: '#1e293b',
  onPrimaryContainer: '#94a3b8',
  inversePrimary: '#cbd5e1',
  secondary: '#0047ba',
  onSecondary: '#ffffff',
  secondaryContainer: '#eff6ff',
  onSecondaryContainer: '#0047ba',
  /** Handoff “Action Teal” — interactive accent (tabs, links, key CTAs) */
  actionTeal: '#0047ba',
  tertiary: '#321b00',
  onTertiary: '#ffffff',
  error: '#ba1a1a',
  onError: '#ffffff',
  errorContainer: '#ffdad6',
  background: '#f8fafc',
  onBackground: '#0f172a',
} as const;

export type DirAppColorKey = keyof typeof dirApp;
