import { COLORS } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { Text, TextInput, View } from "react-native";

export default function ExploreHeader() {
  return (
    <View className="px-6 pb-2 bg-background">
      <View className="flex-row justify-between items-center">
        <Text className="text-3xl pt-6 font-m-extra text-textDark mb-6">
          Explore
        </Text>
        <Ionicons
          name="notifications-outline"
          size={24}
          color={COLORS.textDark}
        />
      </View>

      <View className="flex-row items-center bg-white rounded-2xl px-4 py-4 border border-borderLight">
        <Ionicons
          name="search"
          size={20}
          color={COLORS.textLight}
          className="mr-3"
        />
        <TextInput
          placeholder="Search library"
          className="flex-1 text-lg text-textDark ml-2"
          placeholderTextColor={COLORS.textLight}
        />
        <Ionicons name="options-outline" size={20} color={COLORS.brand} />
      </View>
    </View>
  );
}
