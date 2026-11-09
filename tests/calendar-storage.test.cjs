const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { indexedDB } = require('fake-indexeddb');
const { load } = require('./load-typescript.cjs');
const calendar = load('lib/calendar.ts');
function openStore() {
  const module = { exports: {} };
  const js = ts.transpileModule(fs.readFileSync('lib/calendar-store.web.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInNewContext(js, { module, exports: module.exports, indexedDB, Promise, require: () => calendar });
  return module.exports;
}
const event = { id: 'a', ownerId: 'teacher-a', title: 'Fractions', date: '2026-11-03', start: '08:00', end: '09:00', lessonPlanId: 'lesson-1', reminderMinutes: 15, notes: 'Room 101' };
test('offline schedules survive reopening, keep linked lessons and isolate account data', async () => {
  const store = openStore();
  await store.saveCalendarEvent(event);
  await store.saveCalendarEvent({ ...event, ownerId: 'teacher-b', title: 'Other teacher' });
  const reopened = openStore();
  const mine = await reopened.listCalendarEvents('teacher-a');
  assert.equal(mine.length, 1);
  assert.equal(mine[0].lessonPlanId, 'lesson-1');
  assert.equal(mine[0].reminderMinutes, 15);
  assert.equal(mine[0].notes, 'Room 101');
  assert.equal((await reopened.listCalendarEvents('teacher-b'))[0].title, 'Other teacher');
});
test('concurrent overlapping writes allow only one schedule and edits persist', async () => {
  const store = openStore();
  const results = await Promise.allSettled([
    store.saveCalendarEvent({ ...event, id: 'b', date: '2026-11-04' }),
    store.saveCalendarEvent({ ...event, id: 'c', date: '2026-11-04' }),
  ]);
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  assert.match(results.find((result) => result.status === 'rejected').reason.message, /overlaps/);
  const saved = (await store.listCalendarEvents('teacher-a')).find((item) => item.date === '2026-11-04');
  await store.saveCalendarEvent({ ...saved, title: 'Updated schedule', start: '10:00', end: '11:00', reminderMinutes: null });
  const updated = (await openStore().listCalendarEvents('teacher-a')).find((item) => item.id === saved.id);
  assert.equal(updated.title, 'Updated schedule');
  assert.equal(updated.start, '10:00');
  assert.equal(updated.reminderMinutes, null);
});
test('deletion is scoped to the account, and invalid schedules are never stored', async () => {
  const store = openStore();
  await store.deleteCalendarEvent('teacher-a', 'a');
  assert.equal((await store.listCalendarEvents('teacher-a')).some((item) => item.id === 'a'), false);
  assert.equal((await store.listCalendarEvents('teacher-b')).length, 1);
  await assert.rejects(store.saveCalendarEvent({ ...event, id: 'bad', date: '2026-02-31' }), /valid date/);
  assert.equal((await store.listCalendarEvents('teacher-a')).some((item) => item.id === 'bad'), false);
});
