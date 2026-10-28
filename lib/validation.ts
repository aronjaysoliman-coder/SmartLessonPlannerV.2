import { LessonPlanCore } from './types';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

export interface FieldErrors {
  [field: string]: string | undefined;
}

/** Module 1.3 / 1.6: login + registration validation. */
export function validateLogin(email: string, password: string): FieldErrors {
  const errors: FieldErrors = {};
  if (!email.trim()) errors.email = 'Email is required.';
  else if (!isValidEmail(email)) errors.email = 'Enter a valid email address.';
  if (!password) errors.password = 'Password is required.';
  return errors;
}

export function validateRegistration(
  fullName: string,
  email: string,
  password: string,
  confirmPassword: string
): FieldErrors {
  const errors: FieldErrors = {};
  if (!fullName.trim()) errors.fullName = 'Full name is required.';
  if (!email.trim()) errors.email = 'Email is required.';
  else if (!isValidEmail(email)) errors.email = 'Enter a valid email address.';
  if (!password) errors.password = 'Password is required.';
  else if (password.length < 8) errors.password = 'Password must be at least 8 characters.';
  if (!confirmPassword) errors.confirmPassword = 'Please confirm your password.';
  else if (password !== confirmPassword) errors.confirmPassword = 'Passwords do not match.';
  return errors;
}

/** Module 3.7: setup screen must be complete before moving to the activity/editor step. */
export function validateSetup(data: {
  gradeLevel: string;
  subject: string;
  term: string;
  week: string;
  learningCompetencies: string;
  planType: string;
}): FieldErrors {
  const errors: FieldErrors = {};
  if (!data.gradeLevel) errors.gradeLevel = 'Select a grade level.';
  if (!data.subject) errors.subject = 'Select a learning area / subject.';
  if (!data.term) errors.term = 'Select a term.';
  if (!data.week) errors.week = 'Select a week.';
  if (!data.learningCompetencies.trim()) {
    errors.learningCompetencies = 'Enter at least one learning competency.';
  }
  if (!data.planType) errors.planType = 'Select a lesson plan type.';
  return errors;
}

/** Module 6.5: validate a lesson plan before Preview / Export / Save-as-completed. */
export function validateForCompletion(plan: LessonPlanCore): FieldErrors {
  const errors: FieldErrors = {};
  if (!plan.lessonTitle.trim()) errors.lessonTitle = 'Lesson title is required.';
  if (!plan.subjectMatter.trim()) errors.subjectMatter = 'Subject matter is required.';
  if (plan.objectives.filter((o) => o.trim()).length === 0) {
    errors.objectives = 'Add at least one learning objective.';
  }
  if (plan.activities.length === 0) {
    errors.activities = 'Add at least one classroom activity.';
  }
  if (!plan.assessment.trim()) errors.assessment = 'Assessment is required.';
  return errors;
}

export function hasErrors(errors: FieldErrors): boolean {
  return Object.values(errors).some((v) => !!v);
}
