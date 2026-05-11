import { useColorScheme } from 'react-native';
import { buildAppTheme, type AppTheme } from '../theme';

/**
 * OS-aware shell chrome (tab bar, headers). Feature screens may keep fixed navy styling.
 */
export function useAppTheme(): AppTheme {
  const scheme = useColorScheme();
  return buildAppTheme(scheme);
}
