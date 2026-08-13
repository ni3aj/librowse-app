import apiClient from "@/api/client";
import Button from "@/components/ui/Button";
import Chip from "@/components/ui/Chip";
import Header from "@/components/ui/Header";
import { COLORS } from "@/constants/theme";
import { useLibraryStore } from "@/store/libraryStore";
import { formatCleanDate } from "@/utils/dateFormatter";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { studentApi } from "../../shared/api";

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
  const [isCancelling, setIsCancelling] = useState(false); // 📌 Added cancelling state
  const { setHasActiveBooking } = useLibraryStore();

  const fetchDashboard = async () => {
    try {
      const response = await apiClient.get("/student/dashboard");
      if (response.data.success) {
        setDashboardData(response.data.data);
        const isActive =
          response.data.data.primary_booking?.status === "ACTIVE" ||
          (response.data.data.future_enrollments || []).some(
            (b) => b.status === "ACTIVE",
          );
        if (setHasActiveBooking) {
          setHasActiveBooking(isActive);
        }
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
    const url = Platform.select({
      ios: `${scheme}${name}@${latLng}`,
      android: `${scheme}${latLng}(${name})`,
    });
    Linking.openURL(url).catch(() => {
      Linking.openURL(
        `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
      );
    });
  };

  const handleNotifyPayment = (enrollmentId) => {
    Alert.alert(
      "Confirm Offline Payment",
      "Please pay the library owner directly via Cash or UPI first. Have you completed the payment?",
      [
        { text: "Not Yet", style: "cancel" },
        {
          text: "Yes, I've Paid",
          onPress: async () => {
            try {
              const res = await apiClient.post(
                `/student/enrollments/${enrollmentId}/notify-payment`,
              );
              if (res.data.success) {
                Toast.show({
                  type: "success",
                  text1: "Owner Notified 🔔",
                  text2: "Waiting for their confirmation.",
                });
                fetchDashboard();
              }
            } catch (error) {
              Toast.show({
                type: "error",
                text1: "Error",
                text2: error.response?.data?.error || "Failed to notify owner.",
              });
            }
          },
        },
      ],
    );
  };

  // 📌 Added handleCancel logic directly to dashboard
  const handleCancel = () => {
    Alert.alert(
      "Cancel Request",
      "Are you sure you want to cancel your seat request?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            setIsCancelling(true);
            try {
              const response = await studentApi.cancelEnrollment(
                primary_booking.enrollment_id,
              );
              if (response.data.success) {
                Toast.show({
                  type: "success",
                  text1: "Cancelled",
                  text2: "Your request has been cancelled.",
                });
                fetchDashboard(); // Instantly clears the card
              }
            } catch (error) {
              Toast.show({
                type: "error",
                text1: "Error",
                text2: error.response?.data?.error || "Failed to cancel.",
              });
            } finally {
              setIsCancelling(false);
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View className="flex-1 bg-background justify-center items-center">
        <ActivityIndicator size="large" color={COLORS.brand} />
      </View>
    );
  }

  const {
    user,
    primary_booking,
    future_enrollments = [],
    rejected_enrollments = [],
    history_bookings = [],
    latest_announcements = [],
    needs_review,
  } = dashboardData || {};

  const totalSecondaryBookings =
    future_enrollments.length +
    rejected_enrollments.length +
    history_bookings.length;

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
        className="flex-1 px-6"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.brand}
          />
        }
      >
        {!primary_booking ? (
          <View className="items-center justify-center mb-10">
            <View className="bg-surface p-8 rounded-[32px] w-full items-center border border-borderLight shadow-sm shadow-black/5">
              <View className="w-20 h-20 bg-white rounded-full items-center justify-center mb-6">
                <Text className="text-4xl">📚</Text>
              </View>
              <Text className="text-xl font-m-extra text-textDark text-center mb-3">
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
            <Text className="text-sm font-m-bold text-textLight uppercase tracking-wider mb-3 ml-1">
              Current Booking
            </Text>
            <View className="bg-surface border border-borderLight rounded-3xl mb-6 shadow-sm shadow-black/5 overflow-hidden">
              {/* --- DYNAMIC CARD HEADERS --- */}
              {primary_booking.status === "PENDING" && (
                <View className="bg-blue-50 px-5 py-3 border-b border-blue-100 flex-row distance-between items-center">
                  <Ionicons
                    name="time"
                    size={18}
                    color="#2563EB"
                    className="mr-2"
                  />
                  <Text className="flex-1 text-blue-800 font-m-bold text-sm">
                    Approval Pending
                  </Text>
                  <Text className="text-textLight font-m-semi text-xs">
                    Since {formatCleanDate(primary_booking.updated_at)}
                  </Text>
                </View>
              )}

              {primary_booking.status === "PAYMENT_PENDING" &&
                !primary_booking.payment_claimed_at && (
                  <View className="bg-brandAccent/10 px-5 py-3 border-b border-brandAccent/20 flex-row items-center">
                    <Ionicons
                      name="alert-circle"
                      size={18}
                      color={COLORS.brandAccent}
                      className="mr-2"
                    />
                    <Text className="flex-1 text-brandAccent font-m-bold text-sm">
                      Payment Pending
                    </Text>
                    <Text className="text-textLight font-m-semi text-xs">
                      Since {formatCleanDate(primary_booking.updated_at)}
                    </Text>
                  </View>
                )}

              {primary_booking.status === "PAYMENT_PENDING" &&
                primary_booking.payment_claimed_at && (
                  <View className="bg-yellow-50 px-5 py-3 border-b border-yellow-200 flex-row items-center">
                    <Ionicons
                      name="shield-checkmark"
                      size={18}
                      color="#CA8A04"
                      className="mr-2"
                    />
                    <Text className="text-yellow-800 font-m-bold text-sm">
                      Payment Verification Pending
                    </Text>
                  </View>
                )}

              {primary_booking.status === "ACTIVE" &&
                primary_booking.days_remaining > 5 && (
                  <View className="bg-emerald-50 px-5 py-3 border-b border-emerald-100 flex-row items-center">
                    <Ionicons
                      name="checkmark-circle"
                      size={18}
                      color="#059669"
                      className="mr-2"
                    />
                    <Text className="text-emerald-800 font-m-bold text-sm">
                      Seat Active
                    </Text>
                  </View>
                )}

              {primary_booking.status === "ACTIVE" &&
                primary_booking.days_remaining <= 5 && (
                  <View className="bg-orange-50 px-5 py-3 border-b border-orange-200 flex-row items-center">
                    <Ionicons
                      name="warning"
                      size={18}
                      color="#EA580C"
                      className="mr-2"
                    />
                    <Text className="text-orange-800 font-m-bold text-sm">
                      Expiring in {primary_booking.days_remaining} days!
                    </Text>
                  </View>
                )}

              {/* --- CARD BODY --- */}
              <View className="p-5">
                <View className="flex-row justify-between items-start mb-4">
                  <View className="flex-1 pr-4">
                    <TouchableOpacity
                      onPress={() =>
                        router.push(`/library/${primary_booking.library_id}`)
                      }
                    >
                      <Text className="text-xl font-m-extra text-textDark leading-7 mb-1">
                        {primary_booking.library_name}
                      </Text>
                    </TouchableOpacity>
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

                {/* --- DYNAMIC CARD MESSAGES & BUTTONS --- */}
                {primary_booking.status === "PENDING" && (
                  <View className="mt-1 bg-gray-50 p-3 rounded-xl border border-borderLight">
                    <Text className="text-textLight font-m text-sm leading-5">
                      Your request has been sent! Waiting for the library owner
                      to approve it before you can pay.
                    </Text>
                  </View>
                )}

                {primary_booking.status === "PAYMENT_PENDING" &&
                  !primary_booking.payment_claimed_at && (
                    <View className="mt-2">
                      <Text className="text-textDark font-m text-sm leading-5 mb-4">
                        Your seat is approved! Please pay{" "}
                        <Text className="font-m-bold text-brand">
                          ₹{primary_booking.price}
                        </Text>{" "}
                        directly to the library via Cash or UPI.
                      </Text>
                      <Button
                        title="I Have Paid (Notify Owner)"
                        variant="primary"
                        className="py-3.5"
                        onPress={() =>
                          handleNotifyPayment(primary_booking.enrollment_id)
                        }
                      />
                    </View>
                  )}

                {primary_booking.status === "PAYMENT_PENDING" &&
                  primary_booking.payment_claimed_at && (
                    <View className="mt-1 bg-gray-50 p-3 rounded-xl border border-borderLight">
                      <Text className="text-textLight font-m text-sm leading-5">
                        You notified the owner. Your seat will activate
                        automatically once they confirm receipt of your payment.
                      </Text>
                    </View>
                  )}

                {primary_booking.status === "ACTIVE" && (
                  <View className="mt-2">
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

                    {primary_booking.days_remaining <= 5 && (
                      <Button
                        title="Renew Seat"
                        variant="primary"
                        className="mt-5 py-3.5"
                        onPress={() =>
                          router.push(`/renew/${primary_booking.enrollment_id}`)
                        }
                      />
                    )}
                  </View>
                )}
              </View>

              {/* --- CARD FOOTER (ALWAYS VISIBLE) --- */}
              <View className="flex-row border-t border-borderLight bg-gray-50/50">
                <TouchableOpacity
                  onPress={() =>
                    openMaps(
                      primary_booking.latitude,
                      primary_booking.longitude,
                      primary_booking.library_name,
                    )
                  }
                  className="flex-1 flex-row items-center justify-center py-3.5 border-r border-borderLight"
                >
                  <Ionicons
                    name="navigate-outline"
                    size={18}
                    color={COLORS.textDark}
                  />
                  <Text className="text-sm font-m-bold text-textDark ml-2">
                    Locate
                  </Text>
                </TouchableOpacity>

                {primary_booking.status === "ACTIVE" && (
                  <TouchableOpacity
                    onPress={() =>
                      router.push({
                        pathname: "/activities",
                        params: { libraryId: primary_booking.library_id },
                      })
                    }
                    className={`flex-1 flex-row items-center justify-center py-3.5 ${
                      primary_booking.status === "PENDING"
                        ? "border-r border-borderLight"
                        : ""
                    }`}
                  >
                    <Ionicons
                      name="chatbubbles-outline"
                      size={18}
                      color={COLORS.textDark}
                    />
                    <Text className="text-sm font-m-bold text-textDark ml-2">
                      Chat
                    </Text>
                  </TouchableOpacity>
                )}

                {/* 📌 Added Cancel Button when Status is PENDING */}
                {primary_booking.status === "PENDING" && (
                  <TouchableOpacity
                    onPress={handleCancel}
                    disabled={isCancelling}
                    className="flex-1 flex-row items-center justify-center py-3.5"
                  >
                    {isCancelling ? (
                      <ActivityIndicator size="small" color="#DC2626" />
                    ) : (
                      <>
                        <Ionicons
                          name="close-circle-outline"
                          size={18}
                          color="#DC2626"
                        />
                        <Text className="text-sm font-m-bold text-red-600 ml-1">
                          Cancel
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Rate Experience */}
            {needs_review && (
              <TouchableOpacity
                onPress={() =>
                  router.push(`/library/${primary_booking.library_id}`)
                }
                className="bg-[#FDF4FF] border border-[#F5D0FE] p-4 rounded-2xl flex-row items-center"
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

            {/* Notice Board */}
            {latest_announcements && latest_announcements.length > 0 && (
              <View>
                <Text className="text-sm font-m-bold text-textLight uppercase tracking-wider mb-3 ml-1 mt-6">
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

        {/* Other Enrollments */}
        {totalSecondaryBookings > 0 && (
          <View className="mb-4">
            <TouchableOpacity
              onPress={() => setIsHistoryExpanded(!isHistoryExpanded)}
              className="flex-row justify-between items-center py-4 px-1"
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
                          {booking.assigned_seat && (
                            <Chip label={booking.assigned_seat} />
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                )}

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
                        <Text
                          className="text-[12px] text-xs text-textLight"
                          numberOfLines={1}
                        >
                          {booking.amenity} / {booking.shift} /{" "}
                          {booking.reservation}{" "}
                          {booking.assigned_seat &&
                            `(${booking.assigned_seat})`}
                        </Text>
                        <Text className="text-xs font-m text-textLight mt-1">
                          {booking.status === "EXPIRED" && (
                            <>
                              Ended{" "}
                              {booking.end_date
                                ? formatCleanDate(booking.end_date)
                                : "N/A"}
                            </>
                          )}
                          {booking.status === "CANCELLED" && (
                            <>
                              Cancelled on{" "}
                              {booking.updated_at
                                ? formatCleanDate(booking.updated_at)
                                : "N/A"}
                            </>
                          )}
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
