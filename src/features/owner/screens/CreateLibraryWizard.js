import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { createLibraryProfile } from "@/features/owner/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location"; // 📌 NEW: Import Location
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function CreateLibraryWizard() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");

  // 📌 NEW: Geolocation State
  const [coords, setCoords] = useState({ latitude: null, longitude: null });

  // Amenities State
  const [amenities, setAmenities] = useState({
    ac: false,
    wifi: false,
    cctv: false,
    ro_water: false,
    parking: false,
  });

  const toggleAmenity = (key) => {
    setAmenities((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // 📌 NEW: Function to auto-fetch GPS coordinates
  const fetchCurrentLocation = async () => {
    setLocationLoading(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "We need location access to show your library on the student map.",
        );
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
    } catch (error) {
      Alert.alert("Error", "Could not fetch location. Please try again.");
    }
    setLocationLoading(false);
  };

  const handleNextStep = () => {
    if (!name.trim() || !city.trim() || !address.trim()) {
      return Alert.alert("Missing Info", "Please fill in all the details.");
    }
    if (!coords.latitude || !coords.longitude) {
      return Alert.alert(
        "Location Required",
        "Please detect your map location so students can find you.",
      );
    }
    setStep(2);
  };

  const handleFinalSubmit = async () => {
    setLoading(true);

    const { success, data, error } = await createLibraryProfile({
      name: name.trim(),
      city: city.trim(),
      address: address.trim(),
      latitude: coords.latitude, // 📌 Include in payload
      longitude: coords.longitude, // 📌 Include in payload
      amenities,
    });

    setLoading(false);

    if (success) {
      await AsyncStorage.setItem("libraryId", data.libraryId);
      Alert.alert(
        "Library Created!",
        "Welcome to LiBrowse. Let's add your seating capacity next.",
        [
          {
            text: "Let's Go",
            onPress: () => router.replace("/(owner)/manage-seats"),
          },
        ],
      );
    } else {
      Alert.alert("Setup Failed", error);
    }
  };

  return (
    <ScrollView className="flex-1 bg-background p-6">
      {/* Wizard Header */}
      <View className="mb-8 mt-10">
        <Text className="text-sm font-bold text-brand mb-2 uppercase tracking-wider">
          Step {step} of 2
        </Text>
        <Text className="text-3xl font-bold text-textDark mb-2">
          {step === 1 ? "Your Study Room" : "Amenities"}
        </Text>
        <Text className="text-base text-textLight">
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

          {/* 📌 NEW: Location Fetcher UI */}
          <View className="mt-4 p-4 rounded-xl border border-borderLight bg-surface">
            <Text className="font-bold text-textDark mb-2">Map Location</Text>
            {coords.latitude ? (
              <View className="flex-row items-center">
                <Text className="text-green-600 font-bold mr-2">
                  ✓ Location Captured
                </Text>
                <TouchableOpacity onPress={fetchCurrentLocation}>
                  <Text className="text-brand text-sm underline">Retake</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={fetchCurrentLocation}
                className="bg-brand/10 p-3 rounded-lg items-center flex-row justify-center"
              >
                {locationLoading ? (
                  <ActivityIndicator color="#C13383" size="small" />
                ) : (
                  <Text className="text-brand font-bold">
                    📍 Detect My Location
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>

          <Button title="Next" onPress={handleNextStep} className="mt-8" />
        </View>
      )}

      {/* --- STEP 2: Amenities Toggle --- */}
      {step === 2 && (
        <View>
          <View className="flex-row flex-wrap justify-between">
            {Object.keys(amenities).map((key) => (
              <TouchableOpacity
                key={key}
                onPress={() => toggleAmenity(key)}
                className={`w-[48%] p-4 rounded-xl border mb-4 items-center ${
                  amenities[key]
                    ? "border-brand bg-brand/10"
                    : "border-borderLight bg-surface"
                }`}
              >
                <Text
                  className={`font-bold capitalize ${amenities[key] ? "text-brand" : "text-textDark"}`}
                >
                  {key.replace("_", " ")}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View className="flex-row justify-between mt-8">
            <TouchableOpacity
              onPress={() => setStep(1)}
              className="p-4 flex-1 items-center bg-surface border border-borderLight rounded-xl mr-2"
            >
              <Text className="text-textDark font-bold">Back</Text>
            </TouchableOpacity>

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
  );
}
