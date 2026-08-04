import apiClient from "@/api/client";
import Button from "@/components/ui/Button";
import { COLORS } from "@/constants/theme";
import * as Location from "expo-location";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Modal,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import ExploreHeader from "@/components/student/ExploreHeader";
import FilterChips from "@/components/student/FilterChips";
import LibraryCard from "@/components/student/LibraryCard";
import { Ionicons } from "@expo/vector-icons";

export default function LibrariesListingScreen() {
  const [libraries, setLibraries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [locationError, setLocationError] = useState(null);

  // --- FILTER STATES ---
  const [activeChip, setActiveChip] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);

  const DEFAULT_FILTERS = { maxPrice: 5000, minRating: 0, maxDistance: 15 };
  const [appliedFilters, setAppliedFilters] = useState(DEFAULT_FILTERS);
  const [tempFilters, setTempFilters] = useState(DEFAULT_FILTERS);

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
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        setLocationError("Permission Denied");
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = location.coords;

      const response = await apiClient.get("/student/libraries", {
        params: { latitude, longitude, radius: 15 },
      });

      if (response.data.success) {
        setLibraries(response.data.libraries);
      }
    } catch (error) {
      setLocationError(
        "Failed to detect location. Please ensure your GPS is on.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRetryLocation = async () => {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status === "denied") {
      Alert.alert(
        "Permission Required",
        "Please enable location services in your phone settings to find nearby study rooms.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Open Settings", onPress: () => Linking.openSettings() },
        ],
      );
    } else {
      fetchLocationAndLibraries();
    }
  };

  const openFilterModal = () => {
    setTempFilters(appliedFilters);
    setIsFilterModalVisible(true);
  };

  const applyFilters = () => {
    setAppliedFilters(tempFilters);
    setIsFilterModalVisible(false);
  };

  // 📌 THE FIX: This now strictly resets ONLY the advanced modal filters
  const clearModalFilters = () => {
    setTempFilters(DEFAULT_FILTERS);
    setAppliedFilters(DEFAULT_FILTERS);
    setIsFilterModalVisible(false);
  };

  // 📌 THE FIX: This is a Master Reset for the Empty State button! It clears EVERYTHING.
  const clearAllFilters = () => {
    setTempFilters(DEFAULT_FILTERS);
    setAppliedFilters(DEFAULT_FILTERS);
    setActiveChip("All"); // Resets the Chips
    setSearchQuery(""); // Resets the Search Bar
  };

  const filteredLibraries = libraries.filter((lib) => {
    // 1. Text Search Filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const nameMatch = lib.name.toLowerCase().includes(query);
      const cityMatch = lib.city?.toLowerCase().includes(query);
      if (!nameMatch && !cityMatch) return false;
    }

    // 2. Chip Filter (Amenities)
    if (activeChip !== "All") {
      const searchKey = activeChip.toUpperCase().replace(" ", "_");
      const hasAmenity = lib.amenities?.some(
        (a) => a.toUpperCase() === searchKey,
      );
      if (!hasAmenity) return false;
    }

    // 3. Advanced Filters
    const price = parseFloat(lib.monthly_price || 0);
    const rating = parseFloat(lib.rating || 0);

    if (price > appliedFilters.maxPrice) return false;
    if (rating > 0 && rating < appliedFilters.minRating) return false;
    if (lib.distance_km > appliedFilters.maxDistance) return false;

    return true;
  });

  const FilterOption = ({ label, isSelected, onPress }) => (
    <TouchableOpacity
      onPress={onPress}
      className={`px-4 py-2.5 rounded-xl border mr-2 mb-3 ${
        isSelected
          ? "bg-textDark border-textDark"
          : "bg-white border-borderLight"
      }`}
    >
      <Text
        className={`font-m-bold ${isSelected ? "text-white" : "text-textDark"}`}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-background">
      <FlatList
        data={filteredLibraries}
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
            <ExploreHeader
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onFilterPress={openFilterModal}
            />
            <FilterChips
              activeFilter={activeChip}
              onSelectFilter={setActiveChip}
            />
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
              <View className="items-center bg-surface w-full p-8 rounded-[24px] border border-borderLight">
                <Text className="text-xl font-m-bold text-textDark mb-2">
                  Location Required
                </Text>
                <Button
                  title="Enable Location"
                  onPress={handleRetryLocation}
                  className="w-full"
                />
              </View>
            ) : (
              <View className="items-center bg-surface w-full px-8 rounded-[24px] border border-borderLight">
                <Text className="text-4xl my-4">📭</Text>
                <Text className="text-lg font-m-bold text-textDark mb-2">
                  No Libraries Found
                </Text>
                <Text className="text-textLight text-center font-m">
                  Try clearing your filters or expanding your search distance.
                </Text>

                {/* 📌 THE FIX: Uses the Master Reset (clearAllFilters) */}
                {(activeChip !== "All" ||
                  appliedFilters.maxPrice !== 5000 ||
                  appliedFilters.minRating !== 0 ||
                  appliedFilters.maxDistance !== 15 ||
                  searchQuery !== "") && (
                  <Button
                    title="Clear All Filters"
                    variant="outline"
                    onPress={clearAllFilters}
                    className="my-4 w-full"
                  />
                )}
              </View>
            )}
          </View>
        }
        renderItem={({ item }) => <LibraryCard library={item} />}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      />

      <Modal
        visible={isFilterModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsFilterModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-surface rounded-t-3xl p-6 pt-2 pb-16 shadow-lg mt-24">
            <View className="items-center mb-4">
              <View className="w-12 h-1.5 bg-gray-300 rounded-full mt-2 mb-4" />
              <View className="flex-row items-center w-full">
                <Text className="text-xl flex-1 font-m-bold text-textDark">
                  Filters
                </Text>
                <TouchableOpacity onPress={clearModalFilters}>
                  <Text className="text-brand font-m-bold underline mr-4">
                    Clear All
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setIsFilterModalVisible(false)}
                  className="p-1 bg-gray-100 rounded-full"
                >
                  <Ionicons name="close" size={20} color={COLORS.textDark} />
                </TouchableOpacity>
              </View>
            </View>

            <Text className="text-base font-m-bold text-textDark mb-3 mt-4">
              Max Monthly Price
            </Text>
            <View className="flex-row flex-wrap">
              {[500, 1000, 2000, 5000].map((price) => (
                <FilterOption
                  key={price}
                  label={price === 5000 ? "Any Price" : `Under ₹${price}`}
                  isSelected={tempFilters.maxPrice === price}
                  onPress={() =>
                    setTempFilters({ ...tempFilters, maxPrice: price })
                  }
                />
              ))}
            </View>

            <Text className="text-base font-m-bold text-textDark mb-3 mt-4">
              Minimum Rating
            </Text>
            <View className="flex-row flex-wrap">
              {[0, 3, 4, 4.5].map((rating) => (
                <FilterOption
                  key={rating}
                  label={rating === 0 ? "Any Rating" : `${rating} & above`}
                  isSelected={tempFilters.minRating === rating}
                  onPress={() =>
                    setTempFilters({ ...tempFilters, minRating: rating })
                  }
                />
              ))}
            </View>

            <Text className="text-base font-m-bold text-textDark mb-3 mt-4">
              Distance
            </Text>
            <View className="flex-row flex-wrap">
              {[2, 5, 10, 15].map((dist) => (
                <FilterOption
                  key={dist}
                  label={dist === 15 ? "Anywhere" : `Within ${dist} km`}
                  isSelected={tempFilters.maxDistance === dist}
                  onPress={() =>
                    setTempFilters({ ...tempFilters, maxDistance: dist })
                  }
                />
              ))}
            </View>

            <Button
              title={`Show Results`}
              variant="primary"
              className="w-full mt-8 py-4"
              onPress={applyFilters}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}
