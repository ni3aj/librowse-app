import { COLORS } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useNavigation } from "expo-router";
import { ReactNode } from "react";
import { Platform, Text, TouchableOpacity, View } from "react-native";

interface HeaderProps {
  title: string;
  rightComponent?: ReactNode;
  enableBack?: boolean;
}

export default function Header({ 
  title, 
  rightComponent, 
  enableBack = true
}: HeaderProps) {
  const notchHeight = Constants.statusBarHeight;
  const isIOS = Platform.OS === "ios";
  const navigation = useNavigation();

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  return (
    <View
      className="bg-background"
      style={{
        paddingTop: isIOS ? notchHeight + 10 : notchHeight + 20,
        paddingBottom: 16,
        paddingHorizontal: 24,
      }}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center flex-1 pr-4">
          {enableBack && (
            <TouchableOpacity
              onPress={handleBack}
              activeOpacity={0.7}
              className="mr-3 -ml-2"
            >
              <Ionicons name="chevron-back" size={28} color={COLORS.textDark} />
            </TouchableOpacity>
          )}
          <Text
            className="text-2xl font-m-extra text-textDark flex-1"
            numberOfLines={1}
          >
            {title}
          </Text>
        </View>
        {rightComponent && <View>{rightComponent}</View>}
      </View>
    </View>
  );
}