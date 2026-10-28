import React, { createContext, useContext, useState } from 'react';
import { createEmptyLessonPlan, LessonPlanCore } from './types';

interface DraftContextValue {
  draft: LessonPlanCore;
  setDraft: React.Dispatch<React.SetStateAction<LessonPlanCore>>;
  templateId: string | null;
  setTemplateId: React.Dispatch<React.SetStateAction<string | null>>;
  resetDraft: (ownerId: string) => void;
}

const DraftContext = createContext<DraftContextValue | undefined>(undefined);

/**
 * Holds the lesson plan currently being built across
 * Setup -> Activities -> Editor -> Preview (Modules 3-6), so each step just
 * reads/writes the same object instead of passing everything through
 * navigation params.
 */
export function DraftProvider({ children }: { children: React.ReactNode }) {
  const [draft, setDraft] = useState<LessonPlanCore>(createEmptyLessonPlan('local'));
  const [templateId, setTemplateId] = useState<string | null>(null);

  return (
    <DraftContext.Provider
      value={{
        draft,
        setDraft,
        templateId,
        setTemplateId,
        resetDraft: (ownerId: string) => {
          setDraft(createEmptyLessonPlan(ownerId));
          setTemplateId(null);
        },
      }}
    >
      {children}
    </DraftContext.Provider>
  );
}

export function useDraft(): DraftContextValue {
  const ctx = useContext(DraftContext);
  if (!ctx) throw new Error('useDraft must be used within a DraftProvider.');
  return ctx;
}
