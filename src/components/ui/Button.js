import { ActivityIndicator, Text, TouchableOpacity } from "react-native";
import { COLORS } from "../../constants/theme"; // 📌 Single Source of Truth

export default function Button({
  title,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  className = "",
  ...props
}) {
  // Tailwind classes mapping (using your config keys)
  const baseStyle = "py-4 px-6 rounded-2xl items-center justify-center";

  const variants = {
    primary: "bg-brand",
    outline: "bg-transparent border border-borderLight",
    dark: "bg-textDark",
  };

  const textStyles = {
    primary: "text-white font-m-bold text-lg", // White is the only universal color for brand background
    outline: "text-textLight font-m-semi text-lg",
    dark: "text-white font-m-bold text-lg",
  };

  // Dynamic loader color based on variant
  // Primary buttons need a white spinner, Outline buttons need the Clay Brown spinner
  const loaderColor = variant === "primary" ? "#FFFFFF" : COLORS.textLight;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      className={`${baseStyle} ${variants[variant]} ${disabled ? "opacity-50" : ""} ${className}`}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={loaderColor} />
      ) : (
        <Text className={textStyles[variant]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}
