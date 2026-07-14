// app/profile/library/[id]/edit.js

import apiClient from "@/api/client";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { COLORS } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// Using Expo ImagePicker for photos
// import * as ImagePicker from "expo-image-picker";

export default function EditLibraryDetailsScreen() {
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    city: "",
    address: "",
    amenities: [],
    photos: [], // Array of image URLs/URIs
  });

  useEffect(() => {
    fetchLibraryDetails();
  }, [id]);

  const fetchLibraryDetails = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/owner/library/${id}`);
      if (res.data.success) {
        const lib = res.data.library;
        setFormData({
          name: lib.name || "",
          city: lib.city || "",
          address: lib.address || "",
          amenities:
            typeof lib.amenities === "string"
              ? JSON.parse(lib.amenities)
              : lib.amenities || [],
          photos: lib.photos || [],
        });
      }
    } catch (error) {
      Alert.alert("Error", "Could not load library details.");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const toggleAmenity = (amenity) => {
    setFormData((prev) => {
      const exists = prev.amenities.includes(amenity);
      if (exists) {
        return {
          ...prev,
          amenities: prev.amenities.filter((a) => a !== amenity),
        };
      } else {
        return { ...prev, amenities: [...prev.amenities, amenity] };
      }
    });
  };

  const pickImage = async () => {
    // Request permission first
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Denied",
        "Sorry, we need camera roll permissions to upload photos.",
      );
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      // In a real production app, you would upload this URI to AWS S3 / Cloudinary here
      // and then save the returned cloud URL to the state.
      // For now, we'll store the local URI to show in the UI.
      const newUri = result.assets[0].uri;
      setFormData((prev) => ({ ...prev, photos: [...prev.photos, newUri] }));
    }
  };

  const removePhoto = (indexToRemove) => {
    setFormData((prev) => ({
      ...prev,
      photos: prev.photos.filter((_, index) => index !== indexToRemove),
    }));
  };

  const handleSave = async () => {
    if (!formData.name || !formData.city || !formData.address) {
      Alert.alert("Validation Error", "Name, City, and Address are required.");
      return;
    }

    try {
      setSaving(true);
      const res = await apiClient.put(`/owner/library/${id}`, formData);
      if (res.data.success) {
        Alert.alert("Success", "Library details updated successfully!");
        router.back(); // Goes back to the profile screen, which will auto-refresh via useFocusEffect!
      }
    } catch (error) {
      Alert.alert("Error", "Failed to update library details.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-background justify-center items-center">
        <ActivityIndicator size="large" color={COLORS.brand} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      {/* Simple Header */}
      <View className="pt-14 pb-4 px-6 flex-row items-center border-b border-borderLight bg-surface">
        <TouchableOpacity onPress={() => router.back()} className="mr-4 p-1">
          <Ionicons name="arrow-back" size={24} color={COLORS.textDark} />
        </TouchableOpacity>
        <Text className="text-xl font-m-bold text-textDark">
          Edit Library Details
        </Text>
      </View>

      <ScrollView
        className="flex-1 p-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Basic Info */}
        <Text className="text-lg font-m-bold text-textDark mb-4">
          Basic Information
        </Text>
        <Input
          label="Library Name"
          value={formData.name}
          onChangeText={(text) => setFormData({ ...formData, name: text })}
          placeholder="e.g. Focus Study Room"
        />
        <Input
          label="City"
          value={formData.city}
          onChangeText={(text) => setFormData({ ...formData, city: text })}
          placeholder="e.g. Pune"
        />
        <Input
          label="Full Address"
          value={formData.address}
          onChangeText={(text) => setFormData({ ...formData, address: text })}
          placeholder="Street, Landmark, Pincode"
          multiline
        />

        {/* Amenities Selection */}
        <Text className="text-lg font-m-bold text-textDark mt-6 mb-3">
          Amenities
        </Text>
        <View className="flex-row flex-wrap gap-3 mb-6">
          {["AC", "NON_AC", "WIFI", "RO_WATER"].map((item) => {
            const isSelected = formData.amenities.includes(item);
            return (
              <TouchableOpacity
                key={item}
                onPress={() => toggleAmenity(item)}
                className={`px-4 py-2 rounded-full border ${
                  isSelected
                    ? "bg-brand border-brand"
                    : "bg-surface border-borderLight"
                }`}
              >
                <Text
                  className={`font-m-bold text-sm ${isSelected ? "text-white" : "text-textLight"}`}
                >
                  {item.replace("_", " ")}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Photos Section */}
        <Text className="text-lg font-m-bold text-textDark mb-3">
          Library Photos
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-8"
        >
          {/* Add Photo Button */}
          <TouchableOpacity
            onPress={pickImage}
            className="w-24 h-24 bg-surface border-2 border-dashed border-borderLight rounded-xl items-center justify-center mr-4"
          >
            <Ionicons name="camera" size={28} color={COLORS.textLight} />
            <Text className="text-xs text-textLight mt-1 font-m-bold">Add</Text>
          </TouchableOpacity>

          {/* Render Existing/Selected Photos */}
          {formData.photos.map((photoUri, index) => (
            <View key={index} className="w-24 h-24 mr-4 relative">
              <Image
                source={{ uri: photoUri }}
                className="w-full h-full rounded-xl"
                resizeMode="cover"
              />
              <TouchableOpacity
                onPress={() => removePhoto(index)}
                className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1 border-2 border-white"
              >
                <Ionicons name="close" size={14} color="white" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      </ScrollView>

      {/* Fixed Bottom Save Button */}
      <View className="p-6 pt-2 border-t border-borderLight bg-background pb-8">
        <Button
          title="Save Changes"
          onPress={handleSave}
          loading={saving}
          disabled={saving}
        />
      </View>
    </View>
  );
}
