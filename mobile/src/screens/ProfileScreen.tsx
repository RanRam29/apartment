import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useAuthStore } from '../store/useAuthStore';

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>פרופיל</Text>
      <Text style={styles.name}>{user?.firstName} {user?.lastName}</Text>
      <Text style={styles.email}>{user?.email}</Text>
      <Text style={styles.role}>{user?.role === 'tenant' ? 'שוכר' : 'משכיר'}</Text>

      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Text style={styles.logoutText}>התנתקות</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A1A2E', padding: 24, alignItems: 'center', paddingTop: 60 },
  title: { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 24 },
  name: { fontSize: 20, fontWeight: '600', color: '#fff', marginBottom: 6 },
  email: { fontSize: 14, color: '#A0A0B2', marginBottom: 4 },
  role: { fontSize: 14, color: '#6C5CE7', marginBottom: 40 },
  logoutBtn: {
    backgroundColor: '#E74C3C', borderRadius: 12,
    paddingVertical: 14, paddingHorizontal: 40,
  },
  logoutText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
