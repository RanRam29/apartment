import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface State { hasError: boolean }

export class ErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error.message, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <SafeAreaView style={styles.container}>
        <Ionicons name="warning-outline" size={64} color="#FF4757" />
        <Text style={styles.title}>משהו השתבש</Text>
        <Text style={styles.message}>אירעה שגיאה בלתי צפויה. נסה שוב.</Text>
        <TouchableOpacity
          style={styles.btn}
          onPress={() => this.setState({ hasError: false })}
        >
          <Text style={styles.btnText}>נסה שוב</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: '#1A1A2E',
    justifyContent: 'center', alignItems: 'center', gap: 16, padding: 32,
  },
  title: { fontSize: 22, fontWeight: '800', color: '#fff' },
  message: { fontSize: 14, color: '#A0A0B2', textAlign: 'center' },
  btn: {
    backgroundColor: '#6C5CE7', borderRadius: 12,
    paddingVertical: 14, paddingHorizontal: 32, marginTop: 8,
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
