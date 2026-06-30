import { ScrollView, Text, TouchableOpacity } from "react-native";

export default function FilterChips() {
  const categories = ["All", "Wi-Fi", "AC", "Reservation"];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="px-6 py-4 bg-background mb-4"
    >
      {categories.map((item, index) => (
        <TouchableOpacity
          key={index}
          className={`px-6 py-3 rounded-full mr-3 border ${index === 0 ? "bg-brand border-brand" : "bg-white border-borderLight"}`}
        >
          <Text
            className={`${index === 0 ? "text-white" : "text-textDark"} font-m-semi`}
          >
            {item}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}
