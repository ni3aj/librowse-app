import Header from "@/components/ui/Header";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import apiClient from "../../../api/client"; // Adjust path as needed
import { COLORS } from "../../../constants/theme";

export default function OwnerStudentsListScreen() {
  const { id } = useLocalSearchParams(); // Library ID
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStudents();
  }, [id]); // 📌 Added 'id' to dependency array

  const fetchStudents = async () => {
    try {
      const res = await apiClient.get(`/owner/libraries/${id}/students`);
      if (res.data.success) {
        setStudents(res.data.students);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  // 📌 Helper to format expiry date safely
  const formatExpiry = (dateStr) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    });
  };

  const renderStudent = ({ item }) => {
    const isActive = item.status === "ACTIVE";
    // Keep this for the color dots/text styling
    const isPending =
      item.status === "PENDING" || item.status === "PAYMENT_PENDING";

    return (
      <TouchableOpacity
        onPress={() => router.push(`/user/${item.user_id}`)}
        className="bg-white p-4 rounded-2xl mb-3 border border-borderLight flex-row items-center"
      >
        {/* Avatar Placeholder */}
        <View className="w-12 h-12 rounded-full bg-surface justify-center items-center mr-4 border border-borderLight">
          <Text className="text-lg font-m-bold text-textDark">
            {item.full_name?.charAt(0).toUpperCase()}
          </Text>
        </View>

        {/* Student Details */}
        <View className="flex-1 pr-2">
          <Text className="text-base font-m-bold text-textDark mb-0.5">
            {item.full_name}
          </Text>
          <Text className="text-xs text-textLight mb-1">
            {item.amenity?.replace("_", " ")} • {item.shift?.replace("_", " ")}
          </Text>

          <View className="flex-row items-center">
            {/* 📌 Dynamic Color Dot */}
            <View
              className={`w-2 h-2 rounded-full mr-1.5 ${
                isActive
                  ? "bg-green-500"
                  : isPending
                    ? "bg-brandAccent"
                    : "bg-gray-400"
              }`}
            />
            {/* 📌 Dynamic Status Text */}
            <Text
              className={`text-xs font-m-bold ${
                isActive
                  ? "text-green-600"
                  : isPending
                    ? "text-brandAccent"
                    : "text-gray-500"
              }`}
            >
              {/* 📌 THE FIX: Split the text output for Pending vs Payment Pending */}
              {isActive
                ? `Valid till ${formatExpiry(item.end_date)}`
                : item.status === "PAYMENT_PENDING"
                  ? `Payment Pending`
                  : item.status === "PENDING"
                    ? `Pending Request`
                    : `Expired on ${formatExpiry(item.end_date)}`}
            </Text>
          </View>
        </View>

        {/* Action Button: Profile Arrow or WhatsApp Reminder */}
        {/* 📌 Only show WhatsApp if they are fully EXPIRED */}
        {!isActive && !isPending ? (
          <TouchableOpacity
            onPress={() => {
              // Wrapped in encodeURIComponent so special characters in names don't break the WhatsApp link!
              const msg = encodeURIComponent(
                `Hi ${item.full_name}, your library seat expired on ${formatExpiry(item.end_date)}. Would you like to renew it for this month? Please log in to LiBrowse app and choose you seat.`,
              );
              Linking.openURL(
                `whatsapp://send?phone=91${item.phone}&text=${msg}`,
              );
            }}
            className="bg-green-50 p-3 rounded-full border border-green-200"
          >
            <Ionicons name="logo-whatsapp" size={20} color="#128C7E" />
          </TouchableOpacity>
        ) : (
          <View className="p-3">
            <Ionicons
              name="chevron-forward"
              size={20}
              color={COLORS.textLight}
            />
          </View>
        )}
      </TouchableOpacity>
    );
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
      <Header title="My Students" subtitle="Manage your students" />

      <FlatList
        data={students}
        keyExtractor={(item) => item.user_id}
        renderItem={renderStudent}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={
          <Text className="text-center text-textLight mt-10">
            No students found.
          </Text>
        }
        className="m-6"
      />
    </View>
  );
}
