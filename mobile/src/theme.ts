export const C = {
  // Brand palette
  navy:    '#2C3E50',
  cyan:    '#00E5FF',
  coral:   '#FF7F7F',
  bg:      '#F8FAFC',
  bgCard:  '#FFFFFF',

  // Text
  text:    '#2C3E50',
  textSub: '#6B7280',
  textMut: '#9CA3AF',

  // Borders / dividers
  border:  '#E5E7EB',
  borderLight: '#F3F4F6',

  // Status / feedback
  gold:    '#F59E0B',
  success: '#10B981',
  danger:  '#EF4444',

  // Overlays
  navyAlpha: (opacity: number) => `rgba(44,62,80,${opacity})`,
  cyanAlpha:  (opacity: number) => `rgba(0,229,255,${opacity})`,
  coralAlpha: (opacity: number) => `rgba(255,127,127,${opacity})`,
} as const;
