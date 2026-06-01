import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { C } from '../theme';

const LOGO = require('../../assets/logo.png');

/** Pixel size of `assets/logo.png` (width × height). Used for `aspectRatio` = W/H. */
const LOGO_W = 558;
const LOGO_H = 539;
const LOGO_ASPECT = LOGO_W / LOGO_H;

const WIDTH = { xs: 72, sm: 96, md: 128, lg: 176 };

interface Props {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  /** Kept for API compatibility; the raster logo already includes the wordmark. */
  showLabel?: boolean;
  /**
   * When true (default), draws a clean premium rounded “plate” behind the mark so
   * transparent/white pixels read clearly on any page background.
   */
  plate?: boolean;
}

export default function SwipeHouseLogo({ size = 'md', plate = true }: Props) {
  const width = WIDTH[size];

  const inner = (
    <Image
      source={LOGO}
      style={{ width, aspectRatio: LOGO_ASPECT }}
      contentFit="contain"
    />
  );

  if (!plate) {
    return (
      <View
        style={styles.wrapperBare}
        accessibilityRole="image"
        accessibilityLabel="DirApp"
      >
        {inner}
      </View>
    );
  }

  return (
    <View
      style={styles.wrapperPlate}
      accessibilityRole="image"
      accessibilityLabel="DirApp"
    >
      {inner}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapperBare: { alignItems: 'center' },
  wrapperPlate: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    // Premium soft card shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
});
