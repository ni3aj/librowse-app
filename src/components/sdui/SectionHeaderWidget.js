// components/sdui/SectionHeaderWidget.js
import { Text, View } from "react-native";

export default function SectionHeaderWidget({ title, subtitle }) {
  return (
    <View className="px-6 pt-6 pb-2">
      <Text className="text-xl font-m-extra text-textDark">{title}</Text>
      {subtitle && (
        <Text className="text-sm font-m text-textLight mt-1">{subtitle}</Text>
      )}
    </View>
  );
}
