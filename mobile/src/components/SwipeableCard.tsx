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
import { C } from '../theme';
import { dirApp } from '../theme/dirAppTokens';
import type { Apartment, SwipeDirection } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.35;
const ROTATION_FACTOR = 12;

interface Props {
  apartment: Apartment;
  onSwipe: (direction: SwipeDirection) => void;
  isTop: boolean;
  onPress?: () => void;
}

export default function SwipeableCard({ apartment, onSwipe, isTop, onPress }: Props) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const startTime  = useSharedValue(Date.now());

  const flyOut = useCallback(
    (direction: SwipeDirection) => {
      onSwipe(direction);
    },
    [onSwipe]
  );

  const pan = Gesture.Pan()
    .enabled(isTop)
    .onBegin(() => { startTime.value = Date.now(); })
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

  const tap = Gesture.Tap()
    .enabled(isTop)
    .onEnd(() => {
      if (onPress) {
        runOnJS(onPress)();
      }
    });

  const gesture = Gesture.Exclusive(pan, tap);

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
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.container, animatedStyle]}>
        <ApartmentCard apartment={apartment} isTop={isTop} />

        {/* LIKE — cyan */}
        <Animated.View style={[styles.labelLike, likeOpacity]}>
          <Animated.Text style={styles.labelLikeText}>LIKE</Animated.Text>
        </Animated.View>

        {/* NOPE — coral */}
        <Animated.View style={[styles.labelNope, nopeOpacity]}>
          <Animated.Text style={styles.labelNopeText}>NOPE</Animated.Text>
        </Animated.View>

        {/* SUPER — navy */}
        <Animated.View style={[styles.labelSuper, superOpacity]}>
          <Animated.Text style={styles.labelSuperText}>SUPER ★</Animated.Text>
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
    position: 'absolute', top: 36, left: 18,
    borderWidth: 3, borderColor: C.cyan, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 7,
    transform: [{ rotate: '-18deg' }],
    backgroundColor: C.cyanAlpha(0.08),
  },
  labelLikeText: { color: C.cyan, fontSize: 22, fontWeight: '800', letterSpacing: 1 },

  labelNope: {
    position: 'absolute', top: 36, right: 18,
    borderWidth: 3, borderColor: C.coral, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 7,
    transform: [{ rotate: '18deg' }],
    backgroundColor: C.coralAlpha(0.08),
  },
  labelNopeText: { color: C.coral, fontSize: 22, fontWeight: '800', letterSpacing: 1 },

  labelSuper: {
    position: 'absolute', bottom: 110, alignSelf: 'center',
    borderWidth: 3, borderColor: dirApp.primary, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 7,
    backgroundColor: `${dirApp.primary}14`,
  },
  labelSuperText: { color: dirApp.primary, fontSize: 22, fontWeight: '800' },
});
