import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../theme';

interface Props {
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export default function SwipeHouseLogo({ size = 'md', showLabel = true }: Props) {
  const pulse = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.6, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const iconSize  = size === 'sm' ? 20 : size === 'lg' ? 38 : 28;
  const arrowSize = size === 'sm' ? 11 : size === 'lg' ? 18 : 14;
  const fontSize  = size === 'sm' ? 13 : size === 'lg' ? 22 : 17;

  return (
    <View style={styles.wrapper}>
      {/* House icon + animated cyan arrow (mirrors actual app icon) */}
      <View style={styles.iconRow}>
        <Ionicons name="home-outline" size={iconSize} color={C.navy} />
        <Animated.View style={[styles.arrowWrap, { opacity: pulse }]}>
          <Ionicons name="arrow-forward" size={arrowSize} color={C.cyan} />
        </Animated.View>
      </View>

      {showLabel && (
        <Text style={[styles.label, { fontSize }]}>DirApp</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center' },
  iconRow: { flexDirection: 'row', alignItems: 'flex-end' },
  arrowWrap: {
    marginLeft: 1,
    marginBottom: 2,
    shadowColor: C.cyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 4,
  },
  label: {
    color: C.navy,
    fontWeight: '300',
    letterSpacing: 4,
    marginTop: 2,
  },
});
