import { COLORS } from "@/constants/theme";
import Constants from "expo-constants";
import { LinearGradient } from "expo-linear-gradient";
import { ReactNode } from "react";
import { Platform, Text, View } from "react-native";

interface HeaderProps {
  title: string;
  subtitle?: string;
  rightComponent?: ReactNode;
}

export default function Header({
  title,
  subtitle,
  rightComponent,
}: HeaderProps) {
  const notchHeight = Constants.statusBarHeight;
  
  // 📌 1. Check which platform the app is running on
  const isIOS = Platform.OS === "ios";

  return (
    <LinearGradient
      colors={[COLORS.brand, COLORS.brandAccent]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      // 📌 2. Dynamic Platform Classes:
      // If iOS, use the standard shadow and curves. If Android, use a flatter look to prevent scattering.
      className={`border-b border-borderLight ${
        isIOS ? "pb-6 rounded-b-3xl shadow-sm" : "pb-4 rounded-b-2xl"
      }`}
      style={{
        paddingTop: isIOS ? notchHeight + 10 : notchHeight + 20, // Android usually needs a bit more breathing room
        paddingHorizontal: 24,
        // 📌 Android explicitly requires 'elevation' for shadows, NativeWind 'shadow-sm' often fails on it
        ...(isIOS
          ? {}
          : { elevation: 4 }), 
      }}
    >
      <View className="flex-row justify-between items-start">
        <View className="flex-1 pr-4">
          <Text
            className={`text-3xl font-m-extra text-white ${
              subtitle ? "mb-2" : "mb-4"
            }`}
          >
            {title}
          </Text>

          {subtitle ? (
            <Text className={`text-sm text-white/80 ${isIOS ? "pb-4" : "pb-2"}`}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        {rightComponent}
      </View>
    </LinearGradient>
  );
}