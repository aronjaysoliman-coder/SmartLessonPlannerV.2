/**
 * Core data models for Smart Lesson Planner.
 * Kept in one file so every screen and service shares one source of truth.
 */

export type LessonPlanType = "ILAW" | "Detailed" | "Semi-Detailed";

export type LessonStatus = "draft" | "completed";

/** Grade levels grouped the same way as the Create Lesson Plan setup screen. */
export const GRADE_LEVEL_GROUPS: { label: string; options: string[] }[] = [
  { label: "Primary", options: ["Grade 1", "Grade 2", "Grade 3"] },
  { label: "Intermediate", options: ["Grade 4", "Grade 5", "Grade 6"] },
  {
    label: "Junior High School",
    options: ["Grade 7", "Grade 8", "Grade 9", "Grade 10"],
  },
  { label: "Senior High School", options: ["Grade 11", "Grade 12"] },
];

export const SUBJECT_OPTIONS: string[] = [
  "Mathematics",
  "Science",
  "English",
  "Filipino",
  "Araling Panlipunan",
  "EsP (Edukasyon sa Pagpapakatao)",
  "MAPEH",
  "TLE",
  "Computer Programming",
  "Physical Education",
  "Other",
];

export const TERM_OPTIONS: string[] = ["Term 1", "Term 2", "Term 3"];

export const WEEK_OPTIONS: string[] = Array.from(
  { length: 20 },
  (_, i) => `Week ${i + 1}`,
);

export const LESSON_PLAN_TYPES: {
  value: LessonPlanType;
  label: string;
  description: string;
}[] = [
  {
    value: "ILAW",
    label: "ILAW Lesson Plan",
    description:
      "Intentions, Learning Experience, Assessing Learning, Ways Forward.",
  },
  {
    value: "Detailed",
    label: "Detailed Lesson Plan",
    description:
      "Full narrative procedure with complete teacher/student dialogue.",
  },
  {
    value: "Semi-Detailed",
    label: "Semi-Detailed Lesson Plan",
    description: "Condensed procedure with key steps and prompts only.",
  },
];

/** A single suggested or user-entered classroom activity. */
export interface LessonActivity {
  id: string;
  title: string;
  type: string; // e.g. Group Discussion, Quiz, Demonstration
  description: string;
  materials?: string;
  durationMinutes?: number;
  /** true if it came from the activity bank and hasn't been edited yet */
  isSuggested: boolean;
}

/** Fields shared by every lesson plan type. */
export interface LessonPlanCore {
  id: string;
  ownerId: string; // MongoDB user UID
  status: LessonStatus;

  // Setup (Module 3)
  gradeLevel: string;
  subject: string;
  /** Requires teacher review after changing the grade or learning area. */
  learningAreaReviewRequired?: boolean;
  term: string;
  week: string;
  learningCompetencies: string;
  teacherName: string;
  section: string;
  planType: LessonPlanType;

  // Editor (Module 4)
  lessonTitle: string;
  subjectMatter: string;
  objectives: string[];
  learningResources: string;
  activities: LessonActivity[];
  procedure: string; // narrative procedure (Detailed/Semi-Detailed) or filled per-section for ILAW
  assessment: string;
  assignment: string;
  reflection: string;
  additionalNotes: string;

  // ILAW-specific optional sections (only used when planType === 'ILAW')
  ilaw?: {
    contentStandard: string;
    performanceStandard: string;
    preLesson: string;
    flow: string;
    integration: string;
    extendedLearning: string;
  };

  // Organization (Module 5)
  category: string;
  folder: string;
  tags: string[];

  createdAt: number;
  updatedAt: number;
}

export type LessonPlanInput = Omit<
  LessonPlanCore,
  "id" | "ownerId" | "createdAt" | "updatedAt" | "status"
>;

export interface LessonPlanFilters {
  query?: string;
  subject?: string;
  gradeLevel?: string;
  planType?: LessonPlanType;
  category?: string;
  sortBy?: "updatedAt" | "createdAt" | "lessonTitle";
}

export interface UserProfile {
  uid: string;
  fullName: string;
  email: string;
  photoUrl?: string;
  role?: "user" | "admin";
  school?: string;
  gradeLevelTaught?: string;
}

/** Creates an empty draft pre-populated with setup defaults. */
export function createEmptyLessonPlan(
  ownerId: string,
  overrides: Partial<LessonPlanCore> = {},
): LessonPlanCore {
  const now = Date.now();
  return {
    id: overrides.id ?? "",
    ownerId,
    status: "draft",
    gradeLevel: "",
    subject: "",
    learningAreaReviewRequired: false,
    term: "",
    week: "",
    learningCompetencies: "",
    teacherName: "",
    section: "",
    planType: "Detailed",
    lessonTitle: "",
    subjectMatter: "",
    objectives: [],
    learningResources: "",
    activities: [],
    procedure: "",
    assessment: "",
    assignment: "",
    reflection: "",
    additionalNotes: "",
    category: "",
    folder: "",
    tags: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}
