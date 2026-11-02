import type { NotificationPreferences } from "@/types/game";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// Configure how incoming notifications appear when app is active
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} catch {
  // Web or unsupported environment
}

export class NotificationService {
  /**
   * Checks whether notification permissions have been granted by OS.
   */
  static async checkPermissions(): Promise<boolean> {
    try {
      if (Platform.OS === "web") {
        if (typeof window !== "undefined" && "Notification" in window) {
          return window.Notification.permission === "granted";
        }
        return false;
      }
      const settings = await Notifications.getPermissionsAsync();
      return Boolean(settings.granted);
    } catch {
      return false;
    }
  }

  /**
   * Prompts the user for OS notification permission only when they enable reminders.
   */
  static async requestPermissions(): Promise<boolean> {
    try {
      if (Platform.OS === "web") {
        if (typeof window !== "undefined" && "Notification" in window) {
          const res = await window.Notification.requestPermission();
          return res === "granted";
        }
        return false;
      }
      const existing = await Notifications.getPermissionsAsync();
      if (existing.granted) return true;

      const requested = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
      return requested.granted;
    } catch {
      return false;
    }
  }

  /**
   * Dispatches an immediate test notification so the player can verify delivery.
   */
  static async sendTestNotification(): Promise<boolean> {
    try {
      const hasPerm = await this.checkPermissions();
      if (!hasPerm) {
        const granted = await this.requestPermissions();
        if (!granted) return false;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: "🎯 Guess My Number",
          body: "Arcade notification system is active and ready for your daily challenges!",
          data: { type: "test" },
        },
        trigger: null, // deliver immediately
      });
      return true;
    } catch (err) {
      console.warn("[NotificationService] Error sending test notification:", err);
      return false;
    }
  }

  /**
   * Cancels all scheduled local reminders.
   */
  static async cancelAllReminders(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch {
      // ignore
    }
  }

  /**
   * Schedules or clears notifications based on player's current preferences.
   */
  static async syncAllReminders(prefs: NotificationPreferences): Promise<void> {
    try {
      await this.cancelAllReminders();

      const hasPerm = await this.checkPermissions();
      if (!hasPerm) return;

      // 1. Daily Challenge Reminder
      if (prefs.dailyReminder) {
        const [hourStr, minStr] = prefs.dailyReminderTime.split(":");
        const hour = parseInt(hourStr ?? "9", 10);
        const minute = parseInt(minStr ?? "0", 10);

        await Notifications.scheduleNotificationAsync({
          content: {
            title: "🌟 New Daily Challenge Available!",
            body: "Today's shared number puzzle is waiting. Can you crack the code?",
            data: { type: "daily" },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour,
            minute,
          },
        });
      }

      // 2. Streak Reminder (Evening 20:00)
      if (prefs.streakReminder) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "🔥 Keep Your Win Streak Alive!",
            body: "Your streak is on the line! Jump in for a quick match before midnight.",
            data: { type: "streak" },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: 20,
            minute: 0,
          },
        });
      }

      // 3. Mission Expiration Reminder (Weekly Saturday 18:00)
      if (prefs.missionReminder) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "⏳ Weekly Missions Ending Soon!",
            body: "Check your active missions in the Progression Hub to claim bonus XP.",
            data: { type: "mission" },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
            weekday: 7, // Saturday
            hour: 18,
            minute: 0,
          },
        });
      }
    } catch (err) {
      console.warn("[NotificationService] Error syncing reminders:", err);
    }
  }
}
