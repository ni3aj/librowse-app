import {
  Montserrat_400Regular,
  Montserrat_500Medium,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
  Montserrat_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/montserrat";
import { Slot } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { Text, TextInput } from "react-native";
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
  const [fontsLoaded, error] = useFonts({
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
    Montserrat_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded || error) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, error]);

  if (!fontsLoaded && !error) {
    return null;
  }

  return <Slot />;
}
