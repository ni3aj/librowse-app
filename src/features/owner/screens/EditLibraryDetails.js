import apiClient from "@/api/client";
import Button from "@/components/ui/Button";
import Header from "@/components/ui/Header";
import Input from "@/components/ui/Input";
import { COLORS } from "@/constants/theme";
import { useLibraryStore } from "@/store/libraryStore";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";

export default function EditLibraryDetailsScreen() {
  // 📌 Removed `libraryStatus` from here to avoid stale global state issues
  const { libraryId, hasInventory, setLibraryStatus } = useLibraryStore();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveStatusText, setSaveStatusText] = useState("Save Changes");

  const [availableAmenities, setAvailableAmenities] = useState([]);

  // 📌 Added `status` to track the REAL status from the database
  const [formData, setFormData] = useState({
    name: "",
    city: "",
    address: "",
    amenities: [],
    photos: [],
    is_marketplace_visible: false,
    status: "UNVERIFIED",
  });

  const [localPhotos, setLocalPhotos] = useState([]);
  const loadedLibIdRef = useRef(null);

  useEffect(() => {
    const fetchAmenities = async () => {
      try {
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

  const fetchLibraryDetails = async () => {
    if (!libraryId) return;

    try {
      const res = await apiClient.get(`/owner/library/${libraryId}`);
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
          is_marketplace_visible: lib.is_marketplace_visible ?? false,
          status: lib.status || "UNVERIFIED", // 📌 Save the true database status here
        });
      }
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Could not load library details.",
      });
      router.back();
    }
  };

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const init = async () => {
        if (loadedLibIdRef.current !== libraryId) {
          setLoading(true);
          setFormData({
            name: "",
            city: "",
            address: "",
            amenities: [],
            photos: [],
            is_marketplace_visible: false,
            status: "UNVERIFIED",
          });
        }

        if (libraryId) {
          await fetchLibraryDetails();
        }

        if (isActive) {
          loadedLibIdRef.current = libraryId;
          setLocalPhotos([]);
          setLoading(false);
        }
      };

      init();

      return () => {
        isActive = false;
      };
    }, [libraryId]),
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchLibraryDetails();
    setRefreshing(false);
  };

  const toggleAmenity = (amenityId) => {
    setFormData((prev) => {
      const exists = prev.amenities.includes(amenityId);
      if (exists) {
        return {
          ...prev,
          amenities: prev.amenities.filter((a) => a !== amenityId),
        };
      } else {
        return { ...prev, amenities: [...prev.amenities, amenityId] };
      }
    });
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Toast.show({
        type: "error",
        text1: "Permission Denied",
        text2: "Sorry, we need camera roll permissions to upload photos.",
      });
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
      Toast.show({
        type: "error",
        text1: "Validation Error",
        text2: "Name, City, and Address are required.",
      });
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

      // 📌 THE FIX: Base the upgrade check strictly on the database's actual status (formData.status)
      const isUpgrading =
        formData.status === "UNVERIFIED" &&
        finalPhotoUrls.length > 0 &&
        hasInventory;

      const newStatus = isUpgrading
        ? "PENDING_ADMIN_APPROVAL"
        : formData.status;

      const payload = {
        ...formData,
        photos: finalPhotoUrls,
        status: newStatus,
      };

      const res = await apiClient.put(`/owner/library/${libraryId}`, payload);

      if (res.data.success) {
        if (isUpgrading) {
          setLibraryStatus(newStatus); // Safely update the global store only if we upgraded
        }

        Toast.show({
          type: "success",
          text1: "Success",
          text2: "Library details updated successfully!",
        });

        setLocalPhotos([]);
        router.back();
      }
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to save changes. Please try again.",
      });
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
        className="flex-1 px-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.brand}
            colors={[COLORS.brand]}
          />
        }
      >
        <View className="flex-row items-center justify-between bg-surface p-4 rounded-2xl border border-borderLight mb-6 mt-4">
          <View className="flex-1 pr-4">
            <Text className="text-base font-m-bold text-textDark">
              Show in Marketplace
            </Text>
            <Text className="text-sm font-m text-textLight mt-1 leading-5">
              Turn this off if you want to temporarily hide your library from
              new students.
            </Text>
          </View>
          <Switch
            trackColor={{ false: COLORS.borderLight, true: COLORS.brand }}
            thumbColor="#FFFFFF"
            ios_backgroundColor={COLORS.borderLight}
            onValueChange={(val) =>
              setFormData({ ...formData, is_marketplace_visible: val })
            }
            value={formData.is_marketplace_visible}
          />
        </View>

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

        <Text className="text-lg font-m-bold text-textDark mb-4 mt-4">
          Amenities
        </Text>
        <View className="flex-row flex-wrap justify-between mb-6">
          {availableAmenities.map((amenity) => {
            const isSelected = formData.amenities.includes(amenity.id);
            return (
              <TouchableOpacity
                key={amenity.id}
                onPress={() => toggleAmenity(amenity.id)}
                className={`w-[48%] p-3 rounded-2xl border mb-3 flex-row items-center ${
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
            disabled={saving}
            className="w-24 h-24 bg-surface border-2 border-dashed border-borderLight rounded-xl items-center justify-center mr-4"
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
