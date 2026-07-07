import apiClient from "@/api/client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants"; // 📌 ADD THIS IMPORT
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
  useEffect(() => {
    const registerForPushNotificationsAsync = async () => {
      if (!Device.isDevice) return;

      const token = await AsyncStorage.getItem("jwt_token");
      if (!token) return;

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
        // 📌 1. GRAB THE PROJECT ID FROM app.json
        const projectId = Constants.expoConfig?.extra?.eas?.projectId;

        if (!projectId) {
          console.warn("Missing EAS Project ID in app.json!");
          return;
        }

        // 📌 2. PASS THE ID INTO THE TOKEN REQUEST
        const expoPushToken = (
          await Notifications.getExpoPushTokenAsync({
            projectId: projectId,
          })
        ).data;

        console.log("🟢 Expo Push Token:", expoPushToken);

        await apiClient.post("/user/fcm-token", { token: expoPushToken });
      } catch (error) {
        console.error("Error saving fcm token:", error);
      }
    };

    registerForPushNotificationsAsync();
  }, []);
};
