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
import { dirApp } from '../theme/dirAppTokens';
import type { AuditLogItem, SystemEventItem } from '../types';
import { ResponsiveContainer } from '../components/ResponsiveContainer';
import { dirType } from '../theme/textStyles';
import { useColors } from '../context/ThemeContext';

type TabKey = 'audit' | 'system';
type SourcePreset = 'all' | 'mobile' | 'web' | 'socket' | 'api' | 'server';

export default function LogsConsoleScreen() {
  const colors = useColors();
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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <ResponsiveContainer style={{ flex: 1 }}>
        <View style={styles.header}>
          <Text style={[styles.title, dirType.title]}>Logs Console</Text>
          <Text style={[styles.subtitle, dirType.caption]}>Audit + System events</Text>
        </View>

      <View style={styles.tabs}>
        <TabButton active={tab === 'audit'} label="Audit" onPress={() => setTab('audit')} />
        <TabButton active={tab === 'system'} label="System" onPress={() => setTab('system')} />
      </View>
      <View style={styles.searchWrap}>
        <TextInput
          style={[styles.searchInput, { backgroundColor: colors.bgCard, borderColor: colors.border, color: colors.text }]}
          value={search}
          onChangeText={setSearch}
          placeholder="Search requestId / action / event / message"
          placeholderTextColor={colors.textMut}
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
          <ActivityIndicator size="large" color={dirApp.secondary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {error && <Text style={styles.error}>{error}</Text>}
          {tab === 'audit'
            ? auditItems.map((item) => (
                <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]} key={item.id}>
                  <HighlightText text={item.action} query={debouncedSearch} style={[styles.primary, { color: colors.text }]} />
                  <HighlightText
                    text={`${item.resourceType || 'resource'} #${item.resourceId || '-'}`}
                    query={debouncedSearch}
                    style={[styles.secondary, { color: colors.textSub }]}
                  />
                  <Text style={[styles.meta, { color: colors.textMut }]}>{item.outcome} · {item.statusCode || '-'}</Text>
                  <HighlightText text={item.requestId || '-'} query={debouncedSearch} style={[styles.meta, { color: colors.textMut }]} />
                  <Text style={[styles.meta, { color: colors.textMut }]}>{new Date(item.createdAt).toLocaleString()}</Text>
                </View>
              ))
            : systemItems.map((item) => (
                <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]} key={item._id}>
                  <HighlightText text={item.event} query={debouncedSearch} style={[styles.primary, { color: colors.text }]} />
                  <HighlightText text={item.message} query={debouncedSearch} style={[styles.secondary, { color: colors.textSub }]} />
                  <Text style={[styles.meta, { color: colors.textMut }]}>{item.category} · {item.severity}</Text>
                  <HighlightText text={item.requestId || '-'} query={debouncedSearch} style={[styles.meta, { color: colors.textMut }]} />
                  <Text style={[styles.meta, { color: colors.textMut }]}>{new Date(item.createdAt).toLocaleString()}</Text>
                </View>
              ))}
          {tab === 'audit' && auditItems.length === 0 && <Text style={[styles.empty, dirType.body]}>No audit logs</Text>}
          {tab === 'system' && systemItems.length === 0 && <Text style={[styles.empty, dirType.body]}>No system events</Text>}
        </ScrollView>
      )}
      </ResponsiveContainer>
    </SafeAreaView>
  );
}

function TabButton({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  const colors = useColors();
  return (
    <TouchableOpacity style={[styles.tabButton, { backgroundColor: colors.bgCard, borderColor: colors.border }, active && styles.tabButtonActive]} onPress={onPress}>
      <Text style={[styles.tabText, { color: colors.textMut }, active && styles.tabTextActive]}>{label}</Text>
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
  container: { flex: 1, backgroundColor: dirApp.background },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  title: { fontSize: 22, fontWeight: '800', color: dirApp.primary },
  subtitle: { color: dirApp.outline, marginTop: 4 },
  tabs: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 10 },
  searchWrap: { paddingHorizontal: 16, marginBottom: 10 },
  searchInput: {
    borderWidth: 1,
    borderColor: `${dirApp.outlineVariant}AA`,
    borderRadius: 10,
    backgroundColor: dirApp.surfaceContainerLowest,
    color: dirApp.onSurface,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  tabButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: `${dirApp.outlineVariant}AA`,
    backgroundColor: dirApp.surfaceContainerLowest,
  },
  tabButtonActive: { backgroundColor: dirApp.primaryContainer },
  tabText: { color: dirApp.outline, fontWeight: '600' },
  tabTextActive: { color: C.onInverse.primary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sourcePresets: { paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
  presetChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: `${dirApp.outlineVariant}AA`,
    backgroundColor: dirApp.surfaceContainerLowest,
  },
  presetChipActive: {
    borderColor: dirApp.primaryContainer,
    backgroundColor: dirApp.primaryContainer,
  },
  presetChipText: { color: dirApp.outline, fontWeight: '600' },
  presetChipTextActive: { color: C.onInverse.primary },
  list: { padding: 16, gap: 10 },
  card: {
    backgroundColor: dirApp.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: `${dirApp.outlineVariant}AA`,
    borderRadius: 12,
    padding: 12,
  },
  primary: { color: dirApp.primary, fontWeight: '700' },
  secondary: { color: dirApp.onSurfaceVariant, marginTop: 4 },
  meta: { color: dirApp.outline, marginTop: 4, fontSize: 12 },
  highlight: {
    backgroundColor: 'rgba(245, 158, 11, 0.28)',
    color: dirApp.primary,
    fontWeight: '700',
  },
  empty: { color: dirApp.outline, textAlign: 'center', marginTop: 20 },
  error: { color: C.danger, marginBottom: 8 },
});
