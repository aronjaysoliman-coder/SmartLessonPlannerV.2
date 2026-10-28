import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '@/lib/auth';
import { colors, fonts } from '@/lib/theme';
import { LessonPlanCore } from '@/lib/types';

export function PlannerBrand() {
  const { profile } = useAuth();
  const router = useRouter();
  const initials = (profile?.fullName?.trim() || 'Teacher').split(/\s+/).slice(0, 2).map((part) => part.charAt(0)).join('').toUpperCase();
  return (
    <View style={s.brandRow}>
      <View style={s.logo} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Ionicons name="book" size={29} color={colors.primary} /><View style={s.bookmark} />
      </View>
      <Text style={s.brand}>Smart<Text style={s.amber}>Lesson</Text>Planner</Text>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Open your profile" style={s.avatar} onPress={() => router.push('/(app)/profile')}>
        <Text style={s.initials}>{initials}</Text>
      </TouchableOpacity>
    </View>
  );
}

export function PlannerHero({ title, subtitle, home = false, onCreate }: { title: string; subtitle: string; home?: boolean; onCreate?: () => void }) {
  const { profile } = useAuth();
  return (
    <View style={[s.hero, home && s.homeHero]}>
      {home && <Text style={s.greeting}>Hello, {profile?.fullName?.trim().split(/\s+/)[0] || 'Teacher'}!</Text>}
      <View style={s.heroRow}>
        <View style={s.heroCopy}>
          <Text accessibilityRole="header" style={[s.title, home && s.homeTitle]}>{title}</Text>
          <Text style={s.subtitle}>{subtitle}</Text>
        </View>
        <View style={s.artwork} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <View style={s.spark} />
          <Ionicons name={home ? 'book' : 'documents'} size={home ? 67 : 53} color={colors.primaryLight} />
          <View style={s.ribbon} />
        </View>
      </View>
      {home && <TouchableOpacity accessibilityRole="button" activeOpacity={0.8} style={s.create} onPress={onCreate}>
        <Ionicons name="add" size={24} color={colors.primaryDark} /><Text style={s.createText}>Create Lesson Plan</Text>
      </TouchableOpacity>}
    </View>
  );
}

export function StatusPill({ completed }: { completed: boolean }) {
  return <View style={[s.pill, completed ? s.done : s.draft]}><Text style={[s.pillText, { color: completed ? colors.successText : colors.warnText }]}>{completed ? 'Completed' : 'Draft'}</Text></View>;
}

export function LessonCard({ plan, compact = false, onOpen, onEdit, onMenu }: { plan: LessonPlanCore; compact?: boolean; onOpen: () => void; onEdit?: () => void; onMenu?: () => void }) {
  const completed = plan.status === 'completed';
  const date = new Date(plan.updatedAt);
  return (
    <View style={s.card}>
      <View style={s.cardTop}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Open ${plan.lessonTitle || 'Untitled Lesson Plan'}`} style={s.cardOpen} onPress={onOpen}>
          <View style={[s.document, completed ? s.done : s.draft]}><Ionicons name="document-text-outline" size={compact ? 28 : 34} color={completed ? colors.successText : '#AD6800'} /></View>
          <View style={s.cardCopy}>
            <Text style={s.cardTitle} numberOfLines={2}>{plan.lessonTitle || 'Untitled Lesson Plan'}</Text>
            <Text style={s.metadata}>{[plan.subject, plan.gradeLevel].filter(Boolean).join(' · ')}</Text>
            <View style={s.badges}>
              {!compact && <View style={s.format}><Text style={s.formatText}>{plan.planType}</Text></View>}
              <StatusPill completed={completed} />
            </View>
            {!compact && <Text style={s.updated}>{Number.isNaN(date.getTime()) ? 'Update date unavailable' : `Updated ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`}</Text>}
            {!compact && !!plan.category && <Text style={s.category}>{plan.category}</Text>}
          </View>
        </TouchableOpacity>
        {onMenu ? <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Actions for ${plan.lessonTitle || 'Untitled Lesson Plan'}`} style={s.menu} onPress={onMenu}><Ionicons name="ellipsis-horizontal" size={23} color={colors.muted} /></TouchableOpacity> : <Ionicons name="chevron-forward" size={18} color={colors.muted} />}
      </View>
      {!compact && <TouchableOpacity accessibilityRole="button" style={s.cardFooter} onPress={completed ? onOpen : onEdit ?? onOpen}>
        <Text style={[s.action, !completed && s.draftAction]}>{completed ? 'View plan' : 'Continue editing'}</Text><Ionicons name="chevron-forward" size={17} color={completed ? colors.primary : '#AD6800'} />
      </TouchableOpacity>}
    </View>
  );
}

export const plannerStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  list: { flex: 1, width: '100%', maxWidth: 632, alignSelf: 'center' },
  listContent: { paddingHorizontal: 16, paddingBottom: 100 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginTop: 26, marginBottom: 14 },
  sectionTitle: { fontFamily: fonts.bold, fontSize: 19, color: colors.primary, letterSpacing: -0.4 },
  link: { fontFamily: fonts.semiBold, color: colors.primary, fontSize: 13 },
  error: { fontFamily: fonts.regular, color: colors.danger, lineHeight: 21, marginVertical: 12 },
});
const s = StyleSheet.create({
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 20 },
  logo: { width: 32, height: 34, alignItems: 'center', justifyContent: 'center' },
  bookmark: { position: 'absolute', width: 5, height: 14, backgroundColor: colors.accent, right: 6, top: 5, borderBottomLeftRadius: 3 },
  brand: { flex: 1, fontFamily: fonts.extraBold, fontSize: 18, color: colors.primary, letterSpacing: -0.6 },
  amber: { color: '#AD6800' },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryLight, borderWidth: 1, borderColor: colors.border },
  initials: { fontFamily: fonts.bold, color: colors.primary, fontSize: 14 },
  hero: { backgroundColor: colors.primary, borderRadius: 22, padding: 24, overflow: 'hidden' },
  homeHero: { paddingVertical: 27 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroCopy: { flex: 1 },
  title: { fontFamily: fonts.extraBold, fontSize: 30, color: '#FFFFFF', letterSpacing: -0.7 },
  homeTitle: { fontSize: 29, lineHeight: 37 },
  subtitle: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 22, color: '#E0E8FA', marginTop: 9 },
  greeting: { fontFamily: fonts.medium, fontSize: 16, color: '#E0E8FA', marginBottom: 16 },
  artwork: { width: 64, height: 90, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-8deg' }] },
  spark: { position: 'absolute', width: 5, height: 14, borderRadius: 3, backgroundColor: colors.accent, top: 0, right: 12 },
  ribbon: { position: 'absolute', width: 7, height: 26, borderBottomLeftRadius: 4, backgroundColor: colors.accent, top: 29, right: 22 },
  create: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.accent, paddingHorizontal: 17, paddingVertical: 14, borderRadius: 15, marginTop: 22 },
  createText: { fontFamily: fonts.bold, fontSize: 15, color: colors.primaryDark, flexShrink: 1 },
  card: { backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: '#E8EDF4', padding: 18, marginBottom: 14, shadowColor: '#102449', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 2 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardOpen: { flex: 1, flexDirection: 'row', gap: 13, alignItems: 'flex-start' },
  document: { width: 48, minHeight: 64, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  cardCopy: { flex: 1 },
  cardTitle: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 23, color: colors.primaryDark },
  metadata: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 19, color: colors.muted, marginTop: 3 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 7 },
  pill: { alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20 },
  done: { backgroundColor: colors.successBg },
  draft: { backgroundColor: colors.warnBg },
  pillText: { fontFamily: fonts.medium, fontSize: 11 },
  format: { borderRadius: 20, borderWidth: 1, borderColor: '#BCD0F1', paddingHorizontal: 9, paddingVertical: 3, backgroundColor: '#F5F8FF' },
  formatText: { fontFamily: fonts.medium, fontSize: 11, color: colors.primary },
  updated: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 18, marginTop: 7, color: colors.muted },
  category: { fontFamily: fonts.medium, fontSize: 11, color: colors.muted, marginTop: 4 },
  menu: { width: 44, height: 44, alignSelf: 'flex-start', alignItems: 'center', justifyContent: 'center' },
  cardFooter: { borderTopWidth: 1, borderTopColor: '#E8EDF4', marginTop: 14, paddingTop: 14, minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 9 },
  action: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.primary },
  draftAction: { color: '#AD6800' },
});
