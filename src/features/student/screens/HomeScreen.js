import apiClient from "@/api/client";
import Button from "@/components/ui/Button"; // 📌 Ensure your Button is imported
import { COLORS } from "@/constants/theme";
import * as Location from "expo-location"; // 📌 Import expo-location
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl, // 📌 Import RefreshControl
  Text,
  View,
} from "react-native";

import ExploreHeader from "@/components/home/ExploreHeader";
import FilterChips from "@/components/home/FilterChips";
import LibraryCard from "@/components/home/LibraryCard";

export default function HomeScreen() {
  const [libraries, setLibraries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [locationError, setLocationError] = useState(null);

  useEffect(() => {
    fetchLocationAndLibraries();
  }, []);

  const handlePullToRefresh = useCallback(() => {
    setRefreshing(true);
    fetchLocationAndLibraries();
  }, []);

  // 📌 THE FIX: Replaced fetchLibraries with dynamic location fetcher
  const fetchLocationAndLibraries = async () => {
    setLocationError(null);
    setLoading(true);

    try {
      // 1. Ask for Permission
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        setLocationError("Permission Denied");
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // 2. Get Real Coordinates
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = location.coords;

      // 3. Fetch from API using real coordinates
      const response = await apiClient.get("/student/libraries", {
        params: { latitude, longitude, radius: 15 }, // Set a standard radius like 15km
      });

      if (response.data.success) {
        setLibraries(response.data.libraries);
      }
    } catch (error) {
      console.log(
        "Error fetching libraries:",
        error.response?.data || error.message,
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  return (
    <View className="flex-1 bg-background">
      <FlatList
        data={libraries}
        keyExtractor={(item) => item.id.toString()}
        // 📌 Added Pull-to-Refresh
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handlePullToRefresh}
            tintColor={COLORS.brand}
          />
        }
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
                <Text className="text-textLight mt-4 font-m-med">
                  Finding nearby libraries...
                </Text>
              </>
            ) : locationError ? (
              // 📌 THE FIX: UI when location permission is denied
              <View className="items-center bg-surface w-full p-8 rounded-[24px] border border-borderLight shadow-sm">
                <View className="bg-brand/10 h-16 w-16 rounded-full items-center justify-center mb-4">
                  <Text className="text-3xl">📍</Text>
                </View>
                <Text className="text-xl font-m-bold text-textDark mb-2 text-center">
                  Location Required
                </Text>
                <Text className="text-textLight text-center mb-6 leading-5">
                  We need your location to show you the closest study rooms.
                </Text>
                <Button
                  title="Enable Location"
                  onPress={fetchLocationAndLibraries}
                  className="w-full"
                />
              </View>
            ) : (
              // 📌 Original Empty State
              <View className="items-center bg-surface w-full p-8 rounded-[24px] border border-borderLight shadow-sm">
                <Text className="text-4xl mb-4">📭</Text>
                <Text className="text-lg font-m-bold text-textDark mb-2">
                  No Libraries Found
                </Text>
                <Text className="text-textLight text-center font-m">
                  No study rooms within 15km.
                </Text>
              </View>
            )}
          </View>
        }
        renderItem={({ item }) => <LibraryCard library={item} />}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
