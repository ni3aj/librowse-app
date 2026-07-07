import apiClient from "@/api/client";
import { COLORS } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams(); // Gets the dynamic ID from the URL
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserProfile();
  }, [id]);

  const fetchUserProfile = async () => {
    try {
      const response = await apiClient.get(`/user/${id}`); // Adjust prefix if needed
      if (response.data.success) {
        setUser(response.data.user);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to load user profile.");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-background justify-center items-center">
        <ActivityIndicator size="large" color={COLORS.brand} />
      </SafeAreaView>
    );
  }

  if (!user) return null;

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-center px-6 pt-4 pb-6">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Ionicons name="arrow-back" size={24} color={COLORS.textDark} />
        </TouchableOpacity>
        <Text className="text-2xl font-m-extra text-textDark">
          User Profile
        </Text>
      </View>

      <View className="px-6">
        {/* Profile Card */}
        <View className="bg-white p-6 rounded-3xl border border-borderLight items-center mt-4">
          {/* Avatar Placeholder */}
          <View className="w-24 h-24 bg-brand/10 rounded-full items-center justify-center mb-4">
            <Text className="text-4xl text-brand font-m-bold">
              {user.full_name?.charAt(0)?.toUpperCase()}
            </Text>
          </View>

          <Text className="text-2xl font-m-bold text-textDark mb-1">
            {user.full_name}
          </Text>
          <Text className="text-textLight font-m-med mb-6 capitalize">
            {user.role.toLowerCase()}
          </Text>

          {/* Details List */}
          <View className="w-full bg-background/50 rounded-2xl p-4 border border-borderLight/50">
            <View className="flex-row items-center mb-4">
              <View className="w-10 h-10 bg-white rounded-full items-center justify-center mr-3">
                <Ionicons name="call" size={18} color={COLORS.brand} />
              </View>
              <View>
                <Text className="text-xs text-textLight font-m">
                  Phone Number
                </Text>
                <Text className="text-base text-textDark font-m-bold">
                  {user.phone || "Not provided"}
                </Text>
              </View>
            </View>

            <View className="flex-row items-center">
              <View className="w-10 h-10 bg-white rounded-full items-center justify-center mr-3">
                <Ionicons name="calendar" size={18} color={COLORS.brand} />
              </View>
              <View>
                <Text className="text-xs text-textLight font-m">
                  Member Since
                </Text>
                <Text className="text-base text-textDark font-m-bold">
                  {new Date(user.created_at).toLocaleDateString("en-IN", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
