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

  const iconSize = size === 'sm' ? 22 : size === 'lg' ? 40 : 30;
  const dotSize  = size === 'sm' ? 6  : size === 'lg' ? 10 : 8;
  const fontSize = size === 'sm' ? 13 : size === 'lg' ? 22 : 17;

  return (
    <View style={styles.wrapper}>
      {/* House icon + animated cyan dot */}
      <View style={styles.iconRow}>
        <Ionicons name="home-outline" size={iconSize} color={C.navy} />
        <Animated.View
          style={[
            styles.dot,
            { width: dotSize, height: dotSize, borderRadius: dotSize / 2, opacity: pulse },
          ]}
        />
      </View>

      {showLabel && (
        <Text style={[styles.label, { fontSize }]}>DirApp</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center' },
  iconRow: { flexDirection: 'row', alignItems: 'flex-start' },
  dot: {
    backgroundColor: C.cyan,
    marginTop: 2,
    marginLeft: 2,
    shadowColor: C.cyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },
  label: {
    color: C.navy,
    fontWeight: '300',
    letterSpacing: 4,
    marginTop: 2,
  },
});
