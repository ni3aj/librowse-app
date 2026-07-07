import { COLORS } from "@/constants/theme";
import { Text, TextInput, View } from "react-native";

export default function Input({
  label,
  value,
  onChangeText,
  placeholder,
  ...props
}) {
  return (
    <View className="mb-6 w-full">
      {label && (
        <Text className="text-lg font-l-semi text-textDark mb-2 ml-1">
          {label}
        </Text>
      )}
      <TextInput
        className="w-full h-16 bg-white px-5 rounded-2xl text-xl text-textDark border border-borderLight"
        placeholder={placeholder}
        placeholderTextColor={COLORS.textLight}
        value={value}
        onChangeText={onChangeText}
        {...props}
      />
    </View>
  );
}
