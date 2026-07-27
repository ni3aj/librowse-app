import { toastConfig } from "@/components/ui/ToastConfig";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import {
  Montserrat_400Regular,
  Montserrat_500Medium,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
  Montserrat_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/montserrat";
import * as NavigationBar from "expo-navigation-bar";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { Platform, Text, TextInput } from "react-native";
import Toast from "react-native-toast-message";
import "../global.css";

SplashScreen.preventAutoHideAsync();

if (!Text.defaultProps) {
  Text.defaultProps = {};
}
Text.defaultProps.style = { fontFamily: "Montserrat_400Regular" };

if (!TextInput.defaultProps) {
  TextInput.defaultProps = {};
}
TextInput.defaultProps.style = { fontFamily: "Montserrat_400Regular" };

export default function RootLayout() {
  usePushNotifications();

  const [fontsLoaded, error] = useFonts({
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
    Montserrat_800ExtraBold,
  });

  useEffect(() => {
    if (Platform.OS === "android") {
      NavigationBar.setVisibilityAsync("hidden");
      NavigationBar.setBehaviorAsync("overlay-swipe");
    }
    if (fontsLoaded || error) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, error]);

  if (!fontsLoaded && !error) {
    return null;
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      <Toast config={toastConfig} position="bottom" bottomOffset={80} />
    </>
  );
}
