import { createEmptyLessonPlan, LessonPlanCore } from './types';

export type DraftStep = 'setup' | 'activities' | 'editor' | 'preview';
export const DRAFT_STEPS: DraftStep[] = ['setup', 'activities', 'editor', 'preview'];
export interface RecoverySnapshot { version: 1; draft: LessonPlanCore; templateId: string | null; step: DraftStep; savedAt: number }
export function hasDraftContent(draft: LessonPlanCore): boolean {
  const empty = createEmptyLessonPlan(draft.ownerId);
  return Object.entries(draft).some(([key, value]) => {
    if (['id', 'ownerId', 'status', 'createdAt', 'updatedAt'].includes(key)) return false;
    return JSON.stringify(value) !== JSON.stringify(empty[key as keyof LessonPlanCore]);
  });
}
export function parseRecovery(raw: string, ownerId: string): RecoverySnapshot {
  const value = JSON.parse(raw) as RecoverySnapshot;
  if (value.version !== 1 || value.draft?.ownerId !== ownerId || !DRAFT_STEPS.includes(value.step)
    || !Array.isArray(value.draft.objectives) || !Array.isArray(value.draft.activities)
    || typeof value.draft.lessonTitle !== 'string' || typeof value.savedAt !== 'number') {
    throw new Error('Invalid saved draft');
  }
  return { ...value, draft: createEmptyLessonPlan(ownerId, value.draft) };
}
export type EditorField = 'subjectMatter' | 'learningResources' | 'procedure' | 'assessment' | 'assignment' | 'reflection' | 'additionalNotes' | `ilaw.${keyof NonNullable<LessonPlanCore['ilaw']>}`;
export function readEditorField(draft: LessonPlanCore, key: EditorField): string {
  if (key.startsWith('ilaw.')) return draft.ilaw?.[key.slice(5) as keyof NonNullable<LessonPlanCore['ilaw']>] ?? '';
  return draft[key as Exclude<EditorField, `ilaw.${string}`>];
}
export function writeEditorField(draft: LessonPlanCore, key: EditorField, value: string): LessonPlanCore {
  if (key.startsWith('ilaw.')) return { ...draft, ilaw: { contentStandard: '', performanceStandard: '', preLesson: '', flow: '', integration: '', extendedLearning: '', ...draft.ilaw, [key.slice(5)]: value } };
  return { ...draft, [key]: value };
}
