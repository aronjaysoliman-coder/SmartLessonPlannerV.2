import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DraftProgress } from '@/components/lesson/draft-progress';
import { ErrorBanner, PrimaryButton, ScreenHeader, TextField } from '@/components/ui/form-fields';
import { AiSection, generateSectionSuggestion } from '@/lib/api';
import { useDraft } from '@/lib/draft';
import { EditorField, readEditorField, writeEditorField } from '@/lib/draft-recovery';
import { friendlyMessage } from '@/lib/errors';
import { colors, fonts } from '@/lib/theme';
import { hasErrors, validateForCompletion } from '@/lib/validation';

type Section = { key: EditorField; label: string; hint: string; optional?: boolean; ai?: boolean };
const COMMON: Section[] = [
  { key: 'subjectMatter', label: 'Subject matter', hint: 'The core topic and content of this lesson.', ai: true },
  { key: 'learningResources', label: 'Learning resources', hint: 'List books, page references, links, and materials.', ai: true },
];
const PROCEDURE: Section = { key: 'procedure', label: 'Teaching procedure', hint: 'Sequence your lesson: review, instruction, guided practice, application, and closure.', ai: true };
const ILAW: Section[] = [
  { key: 'ilaw.contentStandard', label: 'Content standard', hint: 'What learners should know. Check the wording against your curriculum guide.', ai: true },
  { key: 'ilaw.performanceStandard', label: 'Performance standard', hint: 'What learners should be able to do.', ai: true },
  { key: 'ilaw.preLesson', label: 'Pre-lesson', hint: 'Activate prior knowledge and introduce the learning target.', ai: true },
  { key: 'ilaw.flow', label: 'Lesson flow', hint: 'Describe the numbered steps of the learning experience.', ai: true },
  { key: 'ilaw.integration', label: 'Opportunities for integration', hint: 'Connect to other subjects and real-life situations.', optional: true, ai: true },
];
const END: Section[] = [
  { key: 'assessment', label: 'Assessment', hint: 'Explain how learning will be checked and how the task will be scored.', ai: true },
  { key: 'assignment', label: 'Assignment', hint: 'Give instructions, the expected output, and completion requirements.', optional: true, ai: true },
  { key: 'reflection', label: 'Reflection', hint: 'After teaching, record what worked and what needs support.', optional: true },
  { key: 'additionalNotes', label: 'Additional notes', hint: 'Record accommodations, reminders, or other teaching notes.', optional: true, ai: true },
];

export default function EditorScreen() {
  const router = useRouter();
  const { draft, setDraft, retrySave } = useDraft();
  const [expanded, setExpanded] = useState<EditorField | null>('learningResources');
  const [generating, setGenerating] = useState<EditorField | null>(null);
  const [suggestions, setSuggestions] = useState<Partial<Record<EditorField, string>>>({});
  const [undo, setUndo] = useState<Partial<Record<EditorField, { before: string; accepted: string }>>>({});
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});
  const [notice, setNotice] = useState('');
  const [leaving, setLeaving] = useState(false);
  const request = useRef(0);
  const busy = useRef(false);
  const activeRequest = useRef<AbortController | null>(null);
  const cache = useRef(new Map<EditorField, string>());
  const context = JSON.stringify({ planType: draft.planType, gradeLevel: draft.gradeLevel, subject: draft.subject, topic: draft.lessonTitle, learningCompetencies: draft.learningCompetencies, objectives: draft.objectives, activityTitles: draft.activities.map((activity) => activity.title) });
  useEffect(() => {
    request.current += 1; activeRequest.current?.abort(); busy.current = false;
    cache.current.clear(); setSuggestions({}); setGenerating(null); setNotice('');
    return () => { request.current += 1; activeRequest.current?.abort(); };
  }, [draft.id, context]);
  const sections = [...COMMON, ...(draft.planType === 'ILAW' ? ILAW : [PROCEDURE]), ...END.slice(0, 2), ...(draft.planType === 'ILAW' ? [{ key: 'ilaw.extendedLearning' as const, label: 'Extended learning', hint: 'Plan opportunities for enrichment and further learning.', optional: true, ai: true }] : []), ...END.slice(2)];

  function cancelSuggestion() {
    request.current += 1; activeRequest.current?.abort(); activeRequest.current = null;
    busy.current = false; setGenerating(null); setNotice('AI request cancelled. Your text was kept.');
  }
  async function suggest(key: EditorField, fresh = false) {
    if (busy.current) return;
    const cached = cache.current.get(key);
    if (cached && !fresh) {
      setSuggestions((previous) => ({ ...previous, [key]: cached }));
      setError(''); setNotice('Previous suggestion reused for these lesson details.'); return;
    }
    busy.current = true;
    setError(''); setNotice(''); setGenerating(key);
    const controller = new AbortController(); activeRequest.current = controller;
    const token = ++request.current;
    try {
      const value = await generateSectionSuggestion({ ...JSON.parse(context), section: key as AiSection }, controller.signal);
      if (request.current !== token) return;
      if (!value.trim()) throw new Error('The AI returned no suggestion for this section. Try again or write your own.');
      cache.current.set(key, value);
      setSuggestions((previous) => ({ ...previous, [key]: value }));
    } catch (err) {
      if (request.current === token) setError(err instanceof Error && err.message.startsWith('The AI returned') ? err.message : friendlyMessage(err, 'generic'));
    } finally {
      if (request.current === token) { busy.current = false; activeRequest.current = null; setGenerating(null); }
    }
  }
  function accept(key: EditorField) {
    const value = suggestions[key];
    if (!value) return;
    setUndo((previous) => ({ ...previous, [key]: { before: readEditorField(draft, key), accepted: value } }));
    setDraft((current) => writeEditorField(current, key, value));
    setSuggestions((previous) => ({ ...previous, [key]: undefined }));
    setNotice('Suggestion accepted for this section. You can undo it below.');
  }
  function undoAcceptance(key: EditorField) {
    const change = undo[key];
    if (!change || readEditorField(draft, key) !== change.accepted) return;
    setDraft((current) => readEditorField(current, key) === change.accepted ? writeEditorField(current, key, change.before) : current);
    setUndo((previous) => ({ ...previous, [key]: undefined })); setNotice('Your previous text was restored.');
  }
  async function continueToReview() {
    const errors = validateForCompletion(draft); setFieldErrors(errors);
    if (hasErrors(errors)) {
      const first = Object.keys(errors)[0];
      if (sections.some((section) => section.key === first)) setExpanded(first as EditorField);
      setError(Object.values(errors)[0] || 'Complete the required fields before review.'); return;
    }
    try { await retrySave(); router.push('/create/preview'); }
    catch { setError('Your latest changes could not be saved. Retry autosave before leaving.'); }
  }
  async function saveAndExit() {
    setLeaving(true);
    try { await retrySave(); router.push('/(app)/dashboard'); }
    catch { setError('Your latest changes could not be saved. Please try again.'); }
    finally { setLeaving(false); }
  }

  return <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
    <ScreenHeader title="Create Lesson Plan" onBack={() => router.back()} />
    <DraftProgress step="editor" />
    <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <Text accessibilityRole="header" style={s.lessonTitle}>{draft.lessonTitle || 'Untitled Lesson Plan'}</Text>
        <Text style={s.description}>{draft.planType} editor · Open one section at a time. Your changes are saved on this device.</Text>
        <ErrorBanner message={error} />
        {!!draft.learningAreaReviewRequired && <TouchableOpacity accessibilityRole="button" style={s.fix} onPress={() => router.push('/create/setup')}><Text style={s.link}>Review grade and learning area in Setup</Text></TouchableOpacity>}
        {!!notice && <Text accessibilityLiveRegion="polite" style={s.notice}>{notice}</Text>}
        {(fieldErrors.lessonTitle || fieldErrors.objectives || fieldErrors.activities) && <TouchableOpacity accessibilityRole="button" style={s.fix} onPress={() => router.push('/create/activities')}><Text style={s.link}>Edit lesson title, objectives & activities</Text></TouchableOpacity>}
        {sections.map((section) => {
          const value = readEditorField(draft, section.key);
          const open = expanded === section.key;
          const proposed = suggestions[section.key];
          const change = undo[section.key];
          const canUndo = !!change && value === change.accepted;
          return <View key={section.key} style={[s.section, open && s.openSection]}>
            <TouchableOpacity accessibilityRole="button" accessibilityState={{ expanded: open }} style={[s.sectionHeader, open && s.activeHeader]} onPress={() => setExpanded(open ? null : section.key)}>
              <View style={s.sectionHeading}><Text style={[s.sectionTitle, open && s.white]}>{section.label}</Text><Text style={[s.sectionMeta, open && s.light]}>{section.optional ? 'Optional' : 'Lesson content'}{value.trim() ? ' · Filled' : ''}</Text></View>
              {!!value.trim() && <Ionicons name="checkmark-circle" size={19} color={open ? '#FFFFFF' : colors.successText} />}
              <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={19} color={open ? '#FFFFFF' : colors.primary} />
            </TouchableOpacity>
            {open && <View style={s.sectionBody}>
              <Text style={s.hint}>{section.hint}</Text>
              <TextField label={section.label} value={value} onChangeText={(text) => { setDraft((current) => writeEditorField(current, section.key, text)); setFieldErrors((previous) => ({ ...previous, [section.key]: undefined })); }} multiline style={s.textArea} optional={section.optional} error={fieldErrors[section.key]} placeholder={`Write your ${section.label.toLowerCase()} here...`} />
              {section.ai && <><TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: !!generating }} disabled={!!generating} style={[s.aiButton, !!generating && s.disabled]} onPress={() => suggest(section.key)}><Ionicons name="sparkles" size={18} color={colors.primary} /><Text style={s.link}>{generating === section.key ? 'Preparing this section...' : 'Suggest with AI'}</Text></TouchableOpacity><Text style={s.aiHint}>Generates only this section. Suggestions are reused until lesson details change. Review against your curriculum.</Text></>}
              {!!proposed && <View style={s.proposal}>
                <Text style={s.proposalTitle}>AI suggestion · Review first</Text>
                <Text style={s.comparisonLabel}>Your current text</Text><Text selectable style={s.previewText}>{value || 'This section is empty.'}</Text>
                <Text style={s.comparisonLabel}>Suggested text</Text><Text selectable style={s.previewText}>{proposed}</Text>
                <PrimaryButton title="Accept suggestion" onPress={() => accept(section.key)} />
                <TouchableOpacity accessibilityRole="button" disabled={!!generating} style={s.keep} onPress={() => suggest(section.key, true)}><Text style={s.link}>Generate another suggestion</Text></TouchableOpacity>
                <TouchableOpacity accessibilityRole="button" style={s.keep} onPress={() => { setSuggestions((previous) => ({ ...previous, [section.key]: undefined })); setNotice('Suggestion dismissed. Your text was kept.'); }}><Text style={s.link}>Keep original</Text></TouchableOpacity>
              </View>}
              {canUndo && <TouchableOpacity accessibilityRole="button" style={s.keep} onPress={() => undoAcceptance(section.key)}><Ionicons name="arrow-undo-outline" size={18} color={colors.primary} /><Text style={s.link}>Undo accepted suggestion</Text></TouchableOpacity>}
              {!!change && !canUndo && <Text style={s.aiHint}>You edited the accepted text. Undo is unavailable to protect your latest changes.</Text>}
            </View>}
          </View>;
        })}
      </ScrollView>
      <View style={s.footer}>{!!generating && <View accessibilityLiveRegion="polite"><Text style={s.aiHint}>Preparing {sections.find((section) => section.key === generating)?.label.toLowerCase()} only · Stops after 45 seconds</Text><TouchableOpacity accessibilityRole="button" style={s.keep} onPress={cancelSuggestion}><Text style={s.link}>Cancel AI request</Text></TouchableOpacity></View>}<PrimaryButton title="Continue to review" onPress={continueToReview} /><TouchableOpacity accessibilityRole="button" disabled={leaving} style={s.keep} onPress={saveAndExit}><Text style={s.link}>{leaving ? 'Saving...' : 'Save & exit'}</Text></TouchableOpacity></View>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg }, flex: { flex: 1 },
  content: { padding: 16, width: '100%', maxWidth: 680, alignSelf: 'center' },
  lessonTitle: { fontFamily: fonts.extraBold, fontSize: 22, lineHeight: 30, color: colors.primary },
  description: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 20, color: colors.muted, marginTop: 7, marginBottom: 18 },
  notice: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 20, color: colors.successText, marginBottom: 14 },
  fix: { padding: 14, backgroundColor: colors.primaryLight, borderRadius: 12, marginBottom: 14 },
  section: { backgroundColor: '#FFFFFF', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, marginBottom: 12 },
  openSection: { borderColor: colors.primary },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 17, minHeight: 68 },
  activeHeader: { backgroundColor: colors.primary }, sectionHeading: { flex: 1 },
  sectionTitle: { fontFamily: fonts.bold, fontSize: 15, color: colors.primary },
  sectionMeta: { fontFamily: fonts.regular, fontSize: 11, color: colors.muted, marginTop: 5 }, white: { color: '#FFFFFF' }, light: { color: '#DBE6FA' },
  sectionBody: { padding: 17 }, hint: { fontFamily: fonts.regular, color: colors.muted, fontSize: 12, lineHeight: 20, marginBottom: 15 },
  textArea: { minHeight: 160, textAlignVertical: 'top' },
  aiButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderWidth: 1, borderColor: colors.primary, borderRadius: 12 },
  disabled: { opacity: 0.5 }, link: { fontFamily: fonts.bold, color: colors.primary, fontSize: 13 },
  aiHint: { fontFamily: fonts.regular, color: colors.muted, fontSize: 11, lineHeight: 18, marginTop: 8 },
  proposal: { backgroundColor: colors.warnBg, borderWidth: 1, borderColor: '#F3CA7D', padding: 15, borderRadius: 14, marginTop: 16 },
  proposalTitle: { fontFamily: fonts.bold, color: colors.warnText, fontSize: 13 },
  comparisonLabel: { fontFamily: fonts.bold, color: colors.primary, fontSize: 12, marginTop: 16 },
  previewText: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 21, color: colors.text, marginTop: 7, marginBottom: 15 },
  keep: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, marginTop: 5 },
  footer: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: '#FFFFFF' },
});
