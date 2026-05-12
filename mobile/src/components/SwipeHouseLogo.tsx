import React from 'react';
import { Image as RNImage, Platform, View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { C } from '../theme';

const LOGO = require('../../assets/logo.png');

/** Pixel size of `assets/logo.png` (width × height). Used for `aspectRatio` = W/H. */
const LOGO_W = 134;
const LOGO_H = 117;
const LOGO_ASPECT = LOGO_W / LOGO_H;

const WIDTH = { xs: 72, sm: 96, md: 128, lg: 176 };

interface Props {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  /** Kept for API compatibility; the raster logo already includes the wordmark. */
  showLabel?: boolean;
  /**
   * When true (default), draws a neutral gray rounded “plate” behind the mark so
   * transparent pixels read clearly on any page background (instead of checkerboard art).
   */
  plate?: boolean;
}

export default function SwipeHouseLogo({ size = 'md', plate = true }: Props) {
  const width = WIDTH[size];
  const height = width / LOGO_ASPECT;

  const webSource = React.useMemo(() => {
    if (Platform.OS !== 'web') return LOGO;
    const r = RNImage.resolveAssetSource(LOGO);
    return r?.uri ? { uri: r.uri } : LOGO;
  }, []);

  const inner = (
    <>
      {Platform.OS === 'web' ? (
        <RNImage
          source={webSource}
          style={{ width, height }}
          resizeMode="contain"
        />
      ) : (
        <Image
          source={LOGO}
          style={{ width, aspectRatio: LOGO_ASPECT }}
          contentFit="contain"
        />
      )}
    </>
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
    backgroundColor: '#D8DADF',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    // Light “tile” feel without literal checker PNG
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 2,
  },
});
