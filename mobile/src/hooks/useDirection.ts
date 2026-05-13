import { I18nManager } from 'react-native';

export interface DirectionInfo {
  isRTL: boolean;
  flexRow: 'row' | 'row-reverse';
  textAlign: 'left' | 'right';
  alignSelf: 'flex-start' | 'flex-end';
  sidebarSide: 'right' | 'left';
  writingDirection: 'rtl' | 'ltr';
}

/** RTL layout helpers; follows React Native `I18nManager.isRTL` (main app has no locale store yet). */
export function useDirection(): DirectionInfo {
  const isRTL = I18nManager.isRTL;

  return {
    isRTL,
    flexRow: isRTL ? 'row-reverse' : 'row',
    textAlign: isRTL ? 'right' : 'left',
    alignSelf: isRTL ? 'flex-end' : 'flex-start',
    sidebarSide: isRTL ? 'right' : 'left',
    writingDirection: isRTL ? 'rtl' : 'ltr',
  };
}
