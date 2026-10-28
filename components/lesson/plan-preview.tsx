import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, radius, spacing } from '@/lib/theme';
import { LessonPlanCore } from '@/lib/types';

function Field({ label, value }: { label: string; value?: string }) {
  if (!value?.trim()) return null;
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value}</Text>
    </View>
  );
}

/** Module 6.1 — preview of every lesson section before finalizing. */
export function PlanPreview({ plan }: { plan: LessonPlanCore }) {
  return (
    <View>
      <View style={styles.badgeRow}>
        <Badge text={plan.planType} />
        <Badge text={plan.gradeLevel} />
        <Badge text={plan.subject} />
        {!!plan.term && <Badge text={plan.term} />}
        {!!plan.week && <Badge text={plan.week} />}
      </View>
      <Text style={styles.title}>{plan.lessonTitle || 'Untitled Lesson Plan'}</Text>
      <Text style={styles.byline}>
        Teacher: {plan.teacherName || 'N/A'} &nbsp;•&nbsp; Section: {plan.section || 'N/A'}
      </Text>

      <Field label="Learning Competencies" value={plan.learningCompetencies} />
      {plan.objectives.filter((o) => o.trim()).length > 0 && (
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Learning Objectives</Text>
          {plan.objectives
            .filter((o) => o.trim())
            .map((o, i) => (
              <Text key={i} style={styles.bullet}>
                {i + 1}. {o}
              </Text>
            ))}
        </View>
      )}
      <Field label="Subject Matter" value={plan.subjectMatter} />
      <Field label="Learning Resources" value={plan.learningResources} />

      {plan.planType === 'ILAW' && plan.ilaw && (
        <>
          <Field label="Content Standard" value={plan.ilaw.contentStandard} />
          <Field label="Performance Standard" value={plan.ilaw.performanceStandard} />
          <Field label="Pre-Lesson" value={plan.ilaw.preLesson} />
          <Field label="Flow / Daloy ng Aralin" value={plan.ilaw.flow} />
          <Field label="Opportunities for Integration" value={plan.ilaw.integration} />
        </>
      )}

      {plan.activities.length > 0 && (
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Classroom Activities</Text>
          {plan.activities.map((a) => (
            <View key={a.id} style={styles.activityCard}>
              <Text style={styles.activityTitle}>
                {a.title} <Text style={styles.activityType}>({a.type}{a.durationMinutes ? `, ${a.durationMinutes} min` : ''})</Text>
              </Text>
              <Text style={styles.activityDesc}>{a.description}</Text>
              {!!a.materials && <Text style={styles.activityMaterials}>Materials: {a.materials}</Text>}
            </View>
          ))}
        </View>
      )}

      {plan.planType !== 'ILAW' && <Field label="Procedure" value={plan.procedure} />}
      <Field label="Assessment" value={plan.assessment} />
      <Field label="Assignment" value={plan.assignment} />
      {plan.planType === 'ILAW' && <Field label="Extended Learning Opportunities" value={plan.ilaw?.extendedLearning} />}
      <Field label="Reflection" value={plan.reflection} />
      <Field label="Additional Notes" value={plan.additionalNotes} />
    </View>
  );
}

function Badge({ text }: { text: string }) {
  if (!text) return null;
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: spacing.sm },
  badge: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe', borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { color: colors.primary, fontSize: fontSize.xs, fontWeight: '700' },
  title: { fontSize: fontSize.xl, fontWeight: '800', color: colors.text, marginBottom: 4 },
  byline: { fontSize: fontSize.sm, color: colors.muted, marginBottom: spacing.lg },
  field: { marginBottom: spacing.md },
  fieldLabel: { fontSize: fontSize.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, color: colors.primary, marginBottom: 4 },
  fieldValue: { fontSize: fontSize.base, color: colors.text, lineHeight: 21 },
  bullet: { fontSize: fontSize.base, color: colors.text, lineHeight: 21 },
  activityCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: spacing.sm, marginBottom: spacing.sm },
  activityTitle: { fontSize: fontSize.base, fontWeight: '700', color: colors.text },
  activityType: { fontWeight: '400', color: colors.muted },
  activityDesc: { fontSize: fontSize.sm, color: colors.text, marginTop: 2 },
  activityMaterials: { fontSize: fontSize.xs, color: colors.muted, marginTop: 4, fontStyle: 'italic' },
});
