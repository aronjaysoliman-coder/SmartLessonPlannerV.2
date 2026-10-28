import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { File as ExpoFile } from 'expo-file-system';
import { ErrorBanner, PrimaryButton, ScreenHeader, SelectField, TextField } from '@/components/ui/form-fields';
import { extractCompetenciesFromPdf } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useDraft } from '@/lib/draft';
import { friendlyMessage } from '@/lib/errors';
import { colors, fontSize, spacing } from '@/lib/theme';
import {
  GRADE_LEVEL_GROUPS,
  LESSON_PLAN_TYPES,
  SUBJECT_OPTIONS,
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
  const { profile } = useAuth();
  const { draft, setDraft, resetDraft } = useDraft();
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [guideError, setGuideError] = useState('');
  const [isReadingGuide, setIsReadingGuide] = useState(false);

  async function importCompetencies() {
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
      const text = await extractCompetenciesFromPdf(file, asset.name, draft.gradeLevel, draft.subject);
      setDraft((current) => ({ ...current, learningCompetencies: text }));
    } catch (err) {
      setGuideError(friendlyMessage(err, 'generic'));
    } finally {
      setIsReadingGuide(false);
    }
  }

  function onContinue() {
    const setupErrors = validateSetup(draft);
    setErrors(setupErrors);
    if (hasErrors(setupErrors)) return;
    router.push('/create/activities');
  }

  function startFresh() {
    resetDraft(profile?.uid ?? 'local');
    setErrors({});
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Create Lesson Plan" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg }} keyboardShouldPersistTaps="handled">
        <Text style={styles.stepLabel}>Step 1 of 4 — Setup</Text>

        <SelectField
          label="Grade Level"
          value={draft.gradeLevel}
          placeholder="Select grade level"
          options={GRADE_LEVEL_GROUPS}
          onSelect={(v) => setDraft((d) => ({ ...d, gradeLevel: v }))}
          error={errors.gradeLevel}
        />
        <SelectField
          label="Learning Area / Subject"
          value={draft.subject}
          placeholder="Select subject"
          options={SUBJECT_OPTIONS}
          onSelect={(v) => setDraft((d) => ({ ...d, subject: v }))}
          error={errors.subject}
        />
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

        <PrimaryButton title="Continue" onPress={onContinue} />
        <View style={{ height: spacing.sm }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
