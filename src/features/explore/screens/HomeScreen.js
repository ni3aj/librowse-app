import apiClient from "@/api/client";
import { COLORS } from "@/constants/theme";
import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Text, View } from "react-native";
// 📌 THE FIX: Import from safe-area-context to prevent the deprecation warning
import { SafeAreaView } from "react-native-safe-area-context";

import ExploreHeader from "@/components/home/ExploreHeader";
import FilterChips from "@/components/home/FilterChips";
import LibraryCard from "@/components/home/LibraryCard";

export default function HomeScreen() {
  const [libraries, setLibraries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLibraries();
  }, []);

  const fetchLibraries = async () => {
    try {
      const response = await apiClient.get("/student/libraries", {
        params: { latitude: 18.5204, longitude: 73.8567, radius: 1000 },
      });
      if (response.data.success) {
        setLibraries(response.data.libraries);
      }
    } catch (error) {
      console.log("Error:", error.response?.data || error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <FlatList
        data={libraries}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={
          <>
            <ExploreHeader />
            <FilterChips />
          </>
        }
        ListEmptyComponent={
          <View className="mt-12 items-center px-6">
            {loading ? (
              <>
                <ActivityIndicator size="large" color={COLORS.brand} />
                <Text className="text-textLight mt-4 font-medium">
                  Finding study spaces...
                </Text>
              </>
            ) : (
              <View className="items-center bg-surface w-full p-8 rounded-3xl border border-borderLight">
                <Text className="text-4xl mb-4">📭</Text>
                <Text className="text-lg font-m-bold text-textDark mb-2">
                  No Libraries Found
                </Text>
                <Text className="text-textLight text-center">
                  No study rooms in your radius.
                </Text>
              </View>
            )}
          </View>
        }
        renderItem={({ item }) => <LibraryCard library={item} />}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}
