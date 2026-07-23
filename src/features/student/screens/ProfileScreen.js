import { COLORS } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
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
// import { useAuth } from "@/context/AuthContext"; // Import your auth context/store here
import apiClient from "@/api/client"; // Your configured axios instance
import Header from "@/components/ui/Header";
import { useAuthStore } from "@/store/authStore";
import { useLibraryStore } from "@/store/libraryStore";
import AsyncStorage from "@react-native-async-storage/async-storage";

// 📌 REUSABLE COMPONENT: Keeps the menu list clean and consistent
const ProfileMenuItem = ({
  icon,
  title,
  subtitle,
  onPress,
  isDestructive = false,
  lastItem,
}) => (
  <TouchableOpacity
    activeOpacity={0.7}
    onPress={onPress}
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
    {!isDestructive && (
      <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} />
    )}
  </TouchableOpacity>
);

export default function StudentProfileScreen() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isPhotoViewerVisible, setIsPhotoViewerVisible] = useState(false);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const clearLibrary = useLibraryStore((state) => state.clearLibrary);

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
      Alert.alert("Error", "Failed to load profile data.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await AsyncStorage.clear();
          clearAuth();
          clearLibrary();
          router.replace("/");
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

  // Safe fallbacks for data
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
        {/* --- TOP SECTION: AVATAR & BASIC INFO --- */}
        <View className="items-center mt-8 mb-6 px-6">
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setIsPhotoViewerVisible(true)}
            className="relative"
          >
            <Image
              source={{ uri: profilePhotoUrl }}
              className="w-28 h-28 rounded-full border-4 border-white bg-gray-100"
            />
            {/* Tiny edit badge on the avatar */}
            <View className="absolute bottom-0 right-0 bg-brand w-8 h-8 rounded-full items-center justify-center border-2 border-white">
              <Ionicons name="camera" size={14} color="#fff" />
            </View>
          </TouchableOpacity>

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

        {/* --- MENU CARDS --- */}
        <View className="px-6">
          {/* Card 1: Account Settings */}
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
              onPress={() => router.push("/reset-mpin")} // 📌 Plugs into your existing route
            />
            <ProfileMenuItem
              icon="shield-checkmark-outline"
              title="KYC Status"
              subtitle={
                user?.is_kyc_verified ? "Verified" : "Pending Verification"
              }
              onPress={() =>
                Alert.alert("KYC", "Your KYC details are securely stored.")
              }
              lastItem={true}
            />
          </View>

          {/* Card 2: App Preferences */}
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

          {/* Card 3: Danger Zone */}
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
            {/* Empty view to balance flex layout */}
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
