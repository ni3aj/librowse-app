import apiClient from "@/api/client";
import Button from "@/components/ui/Button"; // Adjust path
import Header from "@/components/ui/Header";
import { COLORS } from "@/constants/theme"; // Adjust path
import { useAuthStore } from "@/store/authStore";
import { useLibraryStore } from "@/store/libraryStore";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage"; // 📌 Added missing import for logout
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function OwnerProfileScreen() {
  const [owner, setOwner] = useState(null);
  const [libraries, setLibraries] = useState([]);
  const [loading, setLoading] = useState(true);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const clearLibrary = useLibraryStore((state) => state.clearLibrary);

  // 📌 useFocusEffect triggers every time the user lands on this screen.
  // This ensures if they edit their name or add a library, it updates immediately!
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

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try {
            await AsyncStorage.clear();
            clearAuth();
            clearLibrary();
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

  return (
    <ScrollView className="flex-1 bg-background">
      {/* HEADER */}
      <Header title="Profile" />

      <View className="px-6 pt-6 pb-12">
        {/* SECTION 1: OWNER DETAILS */}
        <View className="mb-8">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-lg font-m-bold text-textDark ml-1">
              Personal Info
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/profile/edit-owner")}
            >
              <Text className="text-brand font-m-bold mr-4">Edit</Text>
            </TouchableOpacity>
          </View>

          <View className="bg-surface p-5 rounded-2xl border border-borderLight">
            <View className="flex-row items-center">
              <View className="w-12 h-12 rounded-full bg-brand/10 items-center justify-center mr-4">
                <Text className="text-xl font-m-bold text-brand">
                  {owner.full_name.charAt(0)}
                </Text>
              </View>
              <View>
                <Text className="text-base font-m-bold text-textDark">
                  {owner.full_name}
                </Text>
                <Text className="text-sm text-textLight">
                  +91 {owner.phone}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* SECTION 2: MY LIBRARIES */}
        <View className="mb-4">
          <View className="flex-row justify-between items-center mb-4 ml-1">
            <Text className="text-lg font-m-bold text-textDark">
              My Libraries
            </Text>
            {/* 📌 Hide the small "+ Add New" button if there are NO libraries, because we show the big card instead */}
            {libraries.length > 0 && libraries.length < 3 && (
              <TouchableOpacity
                onPress={() => router.push("/(owner)/create-library-wizard")}
              >
                <Text className="text-brand font-m-bold mr-3">+ Add New</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* 📌 THE FIX: Handle Empty State */}
          {libraries.length === 0 ? (
            <View className="bg-surface p-6 rounded-3xl border border-borderLight items-center mb-4">
              <View className="bg-brand/10 h-16 w-16 rounded-full items-center justify-center mb-4">
                <Text className="text-3xl">🏢</Text>
              </View>
              <Text className="text-xl font-m-bold text-textDark text-center mb-2">
                No Library Added Yet
              </Text>
              <Text className="text-textLight text-center font-m mb-6 leading-5 px-2">
                You haven't set up a library profile. Create one to start
                managing seats and students!
              </Text>
              <Button
                title="Add a Library"
                variant="primary"
                onPress={() => router.push("/(owner)/create-library-wizard")}
                className="w-full"
              />
            </View>
          ) : (
            /* 📌 Existing map logic runs ONLY if libraries exist */
            libraries.map((lib) => (
              <View
                key={lib.id}
                className="bg-surface p-5 rounded-2xl border border-borderLight mb-3"
              >
                <View className="flex-row justify-between items-start mb-3">
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
                    className="flex-1 bg-background py-2 rounded-xl border border-borderLight items-center mr-2"
                    onPress={() => router.push(`/edit-library`)}
                  >
                    <Text className="text-textDark font-m-bold text-sm">
                      Edit Details
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="flex-1 bg-background py-2 rounded-xl border border-borderLight items-center"
                    onPress={() => router.push(`/manage-seats`)}
                  >
                    <Text className="text-textDark font-m-bold text-sm">
                      Manage Seats
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
          className="text-brandAccent bg-transparent"
        />
      </View>
    </ScrollView>
  );
}
