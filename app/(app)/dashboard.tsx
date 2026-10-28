import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LessonCard, PlannerBrand, PlannerHero, plannerStyles as ui } from '@/components/lesson/planner-ui';
import { EmptyState } from '@/components/ui/form-fields';
import { useAuth } from '@/lib/auth';
import { listLessonPlans } from '@/lib/db';
import { useDraft } from '@/lib/draft';
import { colors, fonts } from '@/lib/theme';
import { LessonPlanCore } from '@/lib/types';

const QUICK_LINKS: { icon: keyof typeof Ionicons.glyphMap; label: string; route: string }[] = [
  { icon: 'document-attach-outline', label: 'Upload Template', route: '/(app)/upload-template' },
  { icon: 'search-outline', label: 'Search Plans', route: '/(app)/my-plans?focus=search' },
  { icon: 'folder-open-outline', label: 'Categories', route: '/(app)/my-plans?view=categories' },
];

export default function DashboardScreen() {
  const { profile } = useAuth();
  const { resetDraft } = useDraft();
  const router = useRouter();
  const [recent, setRecent] = useState<LessonPlanCore[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!profile) return;
    const plans = await listLessonPlans(profile.uid, { sortBy: 'updatedAt' });
    setRecent(plans.slice(0, 5));
    setError('');
  }, [profile]);

  useFocusEffect(useCallback(() => {
    let active = true;
    if (profile) {
      listLessonPlans(profile.uid, { sortBy: 'updatedAt' }).then((plans) => {
        if (active) { setRecent(plans.slice(0, 5)); setError(''); }
      }).catch(() => { if (active) setError('Could not load your plans. Pull down to try again.'); })
        .finally(() => { if (active) setLoading(false); });
    }
    return () => { active = false; };
  }, [profile]));

  function onCreate() {
    resetDraft(profile?.uid ?? 'local');
    router.push('/create/setup');
  }

  async function onRefresh() {
    setRefreshing(true);
    try { await load(); } catch { setError('Could not refresh your plans. Please try again.'); }
    finally { setRefreshing(false); }
  }

  return (
    <SafeAreaView style={ui.safe} edges={['top']}>
      <StatusBar style="dark" />
      <FlatList
        style={ui.list} contentContainerStyle={ui.listContent} data={recent} keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListHeaderComponent={<View>
          <PlannerBrand />
          <PlannerHero home title="Your next great lesson starts here." subtitle="Create, organize, and revisit your lesson plans." onCreate={onCreate} />
          <View style={ui.sectionRow}><Text accessibilityRole="header" style={ui.sectionTitle}>Quick access</Text></View>
          <View style={s.quickLinks}>{QUICK_LINKS.map((item) => <TouchableOpacity key={item.label} accessibilityRole="button" activeOpacity={0.75} style={s.quickCard} onPress={() => router.push(item.route as never)}>
            <Ionicons name={item.icon} size={30} color={colors.primary} /><Text style={s.quickLabel}>{item.label}</Text>
          </TouchableOpacity>)}</View>
          <View style={ui.sectionRow}>
            <Text accessibilityRole="header" style={ui.sectionTitle}>Recently Modified</Text>
            <TouchableOpacity accessibilityRole="button" style={s.viewAll} onPress={() => router.push('/(app)/my-plans')}><Text style={ui.link}>View all</Text><Ionicons name="chevron-forward" size={16} color={colors.primary} /></TouchableOpacity>
          </View>
          {!!error && <Text accessibilityRole="alert" style={ui.error}>{error}</Text>}
        </View>}
        renderItem={({ item }) => <LessonCard compact plan={item} onOpen={() => router.push(`/plan/${item.id}` as never)} />}
        ListEmptyComponent={loading ? <ActivityIndicator color={colors.primary} /> : !error ? <EmptyState icon="document-text-outline" title="No lesson plans yet" subtitle="Tap Create Lesson Plan above to make your first one." /> : null}
      />
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  quickLinks: { flexDirection: 'row', gap: 10 },
  quickCard: { flex: 1, backgroundColor: colors.primaryLight, paddingHorizontal: 7, paddingVertical: 22, borderRadius: 18, alignItems: 'center', gap: 12 },
  quickLabel: { fontFamily: fonts.semiBold, fontSize: 12, lineHeight: 18, color: colors.primary, textAlign: 'center' },
  viewAll: { flexDirection: 'row', gap: 4, alignItems: 'center', minHeight: 44 },
});
