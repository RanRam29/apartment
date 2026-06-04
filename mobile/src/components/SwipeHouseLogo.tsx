import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import { C } from '../theme';

const LOGO = require('../../assets/logo.png');

const LOGO_W = 2816;
const LOGO_H = 1536;
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

export default function SwipeHouseLogo({ size = 'md', plate = false }: Props) {
  const width = WIDTH[size];
  const navigation = useNavigation<any>();

  const inner = (
    <Image
      source={LOGO}
      style={{ width, aspectRatio: LOGO_ASPECT }}
      contentFit="contain"
    />
  );

  const wrapStyle = plate ? styles.wrapperPlate : styles.wrapperBare;

  return (
    <TouchableOpacity
      style={wrapStyle}
      onPress={() => navigation.navigate('Tabs')}
      accessibilityRole="button"
      accessibilityLabel="חזרה למסך הראשי"
    >
      {inner}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapperBare: { alignItems: 'center' },
  wrapperPlate: {
    alignItems: 'center',
    alignSelf: 'center',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
});
