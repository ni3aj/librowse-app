import { LinearGradient } from "expo-linear-gradient";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
} from "react-native";
import { COLORS } from "../../constants/theme";

export default function Button({
  title,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  className = "",
  ...props
}) {
  const baseStyle =
    "py-3 px-4 rounded-2xl items-center justify-center overflow-hidden";

  const variants = {
    primary: "bg-transparent",
    outline: "bg-transparent border border-borderLight",
    dark: "bg-textDark",
  };

  const textStyles = {
    primary: "text-white font-m-bold text-lg",
    outline: "text-textDark font-m-semi text-lg",
    dark: "text-white font-m-bold text-lg",
  };

  const loaderColor = variant === "primary" ? "#FFFFFF" : COLORS.textLight;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      className={`${baseStyle} ${variants[variant]} ${disabled ? "opacity-50" : ""} ${className}`}
      {...props}
    >
      {variant === "primary" && (
        <LinearGradient
          colors={[COLORS.brand, COLORS.brandAccent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}

      {loading ? (
        <ActivityIndicator color={loaderColor} />
      ) : (
        <Text
          className={`${textStyles[variant]} text-center`}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}
