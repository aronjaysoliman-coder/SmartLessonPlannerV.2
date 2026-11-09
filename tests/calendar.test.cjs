const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./load-typescript.cjs');
const { validateCalendarEvent, conflictingEvent, assertNoCalendarConflict, localDateKey, eventStart } = load('lib/calendar.ts');
const base = { id: 'a', ownerId: 'teacher-a', title: 'Math class', date: '2026-11-03', start: '08:00', end: '09:00', lessonPlanId: 'plan-1', reminderMinutes: 15, notes: '' };
test('calendar accepts valid schedules and constructs local date/time without UTC conversion', () => {
  validateCalendarEvent(base);
  const start = eventStart(base);
  assert.equal(localDateKey(start), base.date);
  assert.equal(start.getHours(), 8);
});
test('invalid and normalized dates, empty titles and incorrect times cannot be saved', () => {
  for (const change of [{ date: '2026-02-30' }, { date: '2026-13-01' }, { title: ' ' }, { start: '8:00' }, { start: '24:00' }, { end: '07:30' }, { end: '08:00' }, { reminderMinutes: -1 }]) {
    assert.throws(() => validateCalendarEvent({ ...base, ...change }));
  }
});
test('overlap warnings catch partial overlaps and containment in both directions', () => {
  for (const [start, end] of [['07:30', '08:30'], ['08:30', '09:30'], ['07:00', '10:00'], ['08:10', '08:20'], ['08:00', '09:00']]) {
    assert.throws(() => assertNoCalendarConflict([base], { ...base, id: 'b', start, end }), /overlaps/);
  }
});
test('back-to-back classes, different days and other accounts do not conflict', () => {
  for (const change of [{ start: '09:00', end: '10:00' }, { start: '07:00', end: '08:00' }, { date: '2026-11-04' }, { ownerId: 'teacher-b' }]) {
    assert.equal(conflictingEvent([base], { ...base, id: 'b', ...change }), undefined);
  }
});
test('editing excludes the existing schedule but still checks other events', () => {
  assertNoCalendarConflict([base], { ...base, title: 'Renamed class' });
  assert.throws(() => assertNoCalendarConflict([base, { ...base, id: 'b', start: '09:00', end: '10:00' }], { ...base, end: '09:30' }), /overlaps/);
});
