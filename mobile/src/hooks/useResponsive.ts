import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';

const TABLET = 768;
const DESKTOP = 1024;

export type ResponsiveBreakpoint = 'phone' | 'tablet' | 'desktop';

/**
 * Shared breakpoints for tablet sidebar / web layouts.
 */
export function useResponsive() {
  const { width, height } = useWindowDimensions();

  return useMemo(() => {
    const isPhone = width < TABLET;
    const isTablet = width >= TABLET && width < DESKTOP;
    const isDesktop = width >= DESKTOP;
    const breakpoint: ResponsiveBreakpoint = isDesktop ? 'desktop' : isTablet ? 'tablet' : 'phone';

    let contentMaxWidth = width;
    let gutter = 16;
    if (isDesktop) {
      contentMaxWidth = Math.min(1100, width - 64);
      gutter = 32;
    } else if (isTablet) {
      contentMaxWidth = Math.min(840, width - 48);
      gutter = 24;
    }

    const columns = isDesktop ? 4 : isTablet ? 3 : 2;

    return {
      width,
      height,
      isPhone,
      isTablet,
      isDesktop,
      breakpoint,
      contentMaxWidth,
      gutter,
      columns,
    };
  }, [width, height]);
}
