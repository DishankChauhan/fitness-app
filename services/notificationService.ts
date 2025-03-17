import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export interface ChallengeUpdate {
  challengeId: string;
  type: 'progress' | 'completion' | 'reward';
  message: string;
}

class NotificationService {
  private static instance: NotificationService;

  private constructor() {
    this.initialize();
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  private async initialize() {
    await this.requestPermissions();
    this.configurePushNotifications();
  }

  private async requestPermissions() {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Failed to get push token for push notification!');
      return;
    }

    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }
  }

  private configurePushNotifications() {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  }

  public async registerForPushNotifications() {
    try {
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas.projectId,
      });
      return token.data;
    } catch (error) {
      console.error('Failed to get push token:', error);
      return null;
    }
  }

  public async scheduleLocalNotification(
    title: string,
    body: string,
    trigger: Notifications.NotificationTriggerInput = null
  ) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
      },
      trigger,
    });
  }

  public async showAchievementNotification(achievement: Achievement) {
    await this.scheduleLocalNotification(
      '🏆 Achievement Unlocked!',
      `${achievement.title} - ${achievement.description}`,
      null
    );
  }

  public async showChallengeUpdate(update: ChallengeUpdate) {
    let title = '📊 Challenge Update';
    switch (update.type) {
      case 'progress':
        title = '📈 Progress Update';
        break;
      case 'completion':
        title = '🎉 Challenge Completed';
        break;
      case 'reward':
        title = '💰 Reward Earned';
        break;
    }

    await this.scheduleLocalNotification(title, update.message, null);
  }

  public async showRewardNotification(amount: number) {
    await this.scheduleLocalNotification(
      '💰 Reward Earned!',
      `You've earned $${amount.toFixed(2)} in rewards!`,
      null
    );
  }
}

export const notificationService = NotificationService.getInstance(); 