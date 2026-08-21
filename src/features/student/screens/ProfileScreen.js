import apiClient from "@/api/client";
import Header from "@/components/ui/Header";
import { COLORS } from "@/constants/theme";
import { useAuthStore } from "@/store/authStore";
import { useLibraryStore } from "@/store/libraryStore";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";

// 📌 Upgraded ProfileMenuItem to support custom right-side badges and disabled states
const ProfileMenuItem = ({
  icon,
  title,
  subtitle,
  onPress,
  isDestructive = false,
  lastItem,
  disabled = false,
  rightElement,
}) => (
  <TouchableOpacity
    activeOpacity={disabled ? 1 : 0.7}
    onPress={disabled ? undefined : onPress}
    className={`flex-row items-center justify-between py-4 ${!lastItem && "border-b border-borderLight"}`}
  >
    <View className="flex-row items-center flex-1">
      <View
        className={`w-10 h-10 rounded-full items-center justify-center mr-4 ${
          isDestructive ? "bg-red-50" : "bg-surface border border-borderLight"
        }`}
      >
        <Ionicons
          name={icon}
          size={20}
          color={isDestructive ? "#EF4444" : COLORS.brand}
        />
      </View>
      <View className="flex-1 pr-4">
        <Text
          className={`text-base font-m-bold ${
            isDestructive ? "text-red-500" : "text-textDark"
          }`}
        >
          {title}
        </Text>
        {subtitle && (
          <Text
            className="text-sm font-m text-textLight mt-0.5"
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        )}
      </View>
    </View>
    {rightElement
      ? rightElement
      : !isDestructive && (
          <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} />
        )}
  </TouchableOpacity>
);

export default function StudentProfileScreen() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isPhotoViewerVisible, setIsPhotoViewerVisible] = useState(false);

  // 📌 Pull KYC flags alongside logout from AuthStore
  const { logout, is_kyc_verified, kyc_reference_id } = useAuthStore();
  const clearLibrary = useLibraryStore((state) => state.clearLibrary);

  // Derive KYC Status
  const kycStatus = is_kyc_verified
    ? "VERIFIED"
    : kyc_reference_id
      ? "PENDING"
      : "UNVERIFIED";

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const response = await apiClient.get("/student/profile");
      if (response.data.success) {
        setUser(response.data.user);
      }
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to load profile data.",
      });
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

      const response = await apiClient.patch(
        "/student/profile/photo",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );

      if (response.data.success) {
        setUser({ ...user, profile_photo: response.data.photo_url });
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
    Alert.alert("Logout", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: () => {
          try {
            logout();
            clearLibrary();
            router.replace("/");
          } catch (e) {
            console.error("Logout failed", e);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View className="flex-1 bg-background justify-center items-center">
        <ActivityIndicator size="large" color={COLORS.brand} />
      </View>
    );
  }

  const profilePhotoUrl =
    user?.profile_photo ||
    "https://ui-avatars.com/api/?name=" +
      (user?.full_name || "Student") +
      "&background=C13383&color=fff&size=256";

  return (
    <View className="flex-1 bg-background">
      <Header title="My Profile" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View className="items-center mb-6 px-6">
          <View className="relative">
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setIsPhotoViewerVisible(true)}
            >
              <Image
                source={{ uri: profilePhotoUrl }}
                className="w-28 h-28 rounded-full border-4 border-white bg-gray-100"
              />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.9}
              onPress={handlePickImage}
              disabled={isUploading}
              className="absolute bottom-0 right-0 bg-brand w-9 h-9 rounded-full items-center justify-center border-2 border-white"
            >
              {isUploading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="camera" size={16} color="#fff" />
              )}
            </TouchableOpacity>
          </View>

          <Text className="text-2xl font-m-extra text-textDark mt-4 text-center">
            {user?.full_name || "Student Name"}
          </Text>
          <View className="flex-row items-center mt-1">
            <Ionicons name="call" size={14} color={COLORS.textLight} />
            <Text className="text-base font-m text-textLight ml-1.5">
              +91 {user?.phone || "XXXXXXXXXX"}
            </Text>
          </View>
        </View>

        <View className="px-6">
          <Text className="text-xs font-m-bold text-textLight uppercase tracking-wider mb-2 ml-2">
            Account Settings
          </Text>
          <View className="bg-white rounded-3xl px-5 py-2 border border-borderLight mb-6">
            <ProfileMenuItem
              icon="person-outline"
              title="Edit Profile"
              subtitle="Update your email, address & city"
              onPress={() => router.push("/(student)/edit-profile")}
            />
            <ProfileMenuItem
              icon="lock-closed-outline"
              title="Change MPIN"
              subtitle="Update your security PIN"
              onPress={() => router.push("/auth/reset-mpin")}
              lastItem={false}
            />
            <ProfileMenuItem
              icon={
                kycStatus === "VERIFIED"
                  ? "shield-checkmark-outline"
                  : kycStatus === "PENDING"
                    ? "time-outline"
                    : "shield-half-outline"
              }
              title="KYC Verification"
              subtitle={
                kycStatus === "VERIFIED"
                  ? "KYC Verified"
                  : kycStatus === "PENDING"
                    ? "Under review by owner"
                    : "Pending"
              }
              onPress={() => router.push("/kyc")}
              disabled={kycStatus === "VERIFIED"}
              lastItem={true}
              rightElement={
                kycStatus === "VERIFIED" ? (
                  <View className="bg-emerald-100 px-2 py-1 rounded">
                    <Text className="text-[10px] font-m-bold text-emerald-700 uppercase tracking-wider">
                      Verified
                    </Text>
                  </View>
                ) : kycStatus === "PENDING" ? (
                  <View className="flex-row items-center">
                    <Text className="text-xs font-m-bold text-yellow-600 mr-1">
                      Pending
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color="#D97706"
                    />
                  </View>
                ) : (
                  <View className="flex-row items-center">
                    <Text className="text-xs font-m-bold text-brand mr-1">
                      Complete
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={COLORS.brand}
                    />
                  </View>
                )
              }
            />
          </View>

          <Text className="text-xs font-m-bold text-textLight uppercase tracking-wider mb-2 ml-2">
            About & Support
          </Text>
          <View className="bg-white rounded-3xl px-5 py-2 border border-borderLight mb-6">
            <ProfileMenuItem
              icon="information-circle-outline"
              title="About LiBrowse"
              subtitle="Version 1.0.0"
              onPress={() => router.push("/about")}
            />
            <ProfileMenuItem
              icon="help-buoy-outline"
              title="Help & Support"
              subtitle="Contact library owner or app admin"
              onPress={() => Linking.openURL("mailto:support@librowse.com")}
              lastItem={true}
            />
          </View>

          <View className="bg-white rounded-3xl px-5 py-1 border border-red-100 mb-6">
            <ProfileMenuItem
              icon="log-out-outline"
              title="Logout"
              isDestructive={true}
              onPress={handleLogout}
              lastItem={true}
            />
          </View>
        </View>
      </ScrollView>

      {/* --- FULL SCREEN PHOTO VIEWER MODAL --- */}
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
