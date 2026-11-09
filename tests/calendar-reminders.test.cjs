const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { load } = require('./load-typescript.cjs');
const calendar = load('lib/calendar.ts');
function setup() {
  let events = [], scheduled = [], granted = true, prompts = 0;
  const cancelled = [];
  const notifications = {
    setNotificationHandler() {}, AndroidImportance: { DEFAULT: 3 }, IosAuthorizationStatus: { PROVISIONAL: 3 }, SchedulableTriggerInputTypes: { DATE: 'date' },
    setNotificationChannelAsync: async () => {},
    requestPermissionsAsync: async () => { prompts++; return { granted }; },
    getPermissionsAsync: async () => ({ granted }),
    getAllScheduledNotificationsAsync: async () => [...scheduled],
    cancelScheduledNotificationAsync: async (id) => { cancelled.push(id); scheduled = scheduled.filter((n) => n.identifier !== id); },
    scheduleNotificationAsync: async (n) => { scheduled.push(n); return n.identifier; },
  };
  const module = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync('lib/calendar-reminders.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInNewContext(source, { module, exports: module.exports, Date, Promise, require: (name) => {
    if (name === 'expo-notifications') return notifications;
    if (name === 'react-native') return { Platform: { OS: 'android' } };
    if (name === './calendar') return calendar;
    if (name === './calendar-store') return { listCalendarEvents: async (owner) => events.filter((e) => e.ownerId === owner) };
    throw new Error(name);
  } });
  return { ...module.exports, setEvents: (value) => { events = value; }, setGranted: (value) => { granted = value; }, scheduled: () => scheduled, prompts: () => prompts, cancelled };
}
const event = { id: 'one', ownerId: 'teacher-a', title: 'Fractions', date: '2099-11-03', start: '08:00', end: '09:00', reminderMinutes: 15 };
test('future reminders use selected lead time and syncing never prompts for permissions', async () => {
  const reminders = setup(); reminders.setEvents([event]);
  await reminders.syncCalendarReminders('teacher-a');
  assert.equal(reminders.scheduled().length, 1);
  assert.equal(reminders.scheduled()[0].trigger.date.getTime(), calendar.eventStart(event).getTime() - 15 * 60000);
  assert.equal(reminders.prompts(), 0);
});
test('editing a reminder replaces the old notification, deleting a schedule cancels it', async () => {
  const reminders = setup(); reminders.setEvents([event]);
  await reminders.syncCalendarReminders('teacher-a');
  reminders.setEvents([{ ...event, start: '10:00' }]);
  await reminders.syncCalendarReminders('teacher-a');
  assert.equal(reminders.scheduled().length, 1);
  assert.match(reminders.scheduled()[0].content.body, /10:00/);
  reminders.setEvents([]);
  await reminders.syncCalendarReminders('teacher-a');
  assert.equal(reminders.scheduled().length, 0);
});
test('account changes and logout remove previous-account notifications', async () => {
  const reminders = setup(); reminders.setEvents([event, { ...event, id: 'two', ownerId: 'teacher-b' }]);
  await reminders.syncCalendarReminders('teacher-a');
  await reminders.syncCalendarReminders('teacher-b');
  assert.equal(reminders.scheduled().length, 1);
  assert.equal(reminders.scheduled()[0].content.data.calendarOwnerId, 'teacher-b');
  await reminders.syncCalendarReminders(null);
  assert.equal(reminders.scheduled().length, 0);
});
test('denied permissions and past reminder times do not schedule notifications', async () => {
  const reminders = setup(); reminders.setEvents([event]); reminders.setGranted(false);
  assert.match(await reminders.syncCalendarReminders('teacher-a'), /disabled/);
  assert.equal(reminders.scheduled().length, 0);
  reminders.setGranted(true); reminders.setEvents([{ ...event, date: '2000-01-01' }, { ...event, id: 'two', reminderMinutes: null }]);
  await reminders.syncCalendarReminders('teacher-a');
  assert.equal(reminders.scheduled().length, 0);
});
