import apiClient from "@/api/client";
import { useAuthStore } from "@/store/authStore";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { useEffect } from "react";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const usePushNotifications = () => {
  const userId = useAuthStore((state) => state.userId);

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
};
