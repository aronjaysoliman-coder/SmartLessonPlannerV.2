import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '@/lib/auth';
import { syncCalendarReminders } from '@/lib/calendar-reminders';
export function CalendarReminderSync() {
  const { user, isLoading } = useAuth();
  const ownerId = user?.uid ?? null;
  useEffect(() => {
    if (isLoading) return;
    const refresh = () => { void syncCalendarReminders(ownerId).catch(() => {}); };
    refresh();
    const listener = AppState.addEventListener('change', (state) => { if (state === 'active') refresh(); });
    return () => listener.remove();
  }, [isLoading, ownerId]);
  return null;
}
