import apiClient from "@/api/client";
import Button from "@/components/ui/Button";
import Header from "@/components/ui/Header";
import Input from "@/components/ui/Input";
import { COLORS } from "@/constants/theme";
// 📌 1. Import your global store
import { useAuthStore } from "@/store/authStore";
import { useLibraryStore } from "@/store/libraryStore";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function EditLibraryDetailsScreen() {
  const [loading, setLoading] = useState(true);

  // Controls the button state and text during the save process
  const [saving, setSaving] = useState(false);
  const [saveStatusText, setSaveStatusText] = useState("Save Changes");

  // Form State (Data going to the DB)
  const [formData, setFormData] = useState({
    name: "",
    city: "",
    address: "",
    amenities: [],
    photos: [],
  });

  const [localPhotos, setLocalPhotos] = useState([]);

  useFocusEffect(
    useCallback(() => {
      fetchLibraryDetails();
      setLocalPhotos([]); // WIPE the local photos array clean on entry!
    }, []),
  );

  const fetchLibraryDetails = async () => {
    const { libraryId } = useAuthStore();
    try {
      setLoading(true);
      const res = await apiClient.get(`/owner/library/${storedLibId}`);
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
      const localUri = result.assets[0].uri;
      setLocalPhotos((prev) => [...prev, localUri]);
    }
  };

  const removeExistingPhoto = (indexToRemove) => {
    setFormData((prev) => ({
      ...prev,
      photos: prev.photos.filter((_, index) => index !== indexToRemove),
    }));
  };

  const removeLocalPhoto = (indexToRemove) => {
    setLocalPhotos((prev) =>
      prev.filter((_, index) => index !== indexToRemove),
    );
  };

  const uploadSinglePhotoToR2 = async (localUri) => {
    try {
      const urlRes = await apiClient.post("/owner/library/upload-url");
      if (!urlRes.data.success) throw new Error("Failed to get upload ticket");

      const { uploadUrl, publicUrl } = urlRes.data;

      const imageResponse = await fetch(localUri);
      const imageBlob = await imageResponse.blob();

      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        body: imageBlob,
        headers: { "Content-Type": "image/jpeg" },
      });

      if (!uploadRes.ok) throw new Error("Cloudflare rejected the upload");

      return publicUrl;
    } catch (error) {
      console.error("Upload error for URI:", localUri, error);
      throw error;
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.city || !formData.address) {
      Alert.alert("Validation Error", "Name, City, and Address are required.");
      return;
    }

    try {
      setSaving(true);

      let finalPhotoUrls = [...formData.photos];

      if (localPhotos.length > 0) {
        setSaveStatusText("Uploading Photos...");

        const newUploadedUrls = await Promise.all(
          localPhotos.map((uri) => uploadSinglePhotoToR2(uri)),
        );

        finalPhotoUrls = [...finalPhotoUrls, ...newUploadedUrls];
      }

      setSaveStatusText("Saving Details...");

      const inventoryFlag = await AsyncStorage.getItem("hasInventory");
      const hasSeats = inventoryFlag === "true"; // Evaluates to true only if they added seats

      // 📌 2. THE LOGIC FIX: They only graduate from UNVERIFIED if they have BOTH photos AND seats!
      const currentStatus = useLibraryStore.getState().libraryStatus;
      const isUpgrading =
        currentStatus === "UNVERIFIED" && finalPhotoUrls.length > 0 && hasSeats;
      const newStatus = isUpgrading ? "PENDING_ADMIN_APPROVAL" : currentStatus;

      // Prepare the final payload for the backend
      const payload = {
        ...formData,
        photos: finalPhotoUrls,
        status: newStatus, // 📌 3. Tell the database to officially upgrade the library!
      };
      const { libraryId } = useAuthStore();
      const res = await apiClient.put(`/owner/library/${libraryId}`, payload);

      if (res.data.success) {
        // 📌 4. Instantly update the Global Store so the Dashboard banner changes!
        useLibraryStore.getState().setLibraryStatus(newStatus);

        Alert.alert("Success", "Library details updated successfully!");
        setLocalPhotos([]);
        router.back();
      }
    } catch (error) {
      Alert.alert("Error", "Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
      setSaveStatusText("Save Changes");
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
      <Header title="Edit Library" />

      <ScrollView
        className="flex-1 p-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
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

        <Text className="text-lg font-m-bold text-textDark mb-4 ml-2 mt-6">
          Amenities
        </Text>
        <View className="flex-row flex-wrap gap-3 mb-6 ml-2">
          {["AC", "WIFI", "RO WATER", "CCTV"].map((item) => {
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

        <Text className="text-lg font-m-bold text-textDark mb-3 ml-2">
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
            disabled={saving}
            className="w-24 h-24 ml-2 bg-surface border-2 border-dashed border-borderLight rounded-xl items-center justify-center mr-4"
          >
            <Ionicons name="camera" size={28} color={COLORS.textLight} />
            <Text className="text-xs text-textLight mt-1 font-m-bold">Add</Text>
          </TouchableOpacity>

          {/* Render Existing Photos */}
          {formData.photos.map((photoUri, index) => (
            <View key={`existing-${index}`} className="w-24 h-24 mr-4 relative">
              <Image
                source={{ uri: photoUri }}
                className="w-full h-full rounded-xl bg-gray-200"
                resizeMode="cover"
              />
              <TouchableOpacity
                onPress={() => removeExistingPhoto(index)}
                className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1 border-2 border-white"
              >
                <Ionicons name="close" size={14} color="white" />
              </TouchableOpacity>
            </View>
          ))}

          {/* Render Local Photos */}
          {localPhotos.map((localUri, index) => (
            <View key={`local-${index}`} className="w-24 h-24 mr-4 relative">
              <Image
                source={{ uri: localUri }}
                className="w-full h-full rounded-xl bg-gray-200 opacity-80"
                resizeMode="cover"
              />
              <TouchableOpacity
                onPress={() => removeLocalPhoto(index)}
                className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1 border-2 border-white"
              >
                <Ionicons name="close" size={14} color="white" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      </ScrollView>

      <View className="p-6 pt-4 border-t border-borderLight bg-background pb-4">
        <Button
          title={saveStatusText}
          onPress={handleSave}
          loading={saving}
          disabled={
            saving || (formData.photos.length === 0 && localPhotos.length === 0)
          }
        />
      </View>
    </View>
  );
}
