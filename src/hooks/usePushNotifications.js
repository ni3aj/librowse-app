import apiClient from "@/api/client";
import { useAuthStore } from "@/store/authStore";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { router } from "expo-router"; // 📌 1. Imported router for navigation
import { useEffect } from "react";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const usePushNotifications = () => {
  const { userId } = useAuthStore();

  // --- EFFECT 1: Register and Save Token ---
  useEffect(() => {
    const registerForPushNotificationsAsync = async () => {
      if (!Device.isDevice) return;

      if (!userId) return;

      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        console.log("Failed to get push token for push notification!");
        return;
      }

      try {
        const projectId = Constants.expoConfig?.extra?.eas?.projectId;

        if (!projectId) {
          console.warn("Missing EAS Project ID in app.json!");
          return;
        }

        const expoPushToken = (
          await Notifications.getExpoPushTokenAsync({
            projectId: projectId,
          })
        ).data;

        await apiClient.post("/user/fcm-token", { token: expoPushToken });
      } catch (error) {
        console.error("Error saving fcm token:", error);
      }
    };

    registerForPushNotificationsAsync();
  }, [userId]);

  // --- EFFECT 2: Handle Notification Taps (Navigation) ---
  useEffect(() => {
    // This listener fires whenever a user TAPS a notification (Background, KILLED, or Foreground)
    const responseListener =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;

        // 📌 2. If the payload contains a "screen", navigate to it!
        if (data && data.screen) {
          // A slight 300ms delay ensures Expo Router has fully mounted before trying to push
          setTimeout(() => {
            router.push(data.screen);
          }, 300);
        }
      });

    // Cleanup the listener when the hook unmounts to prevent memory leaks
    return () => {
      if (responseListener) {
        responseListener.remove();
      }
    };
  }, []);
};
