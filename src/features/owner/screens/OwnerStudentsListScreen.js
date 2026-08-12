import Header from "@/components/ui/Header";
import { useLibraryStore } from "@/store/libraryStore";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Linking,
  ScrollView,
  Text,
  TextInput,
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

const FILTER_OPTIONS = [
  { label: "All", value: "All" },
  { label: "Active", value: "ACTIVE" },
  { label: "Pending Request", value: "PENDING" },
  { label: "Awaiting Payment", value: "PAYMENT_PENDING" },
  { label: "Expired", value: "EXPIRED" },
  { label: "Rejected", value: "REJECTED" },
];

export default function OwnerStudentsListScreen() {
  const { libraryId } = useLibraryStore();
  const lastFetchedId = useRef(null);

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const fetchStudents = async () => {
        if (!libraryId) return;

        if (lastFetchedId.current !== libraryId) {
          setLoading(true);
          setStudents([]);
        }

        try {
          const res = await apiClient.get(
            `/owner/libraries/${libraryId}/students`,
          );
          if (isActive && res.data.success) {
            setStudents(res.data.students);
          }
        } catch (error) {
          console.log(error);
        } finally {
          if (isActive) {
            setLoading(false);
            lastFetchedId.current = libraryId;
          }
        }
      };

      fetchStudents();

      return () => {
        isActive = false;
      };
    }, [libraryId]),
  );

  const formatExpiry = (dateStr) => {
    if (!dateStr) return "N/A";

    const date = new Date(dateStr);
    const day = date.getDate();
    const month = date.toLocaleString("en-IN", { month: "short" });

    const getOrdinal = (n) => {
      const s = ["th", "st", "nd", "rd"];
      const v = n % 100;
      return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };

    return `${getOrdinal(day)} ${month}`;
  };

  const filteredStudents = students.filter((student) => {
    const matchesSearch = student.full_name
      ?.toLowerCase()
      .includes(searchQuery.toLowerCase());

    const matchesFilter =
      activeFilter === "All" || student.status === activeFilter;

    return matchesSearch && matchesFilter;
  });

  const renderStudent = ({ item }) => {
    const isActive = item.status === "ACTIVE";
    const isPending = item.status === "PENDING";
    const isPaymentPending = item.status === "PAYMENT_PENDING";
    const isRejected = item.status === "REJECTED";
    const isExpired = item.status === "EXPIRED";

    // 📌 The new flag check
    const hasClaimedPayment = !!item.payment_claimed_at;

    let statusColor = "bg-gray-400";
    let textColor = "text-gray-500";
    let statusText = "Unknown Status";

    if (isActive) {
      statusColor = "bg-green-500";
      textColor = "text-green-600";
      statusText = `Valid till ${formatExpiry(item.end_date)}`;
    } else if (isPaymentPending) {
      if (hasClaimedPayment) {
        statusColor = "bg-yellow-500";
        textColor = "text-yellow-700";
        statusText = "Payment Claimed";
      } else {
        statusColor = "bg-brandAccent";
        textColor = "text-brandAccent";
        statusText = "Awaiting Payment";
      }
    } else if (isPending) {
      statusColor = "bg-blue-500";
      textColor = "text-blue-600";
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
        className={`bg-white p-4 rounded-2xl mb-3 border flex-row items-center ${
          hasClaimedPayment && isPaymentPending
            ? "border-yellow-300 bg-yellow-50/20"
            : "border-borderLight"
        }`}
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
      <Header title="My Students" showLibraryDropdown={true} />

      <FlatList
        data={filteredStudents}
        keyExtractor={(item) => item.user_id}
        renderItem={renderStudent}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
        className="m-6 mt-0"
        ListHeaderComponent={
          <View className="mb-4">
            <View className="flex-row items-center bg-white px-4 py-2 rounded-2xl border border-borderLight mb-4 mt-2">
              <Ionicons name="search" size={20} color={COLORS.textLight} />
              <TextInput
                className="flex-1 ml-2 text-base font-m text-textDark"
                placeholder="Search students by name..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor={COLORS.textLight}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery("")}>
                  <Ionicons
                    name="close-circle"
                    size={20}
                    color={COLORS.textLight}
                  />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingRight: 20 }}
              className="mb-2"
            >
              {FILTER_OPTIONS.map((filter) => {
                const isActive = activeFilter === filter.value;
                return (
                  <TouchableOpacity
                    key={filter.value}
                    onPress={() => setActiveFilter(filter.value)}
                    activeOpacity={0.7}
                    className={`px-4 py-2 rounded-full border mr-2 ${
                      isActive
                        ? "bg-textDark border-textDark"
                        : "bg-white border-borderLight"
                    }`}
                  >
                    <Text
                      className={`font-m-bold ${
                        isActive ? "text-white" : "text-textLight"
                      }`}
                    >
                      {filter.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        }
        ListEmptyComponent={
          <Text className="text-center text-textLight mt-10">
            {students.length === 0
              ? "No students enrolled yet."
              : "No students match your filter."}
          </Text>
        }
      />
    </View>
  );
}
