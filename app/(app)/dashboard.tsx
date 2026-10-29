import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
  const { resetDraft, recovery, saveState, retrySave, finishDraft } = useDraft();
  const router = useRouter();
  const [recent, setRecent] = useState<LessonPlanCore[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
  const [isDeletingProgress, setIsDeletingProgress] = useState(false);

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

  async function onCreate() {
    try { await resetDraft(profile?.uid ?? 'local');
    router.push('/create/setup');
    } catch { setError('Could not preserve your unfinished lesson. Please try again.'); }
  }

  async function onRefresh() {
    setRefreshing(true);
    try { await load(); } catch { setError('Could not refresh your plans. Please try again.'); }
    finally { setRefreshing(false); }
  }

  async function deleteProgress() {
    setIsDeletingProgress(true);
    try {
      await finishDraft();
      setDeleteConfirmationOpen(false);
    } catch {
      setError('Could not delete this progress. Please try again.');
    } finally {
      setIsDeletingProgress(false);
    }
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
          {!!recovery && <View style={s.resumeCard}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Delete in-progress lesson"
              hitSlop={8}
              style={s.deleteProgressButton}
              onPress={() => setDeleteConfirmationOpen(true)}
            >
              <Ionicons name="close" size={20} color={colors.muted} />
            </TouchableOpacity>
            <Text style={s.resumeLabel}>IN PROGRESS</Text>
            <Text style={s.resumeTitle}>{recovery.draft.lessonTitle || recovery.draft.subjectMatter || 'Untitled Lesson Plan'}</Text>
            <Text style={s.resumeMeta}>{[recovery.draft.subject, recovery.draft.gradeLevel].filter(Boolean).join(' · ')}</Text>
            <View style={s.progressTrack}><View style={[s.progressFill, { width: `${(['setup', 'activities', 'editor', 'preview'].indexOf(recovery.step) + 1) * 25}%` }]} /></View>
            <Text style={s.resumeMeta}>Step {['setup', 'activities', 'editor', 'preview'].indexOf(recovery.step) + 1} of 4 · {recovery.step === 'preview' ? 'Review' : recovery.step}</Text>
            <TouchableOpacity accessibilityRole="button" style={s.resumeButton} onPress={() => router.push(`/create/${recovery.step}`)}><Text style={s.resumeButtonText}>Continue lesson</Text><Ionicons name="arrow-forward" size={19} color="#FFFFFF" /></TouchableOpacity>
            <Text style={s.resumeMeta}>{saveState === 'saved' ? 'Saved on this device' : saveState === 'error' ? 'Autosave failed. Retry before leaving.' : 'Saving on this device...'}</Text>
            {saveState === 'error' && <TouchableOpacity accessibilityRole="button" style={s.viewAll} onPress={() => { void retrySave().catch(() => {}); }}><Text style={ui.link}>Retry autosave</Text></TouchableOpacity>}
            <Text style={s.resumeMeta}>Starting a new lesson keeps this one as a draft in My Plans.</Text>
          </View>}
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
      <Modal
        visible={deleteConfirmationOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteConfirmationOpen(false)}
      >
        <View style={s.confirmationBackdrop}>
          <View accessibilityRole="alert" style={s.confirmationDialog}>
            <Text style={s.confirmationTitle}>Delete progress?</Text>
            <Text style={s.confirmationMessage}>Are you sure you want to delete this progress?</Text>
            <View style={s.confirmationActions}>
              <TouchableOpacity
                accessibilityRole="button"
                style={s.cancelButton}
                disabled={isDeletingProgress}
                onPress={() => setDeleteConfirmationOpen(false)}
              >
                <Text style={s.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                style={s.deleteButton}
                disabled={isDeletingProgress}
                onPress={() => { void deleteProgress(); }}
              >
                <Text style={s.deleteButtonText}>{isDeletingProgress ? 'Deleting…' : 'Delete'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  resumeCard: { position: 'relative', marginTop: 20, padding: 20, borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.border },
  deleteProgressButton: { position: 'absolute', top: 8, right: 8, zIndex: 1, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  resumeLabel: { fontFamily: fonts.bold, fontSize: 11, color: colors.warnText, marginBottom: 8 },
  resumeTitle: { fontFamily: fonts.bold, fontSize: 18, color: colors.primary },
  resumeMeta: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, marginTop: 8, lineHeight: 19 },
  progressTrack: { height: 7, borderRadius: 4, backgroundColor: colors.primaryLight, marginTop: 15, overflow: 'hidden' },
  progressFill: { height: 7, borderRadius: 4, backgroundColor: colors.accent },
  resumeButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 14, borderRadius: 12, backgroundColor: colors.primary, marginTop: 15 },
  resumeButtonText: { fontFamily: fonts.bold, color: '#FFFFFF' },
  quickLinks: { flexDirection: 'row', gap: 10 },
  quickCard: { flex: 1, backgroundColor: colors.primaryLight, paddingHorizontal: 7, paddingVertical: 22, borderRadius: 18, alignItems: 'center', gap: 12 },
  quickLabel: { fontFamily: fonts.semiBold, fontSize: 12, lineHeight: 18, color: colors.primary, textAlign: 'center' },
  viewAll: { flexDirection: 'row', gap: 4, alignItems: 'center', minHeight: 44 },
  confirmationBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: 'rgba(15, 23, 42, 0.45)' },
  confirmationDialog: { width: '100%', maxWidth: 380, padding: 24, borderRadius: 16, backgroundColor: '#FFFFFF' },
  confirmationTitle: { fontFamily: fonts.bold, fontSize: 18, color: colors.primary },
  confirmationMessage: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, color: colors.muted, marginTop: 10 },
  confirmationActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 24 },
  cancelButton: { minHeight: 42, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 8, backgroundColor: colors.primaryLight },
  cancelButtonText: { fontFamily: fonts.semiBold, color: colors.primary },
  deleteButton: { minHeight: 42, justifyContent: 'center', paddingHorizontal: 18, borderRadius: 8, backgroundColor: colors.danger },
  deleteButtonText: { fontFamily: fonts.bold, color: '#FFFFFF' },
});
