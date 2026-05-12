import React, { useState } from 'react';
import { View, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import LoginScreen from './LoginScreen';
import RegisterScreen from './RegisterScreen';
import { C } from '../theme';

export default function AuthScreen() {
  const [mode, setMode] = useState<'login' | 'register'>('login');

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Form card (login/register screens include brand mark) */}
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
  safe: { flex: 1, backgroundColor: C.bgCard },
  kav:  { flex: 1 },
  card: {
    flex: 1,
    backgroundColor: C.bgCard,
    overflow: 'hidden',
  },
});
