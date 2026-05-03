import React, { useCallback } from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import ApartmentCard, { CARD_WIDTH, CARD_HEIGHT } from './ApartmentCard';
import type { Apartment, SwipeDirection } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.35;
const ROTATION_FACTOR = 12;

interface Props {
  apartment: Apartment;
  onSwipe: (direction: SwipeDirection) => void;
  isTop: boolean;
}

export default function SwipeableCard({ apartment, onSwipe, isTop }: Props) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const startTime  = useSharedValue(Date.now());

  const flyOut = useCallback(
    (direction: SwipeDirection) => {
      const seenMs = Date.now() - startTime.value;
      onSwipe(direction);
    },
    [onSwipe]
  );

  const pan = Gesture.Pan()
    .enabled(isTop)
    .onBegin(() => {
      startTime.value = Date.now();
    })
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY * 0.3;
    })
    .onEnd((e) => {
      if (e.translationX > SWIPE_THRESHOLD) {
        translateX.value = withSpring(SCREEN_WIDTH * 1.5, { velocity: e.velocityX });
        runOnJS(flyOut)('like');
      } else if (e.translationX < -SWIPE_THRESHOLD) {
        translateX.value = withSpring(-SCREEN_WIDTH * 1.5, { velocity: e.velocityX });
        runOnJS(flyOut)('dislike');
      } else if (e.translationY < -SWIPE_THRESHOLD * 0.8) {
        translateY.value = withSpring(-SCREEN_WIDTH * 1.5);
        runOnJS(flyOut)('superlike');
      } else {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }
    });

  const animatedStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      translateX.value,
      [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
      [-ROTATION_FACTOR, 0, ROTATION_FACTOR],
      Extrapolate.CLAMP
    );
    const scale = isTop
      ? 1
      : interpolate(
          Math.abs(translateX.value),
          [0, SWIPE_THRESHOLD],
          [0.95, 1],
          Extrapolate.CLAMP
        );
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotate}deg` },
        { scale },
      ],
    };
  });

  // Like / dislike overlay opacity
  const likeOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, SWIPE_THRESHOLD * 0.5], [0, 1], Extrapolate.CLAMP),
  }));
  const nopeOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-SWIPE_THRESHOLD * 0.5, 0], [1, 0], Extrapolate.CLAMP),
  }));
  const superOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(translateY.value, [-SWIPE_THRESHOLD * 0.5, 0], [1, 0], Extrapolate.CLAMP),
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.container, animatedStyle]}>
        <ApartmentCard apartment={apartment} isTop={isTop} />

        <Animated.View style={[styles.labelLike, likeOpacity]}>
          <Animated.Text style={styles.labelLikeText}>❤️ Like</Animated.Text>
        </Animated.View>
        <Animated.View style={[styles.labelNope, nopeOpacity]}>
          <Animated.Text style={styles.labelNopeText}>✕ Nope</Animated.Text>
        </Animated.View>
        <Animated.View style={[styles.labelSuper, superOpacity]}>
          <Animated.Text style={styles.labelSuperText}>⭐ Super</Animated.Text>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
  },
  labelLike: {
    position: 'absolute', top: 40, left: 20,
    borderWidth: 3, borderColor: '#00E676', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 6, transform: [{ rotate: '-20deg' }],
  },
  labelLikeText: { color: '#00E676', fontSize: 22, fontWeight: '800' },
  labelNope: {
    position: 'absolute', top: 40, right: 20,
    borderWidth: 3, borderColor: '#FF4757', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 6, transform: [{ rotate: '20deg' }],
  },
  labelNopeText: { color: '#FF4757', fontSize: 22, fontWeight: '800' },
  labelSuper: {
    position: 'absolute', bottom: 100, alignSelf: 'center',
    borderWidth: 3, borderColor: '#6C5CE7', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  labelSuperText: { color: '#6C5CE7', fontSize: 22, fontWeight: '800' },
});
