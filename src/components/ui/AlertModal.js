import { COLORS } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import {
  Animated,
  Modal,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

export default function AlertModal({
  visible,
  title,
  message,
  type = "info", // 'success', 'error', 'warning', 'info'
  primaryButtonText = "OK",
  onPrimaryPress,
  secondaryButtonText,
  onSecondaryPress,
  onClose,
}) {
  const scaleValue = useRef(new Animated.Value(0.8)).current;
  const opacityValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleValue, {
          toValue: 1,
          tension: 20,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(opacityValue, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleValue.setValue(0.8);
      opacityValue.setValue(0);
    }
  }, [visible]);

  if (!visible) return null;

  // Dynamic Styles based on Alert Type
  const getIconConfig = () => {
    switch (type) {
      case "success":
        return {
          name: "checkmark-circle",
          color: "#10B981",
          bg: "bg-green-100",
        }; // Emerald
      case "error":
        return {
          name: "close-circle",
          color: COLORS.brandAccent,
          bg: "bg-red-50",
        }; // Coral Red
      case "warning":
        return { name: "warning", color: "#F59E0B", bg: "bg-yellow-100" }; // Amber
      default:
        return {
          name: "information-circle",
          color: COLORS.brand,
          bg: "bg-brand/10",
        }; // Magenta
    }
  };

  const iconConfig = getIconConfig();

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View className="flex-1 justify-center items-center bg-black/50 px-6">
          <TouchableWithoutFeedback onPress={() => {}}>
            <Animated.View
              style={{
                transform: [{ scale: scaleValue }],
                opacity: opacityValue,
              }}
              className="bg-surface w-full rounded-3xl p-6 items-center shadow-xl shadow-black/20 border border-borderLight"
            >
              {/* Dynamic Icon */}
              <View
                className={`${iconConfig.bg} w-12 h-12 rounded-full items-center justify-center mb-4`}
              >
                <Ionicons
                  name={iconConfig.name}
                  size={24}
                  color={iconConfig.color}
                />
              </View>

              {/* Text Content */}
              <Text className="text-xl font-m-bold text-textDark text-center mb-2">
                {title}
              </Text>
              <Text className="text-sm font-m-regular text-textLight text-center mb-6 leading-relaxed">
                {message}
              </Text>

              {/* Buttons */}
              <View className="w-full flex-row space-x-3">
                {secondaryButtonText && (
                  <TouchableOpacity
                    onPress={onSecondaryPress || onClose}
                    className="flex-1 p-2 bg-background py-3.5 m-2 rounded-xl items-center border border-borderLight"
                  >
                    <Text className="text-textLight font-m-bold text-base">
                      {secondaryButtonText}
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={onPrimaryPress || onClose}
                  className="flex-1 p-2 bg-brand py-3.5 m-2 rounded-xl items-center"
                >
                  <Text className="text-white font-m-bold text-base">
                    {primaryButtonText}
                  </Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
