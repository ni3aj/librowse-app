import apiClient from "@/api/client";
import Button from "@/components/ui/Button";
import { COLORS } from "@/constants/theme";
import * as Location from "expo-location";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert, // 📌 Added Alert
  FlatList,
  Linking, // 📌 Added Linking to open Phone Settings
  RefreshControl,
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
        params: { latitude, longitude, radius: 15 },
      });

      if (response.data.success) {
        setLibraries(response.data.libraries);
      }
    } catch (error) {
      console.log("Error fetching libraries:", error.message);
      // 📌 THE FIX #1: If GPS fails to lock, show the retry button, NOT the "No Libraries" screen!
      setLocationError(
        "Failed to detect location. Please ensure your GPS is on.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // 📌 THE FIX #2: Safely handle OS-level permission blocks
  const handleRetryLocation = async () => {
    const { status } = await Location.getForegroundPermissionsAsync();

    if (status === "denied") {
      // If they permanently denied it, the OS hides the prompt. We MUST open settings.
      Alert.alert(
        "Permission Required",
        "Please enable location services in your phone settings to find nearby study rooms.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Open Settings", onPress: () => Linking.openSettings() },
        ],
      );
    } else {
      // Otherwise, just retry fetching
      fetchLocationAndLibraries();
    }
  };

  return (
    <View className="flex-1 bg-background">
      <FlatList
        data={libraries}
        keyExtractor={(item) => item.id.toString()}
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
              // 📌 UI when location is denied OR GPS fails
              <View className="items-center bg-surface w-full p-8 rounded-[24px] border border-borderLight">
                <View className="bg-brand/10 h-16 w-16 rounded-full items-center justify-center mb-4">
                  <Text className="text-3xl">📍</Text>
                </View>
                <Text className="text-xl font-m-bold text-textDark mb-2 text-center">
                  Location Required
                </Text>
                <Text className="text-textLight text-center mb-6 leading-5">
                  {locationError === "Permission Denied"
                    ? "We need your location to show you the nearest libraries."
                    : locationError}
                </Text>
                <Button
                  title="Enable Location"
                  onPress={handleRetryLocation} // 📌 Uses the new smart retry function
                  className="w-full"
                />
              </View>
            ) : (
              // 📌 Original Empty State (Only shows if GPS works perfectly but DB returns 0)
              <View className="items-center bg-surface w-full p-8 rounded-[24px] border border-borderLight shadow-sm">
                <Text className="text-4xl mb-4">📭</Text>
                <Text className="text-lg font-m-bold text-textDark mb-2">
                  No Libraries Found
                </Text>
                <Text className="text-textLight text-center font-m">
                  No libraries found within 15km.
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
