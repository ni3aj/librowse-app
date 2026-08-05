import { COLORS } from "@/constants/theme";
import { useLibraryStore } from "@/store/libraryStore";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react"; // 📌 Added missing import
import { FlatList, Modal, Text, TouchableOpacity, View } from "react-native";

export default function LibrarySelector({
  libraries,
  selectedLibrary,
  onSelect,
}) {
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <>
      <TouchableOpacity
        onPress={() => setModalVisible(true)}
        className="flex-row items-center bg-white border border-borderLight rounded-full px-4 py-2"
      >
        <Text
          className="text-textDark font-m-bold text-sm mr-2"
          numberOfLines={1}
        >
          {selectedLibrary?.name || "Select Library"}
        </Text>
        <Ionicons name="chevron-down" size={16} color={COLORS.textDark} />
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="fade">
        <TouchableOpacity
          className="flex-1 bg-black/30 justify-center items-center"
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View className="bg-white w-4/5 rounded-3xl p-4">
            <Text className="text-lg font-m-bold text-textDark mb-4">
              Your Libraries
            </Text>
            <FlatList
              data={libraries}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  className="py-4 border-b border-borderLight"
                  onPress={() => {
                    useLibraryStore.setState({ libraryId: item.id });
                    if (onSelect) {
                      onSelect(item);
                    }

                    setModalVisible(false);
                  }}
                >
                  <Text className="text-textDark font-m-med">{item.name}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}
