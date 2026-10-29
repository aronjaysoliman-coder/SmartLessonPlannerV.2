import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PlanPreview } from '@/components/lesson/plan-preview';
import { ErrorBanner, PrimaryButton, ScreenHeader } from '@/components/ui/form-fields';
import { deleteCloudLessonPlan } from '@/lib/api';
import { deleteLessonPlan, getLessonPlan } from '@/lib/db';
import { useDraft } from '@/lib/draft';
import { friendlyMessage } from '@/lib/errors';
import { exportLessonPlanPdf, shareLessonPlanPdf } from '@/lib/pdf';
import { colors, fontSize, radius, spacing } from '@/lib/theme';
import { LessonPlanCore } from '@/lib/types';

/** Module 5.5 (edit) / 5.6 (delete) / 6.2-6.3 (export + share) for a saved plan. */
export default function ViewPlanScreen() {
  const { id, edit } = useLocalSearchParams<{ id: string; edit?: string }>();
  const router = useRouter();
  const { openDraft } = useDraft();
  const [plan, setPlan] = useState<LessonPlanCore | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const found = await getLessonPlan(id);
      setPlan(found);
      setIsLoading(false);
      if (found && edit === '1') {
        try {
          await openDraft(found);
          router.replace('/create/editor');
        } catch { setError('Could not preserve your unfinished lesson. Please try again.'); }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function onEdit() {
    if (!plan) return;
    try { await openDraft(plan); } catch { setError("Could not preserve your unfinished lesson. Please try again."); return; }
    router.push('/create/editor');
  }

  function onDelete() {
    if (!plan) return;
    Alert.alert('Delete lesson plan?', `"${plan.lessonTitle || 'Untitled'}" will be permanently removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteLessonPlan(plan.id);
            deleteCloudLessonPlan(plan.id).catch(() => {});
            router.back();
          } catch {
            Alert.alert('Error', "We couldn't delete this lesson plan. Please try again.");
          }
        },
      },
    ]);
  }

  async function onExportAndShare() {
    if (!plan) return;
    setError('');
    setIsExporting(true);
    try {
      const fileUri = await exportLessonPlanPdf(plan);
      try {
        await shareLessonPlanPdf(fileUri);
      } catch (shareErr) {
        setError(friendlyMessage(shareErr, 'share'));
      }
    } catch (err) {
      setError(friendlyMessage(err, 'pdf'));
    } finally {
      setIsExporting(false);
    }
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator style={{ marginTop: spacing.xxl }} color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (!plan) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Lesson Plan" onBack={() => router.back()} />
        <View style={styles.notFound}>
          <Ionicons name="alert-circle-outline" size={32} color={colors.muted} />
          <Text style={styles.notFoundText}>This lesson plan could not be found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        title="Lesson Plan"
        onBack={() => router.back()}
        right={
          <TouchableOpacity onPress={onEdit}>
            <Ionicons name="create-outline" size={20} color="#fff" />
          </TouchableOpacity>
        }
      />
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <ErrorBanner message={error} />
        <View style={styles.previewCard}>
          <PlanPreview plan={plan} />
        </View>

        <Text style={styles.pdfHint}>PDF format: Classic School layout · A4 portrait</Text>
        <PrimaryButton title={isExporting ? 'Preparing PDF…' : 'Export PDF & Share'} onPress={onExportAndShare} loading={isExporting} />
        <View style={{ height: spacing.sm }} />
        <PrimaryButton title="Edit" onPress={onEdit} variant="outline" />
        <View style={{ height: spacing.sm }} />
        <PrimaryButton title="Delete" onPress={onDelete} variant="ghost" />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  pdfHint: { fontSize: 12, lineHeight: 18, color: colors.muted, textAlign: 'center', marginBottom: 10 },
  safe: { flex: 1, backgroundColor: colors.bg },
  previewCard: { backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, marginBottom: spacing.lg },
  notFound: { alignItems: 'center', justifyContent: 'center', padding: spacing.xxl, gap: spacing.sm },
  notFoundText: { color: colors.muted, fontSize: fontSize.base },
});
