import apiClient from "@/api/client";
import Button from "@/components/ui/Button";
import Header from "@/components/ui/Header";
import { COLORS } from "@/constants/theme";
import { useAuthStore } from "@/store/authStore";
import { useLibraryStore } from "@/store/libraryStore";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";

export default function OwnerProfileScreen() {
  const [owner, setOwner] = useState(null);
  const [libraries, setLibraries] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isUploading, setIsUploading] = useState(false);
  const [isPhotoViewerVisible, setIsPhotoViewerVisible] = useState(false);

  const { logout } = useAuthStore();
  const clearLibrary = useLibraryStore((state) => state.clearLibrary);

  useFocusEffect(
    useCallback(() => {
      fetchProfileData();
    }, []),
  );

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get("/owner/profile");
      if (res.data.success) {
        setOwner(res.data.owner);
        setLibraries(res.data.libraries);
      }
    } catch (error) {
      console.log("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePickImage = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Toast.show({
        type: "error",
        text1: "Permission Required",
        text2: "Please allow access to your photos.",
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      uploadPhoto(result.assets[0].uri);
    }
  };

  const uploadPhoto = async (uri) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      const filename = uri.split("/").pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpeg`;

      formData.append("photo", { uri, name: filename, type });

      const response = await apiClient.patch("/owner/profile/photo", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.data.success) {
        setOwner({ ...owner, profile_photo: response.data.photo_url });
        Toast.show({
          type: "success",
          text1: "Success",
          text2: "Profile photo updated!",
        });
      }
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Upload Failed",
        text2: error.response?.data?.error || "Could not upload photo.",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: () => {
          try {
            logout();
            if (clearLibrary) clearLibrary();
            router.replace("/");
          } catch (e) {
            console.error("Logout failed", e);
          }
        },
      },
    ]);
  };

  if (loading || !owner) {
    return (
      <View className="flex-1 bg-background justify-center items-center">
        <ActivityIndicator size="large" color={COLORS.brand} />
      </View>
    );
  }

  const profilePhotoUrl =
    owner?.profile_photo ||
    "https://ui-avatars.com/api/?name=" +
      (owner?.full_name || "Owner") +
      "&background=C13383&color=fff&size=256";

  return (
    <View className="flex-1 bg-background">
      {/* HEADER */}
      <Header title="Profile" />

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* 📌 SECTION 1: CENTERED OWNER DETAILS WITH PHOTO UPLOAD */}
        <View className="items-center mb-8 px-6">
          <View className="relative">
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setIsPhotoViewerVisible(true)}
            >
              <Image
                source={{ uri: profilePhotoUrl }}
                className="w-28 h-28 rounded-full border-4 border-white bg-gray-100 shadow-sm"
              />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.9}
              onPress={handlePickImage}
              disabled={isUploading}
              className="absolute bottom-0 right-0 bg-brand w-9 h-9 rounded-full items-center justify-center border-2 border-white shadow-sm"
            >
              {isUploading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="camera" size={16} color="#fff" />
              )}
            </TouchableOpacity>
          </View>

          <Text className="text-2xl font-m-extra text-textDark mt-4 text-center">
            {owner?.full_name || "Business Owner"}
          </Text>
          <View className="flex-row items-center mt-1">
            <Ionicons name="call" size={14} color={COLORS.textLight} />
            <Text className="text-base font-m text-textLight ml-1.5">
              +91 {owner?.phone || "XXXXXXXXXX"}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => router.push("/edit-profile")}
            className="mt-3 bg-brand/10 px-5 py-2 rounded-full border border-brand/20"
          >
            <Text className="text-brand font-m-bold text-xs uppercase tracking-wider">
              Edit Personal Details
            </Text>
          </TouchableOpacity>
        </View>

        <View className="px-6 pb-12">
          {/* SECTION 2: MY LIBRARIES */}
          <View className="mb-4">
            <View className="flex-row justify-between items-center mb-4 ml-1">
              <Text className="text-lg font-m-bold text-textDark">
                My Libraries
              </Text>
              {libraries.length > 0 && libraries.length < 3 && (
                <TouchableOpacity
                  onPress={() => router.push("/(owner)/create-library-wizard")}
                >
                  <Text className="text-brand font-m-bold mr-3">+ Add New</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* EMPTY STATE */}
            {libraries.length === 0 ? (
              <View className="bg-surface p-6 rounded-3xl border border-borderLight items-center mb-4">
                <View className="bg-brand/10 h-16 w-16 rounded-full items-center justify-center mb-4">
                  <Text className="text-3xl">🏢</Text>
                </View>
                <Text className="text-xl font-m-bold text-textDark text-center mb-2">
                  No Library Created Yet
                </Text>
                <Text className="text-textLight text-center font-m mb-6 leading-5 px-2">
                  You haven't created any libraries to your account yet. Let's
                  get started!
                </Text>
                <Button
                  title="Create New Library"
                  variant="primary"
                  onPress={() => router.push("/(owner)/create-library-wizard")}
                  className="w-full"
                />
              </View>
            ) : (
              /* MAP LIBRARIES */
              libraries.map((lib) => (
                <View
                  key={lib.id}
                  className="bg-surface p-2 rounded-2xl border border-borderLight mb-3"
                >
                  <View className="flex-row justify-between items-start p-2">
                    <View>
                      <Text className="text-base font-m-bold text-textDark">
                        {lib.name}
                      </Text>
                      <Text className="text-sm text-textLight">{lib.city}</Text>
                    </View>
                    <View
                      className={`px-2 py-1 rounded-md ${lib.status === "VERIFIED" ? "bg-green-100" : "bg-orange-100"}`}
                    >
                      <Text
                        className={`text-xs font-bold ${lib.status === "VERIFIED" ? "text-green-700" : "text-orange-700"}`}
                      >
                        {lib.status === "VERIFIED" ? "Active" : "Pending"}
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row space-x-3 mt-2">
                    <TouchableOpacity
                      className="flex-1 bg-background py-2.5 rounded-xl border border-borderLight items-center mr-1"
                      onPress={() => {
                        useLibraryStore.setState({ libraryId: lib.id });
                        router.push(`/edit-library`);
                      }}
                    >
                      <Text className="text-textDark font-m-bold text-xs">
                        Edit Details
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="flex-1 bg-background py-2.5 px-2 rounded-xl border border-borderLight items-center mr-1"
                      onPress={() => {
                        useLibraryStore.setState({ libraryId: lib.id });
                        router.push("/manage-seats");
                      }}
                    >
                      <Text className="text-textDark font-m-bold text-xs">
                        Manage Seats
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="flex-1 bg-background py-2.5 rounded-xl border border-borderLight items-center"
                      onPress={() => {
                        useLibraryStore.setState({ libraryId: lib.id });
                        router.push(`/reviews`);
                      }}
                    >
                      <Text className="text-textDark font-m-bold text-xs">
                        Reviews
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>

          {/* SECTION 3: BILLING & SETTINGS */}
          <View className="mb-8 space-y-3">
            <Text className="text-lg font-m-bold text-textDark mb-4 ml-1">
              App & Billing
            </Text>
            {/* <TouchableOpacity
              className="bg-surface p-4 mb-2 rounded-2xl border border-borderLight flex-row items-center justify-between"
              onPress={() => router.push("/link-bank")}
            >
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-full bg-brand/10 items-center justify-center mr-3">
                  <Ionicons name="logo-usd" size={20} color={COLORS.brand} />
                </View>
                <Text className="text-base font-m-bold text-textDark">
                  Start Receiving Payments
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={COLORS.textLight}
              />
            </TouchableOpacity> */}

            {libraries?.length > 0 && (
              <TouchableOpacity
                className="bg-surface p-4 rounded-2xl border border-borderLight flex-row items-center justify-between mb-2"
                onPress={() => router.push("/billing")}
              >
                <View className="flex-row items-center">
                  <View className="w-10 h-10 rounded-full bg-brand/10 items-center justify-center mr-3">
                    <Ionicons name="card" size={20} color={COLORS.brand} />
                  </View>
                  <Text className="text-base font-m-bold text-textDark">
                    Platform Subscription
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={COLORS.textLight}
                />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              className="bg-surface p-4 rounded-2xl border border-borderLight flex-row items-center justify-between"
              onPress={() => router.push("/auth/reset-mpin")}
            >
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-full bg-brand/10 items-center justify-center mr-3">
                  <Ionicons name="lock-closed" size={20} color={COLORS.brand} />
                </View>
                <Text className="text-base font-m-bold text-textDark">
                  Change MPIN
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={COLORS.textLight}
              />
            </TouchableOpacity>
          </View>

          {/* LOGOUT BUTTON */}
          <Button
            title="Logout"
            variant="primary"
            onPress={handleLogout}
            className="text-brandAccent bg-transparent border border-red-100"
          />
        </View>
      </ScrollView>

      {/* --- 📌 FULL SCREEN PHOTO VIEWER MODAL --- */}
      <Modal
        visible={isPhotoViewerVisible}
        transparent={false}
        animationType="fade"
        onRequestClose={() => setIsPhotoViewerVisible(false)}
      >
        <View className="flex-1 bg-black justify-center items-center">
          <View className="absolute top-12 left-0 right-0 z-10 flex-row justify-between items-center px-6">
            <View className="w-10" />
            <Text className="text-white font-m-bold text-lg">
              Profile Photo
            </Text>
            <TouchableOpacity
              onPress={() => setIsPhotoViewerVisible(false)}
              className="p-2 bg-white/20 rounded-full"
            >
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <Image
            source={{ uri: profilePhotoUrl }}
            style={{ width: "100%", height: "70%" }}
            resizeMode="contain"
          />
        </View>
      </Modal>
    </View>
  );
}
