import apiClient from "@/api/client"; // 📌 1. Imported apiClient
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { COLORS } from "@/constants/theme";
import { createLibraryProfile } from "@/features/owner/api";
import { useLibraryStore } from "@/store/libraryStore";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { router } from "expo-router";
import { useEffect, useState } from "react"; // 📌 2. Imported useEffect
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import Toast from "react-native-toast-message";

export default function CreateLibraryWizard() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);

  // 📌 3. State for fetched amenities
  const [availableAmenities, setAvailableAmenities] = useState([]);

  // Map Modal State
  const [showMap, setShowMap] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");

  // Geolocation State
  const [coords, setCoords] = useState({ latitude: null, longitude: null });
  const [selectedAmenities, setSelectedAmenities] = useState([]);

  // 📌 4. Fetch Amenities on Mount
  useEffect(() => {
    const fetchAmenities = async () => {
      try {
        // Adjust this endpoint to match where you put the route in Fastify
        const response = await apiClient.get("/shared/amenities");
        if (response.data.success) {
          setAvailableAmenities(response.data.amenities);
        }
      } catch (error) {
        console.log("Failed to fetch amenities", error);
      }
    };
    fetchAmenities();
  }, []);

  // 📌 5. Toggle by ID instead of string name
  const toggleAmenity = (amenityId) => {
    setSelectedAmenities((prev) =>
      prev.includes(amenityId)
        ? prev.filter((id) => id !== amenityId)
        : [...prev, amenityId],
    );
  };

  const fetchCurrentLocation = async () => {
    setLocationLoading(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Toast.show({
          type: "error",
          text1: "Permission Denied",
          text2:
            "We need location access to show your library on the student map.",
        });
        setLocationLoading(false);
        return;
      }

      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setCoords({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      Toast.show({
        type: "success",
        text1: "Success",
        text2: "GPS Location found!",
      });
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Could not fetch location. Please try again.",
      });
    }
    setLocationLoading(false);
  };

  const handleNextStep = () => {
    if (!name.trim() || !city.trim() || !address.trim()) {
      return Toast.show({
        type: "info",
        text1: "Missing Info",
        text2: "Please fill in all the details.",
      });
    }
    if (!coords.latitude || !coords.longitude) {
      return Toast.show({
        type: "info",
        text1: "Location Required",
        text2:
          "Please detect or pick your map location so students can find you.",
      });
    }
    setStep(2);
  };

  const handleFinalSubmit = async () => {
    setLoading(true);

    const { success, data, error } = await createLibraryProfile({
      name: name.trim(),
      city: city.trim(),
      address: address.trim(),
      latitude: coords.latitude,
      longitude: coords.longitude,
      amenities: selectedAmenities, // Array of IDs like ["AC", "WIFI"]
    });

    setLoading(false);

    if (success) {
      useLibraryStore.setState({ libraryId: data.libraryId });
      Toast.show({
        type: "success",
        text1: "Library Created",
        text2: "Welcome to LiBrowse. Let's add your seating capacity next.",
      });
      router.replace("/(owner)/manage-seats");
    } else {
      Toast.show({ type: "error", text1: "Setup Failed", text2: error });
    }
  };

  return (
    <View className="flex-1 bg-background">
      <ScrollView className="flex-1 p-6">
        {/* Wizard Header */}
        <View className="mb-8 mt-10">
          <Text className="text-sm font-m-bold text-brand mb-2 uppercase tracking-wider">
            Step {step} of 2
          </Text>
          <Text className="text-3xl font-m-bold text-textDark mb-2">
            {step === 1 ? "Create New Library" : "Amenities"}
          </Text>
          <Text className="text-base font-m text-textLight">
            {step === 1
              ? "Where are you located?"
              : "What facilities do you offer?"}
          </Text>
        </View>

        {/* --- STEP 1: Basic Info --- */}
        {step === 1 && (
          <View className="space-y-4">
            <Input
              label="Library Name"
              placeholder="e.g. Focus Study Library"
              value={name}
              onChangeText={setName}
            />
            <Input
              label="City"
              placeholder="e.g. Pune"
              value={city}
              onChangeText={setCity}
            />
            <Input
              label="Full Address"
              placeholder="e.g. 2nd Floor, ABC Complex"
              value={address}
              onChangeText={setAddress}
            />

            {/* Location Fetcher UI */}
            <View className="mt-4 p-4 rounded-2xl border border-borderLight bg-surface">
              <Text className="font-m-bold text-textDark mb-4">
                Location on Map
              </Text>

              {coords.latitude ? (
                <View className="flex-row items-center justify-between bg-green-50 border border-green-200 p-3 rounded-xl mb-4">
                  <View className="flex-row items-center">
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color="#10B981"
                    />
                    <Text className="text-green-700 font-m-bold ml-2">
                      Location Saved
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setShowMap(true)}>
                    <Text className="text-brand font-m-bold text-sm underline">
                      Adjust Pin
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              <View className="flex-row gap-2">
                <TouchableOpacity
                  onPress={fetchCurrentLocation}
                  className="flex-1 bg-brand/10 py-3 px-2 rounded-xl items-center flex-row justify-center border border-brand/20"
                >
                  {locationLoading ? (
                    <ActivityIndicator color={COLORS.brand} size="small" />
                  ) : (
                    <>
                      <Ionicons name="locate" size={16} color={COLORS.brand} />
                      <Text className="text-brand font-m-bold ml-1.5 text-xs">
                        Current Location
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setShowMap(true)}
                  className="flex-1 bg-indigo-50 py-3 px-2 rounded-xl items-center flex-row justify-center border border-indigo-100"
                >
                  <Ionicons name="map" size={16} color="#4F46E5" />
                  <Text className="text-indigo-600 font-m-bold ml-1.5 text-xs">
                    Pick on Map
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <Button title="Next" onPress={handleNextStep} className="mt-8" />
          </View>
        )}

        {/* --- STEP 2: Amenities Toggle --- */}
        {step === 2 && (
          <View>
            <View className="flex-row flex-wrap justify-between">
              {/* 📌 6. Render dynamically from fetched data */}
              {availableAmenities.map((amenity) => {
                const isSelected = selectedAmenities.includes(amenity.id);
                return (
                  <TouchableOpacity
                    key={amenity.id}
                    onPress={() => toggleAmenity(amenity.id)}
                    className={`w-[48%] p-3 rounded-2xl border mb-4 flex-row items-center ${
                      isSelected
                        ? "border-brand bg-brand/10"
                        : "border-borderLight bg-surface"
                    }`}
                  >
                    <Ionicons
                      name={amenity.icon}
                      size={20}
                      color={isSelected ? COLORS.brand : COLORS.textLight}
                      style={{ marginRight: 8 }}
                    />
                    <Text
                      className={`font-m-bold flex-1 text-sm ${
                        isSelected ? "text-brand" : "text-textDark"
                      }`}
                    >
                      {amenity.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View className="flex-row justify-between mt-4">
              <Button
                title="Back"
                variant="outline"
                onPress={() => setStep(1)}
              />

              <View className="flex-[2] ml-2">
                <Button
                  title="Finish Setup"
                  onPress={handleFinalSubmit}
                  loading={loading}
                />
              </View>
            </View>
          </View>
        )}

        <View className="h-10" />
      </ScrollView>

      {/* 📌 MAP PICKER MODAL */}
      <Modal
        visible={showMap}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View className="flex-1 bg-background">
          <View className="pt-12 pb-4 px-6 flex-row justify-between items-center bg-surface z-10 shadow-sm">
            <Text className="text-xl font-m-bold text-textDark">
              Place Library Pin
            </Text>
            <TouchableOpacity
              onPress={() => setShowMap(false)}
              className="bg-gray-100 p-2 rounded-full"
            >
              <Ionicons name="close" size={20} color={COLORS.textDark} />
            </TouchableOpacity>
          </View>

          <View className="bg-blue-50 px-6 py-3 flex-row items-center border-b border-blue-100">
            <Ionicons name="information-circle" size={20} color="#2563EB" />
            <Text className="text-blue-800 font-m text-xs ml-2 flex-1">
              Tap anywhere on the map to drop the pin. You can also drag the pin
              for exact placement.
            </Text>
          </View>

          <MapView
            style={{ flex: 1 }}
            showsUserLocation={true}
            initialRegion={{
              latitude: coords.latitude || 20.5937,
              longitude: coords.longitude || 78.9629,
              latitudeDelta: coords.latitude ? 0.005 : 15,
              longitudeDelta: coords.longitude ? 0.005 : 15,
            }}
            onPress={(e) => setCoords(e.nativeEvent.coordinate)}
          >
            {coords.latitude && (
              <Marker
                coordinate={coords}
                draggable
                onDragEnd={(e) => setCoords(e.nativeEvent.coordinate)}
              />
            )}
          </MapView>

          <View className="p-6 bg-surface pb-10 border-t border-borderLight">
            <Button
              title="Confirm Location"
              onPress={() => setShowMap(false)}
              disabled={!coords.latitude}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}
