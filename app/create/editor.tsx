import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ErrorBanner, PrimaryButton, ScreenHeader, TextField } from '@/components/ui/form-fields';
import { generateLessonDraft } from '@/lib/api';
import { useDraft } from '@/lib/draft';
import { friendlyMessage } from '@/lib/errors';
import { colors, fontSize, spacing } from '@/lib/theme';
import { hasErrors, validateForCompletion } from '@/lib/validation';

/**
 * Module 4.4 — loads the editor matching the selected lesson-plan type.
 * Module 4.5 — teacher can edit auto-suggested content or enter their own.
 * Includes an optional AI-assist draft (backend-proxied) on top of the
 * required manual editing fields.
 */
export default function EditorScreen() {
  const router = useRouter();
  const { draft, setDraft } = useDraft();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const isIlaw = draft.planType === 'ILAW';

  async function onAiAssist() {
    setError('');
    setIsGenerating(true);
    try {
      const result = await generateLessonDraft({
        planType: draft.planType,
        gradeLevel: draft.gradeLevel,
        subject: draft.subject,
        topic: draft.lessonTitle,
        learningCompetencies: draft.learningCompetencies,
        objectives: draft.objectives,
        activityTitles: draft.activities.map((a) => a.title),
      });
      setDraft((d) => ({
        ...d,
        subjectMatter: result.subjectMatter || d.subjectMatter,
        learningResources: result.learningResources || d.learningResources,
        procedure: result.procedure || d.procedure,
        assessment: result.assessment || d.assessment,
        assignment: result.assignment || d.assignment,
        additionalNotes: result.additionalNotes || d.additionalNotes,
        ilaw: result.ilaw ? { ...(d.ilaw as NonNullable<typeof d.ilaw>), ...result.ilaw } : d.ilaw,
      }));
    } catch (err) {
      setError(friendlyMessage(err, 'generic'));
    } finally {
      setIsGenerating(false);
    }
  }

  function onContinue() {
    const errors = validateForCompletion(draft);
    if (hasErrors(errors)) {
      setError(Object.values(errors)[0] || 'Please complete the required fields.');
      return;
    }
    router.push('/create/preview');
  }

  function ilaw<K extends keyof NonNullable<typeof draft.ilaw>>(key: K, value: string) {
    setDraft((d) => ({
      ...d,
      ilaw: { contentStandard: '', performanceStandard: '', preLesson: '', flow: '', integration: '', extendedLearning: '', ...d.ilaw, [key]: value },
    }));
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Create Lesson Plan" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg }} keyboardShouldPersistTaps="handled">
        <Text style={styles.stepLabel}>Step 3 of 4 — {draft.planType} Editor</Text>
        <ErrorBanner message={error} />

        <TouchableOpacity style={styles.aiBtn} onPress={onAiAssist} disabled={isGenerating}>
          <Ionicons name="sparkles" size={16} color="#fff" />
          <Text style={styles.aiBtnText}>{isGenerating ? 'Drafting with AI…' : 'Draft this section with AI'}</Text>
        </TouchableOpacity>
        <Text style={styles.hint}>Optional — fills the fields below with a starting draft you can edit. Requires an internet connection.</Text>

        <TextField label="Learning Resources" placeholder="Books, materials, links, toolkits used" value={draft.learningResources} onChangeText={(v) => setDraft((d) => ({ ...d, learningResources: v }))} multiline style={styles.textArea} />

        {isIlaw ? (
          <>
            <TextField label="Content Standard" value={draft.ilaw?.contentStandard ?? ''} onChangeText={(v) => ilaw('contentStandard', v)} multiline style={styles.textArea} placeholder="What learners should know" />
            <TextField label="Performance Standard" value={draft.ilaw?.performanceStandard ?? ''} onChangeText={(v) => ilaw('performanceStandard', v)} multiline style={styles.textArea} placeholder="What learners should be able to do" />
            <TextField label="Pre-Lesson" value={draft.ilaw?.preLesson ?? ''} onChangeText={(v) => ilaw('preLesson', v)} multiline style={styles.textArea} placeholder="Activating prior knowledge" />
            <TextField label="Flow / Daloy ng Aralin" value={draft.ilaw?.flow ?? ''} onChangeText={(v) => ilaw('flow', v)} multiline style={[styles.textArea, { minHeight: 140 }]} placeholder="Numbered steps of the lesson flow" />
            <TextField label="Opportunities for Integration" value={draft.ilaw?.integration ?? ''} onChangeText={(v) => ilaw('integration', v)} multiline style={styles.textArea} optional />
          </>
        ) : (
          <TextField
            label="Procedure"
            placeholder={draft.planType === 'Detailed' ? 'Full narrative procedure with teacher/student dialogue' : 'Condensed key steps and prompts'}
            value={draft.procedure}
            onChangeText={(v) => setDraft((d) => ({ ...d, procedure: v }))}
            multiline
            style={[styles.textArea, { minHeight: 140 }]}
          />
        )}

        <TextField label="Assessment" placeholder="How learning will be checked" value={draft.assessment} onChangeText={(v) => setDraft((d) => ({ ...d, assessment: v }))} multiline style={styles.textArea} />
        <TextField label="Assignment" value={draft.assignment} onChangeText={(v) => setDraft((d) => ({ ...d, assignment: v }))} multiline style={styles.textArea} optional />
        {isIlaw && (
          <TextField label="Extended Learning Opportunities" value={draft.ilaw?.extendedLearning ?? ''} onChangeText={(v) => ilaw('extendedLearning', v)} multiline style={styles.textArea} optional />
        )}
        <TextField label="Reflection" value={draft.reflection} onChangeText={(v) => setDraft((d) => ({ ...d, reflection: v }))} multiline style={styles.textArea} optional />
        <TextField label="Additional Notes" value={draft.additionalNotes} onChangeText={(v) => setDraft((d) => ({ ...d, additionalNotes: v }))} multiline style={styles.textArea} optional />

        <View style={{ height: spacing.md }} />
        <PrimaryButton title="Continue to Preview" onPress={onContinue} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  stepLabel: { fontSize: fontSize.xs, color: colors.muted, fontWeight: '700', textTransform: 'uppercase', marginBottom: spacing.md },
  aiBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.accent, borderRadius: 10, paddingVertical: 12, marginBottom: 6 },
  aiBtnText: { color: '#111', fontWeight: '700', fontSize: fontSize.sm },
  hint: { fontSize: fontSize.xs, color: colors.muted, marginBottom: spacing.lg, textAlign: 'center' },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
});
