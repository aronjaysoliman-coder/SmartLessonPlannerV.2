export async function requestCalendarReminderPermission(): Promise<boolean> { return false; }
export async function syncCalendarReminders(_ownerId: string | null): Promise<string> {
  return 'Saved in this browser. Background reminders require the mobile app; clearing browser data removes local schedules.';
}
