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
  const result = { exports: {} };
  cache.set(file, result.exports);
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInThisContext(`(function(require,module,exports){${source}\n})`, { filename: file })((name) => name.startsWith('.') ? load(path.resolve(path.dirname(file), `${name}.ts`)) : require(name), result, result.exports);
  return result.exports;
}
const { createEmptyLessonPlan } = load('lib/types.ts');
const { hasDraftContent, parseRecovery, readEditorField, writeEditorField } = load('lib/draft-recovery.ts');

test('an empty draft is not offered for recovery, but setup and objective edits are', () => {
  const empty = createEmptyLessonPlan('teacher-a');
  assert.equal(hasDraftContent(empty), false);
  assert.equal(hasDraftContent({ ...empty, gradeLevel: 'Grade 4' }), true);
  assert.equal(hasDraftContent({ ...empty, objectives: ['Compare halves and quarters'] }), true);
});
test('recovery preserves incomplete objectives, the workflow step, and the selected template', () => {
  const draft = createEmptyLessonPlan('teacher-a', { lessonTitle: 'Fractions', objectives: ['One objective', ''] });
  const snapshot = { version: 1, draft, templateId: 'template-1', step: 'activities', savedAt: 123 };
  const restored = parseRecovery(JSON.stringify(snapshot), 'teacher-a');
  assert.deepEqual(restored, snapshot);
});
test('recovery rejects another account and unsupported or broken snapshots', () => {
  const snapshot = { version: 1, draft: createEmptyLessonPlan('teacher-a'), templateId: null, step: 'editor', savedAt: 123 };
  assert.throws(() => parseRecovery(JSON.stringify(snapshot), 'teacher-b'));
  assert.throws(() => parseRecovery('{broken', 'teacher-a'));
  assert.throws(() => parseRecovery(JSON.stringify({ ...snapshot, version: 2 }), 'teacher-a'));
  assert.throws(() => parseRecovery(JSON.stringify({ ...snapshot, step: 'unknown' }), 'teacher-a'));
});
test('applying an ILAW suggestion preserves all unrelated standards and lesson content', () => {
  const draft = createEmptyLessonPlan('teacher-a', { assessment: 'Keep this assessment', ilaw: { contentStandard: 'Existing standard', performanceStandard: 'Existing performance', preLesson: 'Review', flow: 'Original flow', integration: 'Arts', extendedLearning: 'Home practice' } });
  const updated = writeEditorField(draft, 'ilaw.flow', 'New flow');
  assert.equal(updated.ilaw.flow, 'New flow');
  assert.equal(updated.ilaw.contentStandard, draft.ilaw.contentStandard);
  assert.equal(updated.assessment, draft.assessment);
  assert.equal(draft.ilaw.flow, 'Original flow');
  assert.equal(readEditorField(updated, 'ilaw.flow'), 'New flow');
});
test('restoring a previous section value preserves edits made in other sections', () => {
  const draft = createEmptyLessonPlan('teacher-a', { procedure: 'Original', assessment: 'Original assessment' });
  const accepted = writeEditorField(draft, 'procedure', 'AI suggestion');
  const otherEdit = { ...accepted, assessment: 'Teacher changed this assessment' };
  const undone = writeEditorField(otherEdit, 'procedure', draft.procedure);
  assert.equal(undone.procedure, 'Original');
  assert.equal(undone.assessment, otherEdit.assessment);
});
