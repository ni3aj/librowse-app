import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import Constants from "expo-constants";
import { useNavigation } from "expo-router"; // 📌 Standard navigation
import { ReactNode } from "react";
import { Platform, Text, TouchableOpacity, View } from "react-native";

interface HeaderProps {
  title: string;
  rightComponent?: ReactNode;
}

export default function Header({ title, rightComponent }: HeaderProps) {
  const notchHeight = Constants.statusBarHeight;
  const isIOS = Platform.OS === "ios";
  const navigation = useNavigation();

  // 📌 1. Real Back Navigation
  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack(); // Pops the literal stack layer, not just a router alias
    }
  };

  return (
    // 📌 2. The Glass Effect
    // "absolute" makes it float over your screen so content scrolls underneath and blurs
    <BlurView
      intensity={isIOS ? 60 : 90} // Android needs slightly higher intensity for the same effect
      tint="dark" // Use "light" if your app has a white background, "dark" for dark themes
      className="absolute top-0 left-0 right-0 z-50 border-b border-white/10"
      style={{
        paddingTop: isIOS ? notchHeight + 10 : notchHeight + 20,
        paddingBottom: 16,
        paddingHorizontal: 24,
      }}
    >
      <View className="flex-row items-center justify-between">
        
        {/* 📌 3. Left Side: Back Arrow + Title */}
        <View className="flex-row items-center flex-1 pr-4">
          <TouchableOpacity
            onPress={handleBack}
            activeOpacity={0.7}
            className="mr-3 p-1 -ml-2"
          >
            <Ionicons name="chevron-back" size={28} color="#fff" />
          </TouchableOpacity>

          <Text
            className="text-2xl font-m-extra text-white flex-1"
            numberOfLines={1}
          >
            {title}
          </Text>
        </View>

        {/* 📌 4. Right Side: Custom Component */}
        {rightComponent && <View>{rightComponent}</View>}
        
      </View>
    </BlurView>
  );
}