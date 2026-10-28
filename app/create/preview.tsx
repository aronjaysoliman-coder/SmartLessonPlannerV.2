import { Ionicons } from '@expo/vector-icons';
import * as Crypto from 'expo-crypto';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ErrorBanner, PrimaryButton, ScreenHeader, TextField } from '@/components/ui/form-fields';
import { PlanPreview } from '@/components/lesson/plan-preview';
import { archiveLessonPlanPdf, syncLessonPlanToCloud } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useDraft } from '@/lib/draft';
import { getLessonTemplate, saveLessonPlan } from '@/lib/db';
import { friendlyMessage } from '@/lib/errors';
import { exportLessonPlanPdf, shareLessonPlanPdf } from '@/lib/pdf';
import { createFilledTemplatePdf } from '@/lib/template-pdf';
import { colors, fontSize, radius, spacing } from '@/lib/theme';
import { hasErrors, validateForCompletion } from '@/lib/validation';

/**
 * Module 6.1 Preview  6.2 Export to PDF  6.3 Share  6.4 Offline-first save
 * 6.5 Validate before processing  6.6 User-friendly error messages only.
 */
export default function PreviewScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const { draft, setDraft, resetDraft, templateId } = useDraft();
  const [category, setCategory] = useState(draft.category);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState('');
  const [savedMessage, setSavedMessage] = useState('');

  async function persist(status: 'draft' | 'completed') {
    setError('');
    if (status === 'completed') {
      const errors = validateForCompletion(draft);
      if (hasErrors(errors)) {
        setError(Object.values(errors)[0] || 'Please complete the required fields first.');
        return null;
      }
    }
    setIsSaving(true);
    try {
      const now = Date.now();
      const finalPlan = {
        ...draft,
        id: draft.id || Crypto.randomUUID(),
        ownerId: profile?.uid ?? 'local',
        category,
        status,
        createdAt: draft.createdAt || now,
        updatedAt: now,
      };
      await saveLessonPlan(finalPlan);
      setDraft(finalPlan);
      // Best-effort cloud backup — never blocks the local save (Module 6.4 offline access).
      syncLessonPlanToCloud(finalPlan).catch(() => {});
      setSavedMessage(status === 'completed' ? 'Lesson plan saved.' : 'Draft saved.');
      return finalPlan;
    } catch (err) {
      setError(friendlyMessage(err, 'save'));
      return null;
    } finally {
      setIsSaving(false);
    }
  }

  async function onSaveDraft() {
    const plan = await persist('draft');
    if (plan) router.replace('/(app)/my-plans');
  }

  async function onSaveCompleted() {
    const plan = await persist('completed');
    if (plan) router.replace('/(app)/my-plans');
  }

  async function onExportAndShare() {
    setError('');
    const errors = validateForCompletion(draft);
    if (hasErrors(errors)) {
      setError(Object.values(errors)[0] || 'Please complete the required fields before exporting.');
      return;
    }
    setIsExporting(true);
    try {
      const plan = await persist('completed');
      if (!plan) return;
      const fileUri = await exportLessonPlanPdf(plan);
      try {
        await syncLessonPlanToCloud(plan);
        const filename = `${(plan.lessonTitle || 'lesson-plan').replace(/[<>:"/\\|?*]/g, '_').slice(0, 100)}.pdf`;
        await archiveLessonPlanPdf(plan.id, fileUri, filename);
        setSavedMessage('Lesson plan and PDF saved to MongoDB.');
      } catch (archiveErr) {
        if (__DEV__) console.error('[pdf] MongoDB archive failed:', archiveErr);
        setError('The PDF was created, but could not be archived in MongoDB. It will still download so you can keep a copy.');
      }
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

  async function onExportWithTemplate() {
    if (!templateId) return;
    setError('');
    setIsExporting(true);
    try {
      const plan = await persist('completed');
      if (!plan) return;
      const template = await getLessonTemplate(templateId, profile?.uid ?? 'local');
      if (!template) throw new Error('This saved template could not be found on this device. Upload it again to continue.');
      const fileUri = await createFilledTemplatePdf(template, plan);
      if (typeof window !== 'undefined' && fileUri.startsWith('blob:')) {
        setSavedMessage('Completed template downloaded.');
      } else {
        await shareLessonPlanPdf(fileUri);
        setSavedMessage('Completed template is ready to share.');
      }
    } catch (err) {
      setError(
        err instanceof Error && /does not fit|could not be found on this device/i.test(err.message)
          ? err.message
          : friendlyMessage(err, 'pdf')
      );
    } finally {
      setIsExporting(false);
    }
  }

  function startNewPlan() {
    resetDraft(profile?.uid ?? 'local');
    router.replace('/create/setup');
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Preview" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <Text style={styles.stepLabel}>Step 4 of 4 — Preview, Save &amp; Export</Text>
        <ErrorBanner message={error} />
        {!!savedMessage && (
          <View style={styles.successBanner}>
            <Ionicons name="checkmark-circle" size={16} color={colors.success} />
            <Text style={styles.successText}>{savedMessage}</Text>
          </View>
        )}

        <TextField label="Category / Folder" placeholder="e.g. Quarter 1, Fractions Unit" value={category} onChangeText={setCategory} optional />

        <View style={styles.previewCard}>
          <PlanPreview plan={draft} />
        </View>

        <PrimaryButton title={isExporting ? 'Preparing PDF…' : 'Export PDF & Share'} onPress={onExportAndShare} loading={isExporting} />
        {!!templateId && (
          <>
            <View style={{ height: spacing.sm }} />
            <PrimaryButton
              title={isExporting ? 'Filling template…' : 'Fill uploaded template'}
              onPress={onExportWithTemplate}
              loading={isExporting}
              variant="outline"
            />
          </>
        )}
        <View style={{ height: spacing.sm }} />
        <PrimaryButton title="Save as Completed" onPress={onSaveCompleted} loading={isSaving} variant="outline" />
        <View style={{ height: spacing.sm }} />
        <PrimaryButton title="Save as Draft" onPress={onSaveDraft} loading={isSaving} variant="ghost" />
        <View style={{ height: spacing.sm }} />
        <TouchableOpacity onPress={startNewPlan}>
          <Text style={styles.newPlanLink}>Start a New Lesson Plan</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  stepLabel: { fontSize: fontSize.xs, color: colors.muted, fontWeight: '700', textTransform: 'uppercase', marginBottom: spacing.md },
  successBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.successBg, borderRadius: radius.sm, padding: spacing.sm, marginBottom: spacing.md },
  successText: { color: colors.success, fontSize: fontSize.sm, fontWeight: '600' },
  previewCard: { backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, marginBottom: spacing.lg },
  newPlanLink: { textAlign: 'center', color: colors.muted, fontSize: fontSize.sm, textDecorationLine: 'underline' },
});
