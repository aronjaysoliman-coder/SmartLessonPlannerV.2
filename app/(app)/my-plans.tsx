import { getLearningAreas } from '@/lib/learning-areas';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LessonCard, PlannerBrand, PlannerHero, plannerStyles as ui } from '@/components/lesson/planner-ui';
import { EmptyState } from '@/components/ui/form-fields';
import { deleteCloudLessonPlan } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { deleteLessonPlan, listCategories, listLessonPlans } from '@/lib/db';
import { useDraft } from '@/lib/draft';
import { colors, fonts } from '@/lib/theme';
import { GRADE_LEVEL_GROUPS, LessonPlanCore } from '@/lib/types';

type Picker = 'subject' | 'grade' | 'category' | 'sort';
type Sort = 'recent' | 'oldest' | 'title';
const SORT_OPTIONS = [{ value: 'recent', label: 'Recently updated' }, { value: 'oldest', label: 'Oldest updated' }, { value: 'title', label: 'Title A-Z' }];

export default function MyPlansScreen() {
  const { profile } = useAuth();
  const { resetDraft } = useDraft();
  const router = useRouter();
  const params = useLocalSearchParams<{ view?: string; focus?: string }>();
  const input = useRef<TextInput>(null);
  const [plans, setPlans] = useState<LessonPlanCore[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [subject, setSubject] = useState('');
  const [grade, setGrade] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState<'all' | 'draft' | 'completed'>('all');
  const [sort, setSort] = useState<Sort>('recent');
  const [picker, setPicker] = useState<Picker | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<LessonPlanCore | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useFocusEffect(useCallback(() => {
    let active = true;
    if (profile) {
      Promise.all([listLessonPlans(profile.uid, { sortBy: 'updatedAt' }), listCategories(profile.uid)])
        .then(([list, cats]) => { if (active) { setPlans(list); setCategories(cats); setError(''); } })
        .catch(() => { if (active) setError('Could not load your plans. Pull down to try again.'); })
        .finally(() => { if (active) setLoading(false); });
    }
    return () => { active = false; };
  }, [profile]));

  useFocusEffect(useCallback(() => {
    if (params.view === 'categories') setPicker('category');
    if (params.focus !== 'search') return;
    const timer = setTimeout(() => input.current?.focus(), 150);
    return () => clearTimeout(timer);
  }, [params.focus, params.view]));


  async function refresh() {
    if (!profile) return;
    setRefreshing(true);
    try {
      const [list, cats] = await Promise.all([listLessonPlans(profile.uid, { sortBy: 'updatedAt' }), listCategories(profile.uid)]);
      setPlans(list); setCategories(cats); setError('');
    } catch { setError('Could not refresh your plans. Please try again.'); }
    finally { setRefreshing(false); }
  }

  const visible = useMemo(() => {
    const search = query.trim().toLocaleLowerCase();
    return plans.filter((plan) => (!subject || plan.subject === subject) && (!grade || plan.gradeLevel === grade)
      && (!category || plan.category === category) && (status === 'all' || plan.status === status)
      && (!search || [plan.lessonTitle, plan.subjectMatter, plan.subject, plan.learningCompetencies, plan.category, ...(plan.tags ?? [])].some((value) => value?.toLocaleLowerCase().includes(search))))
      .sort((a, b) => sort === 'title' ? a.lessonTitle.localeCompare(b.lessonTitle) : sort === 'oldest' ? a.updatedAt - b.updatedAt : b.updatedAt - a.updatedAt);
  }, [plans, query, subject, grade, category, status, sort]);

  const subjectChoices = [...new Set([...(grade ? getLearningAreas(grade) : GRADE_LEVEL_GROUPS.flatMap((group) => group.options).flatMap(getLearningAreas)), ...plans.filter((plan) => !grade || plan.gradeLevel === grade).map((plan) => plan.subject).filter(Boolean)])].sort();
  const options = picker === 'subject' ? [{ value: '', label: 'All subjects' }, ...subjectChoices.map((value) => ({ value, label: value }))]
    : picker === 'grade' ? [{ value: '', label: 'All grade levels' }, ...GRADE_LEVEL_GROUPS.flatMap((g) => g.options).map((value) => ({ value, label: value }))]
    : picker === 'category' ? [{ value: '', label: 'All categories' }, ...categories.map((value) => ({ value, label: value }))] : SORT_OPTIONS;
  const selectedValue = picker === 'subject' ? subject : picker === 'grade' ? grade : picker === 'category' ? category : sort;
  const sortLabel = SORT_OPTIONS.find((item) => item.value === sort)?.label;
  const filtered = !!(query || subject || grade || category || status !== 'all');

  function choose(value: string) {
    if (picker === 'subject') setSubject(value);
    else if (picker === 'grade') {
      setGrade(value);
      if (value && subject && !getLearningAreas(value).includes(subject) && !plans.some((plan) => plan.gradeLevel === value && plan.subject === subject)) setSubject('');
    }
    else if (picker === 'category') setCategory(value);
    else setSort(value as Sort);
    setPicker(null);
  }
  async function create() { try { await resetDraft(profile?.uid ?? 'local'); router.push('/create/setup'); } catch { setError('Could not preserve your unfinished lesson. Please try again.'); } }
  function closeActions() { if (!deleting) { setSelectedPlan(null); setConfirmingDelete(false); } }
  async function remove() {
    if (!selectedPlan || deleting) return;
    setDeleting(true);
    try {
      await deleteLessonPlan(selectedPlan.id);
      deleteCloudLessonPlan(selectedPlan.id).catch(() => {});
      const remaining = plans.filter((plan) => plan.id !== selectedPlan.id);
      setPlans(remaining);
      setCategories([...new Set(remaining.map((plan) => plan.category).filter(Boolean))].sort());
      setSelectedPlan(null); setConfirmingDelete(false); setError('');
    } catch { setError('Could not delete this lesson plan. Please try again.'); setSelectedPlan(null); setConfirmingDelete(false); }
    finally { setDeleting(false); }
  }

  return (
    <SafeAreaView style={ui.safe} edges={['top']}>
      <StatusBar style="dark" />
      <FlatList style={ui.list} contentContainerStyle={ui.listContent} data={visible} keyExtractor={(item) => item.id} keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
        ListHeaderComponent={<View>
          <PlannerBrand />
          <PlannerHero title="My Plans" subtitle="Every lesson, ready when you need it." />
          <View style={s.searchBar}>
            <Ionicons name="search-outline" size={23} color={colors.muted} />
            <TextInput ref={input} accessibilityLabel="Search lesson plans" style={s.searchInput} placeholder="Search lesson plans" placeholderTextColor={colors.muted} value={query} onChangeText={setQuery} autoCorrect={false} returnKeyType="search" />
            {!!query && <TouchableOpacity accessibilityRole="button" accessibilityLabel="Clear search" style={s.clear} onPress={() => setQuery('')}><Ionicons name="close-circle" size={21} color={colors.muted} /></TouchableOpacity>}
          </View>
          <View style={s.statusTabs}>{([{ value: 'all', label: 'All Plans' }, { value: 'draft', label: 'Drafts' }, { value: 'completed', label: 'Completed' }] as const).map((item) => <TouchableOpacity key={item.value} accessibilityRole="tab" accessibilityState={{ selected: status === item.value }} style={[s.statusTab, status === item.value && s.activeTab]} onPress={() => setStatus(item.value)}><Text style={[s.tabText, status === item.value && s.activeText]}>{item.label}</Text></TouchableOpacity>)}</View>
          <View style={s.filters}>
            <FilterButton label={subject || 'Subject'} active={!!subject} onPress={() => setPicker('subject')} />
            <FilterButton label={grade || 'Grade Level'} active={!!grade} onPress={() => setPicker('grade')} />
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Sort lesson plans" style={s.sortButton} onPress={() => setPicker('sort')}><Ionicons name="swap-vertical" size={22} color={colors.primary} /></TouchableOpacity>
          </View>
          <View style={s.categoryRow}>
            <TouchableOpacity accessibilityRole="button" style={s.categoryButton} onPress={() => setPicker('category')}><Ionicons name="folder-outline" size={16} color={colors.primary} /><Text style={s.categoryLabel}>{category || 'All categories'}</Text><Ionicons name="chevron-down" size={13} color={colors.primary} /></TouchableOpacity>
            {filtered && <TouchableOpacity accessibilityRole="button" style={s.resetButton} onPress={() => { setQuery(''); setSubject(''); setGrade(''); setCategory(''); setStatus('all'); }}><Text style={ui.link}>Clear filters</Text></TouchableOpacity>}
          </View>
          <View style={ui.sectionRow}><Text accessibilityRole="header" style={ui.sectionTitle}>Your lesson plans ({visible.length})</Text><TouchableOpacity accessibilityRole="button" style={s.sortLabel} onPress={() => setPicker('sort')}><Text style={s.muted}>{sortLabel}</Text><Ionicons name="chevron-down" size={14} color={colors.muted} /></TouchableOpacity></View>
          {!!error && <Text accessibilityRole="alert" style={ui.error}>{error}</Text>}
        </View>}
        renderItem={({ item }) => <LessonCard plan={item} onOpen={() => router.push(`/plan/${item.id}` as never)} onEdit={() => router.push(`/plan/${item.id}?edit=1` as never)} onMenu={() => { setSelectedPlan(item); setConfirmingDelete(false); }} />}
        ListEmptyComponent={loading ? <ActivityIndicator color={colors.primary} /> : !error ? <EmptyState icon="folder-open-outline" title={filtered ? 'No matching lesson plans' : 'Your lesson library starts here'} subtitle={filtered ? 'Try another search or clear your filters.' : 'Tap the + button to create your first lesson plan.'} /> : null}
      />
      <View style={s.fabContainer} pointerEvents="box-none"><TouchableOpacity accessibilityRole="button" accessibilityLabel="Create Lesson Plan" activeOpacity={0.8} style={s.fab} onPress={create}><Ionicons name="add" size={32} color={colors.primaryDark} /></TouchableOpacity></View>

      <Modal visible={picker !== null} transparent animationType="fade" onRequestClose={() => setPicker(null)}>
        <View style={s.overlay}><Pressable accessibilityLabel="Close filter" style={StyleSheet.absoluteFill} onPress={() => setPicker(null)} /><View style={s.dialog} accessibilityViewIsModal>
          <View style={s.dialogHeading}><Text accessibilityRole="header" style={ui.sectionTitle}>{picker === 'subject' ? 'Subject' : picker === 'grade' ? 'Grade level' : picker === 'category' ? 'Categories' : 'Sort plans'}</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel="Close filter" style={s.clear} onPress={() => setPicker(null)}><Ionicons name="close" size={24} color={colors.primary} /></TouchableOpacity></View>
          <ScrollView keyboardShouldPersistTaps="handled">{options.map((item) => <TouchableOpacity key={item.value} accessibilityRole="radio" accessibilityState={{ checked: item.value === selectedValue }} style={s.option} onPress={() => choose(item.value)}><Text style={s.optionText}>{item.label}</Text>{item.value === selectedValue && <Ionicons name="checkmark" size={22} color={colors.primary} />}</TouchableOpacity>)}{picker === 'category' && categories.length === 0 && <Text style={s.help}>Add a category when saving a lesson plan to organize it here.</Text>}</ScrollView>
        </View></View>
      </Modal>
      <Modal visible={selectedPlan !== null} transparent animationType="fade" onRequestClose={closeActions}>
        <View style={s.overlay}><Pressable style={StyleSheet.absoluteFill} accessibilityLabel="Close lesson actions" onPress={closeActions} /><View style={s.dialog} accessibilityViewIsModal>
          <View style={s.dialogHeading}><Text accessibilityRole="header" style={[ui.sectionTitle, s.dialogTitle]}>{confirmingDelete ? 'Delete lesson plan?' : selectedPlan?.lessonTitle || 'Untitled Lesson Plan'}</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel="Close lesson actions" disabled={deleting} style={s.clear} onPress={closeActions}><Ionicons name="close" size={24} color={colors.primary} /></TouchableOpacity></View>
          {confirmingDelete ? <><Text style={s.help}>“{selectedPlan?.lessonTitle || 'Untitled Lesson Plan'}” will be permanently removed.</Text><TouchableOpacity accessibilityRole="button" disabled={deleting} accessibilityState={{ disabled: deleting, busy: deleting }} style={s.option} onPress={remove}><Text style={s.danger}>{deleting ? 'Deleting...' : 'Delete permanently'}</Text></TouchableOpacity><TouchableOpacity accessibilityRole="button" disabled={deleting} style={s.option} onPress={() => setConfirmingDelete(false)}><Text style={s.optionText}>Cancel</Text></TouchableOpacity></> : <>
            <TouchableOpacity accessibilityRole="button" style={s.option} onPress={() => { const id = selectedPlan?.id; closeActions(); if (id) router.push(`/plan/${id}` as never); }}><Text style={s.optionText}>View plan</Text><Ionicons name="eye-outline" size={22} color={colors.primary} /></TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" style={s.option} onPress={() => { const id = selectedPlan?.id; closeActions(); if (id) router.push(`/plan/${id}?edit=1` as never); }}><Text style={s.optionText}>Edit plan</Text><Ionicons name="create-outline" size={22} color={colors.primary} /></TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" style={s.option} onPress={() => setConfirmingDelete(true)}><Text style={s.danger}>Delete plan</Text><Ionicons name="trash-outline" size={22} color={colors.danger} /></TouchableOpacity>
          </>}
        </View></View>
      </Modal>
    </SafeAreaView>
  );
}

function FilterButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return <TouchableOpacity accessibilityRole="button" style={[s.filterButton, active && s.activeFilter]} onPress={onPress}><Text numberOfLines={1} style={s.filterText}>{label}</Text><Ionicons name="chevron-down" size={16} color={colors.primary} /></TouchableOpacity>;
}
const s = StyleSheet.create({
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.border, borderRadius: 18, paddingLeft: 15, paddingRight: 6, marginTop: 18, minHeight: 54 },
  searchInput: { flex: 1, minWidth: 0, fontFamily: fonts.regular, fontSize: 14, paddingVertical: 15, color: colors.text },
  clear: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  statusTabs: { flexDirection: 'row', gap: 8, marginTop: 14 },
  statusTab: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 13, paddingHorizontal: 4, borderWidth: 1, borderColor: colors.border, borderRadius: 24, backgroundColor: '#FFFFFF' },
  activeTab: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { fontFamily: fonts.semiBold, fontSize: 12, color: colors.primary },
  activeText: { color: '#FFFFFF' },
  filters: { flexDirection: 'row', gap: 8, marginTop: 14 },
  filterButton: { flex: 1, minHeight: 46, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.border, borderRadius: 12 },
  activeFilter: { backgroundColor: colors.primaryLight, borderColor: '#BCD0F1' },
  filterText: { flex: 1, fontFamily: fonts.medium, fontSize: 12, color: colors.primary },
  sortButton: { width: 46, minHeight: 46, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.border, borderRadius: 12 },
  categoryRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 4 },
  categoryButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 12, flexShrink: 1, minHeight: 44 },
  categoryLabel: { fontFamily: fonts.medium, fontSize: 12, color: colors.primary, flexShrink: 1 },
  resetButton: { minHeight: 44, justifyContent: 'center' },
  sortLabel: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44 },
  muted: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  fabContainer: { position: 'absolute', bottom: 20, width: '100%', maxWidth: 632, alignSelf: 'center', alignItems: 'flex-end', paddingRight: 22 },
  fab: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent, elevation: 5, shadowColor: '#8A5700', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 9 },
  overlay: { flex: 1, backgroundColor: 'rgba(15, 36, 80, 0.4)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  dialog: { width: '100%', maxWidth: 480, maxHeight: '75%', borderRadius: 22, backgroundColor: '#FFFFFF', padding: 20 },
  dialogHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12 },
  dialogTitle: { flex: 1 },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, minHeight: 52, paddingVertical: 13, borderTopWidth: 1, borderTopColor: '#E8EDF4' },
  optionText: { flex: 1, fontFamily: fonts.medium, fontSize: 14, color: colors.primary },
  danger: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.danger },
  help: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 21, color: colors.muted, marginBottom: 16 },
});
