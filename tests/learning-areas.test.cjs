const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const test = require('node:test');
const assert = require('node:assert/strict');
const cache = new Map();
function load(file) {
  file = path.resolve(file);
  if (cache.has(file)) return cache.get(file);
  const result = { exports: {} }; cache.set(file, result.exports);
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInThisContext(`(function(require,module,exports){${source}\n})`, { filename: file })((name) => name.startsWith('.') ? load(path.resolve(path.dirname(file), `${name}.ts`)) : require(name), result, result.exports);
  return result.exports;
}
const { createEmptyLessonPlan } = load('lib/types.ts');
const { getLearningAreas, isLearningAreaAllowed, changeGrade, changeLearningArea } = load('lib/learning-areas.ts');
const { validateSetup, validateForCompletion } = load('lib/validation.ts');

test('Grade 1 has its five reference learning areas and excludes later-grade subjects', () => {
  assert.deepEqual(getLearningAreas('Grade 1'), ['Language', 'Reading and Literacy', 'Mathematics', 'Makabansa', 'GMRC']);
  for (const subject of ['Science', 'TLE', 'Computer Programming', 'English']) assert.equal(isLearningAreaAllowed('Grade 1', subject), false);
});
test('Science starts at Grade 3; EPP, TLE and values education follow their grade bands', () => {
  assert.equal(isLearningAreaAllowed('Grade 2', 'Science'), false);
  assert.equal(isLearningAreaAllowed('Grade 3', 'Science'), true);
  assert.equal(isLearningAreaAllowed('Grade 4', 'EPP'), true);
  assert.equal(isLearningAreaAllowed('Grade 4', 'TLE'), false);
  assert.equal(isLearningAreaAllowed('Grade 7', 'EPP'), false);
  assert.equal(isLearningAreaAllowed('Grade 7', 'TLE'), true);
  assert.equal(isLearningAreaAllowed('Grade 6', 'GMRC'), true);
  assert.equal(isLearningAreaAllowed('Grade 7', 'Values Education'), true);
});
test('no grade or unsupported grade has no options; SHS does not reuse K-10 subjects', () => {
  assert.deepEqual(getLearningAreas(''), []);
  assert.deepEqual(getLearningAreas('Grade 13'), []);
  assert.equal(isLearningAreaAllowed('Grade 11', 'Effective Communication'), true);
  assert.equal(isLearningAreaAllowed('Grade 11', 'Mathematics'), false);
  assert.equal(isLearningAreaAllowed('Grade 12', 'Makabansa'), false);
  const list = getLearningAreas('Grade 1'); list.push('Injected');
  assert.equal(isLearningAreaAllowed('Grade 1', 'Injected'), false);
});
test('changing to an incompatible grade clears only the subject and preserves every teaching field', () => {
  const draft = createEmptyLessonPlan('teacher-a', { gradeLevel: 'Grade 3', subject: 'Science', subjectMatter: 'Plants', learningCompetencies: 'Identify plant parts', objectives: ['Identify roots'], activities: [{ id: 'a', title: 'Observe a plant' }], procedure: 'Examine roots', assessment: 'Draw a plant', ilaw: { flow: 'Explore' } });
  const updated = changeGrade(draft, 'Grade 1');
  assert.equal(updated.gradeLevel, 'Grade 1'); assert.equal(updated.subject, ''); assert.equal(updated.learningAreaReviewRequired, true);
  for (const key of ['subjectMatter', 'learningCompetencies', 'objectives', 'activities', 'procedure', 'assessment', 'ilaw']) assert.deepEqual(updated[key], draft[key]);
  assert.equal(draft.subject, 'Science');
});
test('compatible subjects stay selected but retained teaching content still needs review', () => {
  const draft = createEmptyLessonPlan('teacher-a', { gradeLevel: 'Grade 4', subject: 'Mathematics', objectives: ['Compare fractions'] });
  assert.equal(changeGrade(draft, 'Grade 5').subject, 'Mathematics');
  assert.equal(changeGrade(draft, 'Grade 5').learningAreaReviewRequired, true);
  assert.equal(changeGrade(draft, 'Grade 4'), draft);
});
test('changing learning areas preserves lesson text and keeps review pending after reselecting', () => {
  const draft = createEmptyLessonPlan('teacher-a', { gradeLevel: 'Grade 4', subject: 'Science', subjectMatter: 'Plants' });
  const updated = changeLearningArea(draft, 'English');
  assert.equal(updated.subjectMatter, 'Plants'); assert.equal(updated.learningAreaReviewRequired, true);
  assert.equal(changeLearningArea(changeGrade(draft, 'Grade 1'), 'Language').learningAreaReviewRequired, true);
});
test('setup rejects incompatible pairs and unreviewed retained content; completion also respects pending review', () => {
  const draft = createEmptyLessonPlan('teacher-a', { gradeLevel: 'Grade 1', subject: 'Science', term: 'Term 1', week: 'Week 1', learningCompetencies: 'Test competency' });
  assert.ok(validateSetup(draft).subject);
  const reviewed = { ...draft, subject: 'Mathematics' };
  assert.deepEqual(validateSetup(reviewed), {});
  assert.ok(validateSetup({ ...reviewed, learningAreaReviewRequired: true }).learningAreaReviewRequired);
  assert.ok(validateForCompletion({ ...reviewed, learningAreaReviewRequired: true }).learningAreaReviewRequired);
});
