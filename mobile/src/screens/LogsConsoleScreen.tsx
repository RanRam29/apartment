import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { adminLogsApi } from '../services/api';
import { C } from '../theme';
import type { AuditLogItem, SystemEventItem } from '../types';

type TabKey = 'audit' | 'system';
type SourcePreset = 'all' | 'mobile' | 'web' | 'socket' | 'api' | 'server';

export default function LogsConsoleScreen() {
  const [tab, setTab] = useState<TabKey>('audit');
  const [auditItems, setAuditItems] = useState<AuditLogItem[]>([]);
  const [systemItems, setSystemItems] = useState<SystemEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sourcePreset, setSourcePreset] = useState<SourcePreset>('all');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [auditRes, systemRes] = await Promise.all([
        adminLogsApi.getAudit({ limit: 40, offset: 0, search: debouncedSearch || undefined }),
        adminLogsApi.getSystem({
          limit: 40,
          offset: 0,
          search: debouncedSearch || undefined,
          source:
            sourcePreset === 'all'
              ? undefined
              : sourcePreset === 'mobile' || sourcePreset === 'web'
                ? 'client'
                : sourcePreset,
        }),
      ]);
      setAuditItems(auditRes.data.items ?? []);
      let system = systemRes.data.items ?? [];
      if (sourcePreset === 'mobile') {
        system = system.filter((item: SystemEventItem) => {
          const platform = String(item.metadata?.platform || '');
          return platform === 'ios' || platform === 'android';
        });
      } else if (sourcePreset === 'web') {
        system = system.filter((item: SystemEventItem) => String(item.metadata?.platform || '') === 'web');
      }
      setSystemItems(system);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to load logs');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [debouncedSearch, sourcePreset]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Logs Console</Text>
        <Text style={styles.subtitle}>Audit + System events</Text>
      </View>

      <View style={styles.tabs}>
        <TabButton active={tab === 'audit'} label="Audit" onPress={() => setTab('audit')} />
        <TabButton active={tab === 'system'} label="System" onPress={() => setTab('system')} />
      </View>
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search requestId / action / event / message"
          placeholderTextColor={C.textMut}
          autoCapitalize="none"
          autoCorrect={false}
          onSubmitEditing={load}
        />
      </View>
      {tab === 'system' && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sourcePresets}
        >
          <PresetChip label="All" active={sourcePreset === 'all'} onPress={() => setSourcePreset('all')} />
          <PresetChip label="Mobile" active={sourcePreset === 'mobile'} onPress={() => setSourcePreset('mobile')} />
          <PresetChip label="Web" active={sourcePreset === 'web'} onPress={() => setSourcePreset('web')} />
          <PresetChip label="Socket" active={sourcePreset === 'socket'} onPress={() => setSourcePreset('socket')} />
          <PresetChip label="API" active={sourcePreset === 'api'} onPress={() => setSourcePreset('api')} />
          <PresetChip label="Server" active={sourcePreset === 'server'} onPress={() => setSourcePreset('server')} />
        </ScrollView>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.navy} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {error && <Text style={styles.error}>{error}</Text>}
          {tab === 'audit'
            ? auditItems.map((item) => (
                <View style={styles.card} key={item.id}>
                  <HighlightText text={item.action} query={debouncedSearch} style={styles.primary} />
                  <HighlightText
                    text={`${item.resourceType || 'resource'} #${item.resourceId || '-'}`}
                    query={debouncedSearch}
                    style={styles.secondary}
                  />
                  <Text style={styles.meta}>{item.outcome} · {item.statusCode || '-'}</Text>
                  <HighlightText text={item.requestId || '-'} query={debouncedSearch} style={styles.meta} />
                  <Text style={styles.meta}>{new Date(item.createdAt).toLocaleString()}</Text>
                </View>
              ))
            : systemItems.map((item) => (
                <View style={styles.card} key={item._id}>
                  <HighlightText text={item.event} query={debouncedSearch} style={styles.primary} />
                  <HighlightText text={item.message} query={debouncedSearch} style={styles.secondary} />
                  <Text style={styles.meta}>{item.category} · {item.severity}</Text>
                  <HighlightText text={item.requestId || '-'} query={debouncedSearch} style={styles.meta} />
                  <Text style={styles.meta}>{new Date(item.createdAt).toLocaleString()}</Text>
                </View>
              ))}
          {tab === 'audit' && auditItems.length === 0 && <Text style={styles.empty}>No audit logs</Text>}
          {tab === 'system' && systemItems.length === 0 && <Text style={styles.empty}>No system events</Text>}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function TabButton({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.tabButton, active && styles.tabButtonActive]} onPress={onPress}>
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function PresetChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.presetChip, active && styles.presetChipActive]} onPress={onPress}>
      <Text style={[styles.presetChipText, active && styles.presetChipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function HighlightText({ text, query, style }: { text: string; query: string; style: any }) {
  if (!query) {
    return <Text style={style}>{text}</Text>;
  }
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  const index = lower.indexOf(q);
  if (index === -1) {
    return <Text style={style}>{text}</Text>;
  }
  const before = text.slice(0, index);
  const match = text.slice(index, index + query.length);
  const after = text.slice(index + query.length);
  return (
    <Text style={style}>
      {before}
      <Text style={styles.highlight}>{match}</Text>
      {after}
    </Text>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  title: { fontSize: 22, fontWeight: '800', color: C.text },
  subtitle: { color: C.textMut, marginTop: 4 },
  tabs: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 10 },
  searchWrap: { paddingHorizontal: 16, marginBottom: 10 },
  searchInput: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    backgroundColor: C.bgCard,
    color: C.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  tabButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.bgCard,
  },
  tabButtonActive: { backgroundColor: C.navy },
  tabText: { color: C.text, fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sourcePresets: { paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
  presetChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.bgCard,
  },
  presetChipActive: {
    borderColor: C.navy,
    backgroundColor: C.navy,
  },
  presetChipText: { color: C.text, fontWeight: '600' },
  presetChipTextActive: { color: '#fff' },
  list: { padding: 16, gap: 10 },
  card: {
    backgroundColor: C.bgCard,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    padding: 12,
  },
  primary: { color: C.text, fontWeight: '700' },
  secondary: { color: C.textSub, marginTop: 4 },
  meta: { color: C.textMut, marginTop: 4, fontSize: 12 },
  highlight: {
    backgroundColor: 'rgba(245, 158, 11, 0.28)',
    color: C.text,
    fontWeight: '700',
  },
  empty: { color: C.textMut, textAlign: 'center', marginTop: 20 },
  error: { color: C.danger, marginBottom: 8 },
});
