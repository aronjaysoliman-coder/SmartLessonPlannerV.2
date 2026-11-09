import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Crypto from 'expo-crypto';
import { useAuth } from '@/lib/auth';
import { colors, fonts } from '@/lib/theme';
import { CalendarEvent, eventStart, localDateKey, validateCalendarEvent } from '@/lib/calendar';
import { deleteCalendarEvent, listCalendarEvents, saveCalendarEvent } from '@/lib/calendar-store';
import { requestCalendarReminderPermission, syncCalendarReminders } from '@/lib/calendar-reminders';
import { getLessonPlan, listLessonPlans } from '@/lib/db';
import { LessonPlanCore } from '@/lib/types';
import { PlannerBrand, PlannerHero } from '@/components/lesson/planner-ui';
import { ErrorBanner, PrimaryButton, TextField } from '@/components/ui/form-fields';

export default function CalendarScreen() {
  const { profile } = useAuth();
  const ownerId = profile?.uid;
  const owner = useRef(ownerId); owner.current = ownerId;
  const router = useRouter();
  const [selected, setSelected] = useState(localDateKey(new Date()));
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [plans, setPlans] = useState<LessonPlanCore[]>([]);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [reload, setReload] = useState(0);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState<CalendarEvent | null>(null);
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true); setReady(false); setError(''); setForm(null); setEvents([]); setPlans([]); setNotice(reload ? 'Retrying calendar storage…' : '');
    if (ownerId) {
      Promise.all([listCalendarEvents(ownerId), listLessonPlans(ownerId)]).then(([items, lessons]) => {
        if (active) {
          setEvents(items); setPlans(lessons); setReady(true);
          void syncCalendarReminders(ownerId).then((message) => { if (active) setNotice(message); }).catch(() => { if (active) setNotice('Calendar loaded offline. Reminders could not be refreshed; reopen the app to retry.'); });
        }
      }).catch(() => { if (active) setError('Could not open your local calendar. Retry loading before making changes.'); })
        .finally(() => { if (active) setLoading(false); });
    } else setLoading(false);
    return () => { active = false; };
  }, [ownerId, reload]));
  const change = (patch: Partial<CalendarEvent>) => { setForm((value) => value ? { ...value, ...patch } : null); setFormError(''); setConfirmDelete(false); };
  const edit = (event?: CalendarEvent) => {
    if (!ownerId || !ready) return;
    setForm(event ?? { id: Crypto.randomUUID(), ownerId, title: '', date: selected, start: '08:00', end: '09:00', lessonPlanId: null, reminderMinutes: null, notes: '' });
    setFormError(''); setConfirmDelete(false); setNotice('');
  };
  async function reminders(account: string) {
    try { const message = await syncCalendarReminders(account); if (owner.current === account) setNotice(message); }
    catch { if (owner.current === account) setNotice('Schedule changes saved offline, but reminders could not be updated. Reopen the app to retry.'); }
  }
  async function save() {
    if (!form || !ownerId || form.ownerId !== ownerId || busy) return;
    const account = ownerId;
    const event = { ...form, title: form.title.trim(), notes: form.notes.trim() };
    setBusy(true); setFormError('');
    try {
      validateCalendarEvent(event);
      // Storage performs overlap validation in the same write transaction.
      await saveCalendarEvent(event);
      if (owner.current !== account) return;
      setEvents((items) => items.filter((item) => item.id !== event.id).concat(event));
      setSelected(event.date); setMonth(new Date(`${event.date}T12:00:00`)); setForm(null);
      setNotice('Schedule saved on this device.');
      if (event.reminderMinutes !== null && eventStart(event).getTime() - event.reminderMinutes * 60000 > Date.now()) {
        try { await requestCalendarReminderPermission(); } catch { /* Saving never depends on notification permission. */ }
      }
      if (owner.current !== account) return;
      await reminders(account);
      if (owner.current === account && event.reminderMinutes !== null && eventStart(event).getTime() - event.reminderMinutes * 60000 <= Date.now()) setNotice('Schedule saved. Its reminder time has already passed, so no notification was scheduled.');
    } catch (err) { if (owner.current === account) setFormError(err instanceof Error ? err.message : 'Could not save the schedule. Please try again.'); }
    finally { setBusy(false); }
  }
  async function remove() {
    if (!form || !ownerId || busy) return;
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setBusy(true);
    const account = ownerId;
    try {
      await deleteCalendarEvent(account, form.id);
      if (owner.current !== account) return;
      setEvents((items) => items.filter((item) => item.id !== form.id)); setForm(null);
      await reminders(account);
    } catch { setFormError('Could not delete this schedule. Please try again.'); }
    finally { setBusy(false); }
  }
  async function openPlan(id: string) {
    const account = ownerId;
    try {
      const plan = await getLessonPlan(id);
      if (owner.current !== account) return;
      if (!plan || plan.ownerId !== account) { setError('The linked lesson is no longer available. Edit this schedule to choose another plan.'); return; }
      router.push(`/plan/${id}` as never);
    } catch { setError('Could not open the linked lesson. Please try again.'); }
  }
  const moveMonth = (offset: number) => {
    const next = new Date(month.getFullYear(), month.getMonth() + offset, 1);
    setMonth(next); setSelected(localDateKey(next));
  };
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const dayEvents = events.filter((event) => event.date === selected).sort((a, b) => a.start.localeCompare(b.start));
  return <SafeAreaView style={s.safe} edges={['top']}>
    <ScrollView contentContainerStyle={s.content}>
      <PlannerBrand /><PlannerHero title="Calendar" subtitle="Your lessons, classes, and reminders in one place." artIcon="calendar" />
      <Text style={s.storage}><Ionicons name="save-outline" /> Saved on this device · Available offline</Text>
      <Text style={s.help}>{Platform.OS === 'web' ? 'Browser schedules stay in this browser. Background reminders require the mobile app.' : 'Local reminders work offline once scheduled. Allow notifications when prompted.'}</Text>
      <ErrorBanner message={error} />
      {!ready && !loading && <PrimaryButton title="Retry loading calendar" onPress={() => setReload((value) => value + 1)} />}
      <View style={s.month}>
        <View style={s.monthHeader}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Previous month" style={s.iconButton} onPress={() => moveMonth(-1)}><Ionicons name="chevron-back" size={22} color={colors.primary} /></TouchableOpacity>
          <Text style={s.monthTitle}>{month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</Text>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Next month" style={s.iconButton} onPress={() => moveMonth(1)}><Ionicons name="chevron-forward" size={22} color={colors.primary} /></TouchableOpacity>
        </View>
        <View style={s.grid}>{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <Text key={day} style={s.weekday}>{day}</Text>)}</View>
        <View style={s.grid}>
          {Array.from({ length: first.getDay() }, (_, index) => <View key={`blank-${index}`} style={s.daySlot} />)}
          {Array.from({ length: days }, (_, index) => {
            const date = localDateKey(new Date(month.getFullYear(), month.getMonth(), index + 1));
            const count = events.filter((event) => event.date === date).length;
            return <View key={date} style={s.daySlot}><TouchableOpacity accessibilityRole="button" accessibilityLabel={`${date}, ${count} schedules`} accessibilityState={{ selected: date === selected }} style={[s.day, date === selected && s.selectedDay]} onPress={() => setSelected(date)}><Text style={[s.dayText, date === selected && s.white]}>{index + 1}</Text>{count > 0 && <View style={s.dot} />}</TouchableOpacity></View>;
          })}
        </View>
        <TouchableOpacity accessibilityRole="button" style={s.today} onPress={() => { const today = new Date(); setSelected(localDateKey(today)); setMonth(today); }}><Text style={s.link}>Today</Text><Text style={s.help}>Orange dot · Has a schedule</Text></TouchableOpacity>
      </View>
      <View style={s.agendaHeader}><View style={s.flex}><Text accessibilityRole="header" style={s.heading}>{new Date(`${selected}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</Text><Text style={s.help}>{loading ? 'Loading schedules…' : `${dayEvents.length} schedules`}</Text></View><TouchableOpacity disabled={!ready || busy} accessibilityRole="button" accessibilityState={{ disabled: !ready || busy }} style={s.add} onPress={() => edit()}><Ionicons name="add" size={20} color={colors.primaryDark} /><Text style={s.link}>Add</Text></TouchableOpacity></View>
      {loading && <ActivityIndicator color={colors.primary} />}
      {ready && dayEvents.length === 0 && <Text style={s.empty}>No schedules for this day. Tap Add to plan your day.</Text>}
      {dayEvents.map((event) => {
        const plan = plans.find((item) => item.id === event.lessonPlanId);
        return <View key={event.id} style={s.event}>
          <View style={s.eventTop}><Text style={s.time}>{event.start}–{event.end}</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel={`Edit ${event.title}`} style={s.iconButton} onPress={() => edit(event)}><Ionicons name="create-outline" size={22} color={colors.primary} /></TouchableOpacity></View>
          <Text style={s.eventTitle}>{event.title}</Text>
          {event.lessonPlanId && <TouchableOpacity accessibilityRole="button" style={s.plan} onPress={() => openPlan(event.lessonPlanId!)}><Ionicons name="document-text-outline" size={18} color={colors.primary} /><Text style={s.link}>{plan?.lessonTitle || (plan ? 'Untitled Lesson Plan' : 'Linked plan unavailable')} · Open</Text></TouchableOpacity>}
          <Text style={s.help}>{event.reminderMinutes === null ? 'No reminder' : `Reminder · ${event.reminderMinutes} min before${Platform.OS === 'web' ? ' (mobile only)' : ''}`}</Text>
          {!!event.notes && <Text style={s.notes}>{event.notes}</Text>}
        </View>;
      })}
      {!!notice && <Text accessibilityLiveRegion="polite" style={s.storage}>{notice}</Text>}
    </ScrollView>
    <Modal visible={form !== null} animationType="slide" onRequestClose={() => { if (!busy) setForm(null); }}>
      <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <View style={s.agendaHeader}><Text style={s.heading}>{events.some((event) => event.id === form?.id) ? 'Edit schedule' : 'Add schedule'}</Text><TouchableOpacity disabled={busy} accessibilityRole="button" accessibilityLabel="Close schedule form" style={s.iconButton} onPress={() => setForm(null)}><Ionicons name="close" size={24} color={colors.primary} /></TouchableOpacity></View>
        <ErrorBanner message={formError} />
        {form && <>
          <TextField label="Title" value={form.title} onChangeText={(title) => change({ title })} maxLength={120} placeholder="e.g. Grade 4 Mathematics" />
          <TextField label="Date (YYYY-MM-DD)" value={form.date} onChangeText={(date) => change({ date })} placeholder="2026-11-03" autoCapitalize="none" />
          <View style={s.row}><View style={s.flex}><TextField label="Start (HH:MM, 24-hour)" value={form.start} onChangeText={(start) => change({ start })} placeholder="08:00" /></View><View style={s.flex}><TextField label="End (HH:MM, 24-hour)" value={form.end} onChangeText={(end) => change({ end })} placeholder="09:00" /></View></View>
          <Text style={s.heading}>Link a lesson plan</Text>
          {form.lessonPlanId && !plans.some((plan) => plan.id === form.lessonPlanId) && <Text style={s.help}>The linked plan is unavailable. Choose another plan or unlink it.</Text>}
          <ScrollView style={s.planPicker} nestedScrollEnabled>{[{ id: '', lessonTitle: 'No linked plan', subject: '' }, ...plans].map((plan) => <TouchableOpacity key={plan.id} accessibilityRole="radio" accessibilityState={{ checked: (form.lessonPlanId ?? '') === plan.id }} style={s.choice} onPress={() => change({ lessonPlanId: plan.id || null })}><Text style={s.choiceText}>{plan.lessonTitle || 'Untitled Lesson Plan'}{plan.subject ? ` · ${plan.subject}` : ''}</Text><Ionicons name={(form.lessonPlanId ?? '') === plan.id ? 'radio-button-on' : 'radio-button-off'} size={21} color={colors.primary} /></TouchableOpacity>)}</ScrollView>
          <Text style={s.heading}>Reminder</Text><View style={s.reminders}>{[null, 5, 15, 30, 60].map((minutes) => <TouchableOpacity key={String(minutes)} accessibilityRole="radio" accessibilityState={{ checked: form.reminderMinutes === minutes }} style={[s.reminder, form.reminderMinutes === minutes && s.selectedDay]} onPress={() => change({ reminderMinutes: minutes })}><Text style={[s.dayText, form.reminderMinutes === minutes && s.white]}>{minutes === null ? 'None' : `${minutes} min`}</Text></TouchableOpacity>)}</View>
          <Text style={s.help}>{Platform.OS === 'web' ? 'Reminder preferences are saved, but browser background notifications are not supported. Use the mobile app on the same device where you create schedules.' : 'You will be asked for notification permission when saving a future reminder. Denying permission does not prevent saving.'}</Text>
          <TextField label="Notes" value={form.notes} onChangeText={(notes) => change({ notes })} multiline optional placeholder="Section, room, materials…" />
          <PrimaryButton title={busy ? 'Saving…' : 'Save schedule'} disabled={busy} onPress={save} />
          {events.some((event) => event.id === form.id) && <TouchableOpacity disabled={busy} accessibilityRole="button" style={s.deleteButton} onPress={remove}><Text style={s.danger}>{confirmDelete ? 'Confirm delete schedule permanently' : 'Delete schedule'}</Text></TouchableOpacity>}
          <TouchableOpacity disabled={busy} accessibilityRole="button" style={s.iconButton} onPress={() => setForm(null)}><Text style={s.link}>Cancel</Text></TouchableOpacity>
        </>}
      </ScrollView></SafeAreaView>
    </Modal>
  </SafeAreaView>;
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg }, content: { paddingHorizontal: 16, paddingBottom: 35, width: '100%', maxWidth: 632, alignSelf: 'center' },
  flex: { flex: 1 }, row: { flexDirection: 'row', gap: 12 }, storage: { color: colors.successText, fontFamily: fonts.medium, fontSize: 12, lineHeight: 20, marginTop: 14 }, help: { color: colors.muted, fontFamily: fonts.regular, fontSize: 12, lineHeight: 20, marginVertical: 5 },
  month: { backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 10, marginTop: 16 }, monthHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, monthTitle: { fontFamily: fonts.bold, fontSize: 17, color: colors.primary }, iconButton: { minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' }, grid: { flexDirection: 'row', flexWrap: 'wrap' }, weekday: { width: '14.2857%', textAlign: 'center', paddingVertical: 10, color: colors.muted, fontSize: 11, fontFamily: fonts.medium }, daySlot: { width: '14.2857%', height: 46, padding: 1 }, day: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 12 }, dayText: { fontFamily: fonts.medium, fontSize: 13, color: colors.primary }, selectedDay: { backgroundColor: colors.primary }, white: { color: '#FFFFFF' }, dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.accent, position: 'absolute', bottom: 4 }, today: { minHeight: 44, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 8 },
  agendaHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 22, marginBottom: 12 }, heading: { fontFamily: fonts.bold, fontSize: 17, color: colors.primary, marginVertical: 8 }, add: { flexDirection: 'row', gap: 4, alignItems: 'center', backgroundColor: colors.accent, padding: 12, borderRadius: 12, minHeight: 44 }, link: { color: colors.primary, fontFamily: fonts.semiBold, fontSize: 13, flexShrink: 1 }, empty: { padding: 22, color: colors.muted, textAlign: 'center', fontFamily: fonts.regular, lineHeight: 22 },
  event: { borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 16, marginBottom: 12 }, eventTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, time: { color: colors.primary, fontFamily: fonts.medium, fontSize: 12 }, eventTitle: { color: colors.primaryDark, fontFamily: fonts.bold, fontSize: 16, lineHeight: 23 }, plan: { backgroundColor: colors.primaryLight, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 12, borderRadius: 10, minHeight: 44 }, notes: { color: colors.text, fontFamily: fonts.regular, fontSize: 13, lineHeight: 21, marginTop: 4 },
  planPicker: { maxHeight: 180, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.card, marginBottom: 10 }, choice: { minHeight: 48, padding: 12, flexDirection: 'row', gap: 10, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.border }, choiceText: { flex: 1, color: colors.primary, fontFamily: fonts.regular, fontSize: 13 }, reminders: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, reminder: { minHeight: 44, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border }, deleteButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center', padding: 12, marginTop: 10 }, danger: { fontFamily: fonts.semiBold, color: colors.danger, fontSize: 13 },
});
