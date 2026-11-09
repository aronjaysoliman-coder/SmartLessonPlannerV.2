import React from 'react';
import { Animated, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '@/lib/theme';
import { LessonCardSkeletons, useSkeletonOpacity } from './planner-ui';

const shortcuts = [
  { icon: 'document-attach-outline', label: 'Upload Template' },
  { icon: 'search-outline', label: 'Search Plans' },
  { icon: 'folder-open-outline', label: 'Categories' },
] as const;
const tabs = [
  { icon: 'home', label: 'Home' }, { icon: 'document-text', label: 'My Plans' },
  { icon: 'calendar', label: 'Calendar' }, { icon: 'person', label: 'Profile' },
  { icon: 'settings', label: 'Settings' },
] as const;

/** Static app shell while the draft provider hydrates; no navigation handlers. */
export function WorkspaceSkeleton() {
  const opacity = useSkeletonOpacity();
  return <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
    <ScrollView contentContainerStyle={s.content}>
      <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <View style={s.brandRow}>
          <Ionicons name="book" size={29} color={colors.primary} />
          <Text style={s.brand}>Smart<Text style={s.amber}>Lesson</Text>Planner</Text>
          <Animated.View style={[s.bone, s.avatar, { opacity }]} />
        </View>
        <View style={s.hero}>
          <Animated.View style={{ opacity }}>
            <View style={[s.heroBone, s.greeting]} />
            <View style={[s.heroBone, s.title]} /><View style={[s.heroBone, s.title, s.shortTitle]} />
            <View style={[s.heroBone, s.subtitle]} /><View style={[s.heroBone, s.subtitle, s.shortSubtitle]} />
          </Animated.View>
          <View style={s.create}><Ionicons name="add" size={24} color={colors.primaryDark} /><Text style={s.createText}>Create Lesson Plan</Text></View>
        </View>
        <Text style={s.heading}>Quick access</Text>
        <View style={s.quickRow}>{shortcuts.map((item) => <View key={item.label} style={s.quickCard}><Ionicons name={item.icon} size={30} color={colors.primary} /><Text style={s.quickLabel}>{item.label}</Text></View>)}</View>
        <View style={s.sectionRow}><Text style={s.sectionTitle}>Recently Modified</Text><View style={s.viewAll}><Text style={s.viewAllText}>View all</Text><Ionicons name="chevron-forward" size={16} color={colors.muted} /></View></View>
        <LessonCardSkeletons compact />
      </View>
      <Text accessibilityRole="text" accessibilityLiveRegion="polite" style={s.message}>Restoring your workspace…</Text>
    </ScrollView>
    <View pointerEvents="none" style={s.navigation} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {tabs.map((tab, index) => <View key={tab.label} style={[s.tab, index === 0 && s.activeTab]}><Ionicons name={tab.icon} size={23} color={index === 0 ? colors.primary : colors.muted} /><Text style={[s.tabText, index === 0 && s.activeText]}>{tab.label}</Text></View>)}
    </View>
  </SafeAreaView>;
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg }, content: { width: '100%', maxWidth: 632, alignSelf: 'center', paddingHorizontal: 16, paddingBottom: 16 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 20 }, brand: { flex: 1, fontFamily: fonts.extraBold, fontSize: 18, color: colors.primary, letterSpacing: -0.6 }, amber: { color: '#AD6800' }, bone: { backgroundColor: '#E5EAF1' }, avatar: { width: 39, height: 39, borderRadius: 20 },
  hero: { backgroundColor: colors.primary, borderRadius: 22, paddingHorizontal: 24, paddingVertical: 27 }, heroBone: { backgroundColor: '#6880AD', borderRadius: 5 }, greeting: { width: '42%', height: 13, marginBottom: 21 }, title: { width: '94%', height: 24, marginBottom: 10 }, shortTitle: { width: '69%' }, subtitle: { width: '91%', height: 10, marginTop: 7 }, shortSubtitle: { width: '56%', marginTop: 8 },
  create: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.accent, paddingHorizontal: 17, paddingVertical: 14, borderRadius: 15, marginTop: 24, opacity: 0.8 }, createText: { fontFamily: fonts.bold, fontSize: 15, color: colors.primaryDark, flexShrink: 1 },
  heading: { fontFamily: fonts.bold, fontSize: 19, color: colors.primary, marginTop: 26, marginBottom: 14 }, quickRow: { flexDirection: 'row', gap: 10 }, quickCard: { flex: 1, minHeight: 108, borderRadius: 20, backgroundColor: colors.primaryLight, paddingHorizontal: 3, paddingVertical: 15, alignItems: 'center', justifyContent: 'center', gap: 15 }, quickLabel: { fontFamily: fonts.medium, fontSize: 11, color: colors.primary, textAlign: 'center' }, sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginTop: 26, marginBottom: 14 }, sectionTitle: { fontFamily: fonts.bold, fontSize: 19, color: colors.primary, letterSpacing: -0.4 }, viewAll: { flexDirection: 'row', alignItems: 'center', gap: 3 }, viewAllText: { color: colors.muted, fontFamily: fonts.semiBold, fontSize: 13 },
  message: { color: colors.muted, fontFamily: fonts.regular, fontSize: 12, textAlign: 'center', lineHeight: 20, marginTop: 4, marginBottom: 8 }, navigation: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.card, width: '100%' }, tab: { flex: 1, minHeight: 60, alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 2, paddingVertical: 9 }, activeTab: { backgroundColor: colors.primaryLight }, tabText: { color: colors.muted, fontSize: 10, fontFamily: fonts.medium }, activeText: { color: colors.primary },
});
