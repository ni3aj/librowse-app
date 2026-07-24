import { COLORS } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { Text, TextInput, View } from "react-native";

export default function Input({
  label,
  error,
  rightIcon,
  editable = true,
  className = "",
  style,
  ...props
}) {
  return (
    <View className={`mb-4 ${className}`}>
      {label && (
        <Text className="text-sm font-m-bold text-textDark mb-1.5 ml-1">
          {label}
        </Text>
      )}
      <View
        className={`flex-row items-center border rounded-2xl px-4 min-h-[56px] ${
          editable
            ? "bg-white border-borderLight"
            : "bg-gray-100 border-gray-300" // 📌 Disabled background color
        } ${error ? "border-red-500" : ""}`}
      >
        <TextInput
          className={`flex-1 font-m text-base h-full ${
            editable ? "text-textDark" : "text-textLight"
          }`}
          editable={editable}
          placeholderTextColor={COLORS.textLight}
          style={style}
          {...props}
        />
        {/* 📌 Renders the lock icon on the right side */}
        {rightIcon && (
          <Ionicons
            name={rightIcon}
            size={20}
            color={COLORS.textLight}
            style={{ marginLeft: 8 }}
          />
        )}
      </View>
      {error && (
        <Text className="text-xs font-m text-red-500 mt-1">{error}</Text>
      )}
    </View>
  );
}
