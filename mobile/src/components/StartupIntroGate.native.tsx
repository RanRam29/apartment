import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useEventListener } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { C } from '../theme';
import { dirApp } from '../theme/dirAppTokens';

const SOURCE = require('../../assets/startup/StartUpLogo.mp4');
const STORAGE_KEY = 'dirapp_startup_intro_seen';
const MAX_MS = 15_000;

interface Props {
  onFinish: () => void;
}

function StartupIntroVideo({
  onPlayToEnd,
  onPlayerError,
}: {
  onPlayToEnd: () => void;
  onPlayerError: () => void;
}) {
  const player = useVideoPlayer(SOURCE, (p) => {
    p.loop = false;
    p.muted = true;
    p.play();
  });

  useEventListener(player, 'playToEnd', onPlayToEnd);
  useEventListener(player, 'statusChange', ({ status }) => {
    if (status === 'error') onPlayerError();
  });

  return (
    <VideoView
      style={styles.video}
      player={player}
      contentFit="contain"
      nativeControls={false}
      allowsFullscreen={false}
      allowsPictureInPicture={false}
    />
  );
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

  useEffect(() => {
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
    if (nativePhase !== 'show') return;
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

  if (nativePhase === 'checking') {
    return <View style={styles.root} />;
  }

  return (
    <View style={styles.root}>
      <StartupIntroVideo
        onPlayToEnd={markSeenAndFinish}
        onPlayerError={markSeenAndFinish}
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
    color: dirApp.secondary,
    fontSize: 13,
    fontWeight: '600',
  },
});
