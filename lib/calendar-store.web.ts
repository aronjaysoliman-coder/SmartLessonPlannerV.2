import { assertNoCalendarConflict, CalendarEvent } from './calendar';
let database: Promise<IDBDatabase> | null = null;
function db(): Promise<IDBDatabase> {
  if (!database) database = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('lesson_calendar', 1);
    request.onupgradeneeded = () => { request.result.createObjectStore('events', { keyPath: ['ownerId', 'id'] }); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Calendar storage is blocked. Close other app tabs and retry.'));
  }).catch((error) => { database = null; throw error; });
  return database;
}
async function transaction<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore, done: (value: T) => void, fail: (error: unknown) => void) => void): Promise<T> {
  const database = await db();
  return new Promise((resolve, reject) => {
    const tx = database.transaction('events', mode);
    let result: T;
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error ?? new Error('Could not save calendar.'));
    tx.onabort = () => reject(tx.error ?? new Error('Calendar change was not saved.'));
    action(tx.objectStore('events'), (value) => { result = value; }, (error) => { tx.abort(); reject(error); });
  });
}
export function listCalendarEvents(ownerId: string): Promise<CalendarEvent[]> {
  return transaction('readonly', (store, done) => { const request = store.getAll(); request.onsuccess = () => done((request.result as CalendarEvent[]).filter((event) => event.ownerId === ownerId)); });
}
export function saveCalendarEvent(event: CalendarEvent): Promise<void> {
  return transaction('readwrite', (store, done, fail) => {
    const request = store.getAll();
    request.onsuccess = () => {
      try { assertNoCalendarConflict(request.result, event); store.put(event); done(undefined); } catch (error) { fail(error); }
    };
  });
}
export function deleteCalendarEvent(ownerId: string, id: string): Promise<void> {
  return transaction('readwrite', (store, done) => { store.delete([ownerId, id]); done(undefined); });
}
