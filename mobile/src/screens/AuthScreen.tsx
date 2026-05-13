import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import LoginScreen from './LoginScreen';
import RegisterScreen from './RegisterScreen';
import { C } from '../theme';
import { dirApp } from '../theme/dirAppTokens';
import { fontFamily } from '../theme/fonts';
import { useDirection } from '../hooks/useDirection';
import { ResponsiveContainer } from '../components/ResponsiveContainer';

export default function AuthScreen() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const { flexRow } = useDirection();

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ResponsiveContainer style={{ flex: 1 }}>
          <View style={styles.card}>
            <View style={[styles.tabsWrap, { flexDirection: flexRow }]}>
              <TouchableOpacity
                style={[styles.tab, mode === 'login' && styles.tabActive]}
                onPress={() => setMode('login')}
                activeOpacity={0.85}
              >
                <Text style={[styles.tabText, mode === 'login' && styles.tabTextActive]}>התחברות</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, mode === 'register' && styles.tabActive]}
                onPress={() => setMode('register')}
                activeOpacity={0.85}
              >
                <Text style={[styles.tabText, mode === 'register' && styles.tabTextActive]}>הרשמה</Text>
              </TouchableOpacity>
            </View>

            {mode === 'login'
              ? <LoginScreen onSwitch={() => setMode('register')} />
              : <RegisterScreen onSwitch={() => setMode('login')} />
            }
          </View>
        </ResponsiveContainer>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: dirApp.background },
  kav: { flex: 1 },
  card: {
    flex: 1,
    backgroundColor: dirApp.background,
    overflow: 'hidden',
    paddingTop: 10,
  },
  tabsWrap: {
    marginHorizontal: 20,
    backgroundColor: dirApp.surfaceContainerLowest,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: `${dirApp.outlineVariant}AA`,
    padding: 4,
    marginBottom: 10,
    shadowColor: dirApp.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  tab: {
    flex: 1,
    minHeight: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: dirApp.secondaryContainer,
  },
  tabText: {
    color: dirApp.outline,
    fontFamily: fontFamily.medium,
    fontSize: 14,
  },
  tabTextActive: {
    color: dirApp.onSecondaryContainer,
    fontFamily: fontFamily.semibold,
  },
});
