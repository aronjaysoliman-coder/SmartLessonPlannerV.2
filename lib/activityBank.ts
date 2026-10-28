import * as Crypto from 'expo-crypto';
import { LessonActivity } from './types';

/**
 * Module 4.1 — "Generate suggested classroom activities using a predefined
 * activity database and rule-based matching based on subject, grade level,
 * topic, and objectives."
 *
 * This is intentionally NOT an AI call: it is a static bank of activity
 * templates tagged with the subjects/grade-bands/objective-verbs they fit,
 * scored and filtered against the lesson's setup data. It works fully
 * offline and returns the same result for the same input.
 */

export interface ActivityTemplate {
  type: LessonActivity['type'];
  title: string;
  description: string;
  materials: string;
  durationMinutes: number;
  /** Subjects this activity fits well. Empty = fits any subject. */
  subjects: string[];
  /** Grade bands: 'primary' | 'intermediate' | 'jhs' | 'shs'. Empty = any. */
  gradeBands: ('primary' | 'intermediate' | 'jhs' | 'shs')[];
  /** Objective verbs (Bloom's-style) this activity is good for. */
  objectiveVerbs: string[];
}

export const ACTIVITY_BANK: ActivityTemplate[] = [
  {
    type: 'Group Discussion',
    title: 'Think-Pair-Share Discussion',
    description:
      'Learners think individually about a guide question, pair up to compare answers, then share key points with the class.',
    materials: 'Guide questions on the board or a handout',
    durationMinutes: 10,
    subjects: [],
    gradeBands: ['intermediate', 'jhs', 'shs'],
    objectiveVerbs: ['discuss', 'explain', 'describe', 'compare', 'analyze'],
  },
  {
    type: 'Quiz',
    title: 'Quick Formative Quiz',
    description: 'A short 5-item quiz (identification or multiple choice) covering the key concept just taught.',
    materials: 'Quiz sheet or mini whiteboards',
    durationMinutes: 8,
    subjects: [],
    gradeBands: ['primary', 'intermediate', 'jhs', 'shs'],
    objectiveVerbs: ['identify', 'define', 'recall', 'label', 'state'],
  },
  {
    type: 'Problem-Solving',
    title: 'Guided Problem Set',
    description: 'Learners solve a short set of problems that apply the day\u2019s competency, starting guided then independent.',
    materials: 'Worksheet, calculator (if applicable)',
    durationMinutes: 15,
    subjects: ['Mathematics', 'Science', 'General Mathematics', 'Physics', 'Physics 1', 'Physics 2', 'Chemistry 1', 'Chemistry 2'],
    gradeBands: ['intermediate', 'jhs', 'shs'],
    objectiveVerbs: ['solve', 'compute', 'calculate', 'apply', 'derive'],
  },
  {
    type: 'Demonstration',
    title: 'Teacher-Led Demonstration',
    description: 'Teacher demonstrates the process or experiment step by step while learners observe and take notes.',
    materials: 'Demonstration materials/equipment relevant to the topic',
    durationMinutes: 12,
    subjects: ['Science', 'TLE', 'EPP (Edukasyong Pantahanan at Pangkabuhayan)', 'Physical Education', 'MAPEH'],
    gradeBands: ['primary', 'intermediate', 'jhs', 'shs'],
    objectiveVerbs: ['demonstrate', 'show', 'perform', 'illustrate'],
  },
  {
    type: 'Role-Playing',
    title: 'Short Role-Play Scenario',
    description: 'Small groups act out a real-life scenario connected to the lesson, then the class discusses what happened.',
    materials: 'Role cards or scenario prompts',
    durationMinutes: 15,
    subjects: ['English', 'Filipino', 'Araling Panlipunan', 'EsP (Edukasyon sa Pagpapakatao)', 'Values Education', 'Life and Career Skills'],
    gradeBands: ['primary', 'intermediate', 'jhs'],
    objectiveVerbs: ['demonstrate', 'apply', 'practice', 'respond'],
  },
  {
    type: 'Brainstorming',
    title: 'Rapid Brainstorm',
    description: 'Learners call out or write down as many ideas as possible related to the topic in a short time limit, then group similar ideas.',
    materials: 'Manila paper, marker, or sticky notes',
    durationMinutes: 7,
    subjects: [],
    gradeBands: ['primary', 'intermediate', 'jhs', 'shs'],
    objectiveVerbs: ['generate', 'list', 'brainstorm', 'identify'],
  },
  {
    type: 'Concept Mapping',
    title: 'Concept Map Building',
    description: 'Learners build a concept map linking the new topic to related ideas already covered in previous lessons.',
    materials: 'Manila paper/whiteboard, markers, or notebook',
    durationMinutes: 12,
    subjects: ['Science', 'Araling Panlipunan', 'English', 'Research 1', 'Research 2'],
    gradeBands: ['jhs', 'shs'],
    objectiveVerbs: ['organize', 'relate', 'connect', 'classify', 'categorize'],
  },
  {
    type: 'Peer Teaching',
    title: 'Peer Teach-Back',
    description: 'Learners take turns explaining a sub-topic to a partner in their own words to check understanding.',
    materials: 'None required',
    durationMinutes: 10,
    subjects: [],
    gradeBands: ['jhs', 'shs'],
    objectiveVerbs: ['explain', 'summarize', 'teach', 'clarify'],
  },
  {
    type: 'Gallery Walk',
    title: 'Gallery Walk / Poster Viewing',
    description: 'Groups post their output around the room; learners rotate to view and give feedback on each other\u2019s work.',
    materials: 'Manila paper, markers, tape',
    durationMinutes: 15,
    subjects: [],
    gradeBands: ['intermediate', 'jhs', 'shs'],
    objectiveVerbs: ['create', 'produce', 'design', 'present'],
  },
  {
    type: 'Exit Ticket',
    title: 'Exit Ticket Reflection',
    description: 'Before leaving, learners write one thing they learned and one question they still have on a small slip of paper.',
    materials: 'Small paper slips or index cards',
    durationMinutes: 5,
    subjects: [],
    gradeBands: ['primary', 'intermediate', 'jhs', 'shs'],
    objectiveVerbs: ['reflect', 'summarize', 'evaluate'],
  },
];

function gradeBandOf(gradeLevel: string): 'primary' | 'intermediate' | 'jhs' | 'shs' {
  const n = parseInt(gradeLevel.replace(/\D/g, ''), 10);
  if (n <= 3) return 'primary';
  if (n <= 6) return 'intermediate';
  if (n <= 10) return 'jhs';
  return 'shs';
}

function extractVerbs(objectives: string): string[] {
  return objectives
    .toLowerCase()
    .split(/[\n.;]+/)
    .map((line) => line.trim().split(/\s+/)[0])
    .filter(Boolean);
}

/**
 * Scores every template against the setup data and returns the best
 * matches. Pure function — same input always yields the same suggestions.
 */
export function suggestActivities(params: {
  subject: string;
  gradeLevel: string;
  topic: string;
  objectives: string;
  limit?: number;
}): LessonActivity[] {
  const { subject, gradeLevel, topic, objectives, limit = 4 } = params;
  const band = gradeBandOf(gradeLevel);
  const verbs = extractVerbs(objectives);

  const scored = ACTIVITY_BANK.map((tpl) => {
    let score = 0;
    if (tpl.subjects.length === 0 || tpl.subjects.includes(subject)) score += 2;
    if (tpl.gradeBands.length === 0 || tpl.gradeBands.includes(band)) score += 2;
    if (tpl.objectiveVerbs.some((v) => verbs.some((ov) => ov.startsWith(v)))) score += 3;
    return { tpl, score };
  })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  const chosen = scored.slice(0, limit).map((s) => s.tpl);
  // Guarantee at least `limit` suggestions even on a sparse match.
  if (chosen.length < limit) {
    for (const tpl of ACTIVITY_BANK) {
      if (chosen.length >= limit) break;
      if (!chosen.includes(tpl)) chosen.push(tpl);
    }
  }

  return chosen.map((tpl) => ({
    id: Crypto.randomUUID(),
    title: topic ? `${tpl.title}: ${topic}` : tpl.title,
    type: tpl.type,
    description: tpl.description,
    materials: tpl.materials,
    durationMinutes: tpl.durationMinutes,
    isSuggested: true,
  }));
}
