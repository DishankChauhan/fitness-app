import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { notificationService } from '@/services/notificationService';

export function useNotifications() {
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();
  const router = useRouter();

  useEffect(() => {
    registerForPushNotifications();

    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      const data = notification.request.content.data;
      console.log('Notification received:', data);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      console.log('Notification response:', data);

      // Handle notification navigation
      if (data.challengeId) {
        router.push(`/challenge/${data.challengeId}`);
      }
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  const registerForPushNotifications = async () => {
    const token = await notificationService.registerForPushNotifications();
    if (token) {
      // TODO: Send this token to your server
      console.log('Push Notification Token:', token);
    }
  };

  return {
    showAchievementNotification: notificationService.showAchievementNotification.bind(notificationService),
    showChallengeUpdate: notificationService.showChallengeUpdate.bind(notificationService),
    showRewardNotification: notificationService.showRewardNotification.bind(notificationService),
  };
} 