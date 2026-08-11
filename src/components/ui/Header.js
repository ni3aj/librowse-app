import { COLORS } from "@/constants/theme";
import { useLibraryStore } from "@/store/libraryStore"; // 📌 1. Imported library store
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useNavigation } from "expo-router";
import { ReactNode, useState } from "react";
import { Modal, Platform, Text, TouchableOpacity, View } from "react-native";

interface HeaderProps {
  title: string;
  rightComponent?: ReactNode;
  enableBack?: boolean;
  showLibraryDropdown?: boolean; // 📌 2. Added new variable prop
}

export default function Header({ 
  title, 
  rightComponent, 
  enableBack = true,
  showLibraryDropdown = false // Default to false so it doesn't break other screens
}: HeaderProps) {
  const notchHeight = Constants.statusBarHeight;
  const isIOS = Platform.OS === "ios";
  const navigation = useNavigation();

  // 📌 3. State and Store extraction for the dropdown
  const [modalVisible, setModalVisible] = useState(false);
  const { libraryId, libraries } = useLibraryStore();
  
  // Safely grab the current library object for the button text
  const selectedLibrary = libraries?.find((lib) => lib.id === libraryId) || libraries?.[0];

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  return (
    <View
      className="bg-background z-50"
      style={{
        paddingTop: isIOS ? notchHeight + 10 : notchHeight + 20,
        paddingBottom: 16,
        paddingHorizontal: 24,
      }}
    >
      <View className="flex-row items-center justify-between">
        {/* Left Side: Back Button & Title */}
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
            className="text-xl mb-1 font-m-extra text-textDark flex-1"
            numberOfLines={1}
          >
            {title}
          </Text>
        </View>

        {/* Right Side: Dropdown (if enabled) AND Custom Right Component */}
        <View className="flex-row items-center">
          {/* 📌 4. The Library Dropdown UI */}
          {showLibraryDropdown && libraries?.length > 1 && (
            <TouchableOpacity
              onPress={() => setModalVisible(true)}
              className="flex-row items-center bg-white border border-borderLight rounded-full px-3 py-2 mr-0 max-w-[140px]"
            >
              <Text
                className="text-textDark font-m-bold text-sm mr-1 flex-shrink"
                numberOfLines={1}
              >
                {selectedLibrary?.name || "Select"}
              </Text>
              <Ionicons name="chevron-down" size={16} color={COLORS.textDark} />
            </TouchableOpacity>
          )}

          {/* The Custom Right Component (e.g., Refresh Button) */}
          {rightComponent && <View>{rightComponent}</View>}
        </View>
      </View>

      {/* 📌 5. The Isolated Modal */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View className="flex-1 bg-black/50 justify-center items-center p-6">
          <View className="bg-white w-full rounded-3xl p-6 shadow-lg shadow-black/20">
            <Text className="text-xl font-m-bold text-textDark mb-2">
              Select Library
            </Text>
            
            {libraries?.map((lib, index) => {
              const isLast = index === libraries.length - 1;
              const isSelected = lib.id === libraryId;

              return (
                <TouchableOpacity
                  key={lib.id}
                  className={`py-4 flex-row items-center justify-between ${!isLast ? "border-b border-borderLight" : ""}`}
                  onPress={() => {
                    setModalVisible(false);
                    useLibraryStore.setState({ libraryId: lib.id }); // Updates global store directly
                  }}
                >
                  <Text className={`font-m-med ${isSelected ? "text-brand" : "text-textDark"}`}>
                    {lib.name}
                  </Text>
                  {isSelected && <Ionicons name="checkmark-circle" size={20} color={COLORS.brand} />}
                </TouchableOpacity>
              );
            })}

            {/* Added a cancel button for better UX */}
            <TouchableOpacity
              className="mt-2 items-center py-3 bg-gray-100 rounded-xl"
              onPress={() => setModalVisible(false)}
            >
              <Text className="text-textDark font-m-bold">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}