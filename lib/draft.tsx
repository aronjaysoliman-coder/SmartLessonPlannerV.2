import * as Crypto from 'expo-crypto';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from './auth';
import { readDraftRecovery, removeDraftRecovery, saveLessonPlan, writeDraftRecovery } from './db';
import { DraftStep, hasDraftContent, parseRecovery, RecoverySnapshot } from './draft-recovery';
import { colors, fonts } from './theme';
import { createEmptyLessonPlan, LessonPlanCore } from './types';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';
interface DraftContextValue {
  draft: LessonPlanCore;
  setDraft: React.Dispatch<React.SetStateAction<LessonPlanCore>>;
  templateId: string | null;
  setTemplateId: React.Dispatch<React.SetStateAction<string | null>>;
  resetDraft: (ownerId: string) => Promise<void>;
  openDraft: (plan: LessonPlanCore) => Promise<void>;
  step: DraftStep;
  setStep: (step: DraftStep) => void;
  recovery: RecoverySnapshot | null;
  saveState: SaveState;
  retrySave: () => Promise<void>;
  finishDraft: () => Promise<void>;
}
const DraftContext = createContext<DraftContextValue | undefined>(undefined);

export function DraftProvider({ children }: { children: React.ReactNode }) {
  const { profile, isLoading } = useAuth();
  const ownerId = profile?.uid ?? 'local';
  const [draft, updateDraft] = useState(createEmptyLessonPlan(ownerId));
  const [templateId, updateTemplate] = useState<string | null>(null);
  const [step, updateStep] = useState<DraftStep>('setup');
  const [recovery, setRecovery] = useState<RecoverySnapshot | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [loadedOwner, setLoadedOwner] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [reload, setReload] = useState(0);
  const current = useRef({ draft, templateId, step, active: false });
  const queue = useRef<Promise<void>>(Promise.resolve());
  const revision = useRef(0);
  const account = useRef(ownerId);
  // Change immediately so queued work cannot update another account's UI.
  account.current = ownerId;

  useEffect(() => {
    if (isLoading) return;
    let active = true;
    setLoadError(false);
    setLoadedOwner(null);
    const hydration = queue.current.catch(() => {}).then(() => readDraftRecovery(ownerId));
    hydration.then((raw) => {
      if (!active) return;
      const restored = raw ? parseRecovery(raw, ownerId) : null;
      current.current = { draft: restored?.draft ?? createEmptyLessonPlan(ownerId), templateId: restored?.templateId ?? null, step: restored?.step ?? 'setup', active: !!restored };
      revision.current += 1;
      updateDraft(current.current.draft); updateTemplate(current.current.templateId); updateStep(current.current.step);
      setRecovery(restored); setSaveState(restored ? 'saved' : 'idle'); setLoadedOwner(ownerId);
    }).catch(() => { if (active) setLoadError(true); });
    return () => { active = false; };
  }, [ownerId, isLoading, reload]);

  function enqueue(action: () => Promise<void>): Promise<void> {
    const next = queue.current.catch(() => {}).then(action);
    queue.current = next;
    return next;
  }

  function persist(): Promise<void> {
    const state = current.current;
    if (!state.active || (!hasDraftContent(state.draft) && !state.templateId)) return Promise.resolve();
    const snapshot: RecoverySnapshot = { version: 1, draft: state.draft, templateId: state.templateId, step: state.step, savedAt: Date.now() };
    const owner = state.draft.ownerId;
    const version = ++revision.current;
    setSaveState('saving'); setRecovery(snapshot);
    return enqueue(() => writeDraftRecovery(owner, JSON.stringify(snapshot))).then(() => {
      if (version === revision.current && account.current === owner) setSaveState('saved');
    }).catch((error: unknown) => {
      if (version === revision.current && account.current === owner) setSaveState('error');
      throw error;
    });
  }
  function saveQuietly() { void persist().catch(() => {}); }

  // Each change queues a write; no debounce window can discard the latest keystroke.
  function setDraft(action: React.SetStateAction<LessonPlanCore>) {
    if (account.current !== ownerId) return;
    const next = typeof action === 'function' ? action(current.current.draft) : action;
    if (next.ownerId !== ownerId) return;
    current.current = { ...current.current, draft: next, active: true };
    updateDraft(next); saveQuietly();
  }
  function setTemplateId(action: React.SetStateAction<string | null>) {
    if (account.current !== ownerId) return;
    const next = typeof action === 'function' ? action(current.current.templateId) : action;
    current.current.templateId = next;
    if (next) current.current.active = true;
    updateTemplate(next); saveQuietly();
  }
  function setStep(next: DraftStep) {
    if (account.current !== ownerId) return;
    if (current.current.step === next) return;
    current.current.step = next; updateStep(next); saveQuietly();
  }
  async function begin(next: LessonPlanCore, nextStep: DraftStep) {
    const prior = current.current;
    // Keep replaced unfinished work accessible in My Plans rather than silently discarding it.
    if (prior.active && hasDraftContent(prior.draft) && prior.draft.id !== next.id) {
      const archived = { ...prior.draft, id: prior.draft.status === 'completed' ? Crypto.randomUUID() : prior.draft.id || Crypto.randomUUID(), status: 'draft' as const, updatedAt: Date.now() };
      await enqueue(() => saveLessonPlan(archived));
    }
    if (account.current !== ownerId) throw new Error('The signed-in account has changed.');
    await enqueue(() => removeDraftRecovery(ownerId));
    if (account.current !== ownerId) throw new Error('The signed-in account has changed.');
    revision.current += 1;
    current.current = { draft: next, templateId: null, step: nextStep, active: hasDraftContent(next) };
    updateDraft(next); updateTemplate(null); updateStep(nextStep); setRecovery(null); setSaveState('idle');
    await persist();
  }
  async function resetDraft(owner: string) {
    if (owner !== ownerId) throw new Error('The signed-in account has changed.');
    await begin(createEmptyLessonPlan(owner, { id: Crypto.randomUUID() }), 'setup');
  }
  async function openDraft(plan: LessonPlanCore) {
    if (plan.ownerId !== ownerId) throw new Error('This lesson belongs to another account.');
    if (current.current.active && current.current.draft.id === plan.id) { setStep('editor'); return; }
    await begin(plan, 'editor');
  }
  async function finishDraft() {
    if (account.current !== ownerId) return;
    const owner = current.current.draft.ownerId;
    const version = revision.current;
    await enqueue(() => removeDraftRecovery(owner));
    if (account.current !== owner || version !== revision.current) return;
    revision.current += 1;
    current.current.active = false;
    setRecovery(null); setSaveState('idle');
  }

  // Flush when the app backgrounds. Web writes are also queued on each edit.
  const flush = useRef(saveQuietly);
  flush.current = saveQuietly;
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => { if (state !== 'active') flush.current(); });
    return () => subscription.remove();
  }, []);

  if (isLoading || loadedOwner !== ownerId) return <View style={styles.loading}>{loadError ? <><Text style={styles.message}>We could not restore your unfinished lesson. Your saved recovery data has been kept.</Text><TouchableOpacity accessibilityRole="button" style={styles.retry} onPress={() => setReload((value) => value + 1)}><Text style={styles.retryText}>Retry restoring draft</Text></TouchableOpacity></> : <><ActivityIndicator color={colors.primary} /><Text style={styles.message}>Restoring your workspace...</Text></>}</View>;
  return <DraftContext.Provider value={{ draft, setDraft, templateId, setTemplateId, resetDraft, openDraft, step, setStep, recovery, saveState, retrySave: persist, finishDraft }}>{children}</DraftContext.Provider>;
}
export function useDraft(): DraftContextValue {
  const context = useContext(DraftContext);
  if (!context) throw new Error('useDraft must be used within a DraftProvider.');
  return context;
}
const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: colors.bg },
  message: { fontFamily: fonts.regular, color: colors.muted, textAlign: 'center', marginTop: 16, lineHeight: 22 },
  retry: { padding: 16, marginTop: 16, backgroundColor: colors.primary, borderRadius: 12 },
  retryText: { color: '#FFFFFF', fontFamily: fonts.bold },
});
