export interface CalendarEvent {
  id: string;
  ownerId: string;
  title: string;
  date: string;
  start: string;
  end: string;
  lessonPlanId: string | null;
  reminderMinutes: number | null;
  notes: string;
}
export function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function eventStart(event: CalendarEvent): Date { return new Date(`${event.date}T${event.start}:00`); }
export function validateCalendarEvent(event: CalendarEvent): void {
  const day = new Date(`${event.date}T12:00:00`);
  if (!event.id || !event.ownerId || !event.title.trim() || event.title.length > 120) throw new Error('Enter a schedule title (up to 120 characters).');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(event.date) || !Number.isFinite(day.getTime()) || localDateKey(day) !== event.date) throw new Error('Enter a valid date using YYYY-MM-DD.');
  if (![event.start, event.end].every((time) => /^([01]\d|2[0-3]):[0-5]\d$/.test(time)) || event.end <= event.start) throw new Error('Use HH:MM times and choose an end time later than the start time.');
  if (event.reminderMinutes !== null && ![5, 15, 30, 60].includes(event.reminderMinutes)) throw new Error('Choose a valid reminder time.');
}
export function conflictingEvent(events: CalendarEvent[], event: CalendarEvent): CalendarEvent | undefined {
  return events.find((other) => other.ownerId === event.ownerId && other.id !== event.id && other.date === event.date && event.start < other.end && event.end > other.start);
}
export function assertNoCalendarConflict(events: CalendarEvent[], event: CalendarEvent): void {
  validateCalendarEvent(event);
  const conflict = conflictingEvent(events, event);
  if (conflict) throw new Error(`Schedule overlaps “${conflict.title}” (${conflict.start}–${conflict.end}). Choose another time.`);
}
