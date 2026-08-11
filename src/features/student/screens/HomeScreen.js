import apiClient from "@/api/client";
import Button from "@/components/ui/Button";
import Chip from "@/components/ui/Chip";
import Header from "@/components/ui/Header";
import { COLORS } from "@/constants/theme";
import { formatCleanDate } from "@/utils/dateFormatter";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Image,
    Linking,
    Platform,
    RefreshControl,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import Toast from "react-native-toast-message";

// 📌 Reusable Avatar Component
function Avatar({ src, name, size = 50 }) {
  if (src) {
    return (
      <Image
        source={{ uri: src }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        className="bg-gray-100 border border-borderLight"
      />
    );
  }
  return (
    <View
      style={{ width: size, height: size, borderRadius: size / 2 }}
      className="bg-brand/10 items-center justify-center border border-brand/20"
    >
      <Text className="text-brand font-m-bold text-xl">
        {name?.charAt(0)?.toUpperCase() || "?"}
      </Text>
    </View>
  );
}

export default function HomeScreen() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);

  const fetchDashboard = async () => {
    try {
      const response = await apiClient.get("/student/dashboard");
      if (response.data.success) {
        setDashboardData(response.data.data);
      }
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Network Error",
        text2: "Failed to load dashboard data.",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchDashboard();
    }, []),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboard();
  };

  const openMaps = (lat, lng, name) => {
    const scheme = Platform.select({
      ios: "maps:0,0?q=",
      android: "geo:0,0?q=",
    });
    const latLng = `${lat},${lng}`;
    const label = name;
    const url = Platform.select({
      ios: `${scheme}${label}@${latLng}`,
      android: `${scheme}${latLng}(${label})`,
    });
    Linking.openURL(url).catch(() => {
      Linking.openURL(
        `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
      );
    });
  };

  if (loading) {
    return (
      <View className="flex-1 bg-background justify-center items-center">
        <ActivityIndicator size="large" color={COLORS.brand} />
      </View>
    );
  }

  // 📌 Extracting the newly categorized lists from your updated backend
  const {
    user,
    primary_booking,
    future_enrollments = [],
    rejected_enrollments = [],
    history_bookings = [],
    latest_announcements = [],
    needs_review,
  } = dashboardData || {};

  // Calculate total secondary bookings for the accordion header
  const totalSecondaryBookings =
    future_enrollments.length +
    rejected_enrollments.length +
    history_bookings.length;

  // Safely Calculate Progress Bar for Active Seats
  const getProgressWidth = () => {
    if (!primary_booking?.start_date || !primary_booking?.end_date) return "0%";

    const start = new Date(primary_booking.start_date).getTime();
    const end = new Date(primary_booking.end_date).getTime();
    const now = new Date().getTime();

    if (now <= start) return "0%";
    if (now >= end) return "100%";

    const progress = ((now - start) / (end - start)) * 100;

    if (isNaN(progress) || !isFinite(progress)) return "0%";

    return `${Math.max(0, Math.min(100, progress))}%`;
  };

  return (
    <View className="flex-1 bg-background">
      <Header
        title={`Hi, ${user?.first_name || "Student"} 👋`}
        enableBack={false}
        showLibraryDropdown={true}
      />

      <ScrollView
        className="flex-1 px-6 pt-4"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.brand}
          />
        }
      >
        {/* 📌 SECTION 6: Empty State (Discovery) */}
        {!primary_booking ? (
          <View className="items-center justify-center mb-10">
            <View className="bg-surface p-8 rounded-[32px] w-full items-center border border-borderLight shadow-sm shadow-black/5">
              <View className="w-20 h-20 bg-white rounded-full items-center justify-center mb-6">
                <Text className="text-4xl">📚</Text>
              </View>
              <Text className="text-2xl font-m-extra text-textDark text-center mb-3">
                Find Your Perfect Desk
              </Text>
              <Text className="text-textLight font-m text-center leading-6 mb-8 px-2">
                You don't have any active bookings right now. Explore top-rated
                libraries near you and start focusing!
              </Text>
              <Button
                title="Explore Libraries"
                variant="primary"
                onPress={() => router.push("/libraries-listing")}
                className="w-full py-4"
              />
            </View>
          </View>
        ) : (
          <>
            {/* 📌 SECTION 2: Immediate Action Alerts */}
            {primary_booking.status === "PAYMENT_PENDING" && (
              <View className="bg-brandAccent/10 border border-brandAccent/30 p-4 rounded-2xl mb-6 flex-row items-center">
                <View className="flex-1 pr-3">
                  <Text className="text-brandAccent font-m-bold text-base mb-1">
                    Payment Required
                  </Text>
                  <Text className="text-textDark font-m text-sm leading-5">
                    Your request at{" "}
                    <Text className="font-m-bold">
                      {primary_booking.library_name}
                    </Text>{" "}
                    was approved! Pay ₹{primary_booking.price} to secure your
                    seat.
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() =>
                    router.push(`/checkout/${primary_booking.enrollment_id}`)
                  }
                  className="bg-brandAccent px-4 py-2.5 rounded-xl"
                >
                  <Text className="text-white font-m-bold">Pay Now</Text>
                </TouchableOpacity>
              </View>
            )}

            {primary_booking.status === "ACTIVE" &&
              primary_booking.days_remaining <= 5 && (
                <View className="bg-orange-50 border border-orange-200 p-4 rounded-2xl mb-6 flex-row items-center">
                  <View className="flex-1 pr-3">
                    <Text className="text-orange-600 font-m-bold text-base mb-1">
                      Expiring Soon!
                    </Text>
                    <Text className="text-orange-800 font-m text-sm leading-5">
                      Your seat expires in exactly{" "}
                      {primary_booking.days_remaining} days. Renew now to keep
                      your desk.
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() =>
                      router.push(`/renew/${primary_booking.enrollment_id}`)
                    }
                    className="bg-orange-500 px-4 py-2.5 rounded-xl"
                  >
                    <Text className="text-white font-m-bold">Renew</Text>
                  </TouchableOpacity>
                </View>
              )}

            {/* 📌 SECTION 3: The "Active Desk" Card */}
            <Text className="text-sm font-m-bold text-textLight uppercase tracking-wider mb-3 ml-1">
              Current Booking
            </Text>
            <View className="bg-surface border border-borderLight rounded-3xl p-5 mb-6 shadow-sm shadow-black/5 overflow-hidden">
              <View className="flex-row justify-between items-start mb-4">
                <View className="flex-1 pr-4">
                  <Text className="text-xl font-m-extra text-textDark leading-7 mb-1">
                    {primary_booking.library_name}
                  </Text>
                  <View className="flex-row flex-wrap gap-2 mt-1">
                    <Chip label={primary_booking.shift} />
                    <Chip label={primary_booking.amenity} />
                    <Chip label={primary_booking.reservation} />
                  </View>
                </View>

                {primary_booking.assigned_seat && (
                  <View className="bg-brand/10 border border-brand/20 w-14 h-14 rounded-2xl items-center justify-center">
                    <Text className="text-[10px] font-m-bold text-brand uppercase mb-0.5">
                      Seat
                    </Text>
                    <Text className="text-lg font-m-extra text-brand leading-5">
                      {primary_booking.assigned_seat}
                    </Text>
                  </View>
                )}
              </View>

              {primary_booking.status === "ACTIVE" && (
                <View className="mb-6 mt-2">
                  <View className="flex-row justify-between items-end mb-2">
                    <Text className="text-xs font-m text-textLight">
                      Started {formatCleanDate(primary_booking.start_date)}
                    </Text>
                    <Text className="text-xs font-m-bold text-brand">
                      {primary_booking.days_remaining > 0
                        ? `${primary_booking.days_remaining} Days Left`
                        : "Starts Today"}
                    </Text>
                  </View>
                  <View className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden border border-borderLight">
                    <View
                      className="h-full bg-brand rounded-full"
                      style={{ width: getProgressWidth() }}
                    />
                  </View>
                </View>
              )}

              <View className="flex-row border-t border-borderLight pt-4 mt-2">
                <TouchableOpacity
                  onPress={() =>
                    openMaps(
                      primary_booking.latitude,
                      primary_booking.longitude,
                      primary_booking.library_name,
                    )
                  }
                  className="flex-1 flex-row items-center justify-center py-2 border-r border-borderLight"
                >
                  <Ionicons
                    name="navigate-outline"
                    size={18}
                    color={COLORS.textDark}
                  />
                  <Text className="font-m-bold text-textDark ml-2">
                    Directions
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() =>
                    router.push({
                      pathname: "/activities",
                      params: { libraryId: primary_booking.library_id },
                    })
                  }
                  className="flex-1 flex-row items-center justify-center py-2"
                >
                  <Ionicons
                    name="chatbubbles-outline"
                    size={18}
                    color={COLORS.textDark}
                  />
                  <Text className="font-m-bold text-textDark ml-2">
                    Community
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 📌 SECTION 7: Rate Experience Prompt */}
            {needs_review && (
              <TouchableOpacity
                onPress={() =>
                  router.push(`/review/${primary_booking.library_id}`)
                }
                className="bg-[#FDF4FF] border border-[#F5D0FE] p-4 rounded-2xl mb-6 flex-row items-center"
              >
                <View className="bg-[#FAE8FF] p-2.5 rounded-full mr-3">
                  <Ionicons name="star" size={20} color="#D946EF" />
                </View>
                <View className="flex-1">
                  <Text className="text-[#86198F] font-m-bold text-base">
                    Rate your experience
                  </Text>
                  <Text className="text-[#A21CAF] font-m text-xs mt-0.5">
                    Help others by reviewing {primary_booking.library_name}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#C026D3" />
              </TouchableOpacity>
            )}

            {/* 📌 SECTION 4: Latest Announcements */}
            {latest_announcements && latest_announcements.length > 0 && (
              <View>
                <Text className="text-sm font-m-bold text-textLight uppercase tracking-wider mb-3 ml-1">
                  Notice Board
                </Text>
                {latest_announcements.map((announcement, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() =>
                      router.push({
                        pathname: "/activities",
                        params: { libraryId: primary_booking.library_id },
                      })
                    }
                    className="bg-brandAccent/5 border border-brandAccent/20 p-4 rounded-2xl mb-3"
                  >
                    <View className="flex-row items-center justify-between mb-2">
                      <View className="flex-row items-center">
                        <Ionicons
                          name="megaphone"
                          size={14}
                          color={COLORS.brandAccent}
                        />
                        <Text className="text-brandAccent font-m-bold text-xs uppercase tracking-widest ml-1.5">
                          Announcement
                        </Text>
                      </View>
                      <Text className="text-[10px] text-textLight font-m-bold">
                        {formatCleanDate(announcement.created_at)}
                      </Text>
                    </View>
                    <Text
                      className="text-textDark font-m text-sm leading-5"
                      numberOfLines={2}
                    >
                      {announcement.content}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        )}

        {/* 📌 SECTION 5: All Other Secondary Enrollments (Collapsible) */}
        {totalSecondaryBookings > 0 && (
          <View className="mb-4">
            <TouchableOpacity
              onPress={() => setIsHistoryExpanded(!isHistoryExpanded)}
              className="flex-row justify-between items-center py-4 px-2"
            >
              <Text className="text-sm font-m-bold text-textLight uppercase tracking-wider">
                Other Bookings ({totalSecondaryBookings})
              </Text>
              <Ionicons
                name={isHistoryExpanded ? "chevron-up" : "chevron-down"}
                size={20}
                color={COLORS.textLight}
              />
            </TouchableOpacity>

            {isHistoryExpanded && (
              <View>
                {/* UPCOMING BOOKINGS */}
                {future_enrollments.length > 0 && (
                  <View className="mb-2">
                    <Text className="text-xs font-m-bold text-textLight mb-2 px-1 ml-1">
                      Upcoming
                    </Text>
                    {future_enrollments.map((booking, index) => (
                      <View
                        key={`future-${index}`}
                        className="bg-white border border-borderLight rounded-2xl px-4 pt-4 pb-2 mb-3"
                      >
                        <View className="flex-row justify-between items-center mb-1">
                          <Text
                            className="font-m-bold text-textDark text-base flex-1"
                            numberOfLines={1}
                          >
                            {booking.library_name}
                          </Text>
                          <Text className="text-[10px] font-m-bold uppercase px-2 py-0.5 rounded border text-blue-600 bg-blue-50 border-blue-200">
                            UPCOMING
                          </Text>
                        </View>
                        <Text className="text-xs font-m text-textLight mt-1">
                          Starts {formatCleanDate(booking.start_date)}
                        </Text>
                        <View className="flex-row flex-wrap gap-2 mt-2">
                          <Chip label={booking.shift} />
                          <Chip label={booking.amenity} />
                          <Chip label={booking.reservation} />
                          <Chip label={booking.assigned_seat} />
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {/* REJECTED BOOKINGS */}
                {rejected_enrollments.length > 0 && (
                  <View className="mb-4">
                    <Text className="text-xs font-m-bold text-textLight mb-2 px-1 ml-1">
                      Rejected Requests
                    </Text>
                    {rejected_enrollments.map((booking, index) => (
                      <View
                        key={`rejected-${index}`}
                        className="bg-white border border-red-100 rounded-2xl p-4 mb-3 opacity-80"
                      >
                        <View className="flex-row justify-between items-center mb-1">
                          <Text
                            className="font-m-bold text-textDark text-base flex-1"
                            numberOfLines={1}
                          >
                            {booking.library_name}
                          </Text>
                          <Text className="text-[10px] font-m-bold uppercase px-2 py-0.5 rounded border text-red-600 bg-red-50 border-red-200">
                            REJECTED
                          </Text>
                        </View>
                        <Text className="text-xs font-m text-textLight mt-1">
                          {booking.shift.replace("_", " ")} •{" "}
                          {booking.amenity.replace("_", " ")} •{" "}
                          {booking.reservation.replace("_", " ")}{" "}
                          {booking.assigned_seat &&
                            `(${booking.assigned_seat})`}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* PAST / EXPIRED BOOKINGS */}
                {history_bookings.length > 0 && (
                  <View className="mb-4">
                    <Text className="text-xs font-m-bold text-textLight mb-2 px-1">
                      Past Bookings
                    </Text>
                    {history_bookings.map((booking, index) => (
                      <View
                        key={`history-${index}`}
                        className="bg-white border border-borderLight rounded-2xl p-4 mb-3 opacity-70"
                      >
                        <View className="flex-row justify-between items-center mb-1">
                          <Text
                            className="font-m-bold text-textDark text-base flex-1"
                            numberOfLines={1}
                          >
                            {booking.library_name}
                          </Text>
                          <Text className="text-[10px] font-m-bold uppercase px-2 py-0.5 rounded border text-textLight bg-gray-50 border-borderLight">
                            {booking.status === "EXPIRED"
                              ? "EXPIRED"
                              : booking.status}
                          </Text>
                        </View>
                        <Text className="text-xs font-m text-textLight mt-1">
                          Ended{" "}
                          {booking.end_date
                            ? formatCleanDate(booking.end_date)
                            : "N/A"}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        <View className="h-8" />
      </ScrollView>
    </View>
  );
}
