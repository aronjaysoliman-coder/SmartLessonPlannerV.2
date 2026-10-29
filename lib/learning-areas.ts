import type { LessonPlanCore } from './types';

/** MATATAG K-10 reference learning areas. Deployment by school/year is not inferred here.
 * Sources: https://www.deped.gov.ph/matatagcurriculumk147/
 * https://www.deped.gov.ph/wp-content/uploads/DO_s2025_020r_8.pdf
 * https://sites.google.com/deped.gov.ph/deped-lrportal/revised-k-10-lms
 */
const EARLY = ['Filipino', 'English', 'Mathematics', 'Makabansa', 'GMRC'];
const ELEMENTARY = ['Filipino', 'English', 'Mathematics', 'Science', 'Araling Panlipunan', 'GMRC', 'EPP', 'Music and Arts', 'Physical Education and Health'];
const JUNIOR = ['Filipino', 'English', 'Mathematics', 'Science', 'Araling Panlipunan', 'Values Education', 'TLE', 'Music and Arts', 'Physical Education and Health'];
export const K10_LEARNING_AREAS: Readonly<Record<string, readonly string[]>> = {
  'Grade 1': ['Language', 'Reading and Literacy', 'Mathematics', 'Makabansa', 'GMRC'],
  'Grade 2': EARLY,
  'Grade 3': [...EARLY, 'Science'],
  'Grade 4': ELEMENTARY,
  'Grade 5': ELEMENTARY,
  'Grade 6': ELEMENTARY,
  'Grade 7': JUNIOR,
  'Grade 8': JUNIOR,
  'Grade 9': JUNIOR,
  'Grade 10': JUNIOR,
};
export function hasTeachingContent(plan: LessonPlanCore): boolean {
  return !!(plan.subjectMatter.trim() || plan.learningCompetencies.trim() || plan.objectives.some((value) => value.trim()) || plan.activities.length || plan.procedure.trim() || plan.assessment.trim() || plan.assignment.trim() || plan.learningResources.trim() || plan.additionalNotes.trim() || plan.reflection.trim() || Object.values(plan.ilaw ?? {}).some((value) => value.trim()));
}

/** Strengthened SHS core subjects are prescribed for Grade 11.
 * Grade 12 below uses the legacy K-12 core reference catalog; schools schedule
 * these across Grades 11/12. It is deliberately labelled as a reference, not a
 * verified class program. Electives must be supplied in SCHOOL_SHS_OFFERINGS.
 * https://www.deped.gov.ph/strengthened-shs-program/
 * https://www.deped.gov.ph/k-to-12/about/k-to-12-basic-education-curriculum/senior-high-school-core-curriculum-subjects/
 */
export const SHS_CORE_REFERENCE: Readonly<Record<string, readonly string[]>> = {
  'Grade 11': ['Effective Communication', 'Life Skills', 'General Mathematics', 'General Science', 'Pag-aaral ng Kasaysayan at Lipunang Pilipino'],
  'Grade 12': ['Oral Communication in Context', 'Reading and Writing Skills', 'Komunikasyon at Pananaliksik sa Wika at Kulturang Pilipino', 'Pagbasa at Pagsusuri ng Iba’t Ibang Teksto Tungo sa Pananaliksik', '21st Century Literature from the Philippines and the World', 'Contemporary Philippine Arts from the Regions', 'Media and Information Literacy', 'General Mathematics', 'Statistics and Probability', 'Earth and Life Science', 'Physical Science', 'Introduction to the Philosophy of the Human Person', 'Physical Education and Health', 'Personal Development', 'Understanding Culture, Society and Politics'],
};
/** Add only school-approved, grade-specific SHS offerings here. */
export const SCHOOL_SHS_OFFERINGS: Readonly<Record<string, readonly string[]>> = {};
export function getLearningAreas(grade: string): string[] {
  return [...new Set([...(K10_LEARNING_AREAS[grade] ?? SHS_CORE_REFERENCE[grade] ?? []), ...(SCHOOL_SHS_OFFERINGS[grade] ?? [])])];
}
export function isLearningAreaAllowed(grade: string, subject: string): boolean {
  return !!grade && !!subject && getLearningAreas(grade).includes(subject);
}
export function learningAreaReferenceNote(grade: string): string {
  if (grade === 'Grade 11') return 'Strengthened SHS Grade 11 core reference. Electives vary by school; only configured school-approved electives are shown.';
  if (grade === 'Grade 12') return 'Legacy K-12 SHS core reference, not a verified Grade 12 timetable. Confirm your school’s assigned subjects. Strengthened SHS Grade 12 electives require your school’s approved list.';
  return 'MATATAG K-10 reference learning areas. Confirm the curriculum implemented by your school for the selected school year.';
}
export function changeGrade(plan: LessonPlanCore, grade: string): LessonPlanCore {
  if (plan.gradeLevel === grade) return plan;
  return { ...plan, gradeLevel: grade, subject: isLearningAreaAllowed(grade, plan.subject) ? plan.subject : '', learningAreaReviewRequired: !!plan.learningAreaReviewRequired || hasTeachingContent(plan) };
}
export function changeLearningArea(plan: LessonPlanCore, subject: string): LessonPlanCore {
  if (plan.subject === subject) return plan;
  return { ...plan, subject, learningAreaReviewRequired: !!plan.learningAreaReviewRequired || (hasTeachingContent(plan) && !!plan.subject) };
}
