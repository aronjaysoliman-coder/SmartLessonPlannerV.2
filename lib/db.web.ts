import { LessonPlanCore, LessonPlanFilters } from './types';

export interface FlatTemplateField {
  dataKey: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LessonTemplate {
  id: string;
  ownerId: string;
  name: string;
  pdfData: Uint8Array;
  formFields: string[];
  formMappings: Record<string, string>;
  flatFields: FlatTemplateField[];
}

export interface LessonTemplateSummary {
  id: string;
  name: string;
}

const DATABASE_NAME = 'lesson_planner_web';
const DATABASE_VERSION = 2;
const PLAN_STORE = 'lesson_plans';
const TEMPLATE_STORE = 'lesson_templates';

let databasePromise: Promise<IDBDatabase> | null = null;

function getDatabase(): Promise<IDBDatabase> {
  let promise = databasePromise;
  if (!promise) {
    promise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(PLAN_STORE)) database.createObjectStore(PLAN_STORE, { keyPath: 'id' });
        if (!database.objectStoreNames.contains(TEMPLATE_STORE)) database.createObjectStore(TEMPLATE_STORE, { keyPath: 'id' });
        if (!database.objectStoreNames.contains('draft_recovery')) database.createObjectStore('draft_recovery', { keyPath: 'ownerId' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('Could not open browser storage.'));
      request.onblocked = () => reject(new Error('Browser storage is blocked by another open app tab.'));
    }).catch((error: unknown): never => {
      databasePromise = null;
      throw error;
    });
    databasePromise = promise;
  }
  return promise;
}

function runTransaction<T>(
  storeName: string,
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return getDatabase().then(
    (database) =>
      new Promise<T>((resolve, reject) => {
        const transaction = database.transaction(storeName, mode);
        const request = action(transaction.objectStore(storeName));
        let result: T;

        request.onsuccess = () => {
          result = request.result;
        };
        request.onerror = () => reject(request.error ?? new Error('Browser storage request failed.'));
        transaction.oncomplete = () => resolve(result);
        transaction.onerror = () =>
          reject(transaction.error ?? new Error('Browser storage transaction failed.'));
        transaction.onabort = () =>
          reject(transaction.error ?? new Error('Browser storage transaction was aborted.'));
      })
  );
}

export async function saveLessonTemplate(template: LessonTemplate): Promise<void> {
  await runTransaction(TEMPLATE_STORE, 'readwrite', (store) =>
    store.put({ ...template, pdfData: Uint8Array.from(template.pdfData), createdAt: Date.now() })
  );
}

export async function getLessonTemplate(
  id: string,
  ownerId: string
): Promise<LessonTemplate | null> {
  const row = await runTransaction<
    (LessonTemplate & { createdAt: number }) | undefined
  >(TEMPLATE_STORE, 'readonly', (store) => store.get(id));

  if (!row || row.ownerId !== ownerId) return null;
  return { ...row, pdfData: new Uint8Array(row.pdfData) };
}

export async function listLessonTemplates(ownerId: string): Promise<LessonTemplateSummary[]> {
  const rows = await runTransaction<(LessonTemplateSummary & { ownerId: string; createdAt: number })[]>(
    TEMPLATE_STORE,
    'readonly',
    (store) => store.getAll()
  );
  return rows
    .filter((template) => template.ownerId === ownerId)
    .sort((a, b) => b.createdAt - a.createdAt)
    .map(({ id, name }) => ({ id, name }));
}

export async function saveLessonPlan(plan: LessonPlanCore): Promise<void> {
  await runTransaction(PLAN_STORE, 'readwrite', (store) => store.put(plan));
}

export async function deleteLessonPlan(id: string): Promise<void> {
  await runTransaction(PLAN_STORE, 'readwrite', (store) => store.delete(id));
}

export async function getLessonPlan(id: string): Promise<LessonPlanCore | null> {
  return (
    (await runTransaction<LessonPlanCore | undefined>(PLAN_STORE, 'readonly', (store) =>
      store.get(id)
    )) ?? null
  );
}

export async function listLessonPlans(
  ownerId: string,
  filters: LessonPlanFilters = {}
): Promise<LessonPlanCore[]> {
  const plans = await runTransaction<LessonPlanCore[]>(PLAN_STORE, 'readonly', (store) =>
    store.getAll()
  );
  const query = filters.query?.toLocaleLowerCase();

  return plans
    .filter((plan) => {
      if (plan.ownerId !== ownerId) return false;
      if (filters.subject && plan.subject !== filters.subject) return false;
      if (filters.gradeLevel && plan.gradeLevel !== filters.gradeLevel) return false;
      if (filters.planType && plan.planType !== filters.planType) return false;
      if (filters.category && plan.category !== filters.category) return false;
      if (
        query &&
        ![plan.lessonTitle, plan.subjectMatter, plan.learningCompetencies].some((value) =>
          value.toLocaleLowerCase().includes(query)
        )
      ) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (filters.sortBy === 'lessonTitle') return b.lessonTitle.localeCompare(a.lessonTitle);
      const field = filters.sortBy === 'createdAt' ? 'createdAt' : 'updatedAt';
      return b[field] - a[field];
    });
}

export async function listCategories(ownerId: string): Promise<string[]> {
  const plans = await runTransaction<LessonPlanCore[]>(PLAN_STORE, 'readonly', (store) =>
    store.getAll()
  );
  return [...new Set(plans
    .filter((plan) => plan.ownerId === ownerId && Boolean(plan.category))
    .map((plan) => plan.category))];
}

export async function readDraftRecovery(ownerId: string): Promise<string | null> {
  const row = await runTransaction<{ ownerId: string; snapshot: string } | undefined>('draft_recovery', 'readonly', (store) => store.get(ownerId));
  return row?.snapshot ?? null;
}
export async function writeDraftRecovery(ownerId: string, snapshot: string): Promise<void> {
  await runTransaction('draft_recovery', 'readwrite', (store) => store.put({ ownerId, snapshot }));
}
export async function removeDraftRecovery(ownerId: string): Promise<void> {
  await runTransaction('draft_recovery', 'readwrite', (store) => store.delete(ownerId));
}
