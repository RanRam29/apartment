import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { Video, ResizeMode } from 'expo-av';
import type { AVPlaybackStatus } from 'expo-av';
import SwipeHouseLogo from './SwipeHouseLogo';
import { C } from '../theme';

const SOURCE = require('../../assets/startup/StartUpLogo.mp4');
const STORAGE_KEY = 'dirapp_startup_intro_seen';
const MAX_MS = 15_000;
const WEB_MIN_MS = 600;

interface Props {
  onFinish: () => void;
}

export default function StartupIntroGate({ onFinish }: Props) {
  const finished = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [nativePhase, setNativePhase] = useState<'checking' | 'show'>('checking');

  const finishWithoutMarking = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    StatusBar.setHidden(false);
    onFinish();
  }, [onFinish]);

  const markSeenAndFinish = useCallback(async () => {
    if (finished.current) return;
    finished.current = true;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    StatusBar.setHidden(false);
    try {
      await SecureStore.setItemAsync(STORAGE_KEY, '1');
    } catch {
      /* ignore */
    }
    onFinish();
  }, [onFinish]);

  // Web: show loader until document has loaded, with a short minimum display.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    let cancelled = false;
    const started = Date.now();
    const runDone = () => {
      if (cancelled) return;
      const delay = Math.max(0, WEB_MIN_MS - (Date.now() - started));
      setTimeout(() => {
        if (!cancelled && !finished.current) {
          finished.current = true;
          onFinish();
        }
      }, delay);
    };
    if (typeof document !== 'undefined' && document.readyState === 'complete') {
      requestAnimationFrame(() => requestAnimationFrame(runDone));
    } else if (typeof window !== 'undefined') {
      window.addEventListener('load', runDone, { once: true });
    } else {
      runDone();
    }
    return () => {
      cancelled = true;
    };
  }, [onFinish]);

  // Native: skip intro if user has already completed it once.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    let cancelled = false;
    (async () => {
      try {
        const v = await SecureStore.getItemAsync(STORAGE_KEY);
        if (cancelled) return;
        if (v === '1') {
          finishWithoutMarking();
          return;
        }
        setNativePhase('show');
      } catch {
        if (!cancelled) setNativePhase('show');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [finishWithoutMarking]);

  useEffect(() => {
    if (Platform.OS === 'web' || nativePhase !== 'show') return;
    StatusBar.setHidden(true);
    timerRef.current = setTimeout(() => {
      markSeenAndFinish();
    }, MAX_MS);
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      StatusBar.setHidden(false);
    };
  }, [nativePhase, markSeenAndFinish]);

  function onPlaybackStatusUpdate(status: AVPlaybackStatus) {
    if (!status.isLoaded) return;
    if (status.didJustFinish) markSeenAndFinish();
  }

  if (Platform.OS === 'web') {
    return (
      <View style={styles.webRoot} accessibilityLabel="טוען">
        <SwipeHouseLogo size="lg" />
        <ActivityIndicator size="large" color={C.cyan} style={styles.webSpinner} />
        <Text style={styles.webHint}>Loading…</Text>
      </View>
    );
  }

  if (nativePhase === 'checking') {
    return <View style={styles.root} />;
  }

  return (
    <View style={styles.root}>
      <Video
        source={SOURCE}
        style={styles.video}
        resizeMode={ResizeMode.CONTAIN}
        shouldPlay
        isLooping={false}
        isMuted
        onPlaybackStatusUpdate={onPlaybackStatusUpdate}
        onError={() => markSeenAndFinish()}
      />
      <Pressable
        style={styles.skipLayer}
        onPress={() => markSeenAndFinish()}
        accessibilityRole="button"
        accessibilityLabel="דלג על סרטון הפתיחה"
      />
      <Text style={styles.skipHint}>נגיעה בכל מקום לדילוג</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#051221',
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: { width: '100%', height: '100%' },
  skipLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },
  skipHint: {
    position: 'absolute',
    bottom: 36,
    zIndex: 3,
    color: 'rgba(255,255,255,0.62)',
    fontSize: 13,
    fontWeight: '600',
  },
  webRoot: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#051221',
    justifyContent: 'center',
    alignItems: 'center',
  },
  webSpinner: { marginTop: 28 },
  webHint: {
    marginTop: 14,
    color: C.onInverse.subtle,
    fontSize: 14,
    fontWeight: '600',
  },
});
