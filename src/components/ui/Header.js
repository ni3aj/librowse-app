import { COLORS } from "@/constants/theme";
import Constants from "expo-constants";
import { LinearGradient } from "expo-linear-gradient";
import { ReactNode } from "react";
import { Text, View } from "react-native";

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

  return (
    <LinearGradient
      colors={[COLORS.brand, COLORS.brandAccent]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      className="pb-6 border-b border-borderLight rounded-b-3xl shadow-sm"
      style={{
        paddingTop: notchHeight + 10,
        paddingHorizontal: 24,
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
            <Text className="text-sm text-white/80 pb-4">
              {subtitle}
            </Text>
          ) : null}
        </View>

        {rightComponent}
      </View>
    </LinearGradient>
  );
}