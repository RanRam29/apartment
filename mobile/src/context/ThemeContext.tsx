import React, { createContext, useContext, useState } from 'react';
import { useColorScheme } from 'react-native';
import { C, Dark } from '../theme';
import { dirApp } from '../theme/dirAppTokens';

export type ThemeMode = 'light' | 'dark' | 'system';

export type AppColors = {
  bg: string;
  bgCard: string;
  surface: string;
  text: string;
  textSub: string;
  textMut: string;
  border: string;
  borderStrong: string;
  inputBg: string;
  isDark: boolean;
};

const LIGHT: AppColors = {
  bg: '#f8fafc',
  bgCard: '#ffffff',
  surface: '#f1f5f9',
  text: '#0f172a',
  textSub: '#475569',
  textMut: '#94a3b8',
  border: '#e2e8f0',
  borderStrong: '#cbd5e1',
  inputBg: '#ffffff',
  isDark: false,
};

const DARK_COLORS: AppColors = {
  bg: Dark.bg,
  bgCard: Dark.surface,
  surface: '#253850',
  text: C.onInverse.primary,
  textSub: C.onInverse.secondary,
  textMut: C.onInverse.muted,
  border: Dark.border,
  borderStrong: C.cyanAlpha(0.28),
  inputBg: Dark.surface,
  isDark: true,
};

type ThemeCtx = {
  mode: ThemeMode;
  colors: AppColors;
  isDark: boolean;
  setMode: (m: ThemeMode) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeCtx>({
  mode: 'system',
  colors: LIGHT,
  isDark: false,
  setMode: () => {},
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');

  const setMode = (m: ThemeMode) => {
    setModeState(m);
  };

  const isDark =
    mode === 'dark' || (mode === 'system' && systemScheme === 'dark');

  const toggleTheme = () => {
    const next = isDark ? 'light' : 'dark';
    setMode(next);
  };

  const colors = isDark ? DARK_COLORS : LIGHT;

  return (
    <ThemeContext.Provider value={{ mode, colors, isDark, setMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeCtx {
  return useContext(ThemeContext);
}

export function useColors(): AppColors {
  return useContext(ThemeContext).colors;
}
