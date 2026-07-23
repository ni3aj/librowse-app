import Header from "@/components/ui/Header";
import { COLORS } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { TextInput, View } from "react-native";

export default function ExploreHeader() {
  return (
    <View>
      <Header title="Explore" enableBack={false} />
      <View className="flex-row items-center bg-white rounded-2xl px-4 py-2 m-4 border border-borderLight">
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
