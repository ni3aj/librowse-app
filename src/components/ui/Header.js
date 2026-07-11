import { COLORS } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";

export default function Header({ title, showBack = true, rightComponent }) {
  return (
    <View className="flex-row justify-between items-center pt-4 pb-2">
      <View className="flex-row items-center flex-1">
        {/* --- BACK BUTTON --- */}
        {showBack && (
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.7}
            className="w-10 h-10 rounded-full bg-white border border-borderLight items-center justify-center mr-4"
          >
            <Ionicons name="chevron-back" size={20} color={COLORS.textDark} />
          </TouchableOpacity>
        )}

        {/* --- THE TITLE --- */}
        <Text
          className="text-2xl font-m-extra text-textDark flex-1"
          numberOfLines={1} // Prevents long names from breaking the UI
        >
          {title}
        </Text>
      </View>

      {/* --- OPTIONAL RIGHT SIDE (e.g., Settings Icon) --- */}
      {rightComponent && <View className="ml-4">{rightComponent}</View>}
    </View>
  );
}
