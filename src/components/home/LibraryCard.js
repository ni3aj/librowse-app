import { COLORS } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Image, Text, TouchableOpacity, View } from "react-native";

export default function LibraryCard({ library }) {
  // 1. Format distance safely (Postgres returns a string or long decimal for math calculations)
  const formattedDistance = library.distance_km
    ? parseFloat(library.distance_km).toFixed(1)
    : null;

  // 2. Format price safely (Postgres aggregations like MIN() often return strings)
  const formattedPrice = library.monthly_price
    ? Math.round(parseFloat(library.monthly_price))
    : null;

  return (
    <TouchableOpacity
      className="mx-6 mb-6 bg-white rounded-3xl p-3 border border-borderLight"
      activeOpacity={0.9}
      // Navigates to the details page when clicking the card
      onPress={() => router.push(`/(student)/library/${library.id}`)}
    >
      {/* Image Container */}
      <View className="relative">
        <Image
          source={{
            uri:
              library.image_url ||
              "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800",
          }}
          className="w-full h-64 rounded-2xl bg-surface"
        />

        {/* Status Badge */}
        <View className="absolute top-4 left-4 bg-brand px-3 py-1 rounded-full flex-row items-center">
          <View className="w-2 h-2 rounded-full bg-white mr-1.5" />
          <Text className="text-white font-m-bold text-xs uppercase tracking-wider">
            Open
          </Text>
        </View>

        {/* Heart Icon */}
        <TouchableOpacity className="absolute top-4 right-4 bg-white/90 p-2 rounded-full">
          <Ionicons name="heart-outline" size={20} color={COLORS.textDark} />
        </TouchableOpacity>

        {/* Distance Badge */}
        {formattedDistance ? (
          <View className="absolute bottom-4 right-4 bg-white/90 px-2 py-1 rounded-lg">
            <Text className="text-textDark font-m-bold text-xs">
              {formattedDistance} km
            </Text>
          </View>
        ) : null}
      </View>

      {/* Info Section */}
      <View className="p-3">
        <Text className="text-xl font-m-bold text-textDark">
          {library.name}
        </Text>

        {/* 📌 THE FIX: Changed items-left to items-center */}
        <View className="flex-row items-center mt-1 mb-3">
          <Ionicons name="location-sharp" size={14} color={COLORS.textLight} />
          <Text className="text-textLight ml-1 text-sm">
            {library.location || library.address}, {library.city}
          </Text>
        </View>

        <View className="flex-row justify-between items-center">
          {/* Rating */}
          <View className="flex-row items-center">
            {library.rating ? (
              <>
                <Ionicons name="star" size={16} color="#F59E0B" />
                <Text className="font-m-bold text-textDark ml-1">
                  {library.rating}
                </Text>
              </>
            ) : (
              <Text className="font-m-bold text-textLight">New</Text>
            )}
          </View>

          {/* Price */}
          <View className="flex-row items-baseline">
            {formattedPrice ? (
              <>
                <Text className="text-lg font-m-bold text-textDark">
                  ₹{formattedPrice}
                </Text>
                <Text className="text-textLight text-sm"> / month</Text>
              </>
            ) : (
              <Text className="text-textLight text-sm font-medium">
                View pricing
              </Text>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}
