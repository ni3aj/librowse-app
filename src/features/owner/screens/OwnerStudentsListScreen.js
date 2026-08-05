import Header from "@/components/ui/Header";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Linking,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import apiClient from "../../../api/client";
import { COLORS } from "../../../constants/theme";

function Avatar({ src, name, size = 48 }) {
  if (src) {
    return (
      <Image
        source={{ uri: src }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        className="mr-4 bg-gray-100"
      />
    );
  }
  return (
    <View
      style={{ width: size, height: size, borderRadius: size / 2 }}
      className="bg-surface justify-center items-center mr-4 border border-borderLight"
    >
      <Text className="text-lg font-m-bold text-textDark">
        {name?.charAt(0)?.toUpperCase() || "?"}
      </Text>
    </View>
  );
}

export default function OwnerStudentsListScreen() {
  const { id } = useLocalSearchParams(); // Library ID
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStudents();
  }, [id]);

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

  // 📌 UPDATED: Now adds "th/st/nd/rd" and includes the full year!
  const formatExpiry = (dateStr) => {
    if (!dateStr) return "N/A";

    const date = new Date(dateStr);
    const day = date.getDate();
    const month = date.toLocaleString("en-IN", { month: "short" });

    // Helper to get the correct suffix
    const getOrdinal = (n) => {
      const s = ["th", "st", "nd", "rd"];
      const v = n % 100;
      return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };

    return `${getOrdinal(day)} ${month}`;
  };

  const renderStudent = ({ item }) => {
    const isActive = item.status === "ACTIVE";
    const isPending =
      item.status === "PENDING" || item.status === "PAYMENT_PENDING";
    const isRejected = item.status === "REJECTED";
    const isExpired = item.status === "EXPIRED";

    let statusColor = "bg-gray-400";
    let textColor = "text-gray-500";
    let statusText = "Unknown Status";

    if (isActive) {
      statusColor = "bg-green-500";
      textColor = "text-green-600";
      statusText = `Valid till ${formatExpiry(item.end_date)}`;
    } else if (item.status === "PAYMENT_PENDING") {
      statusColor = "bg-brandAccent";
      textColor = "text-brandAccent";
      statusText = "Payment Pending";
    } else if (item.status === "PENDING") {
      statusColor = "bg-brandAccent";
      textColor = "text-brandAccent";
      statusText = "Pending Request";
    } else if (isRejected) {
      statusColor = "bg-red-500";
      textColor = "text-red-500";
      statusText = "Rejected";
    } else if (isExpired) {
      statusColor = "bg-gray-400";
      textColor = "text-gray-500";
      statusText = `Expired on ${formatExpiry(item.end_date)}`;
    }

    return (
      <TouchableOpacity
        onPress={() => router.push(`/user/${item.user_id}`)}
        className="bg-white p-4 rounded-2xl mb-3 border border-borderLight flex-row items-center"
      >
        <Avatar src={item.profile_photo} name={item.full_name} />

        <View className="flex-1 pr-2">
          <Text className="text-base font-m-bold text-textDark mb-0.5">
            {item.full_name}
          </Text>
          <Text className="text-xs text-textLight mb-1">
            {item.amenity?.replace("_", " ")} • {item.shift?.replace("_", " ")}{" "}
            • {item.reservation?.replace("_", " ")}
          </Text>

          <View className="flex-row items-center">
            <View className={`w-2 h-2 rounded-full mr-1.5 ${statusColor}`} />
            <Text className={`text-xs w-full font-m-bold ${textColor}`}>
              {statusText}
            </Text>
          </View>
        </View>

        {isExpired ? (
          <TouchableOpacity
            onPress={() => {
              const msg = encodeURIComponent(
                `Hi ${item.full_name}, your library seat expired on ${formatExpiry(item.end_date)}. Would you like to renew it for this month? Please log in to LiBrowse app and choose your seat.`,
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
      <Header title="My Students" />

      <FlatList
        data={students}
        keyExtractor={(item) => item.user_id}
        renderItem={renderStudent}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={
          <Text className="text-center text-textLight mt-2">
            No students found.
          </Text>
        }
        className="m-6"
      />
    </View>
  );
}
