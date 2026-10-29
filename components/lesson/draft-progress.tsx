import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useDraft } from '@/lib/draft';
import { DRAFT_STEPS, DraftStep } from '@/lib/draft-recovery';
import { colors, fonts } from '@/lib/theme';

export function DraftProgress({ step }: { step: DraftStep }) {
  const { setStep, saveState, retrySave } = useDraft();
  const router = useRouter();
  useFocusEffect(useCallback(() => { setStep(step); }, [step, setStep]));
  const current = DRAFT_STEPS.indexOf(step);
  return <View style={s.container}>
    <View style={s.steps}>{DRAFT_STEPS.map((item, index) => <TouchableOpacity key={item} accessibilityRole="button" accessibilityLabel={`Step ${index + 1}: ${item === 'preview' ? 'Review' : item}`} accessibilityState={{ selected: item === step, disabled: index > current }} disabled={index > current} style={s.step} onPress={() => { if (item !== step) router.push(`/create/${item}`); }}>
      <View style={[s.dot, index <= current && s.filled]}><Text style={[s.number, index <= current && s.white]}>{index + 1}</Text></View>
      <Text style={[s.label, item === step && s.current]}>{['Setup', 'Activities', 'Editor', 'Review'][index]}</Text>
    </TouchableOpacity>)}</View>
    <View style={s.status}><Ionicons name={saveState === 'error' ? 'alert-circle-outline' : saveState === 'saved' ? 'checkmark-circle' : 'save-outline'} size={16} color={saveState === 'error' ? colors.danger : colors.successText} /><Text style={[s.statusText, saveState === 'error' && s.error]}>{saveState === 'saving' ? 'Saving on this device...' : saveState === 'saved' ? 'Saved on this device' : saveState === 'error' ? 'Autosave failed. Keep this screen open.' : 'Changes are saved automatically'}</Text>{saveState === 'error' && <TouchableOpacity accessibilityRole="button" style={s.retry} onPress={() => { void retrySave().catch(() => {}); }}><Text style={s.current}>Retry</Text></TouchableOpacity>}</View>
  </View>;
}
const s = StyleSheet.create({
  container: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  steps: { flexDirection: 'row', gap: 8 }, step: { flex: 1, alignItems: 'center', gap: 5, minHeight: 55 },
  dot: { width: 27, height: 27, borderRadius: 14, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  filled: { backgroundColor: colors.primary }, number: { color: colors.muted, fontFamily: fonts.bold, fontSize: 12 }, white: { color: '#FFFFFF' },
  label: { fontFamily: fonts.medium, fontSize: 11, color: colors.muted }, current: { fontFamily: fonts.bold, color: colors.primary },
  status: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 10 },
  statusText: { flex: 1, color: colors.muted, fontFamily: fonts.regular, fontSize: 11, lineHeight: 18 }, error: { color: colors.danger },
  retry: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
});
