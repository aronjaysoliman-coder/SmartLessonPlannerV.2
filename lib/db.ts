import * as SQLite from 'expo-sqlite';
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

/**
 * Module 5 (Save/Organize/Search/Edit/Delete) + Module 6.4 (Offline Access).
 *
 * Lesson plans live in a local SQLite database first. This is the source of
 * truth for "create, view, edit, search, and delete locally stored lesson
 * plans without an internet connection". Syncing a copy to the cloud
 * (MongoDB, via lib/api.ts) is a best-effort addition on top, never a
 * requirement for the app to function.
 */

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync('lesson_planner.db').then(async (db) => {
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS lesson_plans (
          id TEXT PRIMARY KEY NOT NULL,
          ownerId TEXT NOT NULL,
          status TEXT NOT NULL,
          gradeLevel TEXT, subject TEXT, term TEXT, week TEXT,
          learningCompetencies TEXT, teacherName TEXT, section TEXT, planType TEXT,
          lessonTitle TEXT, subjectMatter TEXT, learningResources TEXT,
          procedure TEXT, assessment TEXT, assignment TEXT, reflection TEXT,
          additionalNotes TEXT,
          category TEXT, folder TEXT,
          objectivesJson TEXT, activitiesJson TEXT, tagsJson TEXT, ilawJson TEXT,
          createdAt INTEGER, updatedAt INTEGER,
          syncedAt INTEGER
        );
        CREATE TABLE IF NOT EXISTS lesson_templates (
          id TEXT PRIMARY KEY NOT NULL,
          ownerId TEXT NOT NULL,
          name TEXT NOT NULL,
          pdfData BLOB NOT NULL,
          formFieldsJson TEXT NOT NULL,
          formMappingsJson TEXT NOT NULL,
          flatFieldsJson TEXT NOT NULL,
          createdAt INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_lesson_plans_owner ON lesson_plans(ownerId);
      `);
      return db;
    });
  }
  return dbPromise;
}

export async function saveLessonTemplate(template: LessonTemplate): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO lesson_templates (id, ownerId, name, pdfData, formFieldsJson, formMappingsJson, flatFieldsJson, createdAt)
     VALUES ($id, $ownerId, $name, $pdfData, $formFields, $formMappings, $flatFields, $createdAt)
     ON CONFLICT(id) DO UPDATE SET
       name = $name, pdfData = $pdfData, formFieldsJson = $formFields,
       formMappingsJson = $formMappings, flatFieldsJson = $flatFields;`,
    {
      $id: template.id,
      $ownerId: template.ownerId,
      $name: template.name,
      $pdfData: template.pdfData,
      $formFields: JSON.stringify(template.formFields),
      $formMappings: JSON.stringify(template.formMappings),
      $flatFields: JSON.stringify(template.flatFields),
      $createdAt: Date.now(),
    }
  );
}

export async function getLessonTemplate(id: string, ownerId: string): Promise<LessonTemplate | null> {
  const db = await getDb();
  const row = await db.getFirstAsync(
    'SELECT * FROM lesson_templates WHERE id = $id AND ownerId = $ownerId;',
    { $id: id, $ownerId: ownerId }
  ) as {
    id: string;
    ownerId: string;
    name: string;
    pdfData: Uint8Array;
    formFieldsJson: string;
    formMappingsJson: string;
    flatFieldsJson: string;
  } | null;
  if (!row) return null;
  return {
    id: row.id,
    ownerId: row.ownerId,
    name: row.name,
    pdfData: new Uint8Array(row.pdfData),
    formFields: JSON.parse(row.formFieldsJson),
    formMappings: JSON.parse(row.formMappingsJson),
    flatFields: JSON.parse(row.flatFieldsJson),
  };
}

export async function listLessonTemplates(ownerId: string): Promise<LessonTemplateSummary[]> {
  const db = await getDb();
  return db.getAllAsync(
    'SELECT id, name FROM lesson_templates WHERE ownerId = $ownerId ORDER BY createdAt DESC;',
    { $ownerId: ownerId }
  ) as Promise<LessonTemplateSummary[]>;
}

function toRow(plan: LessonPlanCore) {
  return {
    $id: plan.id,
    $ownerId: plan.ownerId,
    $status: plan.status,
    $gradeLevel: plan.gradeLevel,
    $subject: plan.subject,
    $term: plan.term,
    $week: plan.week,
    $learningCompetencies: plan.learningCompetencies,
    $teacherName: plan.teacherName,
    $section: plan.section,
    $planType: plan.planType,
    $lessonTitle: plan.lessonTitle,
    $subjectMatter: plan.subjectMatter,
    $learningResources: plan.learningResources,
    $procedure: plan.procedure,
    $assessment: plan.assessment,
    $assignment: plan.assignment,
    $reflection: plan.reflection,
    $additionalNotes: plan.additionalNotes,
    $category: plan.category,
    $folder: plan.folder,
    $objectivesJson: JSON.stringify(plan.objectives ?? []),
    $activitiesJson: JSON.stringify(plan.activities ?? []),
    $tagsJson: JSON.stringify(plan.tags ?? []),
    $ilawJson: plan.ilaw ? JSON.stringify(plan.ilaw) : null,
    $createdAt: plan.createdAt,
    $updatedAt: plan.updatedAt,
  };
}

function fromRow(row: any): LessonPlanCore {
  return {
    id: row.id,
    ownerId: row.ownerId,
    status: row.status,
    gradeLevel: row.gradeLevel ?? '',
    subject: row.subject ?? '',
    term: row.term ?? '',
    week: row.week ?? '',
    learningCompetencies: row.learningCompetencies ?? '',
    teacherName: row.teacherName ?? '',
    section: row.section ?? '',
    planType: row.planType ?? 'Detailed',
    lessonTitle: row.lessonTitle ?? '',
    subjectMatter: row.subjectMatter ?? '',
    learningResources: row.learningResources ?? '',
    procedure: row.procedure ?? '',
    assessment: row.assessment ?? '',
    assignment: row.assignment ?? '',
    reflection: row.reflection ?? '',
    additionalNotes: row.additionalNotes ?? '',
    category: row.category ?? '',
    folder: row.folder ?? '',
    objectives: JSON.parse(row.objectivesJson ?? '[]'),
    activities: JSON.parse(row.activitiesJson ?? '[]'),
    tags: JSON.parse(row.tagsJson ?? '[]'),
    ilaw: row.ilawJson ? JSON.parse(row.ilawJson) : undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function saveLessonPlan(plan: LessonPlanCore): Promise<void> {
  const db = await getDb();
  const r = toRow(plan);
  await db.runAsync(
    `INSERT INTO lesson_plans (
      id, ownerId, status, gradeLevel, subject, term, week, learningCompetencies,
      teacherName, section, planType, lessonTitle, subjectMatter, learningResources,
      procedure, assessment, assignment, reflection, additionalNotes, category, folder,
      objectivesJson, activitiesJson, tagsJson, ilawJson, createdAt, updatedAt
    ) VALUES (
      $id, $ownerId, $status, $gradeLevel, $subject, $term, $week, $learningCompetencies,
      $teacherName, $section, $planType, $lessonTitle, $subjectMatter, $learningResources,
      $procedure, $assessment, $assignment, $reflection, $additionalNotes, $category, $folder,
      $objectivesJson, $activitiesJson, $tagsJson, $ilawJson, $createdAt, $updatedAt
    )
    ON CONFLICT(id) DO UPDATE SET
      status=$status, gradeLevel=$gradeLevel, subject=$subject, term=$term, week=$week,
      learningCompetencies=$learningCompetencies, teacherName=$teacherName, section=$section,
      planType=$planType, lessonTitle=$lessonTitle, subjectMatter=$subjectMatter,
      learningResources=$learningResources, procedure=$procedure, assessment=$assessment,
      assignment=$assignment, reflection=$reflection, additionalNotes=$additionalNotes,
      category=$category, folder=$folder, objectivesJson=$objectivesJson,
      activitiesJson=$activitiesJson, tagsJson=$tagsJson, ilawJson=$ilawJson,
      updatedAt=$updatedAt;`,
    r
  );
}

export async function deleteLessonPlan(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM lesson_plans WHERE id = $id;', { $id: id });
}

export async function getLessonPlan(id: string): Promise<LessonPlanCore | null> {
  const db = await getDb();
  const row = await db.getFirstAsync('SELECT * FROM lesson_plans WHERE id = $id;', { $id: id });
  return row ? fromRow(row) : null;
}

export async function listLessonPlans(
  ownerId: string,
  filters: LessonPlanFilters = {}
): Promise<LessonPlanCore[]> {
  const db = await getDb();
  const clauses = ['ownerId = $ownerId'];
  const params: Record<string, string> = { $ownerId: ownerId };

  if (filters.subject) {
    clauses.push('subject = $subject');
    params.$subject = filters.subject;
  }
  if (filters.gradeLevel) {
    clauses.push('gradeLevel = $gradeLevel');
    params.$gradeLevel = filters.gradeLevel;
  }
  if (filters.planType) {
    clauses.push('planType = $planType');
    params.$planType = filters.planType;
  }
  if (filters.category) {
    clauses.push('category = $category');
    params.$category = filters.category;
  }
  if (filters.query) {
    clauses.push('(lessonTitle LIKE $q OR subjectMatter LIKE $q OR learningCompetencies LIKE $q)');
    params.$q = `%${filters.query}%`;
  }

  const orderBy =
    filters.sortBy === 'createdAt' ? 'createdAt' : filters.sortBy === 'lessonTitle' ? 'lessonTitle' : 'updatedAt';

  const rows = await db.getAllAsync(
    `SELECT * FROM lesson_plans WHERE ${clauses.join(' AND ')} ORDER BY ${orderBy} DESC;`,
    params
  );
  return rows.map(fromRow);
}

export async function listCategories(ownerId: string): Promise<string[]> {
  const db = await getDb();
  const rows = await db.getAllAsync(
    "SELECT DISTINCT category FROM lesson_plans WHERE ownerId = $ownerId AND category != '' AND category IS NOT NULL;",
    { $ownerId: ownerId }
  );
  return rows.map((r: any) => r.category);
}
