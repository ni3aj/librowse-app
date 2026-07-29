import { toastConfig } from "@/components/ui/ToastConfig";
import { COLORS } from "@/constants/theme"; // 📌 1. Import your theme colors
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
import { Platform } from "react-native";
import Toast from "react-native-toast-message";
import "../global.css";

// Keep splash screen visible while fonts load
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  usePushNotifications();

  // 1. Load the fonts
  const [fontsLoaded, error] = useFonts({
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
    Montserrat_800ExtraBold,
  });

  useEffect(() => {
    if (Platform.OS === "android") {
      // 📌 2. THE FIX: Stop hiding the bar. Color it to match your Tabs!
      NavigationBar.setBackgroundColorAsync(COLORS.background);

      // Makes the Android system buttons (home, back, recent) dark
      // so they are visible against your light lavender background
      NavigationBar.setButtonStyleAsync("dark");
    }

    // 3. Hide splash screen ONLY when fonts are successfully loaded
    if (fontsLoaded || error) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, error]);

  // 4. Prevent rendering until fonts are ready to avoid visual glitches
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
