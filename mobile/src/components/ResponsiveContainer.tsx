import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useResponsive } from '../hooks/useResponsive';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * Centers content and caps width on tablet / desktop (web).
 */
export function ResponsiveContainer({ children, style }: Props) {
  const { contentMaxWidth, gutter } = useResponsive();
  return (
    <View
      style={[
        {
          width: '100%',
          maxWidth: contentMaxWidth,
          alignSelf: 'center',
          paddingHorizontal: gutter,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
