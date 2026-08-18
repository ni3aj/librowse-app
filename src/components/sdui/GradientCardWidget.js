// components/sdui/GradientCardWidget.js
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";

export default function GradientCardWidget({
  libraryId,
  title,
  subtitle,
  gradientColors,
  badge,
  actionText, // 📌 1. Accept the new prop from backend
  action,
}) {
  const handlePress = () => {
    if (action?.type === "NAVIGATE") {
      router.push(`/(student)/library/${libraryId}`);
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={handlePress}
      className="mx-6 my-3 "
    >
      <LinearGradient
        colors={gradientColors || ["#4F46E5", "#3B82F6"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: 24, padding: 20 }}
      >
        <View className="flex-row justify-between items-start mb-6">
          <View className="flex-1 pr-4">
            <Text className="text-white font-m-extra text-2xl mb-1">
              {title}
            </Text>
            <Text className="text-white/80 font-m text-sm">{subtitle}</Text>
          </View>

          {badge && (
            <View
              style={{ backgroundColor: badge.backgroundColor }}
              className="px-3 py-1.5 rounded-full "
            >
              <Text
                style={{ color: badge.textColor }}
                className="font-m-bold text-xs uppercase tracking-widest"
              >
                {badge.text}
              </Text>
            </View>
          )}
        </View>

        {/* 📌 2. Render dynamic text here */}
        <View className="flex-row justify-between items-end">
          <View className="bg-black/20 px-3 py-1.5 rounded-lg flex-row items-center">
            <Ionicons
              name="calendar-outline"
              size={14}
              color="white"
              style={{ marginRight: 6 }}
            />
            <Text className="text-white font-m-bold text-xs">
              {actionText || "View Details"}
            </Text>
          </View>
          <Ionicons name="arrow-forward-circle" size={32} color="white" />
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}
