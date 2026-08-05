import { COLORS } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { TextInput, TouchableOpacity, View } from "react-native";

export default function ExploreHeader({
  searchQuery,
  onSearchChange,
  onFilterPress,
}) {
  return (
    <View className="mt-10 mx-2">
      <View className="flex-row items-center bg-white rounded-2xl px-4 py-2 m-4 border border-borderLight">
        <Ionicons
          name="search"
          size={20}
          color={COLORS.textLight}
          className="mr-3"
        />
        <TextInput
          placeholder="Search library..."
          value={searchQuery}
          onChangeText={onSearchChange}
          className="flex-1 text-lg text-textDark ml-2"
          placeholderTextColor={COLORS.textLight}
        />
        <TouchableOpacity
          onPress={onFilterPress}
          className="p-1 bg-brand/10 rounded-lg ml-2"
        >
          <Ionicons name="options-outline" size={22} color={COLORS.brand} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
