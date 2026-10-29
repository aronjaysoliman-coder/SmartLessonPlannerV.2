import { Ionicons } from '@expo/vector-icons';
import * as Crypto from 'expo-crypto';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ErrorBanner, PrimaryButton, ScreenHeader, TextField } from '@/components/ui/form-fields';
import { suggestActivities } from '@/lib/activityBank';
import { useDraft } from '@/lib/draft';
import { colors, fontSize, radius, spacing } from '@/lib/theme';
import { DraftProgress } from '@/components/lesson/draft-progress';
import { LessonActivity } from '@/lib/types';

/**
 * Module 4.1-4.3 — activities are suggested from a predefined activity bank
 * using rule-based matching on subject/grade/topic/objectives, then the
 * teacher can accept, edit, remove, replace, or add custom activities.
 */
export default function ActivitiesScreen() {
  const router = useRouter();
  const { draft, setDraft } = useDraft();
  const lessonTitle = draft.lessonTitle;
  const setLessonTitle = (value: string) => setDraft((current) => ({ ...current, lessonTitle: value }));
  const objectives = draft.objectives.length ? draft.objectives : [''];
  const setObjectives = (action: React.SetStateAction<string[]>) => setDraft((current) => ({ ...current, objectives: typeof action === 'function' ? action(current.objectives.length ? current.objectives : ['']) : action }));
  const [error, setError] = useState('');

  function updateObjective(i: number, value: string) {
    setObjectives((prev) => prev.map((o, idx) => (idx === i ? value : o)));
  }
  function addObjective() {
    setObjectives((prev) => [...prev, '']);
  }
  function removeObjective(i: number) {
    setObjectives((prev) => prev.filter((_, idx) => idx !== i));
  }

  function generateSuggestions() {
    setError('');
    if (!lessonTitle.trim()) {
      setError('Enter a lesson title/topic first so suggestions can be matched to it.');
      return;
    }
    const suggestions = suggestActivities({
      subject: draft.subject,
      gradeLevel: draft.gradeLevel,
      topic: lessonTitle,
      objectives: objectives.join('\n'),
    });
    setDraft((d) => ({
      ...d,
      activities: [...d.activities.filter((a) => !a.isSuggested), ...suggestions],
    }));
  }

  function replaceOne(id: string) {
    const [fresh] = suggestActivities({
      subject: draft.subject,
      gradeLevel: draft.gradeLevel,
      topic: lessonTitle,
      objectives: objectives.join('\n'),
      limit: 1,
    });
    setDraft((d) => ({ ...d, activities: d.activities.map((a) => (a.id === id ? { ...fresh, id: Crypto.randomUUID() } : a)) }));
  }

  function removeActivity(id: string) {
    setDraft((d) => ({ ...d, activities: d.activities.filter((a) => a.id !== id) }));
  }

  function updateActivity(id: string, patch: Partial<LessonActivity>) {
    setDraft((d) => ({ ...d, activities: d.activities.map((a) => (a.id === id ? { ...a, ...patch, isSuggested: false } : a)) }));
  }

  function addCustomActivity() {
    setDraft((d) => ({
      ...d,
      activities: [
        ...d.activities,
        { id: Crypto.randomUUID(), title: '', type: 'Custom', description: '', materials: '', durationMinutes: 10, isSuggested: false },
      ],
    }));
  }

  function onContinue() {
    const cleanObjectives = objectives.filter((o) => o.trim());
    if (!lessonTitle.trim()) {
      setError('Enter a lesson title/topic.');
      return;
    }
    if (cleanObjectives.length === 0) {
      setError('Add at least one learning objective before continuing.');
      return;
    }
    if (draft.activities.length === 0) {
      setError('Generate or add at least one classroom activity before continuing.');
      return;
    }
    setDraft((d) => ({ ...d, lessonTitle, objectives: cleanObjectives }));
    router.push('/create/editor');
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Create Lesson Plan" onBack={() => router.back()} />
      <DraftProgress step="activities" />
      <ScrollView contentContainerStyle={{ padding: spacing.lg }} keyboardShouldPersistTaps="handled">
        <Text style={styles.stepLabel}>Step 2 of 4 — Objectives &amp; Activities</Text>
        <ErrorBanner message={error} />

        <TextField label="Lesson Title / Topic" placeholder="e.g. Adding Fractions with Unlike Denominators" value={lessonTitle} onChangeText={setLessonTitle} />
        <Text style={styles.groupLabel}>Learning Objectives</Text>
        {objectives.map((o, i) => (
          <View key={i} style={styles.objectiveRow}>
            <TextInput
              style={styles.objectiveInput}
              placeholder={`Objective ${i + 1} (e.g. Solve word problems involving...)`}
              placeholderTextColor={colors.muted}
              value={o}
              onChangeText={(v) => updateObjective(i, v)}
            />
            {objectives.length > 1 && (
              <TouchableOpacity onPress={() => removeObjective(i)}>
                <Ionicons name="close-circle" size={20} color={colors.muted} />
              </TouchableOpacity>
            )}
          </View>
        ))}
        <TouchableOpacity style={styles.addLink} onPress={addObjective}>
          <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
          <Text style={styles.addLinkText}>Add Objective</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        <View style={styles.suggestRow}>
          <Text style={styles.groupLabel}>Suggested Classroom Activities</Text>
          <TouchableOpacity style={styles.generateBtn} onPress={generateSuggestions}>
            <Ionicons name="sparkles-outline" size={16} color="#fff" />
            <Text style={styles.generateBtnText}>Generate</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.hint}>Matched from the built-in activity bank based on subject, grade level, topic, and objectives.</Text>

        {draft.activities.map((a) => (
          <ActivityCard key={a.id} activity={a} onUpdate={(patch) => updateActivity(a.id, patch)} onRemove={() => removeActivity(a.id)} onReplace={() => replaceOne(a.id)} />
        ))}

        <TouchableOpacity style={styles.addLink} onPress={addCustomActivity}>
          <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
          <Text style={styles.addLinkText}>Add Custom Activity</Text>
        </TouchableOpacity>

        <View style={{ height: spacing.md }} />
        <PrimaryButton title="Continue" onPress={onContinue} />
      </ScrollView>
    </SafeAreaView>
  );
}

function ActivityCard({
  activity,
  onUpdate,
  onRemove,
  onReplace,
}: {
  activity: LessonActivity;
  onUpdate: (patch: Partial<LessonActivity>) => void;
  onRemove: () => void;
  onReplace: () => void;
}) {
  const [editing, setEditing] = useState(false);
  return (
    <View style={styles.card}>
      <View style={styles.cardTopRow}>
        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>{activity.type}</Text>
        </View>
        {activity.isSuggested && (
          <View style={styles.suggestedBadge}>
            <Text style={styles.suggestedBadgeText}>Suggested</Text>
          </View>
        )}
      </View>
      {editing ? (
        <>
          <TextInput style={styles.editInput} placeholder="Title" value={activity.title} onChangeText={(v) => onUpdate({ title: v })} />
          <TextInput
            style={[styles.editInput, { minHeight: 60 }]}
            placeholder="Description"
            value={activity.description}
            onChangeText={(v) => onUpdate({ description: v })}
            multiline
          />
          <TextInput style={styles.editInput} placeholder="Materials" value={activity.materials} onChangeText={(v) => onUpdate({ materials: v })} />
        </>
      ) : (
        <>
          <Text style={styles.cardTitle}>{activity.title || 'Untitled Activity'}</Text>
          <Text style={styles.cardDesc}>{activity.description}</Text>
          {!!activity.materials && <Text style={styles.cardMaterials}>Materials: {activity.materials}</Text>}
        </>
      )}
      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.cardActionBtn} onPress={() => setEditing((e) => !e)}>
          <Ionicons name={editing ? 'checkmark' : 'create-outline'} size={16} color={colors.primary} />
          <Text style={styles.cardActionText}>{editing ? 'Done' : 'Edit'}</Text>
        </TouchableOpacity>
        {activity.isSuggested && (
          <TouchableOpacity style={styles.cardActionBtn} onPress={onReplace}>
            <Ionicons name="refresh" size={16} color={colors.primary} />
            <Text style={styles.cardActionText}>Replace</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.cardActionBtn} onPress={onRemove}>
          <Ionicons name="trash-outline" size={16} color={colors.danger} />
          <Text style={[styles.cardActionText, { color: colors.danger }]}>Remove</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  stepLabel: { fontSize: fontSize.xs, color: colors.muted, fontWeight: '700', textTransform: 'uppercase', marginBottom: spacing.md },
  groupLabel: { fontSize: fontSize.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, color: colors.text },
  objectiveRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  objectiveInput: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: 10, fontSize: fontSize.base, backgroundColor: colors.card },
  addLink: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: spacing.sm },
  addLinkText: { color: colors.primary, fontWeight: '700', fontSize: fontSize.sm },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },
  suggestRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  generateBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primary, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  generateBtnText: { color: '#fff', fontWeight: '700', fontSize: fontSize.xs },
  hint: { fontSize: fontSize.xs, color: colors.muted, marginBottom: spacing.md },
  card: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  cardTopRow: { flexDirection: 'row', gap: 6, marginBottom: 6 },
  typeBadge: { backgroundColor: '#eff6ff', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  typeBadgeText: { color: colors.primary, fontSize: 11, fontWeight: '700' },
  suggestedBadge: { backgroundColor: colors.warnBg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  suggestedBadgeText: { color: colors.warnText, fontSize: 11, fontWeight: '700' },
  cardTitle: { fontSize: fontSize.base, fontWeight: '700', color: colors.text },
  cardDesc: { fontSize: fontSize.sm, color: colors.text, marginTop: 2 },
  cardMaterials: { fontSize: fontSize.xs, color: colors.muted, marginTop: 4, fontStyle: 'italic' },
  editInput: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 8, fontSize: fontSize.sm, marginBottom: 6, backgroundColor: '#fff' },
  cardActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  cardActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardActionText: { fontSize: fontSize.xs, color: colors.primary, fontWeight: '700' },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
});
