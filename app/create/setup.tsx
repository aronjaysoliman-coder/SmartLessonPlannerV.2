import { Ionicons } from '@expo/vector-icons';
import { changeGrade, changeLearningArea, getLearningAreas, isLearningAreaAllowed, learningAreaReferenceNote } from '@/lib/learning-areas';
import { DraftProgress } from '@/components/lesson/draft-progress';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, Platform, Modal, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { File as ExpoFile } from 'expo-file-system';
import { ErrorBanner, PrimaryButton, ScreenHeader, SelectField, TextField } from '@/components/ui/form-fields';
import { extractCompetenciesFromPdf } from '@/lib/api';
import { useDraft } from '@/lib/draft';
import { friendlyMessage } from '@/lib/errors';
import { colors, fontSize, spacing } from '@/lib/theme';
import {
  GRADE_LEVEL_GROUPS,
  LESSON_PLAN_TYPES,
  TERM_OPTIONS,
  WEEK_OPTIONS,
} from '@/lib/types';
import { hasErrors, validateSetup } from '@/lib/validation';

/**
 * Module 3 (revised) — Create Lesson Plan Workflow (Setup).
 * 3.1 Grade level  3.2 Learning area/subject  3.3 Term + Week
 * 3.4 Learning competencies (free text)  3.5 Teacher name + Section (optional)
 * 3.6 Lesson plan type (ILAW / Detailed / Semi-Detailed)
 * 3.7 Validate before continuing.
 */
export default function SetupScreen() {
  const router = useRouter();
  const { draft, setDraft } = useDraft();
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [guideError, setGuideError] = useState('');
  const [isReadingGuide, setIsReadingGuide] = useState(false);
  const [pendingGrade, setPendingGrade] = useState<string | null>(null);
  const guideRequest = useRef(0);
  const learningAreas = getLearningAreas(draft.gradeLevel);
  const invalidExistingSubject = !!draft.subject && !isLearningAreaAllowed(draft.gradeLevel, draft.subject);

  function applyGrade(grade: string) {
    guideRequest.current += 1;
    setIsReadingGuide(false);
    setDraft((current) => changeGrade(current, grade));
    setErrors({}); setPendingGrade(null); setGuideError('');
  }
  function selectGrade(grade: string) {
    if (grade === draft.gradeLevel) return;
    if (draft.subject && !isLearningAreaAllowed(grade, draft.subject)) setPendingGrade(grade);
    else applyGrade(grade);
  }
  function selectLearningArea(subject: string) {
    guideRequest.current += 1;
    setIsReadingGuide(false);
    setDraft((current) => changeLearningArea(current, subject));
    setErrors({}); setGuideError('');
  }

  async function importCompetencies() {
    if (!isLearningAreaAllowed(draft.gradeLevel, draft.subject)) { setGuideError('Select a valid grade and learning area before importing competencies.'); return; }
    const request = ++guideRequest.current;
    const grade = draft.gradeLevel; const subject = draft.subject;
    setGuideError('');
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (asset.size && asset.size > 20 * 1024 * 1024) {
        setGuideError('Choose a PDF smaller than 20 MB.');
        return;
      }

      setIsReadingGuide(true);
      const file = Platform.OS === 'web' ? asset.file : new ExpoFile(asset.uri);
      if (!file) throw new Error('Could not read the selected PDF.');
      const text = await extractCompetenciesFromPdf(file, asset.name, grade, subject);
      if (request !== guideRequest.current) return;
      setDraft((current) => current.gradeLevel === grade && current.subject === subject ? { ...current, learningCompetencies: text } : current);
    } catch (err) {
      if (request === guideRequest.current) setGuideError(friendlyMessage(err, 'generic'));
    } finally {
      if (request === guideRequest.current) setIsReadingGuide(false);
    }
  }

  function onContinue() {
    const setupErrors = validateSetup(draft);
    setErrors(setupErrors);
    if (hasErrors(setupErrors)) return;
    router.push('/create/activities');
  }


  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Create Lesson Plan" onBack={() => router.back()} />
      <DraftProgress step="setup" />
      <ScrollView contentContainerStyle={{ padding: spacing.lg }} keyboardShouldPersistTaps="handled">
        <Text style={styles.stepLabel}>Step 1 of 4 — Setup</Text>

        <SelectField
          label="Grade Level"
          value={draft.gradeLevel}
          placeholder="Select grade level"
          options={GRADE_LEVEL_GROUPS}
          onSelect={selectGrade}
          error={errors.gradeLevel}
        />
        <SelectField
          label="Learning Area / Subject"
          value={draft.subject}
          placeholder={draft.gradeLevel ? "Select learning area" : "Choose a grade first"}
          options={learningAreas}
          disabled={!draft.gradeLevel || learningAreas.length === 0}
          onSelect={selectLearningArea}
          error={errors.subject}
        />
        {!draft.gradeLevel && <Text style={styles.curriculumHint}>Select a grade first to see its learning areas.</Text>}
        {!!draft.gradeLevel && <Text style={styles.curriculumHint}>{learningAreaReferenceNote(draft.gradeLevel)}</Text>}
        {invalidExistingSubject && <View style={styles.reviewCard}><Text style={styles.reviewTitle}>Saved learning area needs review</Text><Text style={styles.reviewText}>“{draft.subject}” is kept from your existing plan but is not in this grade’s reference list. Choose a mapped learning area to continue. Your lesson text has not been changed.</Text></View>}
        {!!draft.learningAreaReviewRequired && <View style={styles.reviewCard}>
          <Text style={styles.reviewTitle}>Review your retained lesson content</Text>
          <Text style={styles.reviewText}>Your topic, competencies, objectives, activities, and teaching notes were kept. Review them for {draft.gradeLevel}{draft.subject ? ` · ${draft.subject}` : ''} before continuing.</Text>
          {!!draft.objectives.filter(Boolean).length && <Text style={styles.reviewText}>Objectives: {draft.objectives.filter(Boolean).join('; ')}</Text>}
          {!!draft.activities.length && <Text style={styles.reviewText}>Activities: {draft.activities.map((activity) => activity.title || 'Untitled activity').join('; ')}</Text>}
          <PrimaryButton title="I reviewed the content for this grade and learning area" disabled={!isLearningAreaAllowed(draft.gradeLevel, draft.subject)} onPress={() => { setDraft((current) => ({ ...current, learningAreaReviewRequired: false })); setErrors((current) => ({ ...current, learningAreaReviewRequired: undefined })); }} variant="outline" />
        </View>}
        <ErrorBanner message={errors.learningAreaReviewRequired} />
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <SelectField label="Term" value={draft.term} placeholder="Term" options={TERM_OPTIONS} onSelect={(v) => setDraft((d) => ({ ...d, term: v }))} error={errors.term} />
          </View>
          <View style={{ flex: 1 }}>
            <SelectField label="Week" value={draft.week} placeholder="Week" options={WEEK_OPTIONS} onSelect={(v) => setDraft((d) => ({ ...d, week: v }))} error={errors.week} />
          </View>
        </View>
        
        <TextField label="Subject Matter" placeholder="The core topic/content of the lesson" value={draft.subjectMatter} onChangeText={(v) => setDraft((d) => ({ ...d, subjectMatter: v }))} multiline style={styles.textArea} />
        <TextField
          label="Learning Competencies"
          placeholder={'Paste the exact competency text/codes from the curriculum guide, e.g.:\n\nUse critical listening, reading, and viewing strategies...'}
          value={draft.learningCompetencies}
          onChangeText={(v) => setDraft((d) => ({ ...d, learningCompetencies: v }))}
          multiline
          numberOfLines={5}
          style={{ minHeight: 110, textAlignVertical: 'top' }}
          error={errors.learningCompetencies}
        />
        <PrimaryButton
          title={isReadingGuide ? 'Reading curriculum PDF…' : 'Upload curriculum guide PDF'}
          onPress={importCompetencies}
          loading={isReadingGuide}
          disabled={!isLearningAreaAllowed(draft.gradeLevel, draft.subject)}
          variant="outline"
        />
        <Text style={styles.guideHint}>Extracts selectable text from a PDF and suggests matching competencies. Scanned PDFs are not supported.</Text>
        <ErrorBanner message={guideError} />

        <TextField
          label="Teacher's Name"
          placeholder="e.g. Aron Jay Soliman"
          value={draft.teacherName}
          onChangeText={(v) => setDraft((d) => ({ ...d, teacherName: v }))}
          optional
        />
        <TextField
          label="Section / Class"
          placeholder="e.g. Sampaguita"
          value={draft.section}
          onChangeText={(v) => setDraft((d) => ({ ...d, section: v }))}
          optional
        />

        <Text style={styles.groupLabel}>Lesson Plan Type</Text>
        {LESSON_PLAN_TYPES.map((t) => (
          <TouchableOpacity
            key={t.value}
            activeOpacity={0.8}
            style={[styles.planTypeCard, draft.planType === t.value && styles.planTypeCardSelected]}
            onPress={() => setDraft((d) => ({ ...d, planType: t.value }))}
          >
            <Text style={[styles.planTypeTitle, draft.planType === t.value && styles.planTypeTitleSelected]}>{t.label}</Text>
            <Text style={styles.planTypeDesc}>{t.description}</Text>
          </TouchableOpacity>
        ))}
        {!!errors.planType && <Text style={styles.errorText}>{errors.planType}</Text>}

        <PrimaryButton title="Continue" onPress={onContinue} disabled={!draft.gradeLevel || !draft.subject} />
        <View style={{ height: spacing.sm }} />
      </ScrollView>
      <Modal visible={pendingGrade !== null} transparent animationType="fade" onRequestClose={() => setPendingGrade(null)}>
        <View style={styles.modalBackdrop}>
          <Pressable accessibilityLabel="Keep current grade" style={StyleSheet.absoluteFill} onPress={() => setPendingGrade(null)} />
          <View style={styles.modalCard} accessibilityViewIsModal>
            <Ionicons name="information-circle" size={36} color={colors.accent} />
            <Text accessibilityRole="header" style={styles.reviewTitle}>Review your learning area</Text>
            <Text style={styles.reviewText}>Change from {draft.gradeLevel || 'no grade'} to {pendingGrade}? Your current learning area, {draft.subject}, is not in the new grade’s list.</Text>
            <Text style={styles.reviewText}>Only the subject selection will be cleared. All lesson text will be kept for review.</Text>
            <PrimaryButton title="Change grade and choose a learning area" onPress={() => { if (pendingGrade) applyGrade(pendingGrade); }} />
            <TouchableOpacity accessibilityRole="button" style={styles.cancelGrade} onPress={() => setPendingGrade(null)}><Text style={styles.cancelGradeText}>Keep {draft.gradeLevel || 'current grade'}</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  curriculumHint: { color: colors.muted, fontSize: 12, lineHeight: 19, marginBottom: 16 },
  reviewCard: { padding: 16, backgroundColor: colors.warnBg, borderRadius: 14, borderWidth: 1, borderColor: '#F3CA7D', marginBottom: 16 },
  reviewTitle: { color: colors.primary, fontSize: 17, fontWeight: '700', marginVertical: 10 },
  reviewText: { color: colors.muted, fontSize: 13, lineHeight: 21, marginBottom: 14 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15,36,80,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalCard: { backgroundColor: colors.card, borderRadius: 22, padding: 24, width: '100%', maxWidth: 460 },
  cancelGrade: { minHeight: 48, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  cancelGradeText: { color: colors.primary, fontSize: 14, fontWeight: '700' },
  safe: { flex: 1, backgroundColor: colors.bg },
  stepLabel: { fontSize: fontSize.xs, color: colors.muted, fontWeight: '700', textTransform: 'uppercase', marginBottom: spacing.md },
  row: { flexDirection: 'row', gap: spacing.sm },
  groupLabel: { fontSize: fontSize.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, color: colors.text, marginBottom: spacing.sm, marginTop: spacing.xs },
  planTypeCard: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: spacing.md, marginBottom: spacing.sm, backgroundColor: colors.card },
  planTypeCardSelected: { borderColor: colors.primary, backgroundColor: '#eff6ff' },
  planTypeTitle: { fontSize: fontSize.base, fontWeight: '700', color: colors.text },
  planTypeTitleSelected: { color: colors.primary },
  planTypeDesc: { fontSize: fontSize.xs, color: colors.muted, marginTop: 2 },
  errorText: { color: colors.danger, fontSize: fontSize.xs, marginBottom: spacing.md },
  guideHint: { color: colors.muted, fontSize: fontSize.xs, textAlign: 'center', marginTop: spacing.xs, marginBottom: spacing.md },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
});
