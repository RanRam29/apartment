import React from 'react';
import {
  Text, TouchableOpacity, StyleSheet,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, Dark } from '../theme';

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
        <Ionicons name="warning-outline" size={64} color={C.danger} />
        <Text style={styles.title}>משהו השתבש</Text>
        <Text style={styles.message}>אירעה שגיאה בלתי צפויה. נסה שוב.</Text>
        <TouchableOpacity
          style={styles.btn}
          onPress={() => this.setState({ hasError: false })}
          accessibilityRole="button"
          accessibilityLabel="נסה שוב"
        >
          <Text style={styles.btnText}>נסה שוב</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: Dark.bg,
    justifyContent: 'center', alignItems: 'center', gap: 16, padding: 32,
  },
  title: { fontSize: 22, fontWeight: '800', color: C.onInverse.primary },
  message: { fontSize: 14, color: C.textMut, textAlign: 'center' },
  btn: {
    backgroundColor: C.cyan, borderRadius: 12,
    paddingVertical: 14, paddingHorizontal: 32, marginTop: 8,
  },
  btnText: { color: C.navy, fontWeight: '700', fontSize: 15 },
});
