import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';

const LOGO = require('../../assets/logo.png');

/** Intrinsic pixels of `assets/logo.png` (for correct aspect ratio). */
const LOGO_ASPECT = 567 / 595;

const WIDTH = { sm: 96, md: 128, lg: 176 };

interface Props {
  size?: 'sm' | 'md' | 'lg';
  /** Kept for API compatibility; the raster logo already includes the wordmark. */
  showLabel?: boolean;
}

export default function SwipeHouseLogo({ size = 'md' }: Props) {
  const width = WIDTH[size];
  return (
    <View
      style={styles.wrapper}
      accessibilityRole="image"
      accessibilityLabel="DirApp"
    >
      <Image
        source={LOGO}
        style={{ width, aspectRatio: LOGO_ASPECT }}
        contentFit="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center' },
});
