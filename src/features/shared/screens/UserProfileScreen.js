import apiClient from "@/api/client";
import { COLORS } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams(); // Captures libraryId if passed by Owner
  const [user, setUser] = useState(null);
  const [enrollment, setEnrollment] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserProfile();
  }, [id]);

  const fetchUserProfile = async () => {
    try {
      const storedLibraryId = await AsyncStorage.getItem("libraryId");
      const endpoint = `/user/${id}${storedLibraryId ? `?libraryId=${storedLibraryId}` : ""}`;
      const response = await apiClient.get(endpoint);
      if (response.data.success) {
        setUser(response.data.user);
        setEnrollment(response.data.enrollment);
        setPayments(response.data.payments || []);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to load user profile.");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  // Helper to open Google Maps
  const openMap = () => {
    if (user.latitude && user.longitude) {
      Linking.openURL(
        `https://maps.google.com/?q=${user.latitude},${user.longitude}`,
      );
    } else {
      Alert.alert(
        "Location Unavailable",
        "This user hasn't set exact coordinates.",
      );
    }
  };

  // Action Handlers (Connect these to your actual Fastify patch routes later)
  const handleApprove = async () => {
    Alert.alert(
      "Approve",
      "Student approved! (Wire this to /requests/:id/approve)",
    );
  };

  const handleDeny = async () => {
    Alert.alert("Deny", "Student denied! (Wire this to /requests/:id/deny)");
  };

  const handleMarkPaid = async () => {
    Alert.alert(
      "Mark Paid",
      "Payment marked successful! (Wire to /requests/:id/mark-paid)",
    );
  };

  const handleSendReminder = async () => {
    if (user?.phone) {
      const message = `Hi ${user.full_name}, your study room subscription expired on ${formatDate(enrollment?.end_date)}. Please let us know if you'd like to renew your seat!`;
      Linking.openURL(
        `whatsapp://send?phone=91${user.phone}&text=${encodeURIComponent(message)}`,
      );
    }
  };

  // UI Helpers
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const calculateDaysLeft = (endDate) => {
    const diff = new Date(endDate) - new Date();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const totalLTV = payments.reduce((sum, p) => sum + Number(p.amount), 0);

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
      <View className="flex-row items-center px-6 pt-4 pb-4">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Ionicons name="arrow-back" size={24} color={COLORS.textDark} />
        </TouchableOpacity>
        <Text className="text-xl font-m-bold text-textDark">User Profile</Text>
      </View>

      <ScrollView
        className="flex-1 px-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* --------------------------------------------------- */}
        {/* 1. MAIN PROFILE CARD */}
        {/* --------------------------------------------------- */}
        <View className="bg-surface p-6 rounded-3xl border border-borderLight items-center mt-2">
          {/* Avatar or Photo */}
          {user.profile_photo ? (
            <Image
              source={{ uri: user.profile_photo }}
              className="w-24 h-24 rounded-full mb-4 border-2 border-brand/20"
            />
          ) : (
            <View className="w-24 h-24 bg-brand/10 rounded-full items-center justify-center mb-4">
              <Text className="text-4xl text-brand font-m-bold">
                {user.full_name?.charAt(0)?.toUpperCase()}
              </Text>
            </View>
          )}

          {/* Name & KYC Badge */}
          <View className="flex-row items-center mb-4">
            <Text className="text-2xl font-m-bold text-textDark mr-2">
              {user.full_name}
            </Text>
            {user.is_kyc_verified && (
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
            )}
          </View>

          {/* Contact Details List */}
          <View className="w-full bg-background/50 rounded-2xl p-4 border border-borderLight/50 space-y-4">
            {/* Phone */}
            <View className="flex-row items-center mb-4">
              <View className="w-10 h-10 bg-white rounded-full items-center justify-center mr-3 border border-borderLight">
                <Ionicons name="call" size={18} color={COLORS.brand} />
              </View>
              <View>
                <Text className="text-xs text-textLight font-m">
                  Phone Number
                </Text>
                <Text className="text-base text-textDark font-m-bold">
                  {user.phone}
                </Text>
              </View>
            </View>

            {/* Email (If Available) */}
            {user.email && (
              <View className="flex-row items-center">
                <View className="w-10 h-10 bg-white rounded-full items-center justify-center mr-3 border border-borderLight">
                  <Ionicons name="mail" size={18} color={COLORS.brand} />
                </View>
                <View>
                  <Text className="text-xs text-textLight font-m">
                    Email Address
                  </Text>
                  <Text className="text-base text-textDark font-m-bold">
                    {user.email}
                  </Text>
                </View>
              </View>
            )}

            {/* Location */}
            {(user.city || user.address) && (
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center flex-1 pr-2">
                  <View className="w-10 h-10 bg-white rounded-full items-center justify-center mr-3 border border-borderLight">
                    <Ionicons name="location" size={18} color={COLORS.brand} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs text-textLight font-m">
                      Location
                    </Text>
                    <Text
                      className="text-sm text-textDark font-m-bold"
                      numberOfLines={1}
                    >
                      {user.city ? user.city : user.address}
                    </Text>
                  </View>
                </View>
                {user.latitude && (
                  <TouchableOpacity
                    onPress={openMap}
                    className="p-2 bg-brand/10 rounded-full"
                  >
                    <Ionicons name="map" size={18} color={COLORS.brand} />
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Member Since */}
            <View className="flex-row items-center">
              <View className="w-10 h-10 bg-white rounded-full items-center justify-center mr-3 border border-borderLight">
                <Ionicons name="calendar" size={18} color={COLORS.brand} />
              </View>
              <View>
                <Text className="text-xs text-textLight font-m">
                  Member Since
                </Text>
                <Text className="text-base text-textDark font-m-bold">
                  {formatDate(user.member_since)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* --------------------------------------------------- */}
        {/* 2. ENROLLMENT CRM CONTROLS (Only visible to Owner) */}
        {/* --------------------------------------------------- */}
        {enrollment && (
          <View className="mt-6">
            <Text className="text-lg font-m-bold text-textDark mb-3 ml-1">
              Current Enrollment
            </Text>

            {/* ACTIVE BANNER */}
            {enrollment.status === "ACTIVE" && (
              <View className="bg-green-50 border border-green-200 p-4 rounded-2xl mb-4">
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="text-green-800 font-m-bold text-base">
                    Currently Active Seat
                  </Text>
                  <View className="bg-green-200 px-2 py-1 rounded-md">
                    <Text className="text-green-800 text-xs font-bold">
                      {calculateDaysLeft(enrollment.end_date)} Days Left
                    </Text>
                  </View>
                </View>
                <Text className="text-green-700 text-sm mb-1">
                  Enrolled Since:{" "}
                  <Text className="font-m-bold">
                    {formatDate(enrollment.start_date)}
                  </Text>
                </Text>
                <Text className="text-green-700 text-sm font-m-bold">
                  {enrollment.shift.replace("_", " ")} •{" "}
                  {enrollment.amenity.replace("_", " ")} •{" "}
                  {enrollment.reservation}
                </Text>
              </View>
            )}

            {/* PENDING APPROVAL CONTROLS */}
            {enrollment.status === "PENDING" && (
              <View className="bg-orange-50 border border-orange-200 p-4 rounded-2xl mb-4">
                <Text className="text-orange-800 font-m-bold text-base mb-1">
                  Awaiting Your Approval
                </Text>
                <Text className="text-orange-700 text-sm mb-3">
                  Requested on: {formatDate(enrollment.requested_on)}
                </Text>
                <Text className="text-orange-800 text-sm mb-4">
                  Prefers:{" "}
                  <Text className="font-m-bold">
                    {enrollment.shift} • {enrollment.amenity.replace("_", " ")}{" "}
                    • {enrollment.reservation}
                  </Text>
                </Text>

                <View className="flex-row space-x-3">
                  <TouchableOpacity
                    onPress={handleApprove}
                    className="flex-1 bg-brand py-3 rounded-xl items-center mr-2"
                  >
                    <Text className="text-white font-m-bold">Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleDeny}
                    className="flex-1 bg-red-100 border border-red-300 py-3 rounded-xl items-center"
                  >
                    <Text className="text-red-700 font-m-bold">Deny</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* PENDING PAYMENT CONTROLS */}
            {enrollment.status === "PAYMENT_PENDING" && (
              <View className="bg-blue-50 border border-blue-200 p-4 rounded-2xl mb-4">
                <Text className="text-blue-800 font-m-bold text-base mb-1">
                  Awaiting Student Payment
                </Text>
                <Text className="text-blue-700 text-sm mb-4">
                  Approved on: {formatDate(enrollment.status_updated_at)}
                </Text>
                <TouchableOpacity
                  onPress={handleMarkPaid}
                  className="w-full bg-blue-600 py-3 rounded-xl items-center"
                >
                  <Text className="text-white font-m-bold">Mark as Paid</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* EXPIRED CONTROLS */}
            {enrollment.status === "EXPIRED" && (
              <View className="bg-red-50 border border-red-200 p-4 rounded-2xl mb-4">
                <Text className="text-red-800 font-m-bold text-base mb-1">
                  Subscription Expired
                </Text>
                <Text className="text-red-700 text-sm mb-4">
                  Expired on: {formatDate(enrollment.end_date)}
                </Text>
                <TouchableOpacity
                  onPress={handleSendReminder}
                  className="w-full bg-red-600 py-3 rounded-xl flex-row justify-center items-center"
                >
                  <Ionicons name="logo-whatsapp" size={18} color="white" />
                  <Text className="text-white font-m-bold ml-2">
                    Send Reminder
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* --------------------------------------------------- */}
        {/* 3. PAYMENT LEDGER (Only visible to Owner) */}
        {/* --------------------------------------------------- */}
        {payments.length > 0 && (
          <View className="mt-6">
            <View className="flex-row justify-between items-center mb-3 px-1">
              <Text className="text-lg font-m-bold text-textDark">
                Payment Ledger
              </Text>
              <Text className="text-brand font-m-bold">
                Revenue: ₹{totalLTV}
              </Text>
            </View>

            {payments.map((payment, index) => (
              <View
                key={index}
                className="bg-surface border border-borderLight p-4 rounded-2xl mb-3"
              >
                <View className="flex-row justify-between items-start mb-2">
                  <Text className="text-xl font-m-extra text-textDark">
                    ₹{payment.amount?.split(".")[0]}
                  </Text>
                  <View className="bg-green-100 px-2 py-1 rounded-md">
                    <Text className="text-green-700 text-xs font-bold">
                      SUCCESS
                    </Text>
                  </View>
                </View>

                <View className="flex-row items-center mb-2">
                  <Ionicons
                    name="calendar-outline"
                    size={14}
                    color={COLORS.textLight}
                    className="mr-1"
                  />
                  <Text className="text-xs text-textLight font-m ml-1">
                    Paid on {formatDate(payment.paid_on)}
                  </Text>
                </View>

                <View className="bg-background/50 p-3 rounded-xl mt-1 border border-borderLight/50">
                  <Text className="text-xs text-textDark font-m-bold mb-1">
                    {payment.shift} • {payment.amenity.replace("_", " ")} •{" "}
                    {payment.reservation}
                  </Text>
                  <Text className="text-xs text-textLight font-m">
                    Valid: {formatDate(payment.start_date)} -{" "}
                    {formatDate(payment.end_date)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
