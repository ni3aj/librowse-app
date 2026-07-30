import { ScrollView, Text, TouchableOpacity } from "react-native";

export default function FilterChips({ activeFilter, onSelectFilter }) {
  // Matched these to your actual database amenities!
  const categories = ["All", "AC", "WiFi", "Reservation"];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="px-6 bg-background mb-4"
    >
      {categories.map((item, index) => {
        const isActive = activeFilter === item;

        return (
          <TouchableOpacity
            key={index}
            onPress={() => onSelectFilter(item)}
            className={`px-5 py-2 rounded-full mr-3 border ${
              isActive ? "bg-brand border-brand" : "bg-white border-borderLight"
            }`}
          >
            <Text
              className={`${
                isActive ? "text-white" : "text-textDark"
              } font-m-semi`}
            >
              {item}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}
