import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { useNavigation, NavigationContainerRefContext } from '@react-navigation/native';
import { C } from '../theme';

const LOGO = require('../../assets/logo.png');

const LOGO_W = 2816;
const LOGO_H = 1536;
const LOGO_ASPECT = LOGO_W / LOGO_H;

const WIDTH = { xs: 72, sm: 96, md: 128, lg: 176 };

interface Props {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  plate?: boolean;
}

function useNavigationSafe() {
  const ctx = React.useContext(NavigationContainerRefContext);
  if (!ctx) return null;
  try { return useNavigation<any>(); } catch { return null; }
}

export default function SwipeHouseLogo({ size = 'md', plate = false }: Props) {
  const width = WIDTH[size];
  const navigation = useNavigationSafe();

  const inner = (
    <Image
      source={LOGO}
      style={{ width, aspectRatio: LOGO_ASPECT }}
      contentFit=”contain”
    />
  );

  const wrapStyle = plate ? styles.wrapperPlate : styles.wrapperBare;

  if (!navigation) {
    return <View style={wrapStyle} accessibilityRole=”image” accessibilityLabel=”DirApp”>{inner}</View>;
  }

  return (
    <TouchableOpacity
      style={wrapStyle}
      onPress={() => navigation.navigate('Tabs')}
      accessibilityRole=”button”
      accessibilityLabel=”חזרה למסך הראשי”
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
