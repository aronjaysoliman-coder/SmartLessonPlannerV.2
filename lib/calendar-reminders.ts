import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { eventStart } from './calendar';
import { listCalendarEvents } from './calendar-store';
const prefix = 'slp-calendar-';
Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }) });
export async function requestCalendarReminderPermission(): Promise<boolean> {
  if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync('lesson-calendar', { name: 'Lesson schedules', importance: Notifications.AndroidImportance.DEFAULT });
  const permission = await Notifications.requestPermissionsAsync();
  return permission.granted || permission.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}
let queue: Promise<unknown> = Promise.resolve();
/** Also removes this app's old-account, edited, or deleted calendar notifications. */
export function syncCalendarReminders(ownerId: string | null): Promise<string> {
  const task = queue.catch(() => {}).then(async () => {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const item of scheduled) if (item.identifier.startsWith(prefix)) await Notifications.cancelScheduledNotificationAsync(item.identifier);
    if (!ownerId) return '';
    const events = await listCalendarEvents(ownerId);
    if (!events.some((event) => event.reminderMinutes !== null && eventStart(event).getTime() > Date.now())) return 'Schedules saved on this device.';
    const permission = await Notifications.getPermissionsAsync();
    if (!permission.granted && permission.ios?.status !== Notifications.IosAuthorizationStatus.PROVISIONAL) return 'Schedules saved. Notifications are disabled; enable them in device settings to receive reminders.';
    for (const event of events) {
      if (event.reminderMinutes === null) continue;
      const date = new Date(eventStart(event).getTime() - event.reminderMinutes * 60000);
      if (date.getTime() <= Date.now()) continue;
      await Notifications.scheduleNotificationAsync({
        identifier: prefix + event.id,
        content: { title: 'Upcoming lesson schedule', body: `${event.title} · ${event.start}`, sound: 'default', data: { calendarOwnerId: ownerId, scheduleId: event.id } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: 'lesson-calendar' },
      });
    }
    return 'Saved on this device. Future reminders are scheduled.';
  });
  queue = task;
  return task;
}
