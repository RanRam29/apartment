import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import SwipeHouseLogo from './SwipeHouseLogo';
import { C } from '../theme';

const WEB_MIN_MS = 600;

interface Props {
  onFinish: () => void;
}

/** Web: no expo-video — keeps the bundle free of native video module init on web. */
export default function StartupIntroGate({ onFinish }: Props) {
  const finished = useRef(false);

  useEffect(() => {
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
    } else if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('load', runDone, { once: true });
    } else {
      runDone();
    }
    return () => {
      cancelled = true;
    };
  }, [onFinish]);

  return (
    <View style={styles.webRoot} accessibilityLabel="טוען">
      <SwipeHouseLogo size="lg" />
      <ActivityIndicator size="large" color={C.cyan} style={styles.webSpinner} />
      <Text style={styles.webHint}>Loading…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
