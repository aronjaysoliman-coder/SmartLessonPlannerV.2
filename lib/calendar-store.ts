import * as SQLite from 'expo-sqlite';
import { assertNoCalendarConflict, CalendarEvent } from './calendar';
let database: Promise<SQLite.SQLiteDatabase> | null = null;
function db() {
  if (!database) database = SQLite.openDatabaseAsync('lesson_calendar.db').then(async (value) => {
    await value.execAsync('CREATE TABLE IF NOT EXISTS calendar_events (id TEXT NOT NULL, ownerId TEXT NOT NULL, data TEXT NOT NULL, PRIMARY KEY(ownerId, id));');
    return value;
  }).catch((error) => { database = null; throw error; });
  return database;
}
export async function listCalendarEvents(ownerId: string): Promise<CalendarEvent[]> {
  const rows = await (await db()).getAllAsync<{ data: string }>('SELECT data FROM calendar_events WHERE ownerId = ?', ownerId);
  return rows.map((row) => JSON.parse(row.data));
}
export async function saveCalendarEvent(event: CalendarEvent): Promise<void> {
  await (await db()).withExclusiveTransactionAsync(async (tx) => {
    const rows = await tx.getAllAsync<{ data: string }>('SELECT data FROM calendar_events WHERE ownerId = ?', event.ownerId);
    assertNoCalendarConflict(rows.map((row) => JSON.parse(row.data)), event);
    await tx.runAsync('INSERT OR REPLACE INTO calendar_events (id, ownerId, data) VALUES (?, ?, ?)', event.id, event.ownerId, JSON.stringify(event));
  });
}
export async function deleteCalendarEvent(ownerId: string, id: string): Promise<void> {
  await (await db()).runAsync('DELETE FROM calendar_events WHERE ownerId = ? AND id = ?', ownerId, id);
}
