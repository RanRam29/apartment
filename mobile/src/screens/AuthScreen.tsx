import React, { useState } from 'react';
import { View, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import LoginScreen from './LoginScreen';
import RegisterScreen from './RegisterScreen';
import SwipeHouseLogo from '../components/SwipeHouseLogo';
import { C } from '../theme';

export default function AuthScreen() {
  const [mode, setMode] = useState<'login' | 'register'>('login');

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Logo section */}
        <View style={styles.logoSection}>
          <SwipeHouseLogo size="lg" showLabel />
        </View>

        {/* Form card */}
        <View style={styles.card}>
          {mode === 'login'
            ? <LoginScreen onSwitch={() => setMode('register')} />
            : <RegisterScreen onSwitch={() => setMode('login')} />
          }
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  kav:  { flex: 1 },
  logoSection: {
    alignItems: 'center',
    paddingTop: 48,
    paddingBottom: 28,
  },
  card: {
    flex: 1,
    backgroundColor: C.bgCard,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
    shadowColor: C.navy,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 8,
  },
});
