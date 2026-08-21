import apiClient from "@/api/client";
import PaymentModal from "@/components/student/PaymentModal";
import ActionCard from "@/components/ui/ActionCard";
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
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
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

const formatTime = (timeStr) => {
  if (!timeStr) return "";
  try {
    const [hourString, minute] = timeStr.split(":");
    const hour = parseInt(hourString, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const formattedHour = hour % 12 || 12;
    return `${formattedHour}:${minute} ${ampm}`;
  } catch (e) {
    return timeStr;
  }
};

const formatPrice = (priceStr) => {
  if (!priceStr) return "";
  return `₹${parseFloat(priceStr).toLocaleString("en-IN")}`;
};

export default function HomeScreen() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);

  const [isCancelling, setIsCancelling] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);

  const { libraryId, setHasActiveBooking } = useLibraryStore();

  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptEmail, setReceiptEmail] = useState("");
  const [isSendingReceipt, setIsSendingReceipt] = useState(false);
  const [paymentConfig, setPaymentConfig] = useState(null);

  const fetchDashboard = async () => {
    if (!libraryId) {
      setLoading(false);
      setRefreshing(false);
      setDashboardData(null);
      return;
    }

    try {
      const response = await apiClient.get(`/student/dashboard/${libraryId}`);

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
    }, [libraryId]),
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
                fetchDashboard();
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

  const handleCancelFuturePlan = (enrollmentId) => {
    Alert.alert(
      "Cancel Upcoming Plan",
      "Are you sure you want to cancel your seat request for next month? You will keep your current seat.",
      [
        { text: "No, Keep It", style: "cancel" },
        {
          text: "Yes, Cancel Plan",
          style: "destructive",
          onPress: async () => {
            setCancellingId(enrollmentId);
            try {
              const response = await studentApi.cancelEnrollment(enrollmentId);
              if (response.data.success) {
                fetchDashboard();
                Toast.show({
                  type: "success",
                  text1: "Cancelled",
                  text2: "Your request for next month has been withdrawn.",
                });
              }
            } catch (error) {
              Toast.show({
                type: "error",
                text1: "Error",
                text2: error.response?.data?.message || "Failed to cancel.",
              });
            } finally {
              setCancellingId(null);
            }
          },
        },
      ],
    );
  };

  const openReceiptModal = () => {
    setReceiptEmail(user?.email || "");
    setShowReceiptModal(true);
  };

  const sendReceiptToEmail = async () => {
    if (!receiptEmail || !receiptEmail.includes("@")) {
      Toast.show({
        type: "error",
        text1: "Please enter a valid email address.",
      });
      return;
    }

    setIsSendingReceipt(true);
    try {
      const response = await apiClient.post(
        `/student/receipts/enrollments/${primary_booking.enrollment_id}/receipt`,
        { email: receiptEmail.trim() },
      );

      if (response.data.success) {
        Toast.show({
          type: "success",
          text1: "Receipt Sent!",
          text2: `A copy was securely emailed to ${receiptEmail}`,
        });
        setShowReceiptModal(false);
      }
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: error.response?.data?.error || "Failed to send receipt.",
      });
    } finally {
      setIsSendingReceipt(false);
    }
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

  const hasRecentRenewalClaim =
    primary_booking?.status === "ACTIVE" &&
    !!primary_booking?.payment_claimed_at;

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
          <View className="items-center justify-center mb-4 mt-2">
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
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() =>
                router.push(`/library/${primary_booking.library_id}`)
              }
              className="flex-row justify-between items-center bg-white p-4 rounded-[24px] border border-borderLight shadow-sm shadow-black/5 mb-6 mt-2"
            >
              <View className="flex-1 pr-4">
                <Text className="text-[10px] font-m-bold text-brand uppercase tracking-widest mb-1">
                  Library
                </Text>
                <Text className="text-xl font-m-extra text-textDark">
                  {primary_booking.library_name}
                </Text>
              </View>
              <View className="w-12 h-12 bg-brand/5 rounded-2xl items-center justify-center border border-brand/10">
                <Ionicons name="business" size={22} color={COLORS.brand} />
              </View>
            </TouchableOpacity>

            <Text className="text-sm font-m-bold text-textLight uppercase tracking-wider mb-3 ml-1">
              Current Booking
            </Text>
            <ActionCard
              className="mb-4"
              header={{
                bg:
                  primary_booking.status === "PENDING"
                    ? "bg-blue-50"
                    : primary_booking.status === "PAYMENT_PENDING" &&
                        !primary_booking.payment_claimed_at
                      ? "bg-brandAccent/10"
                      : primary_booking.status === "PAYMENT_PENDING" &&
                          primary_booking.payment_claimed_at
                        ? "bg-yellow-50"
                        : primary_booking.status === "ACTIVE" &&
                            primary_booking.days_remaining <= 5
                          ? "bg-orange-50"
                          : "bg-emerald-50",
                border:
                  primary_booking.status === "PENDING"
                    ? "border-blue-100"
                    : primary_booking.status === "PAYMENT_PENDING" &&
                        !primary_booking.payment_claimed_at
                      ? "border-brandAccent/20"
                      : primary_booking.status === "PAYMENT_PENDING" &&
                          primary_booking.payment_claimed_at
                        ? "border-yellow-200"
                        : primary_booking.status === "ACTIVE" &&
                            primary_booking.days_remaining <= 5
                          ? "border-orange-200"
                          : "border-emerald-100",
                icon:
                  primary_booking.status === "PENDING"
                    ? "time"
                    : primary_booking.status === "PAYMENT_PENDING" &&
                        !primary_booking.payment_claimed_at
                      ? "alert-circle"
                      : primary_booking.status === "PAYMENT_PENDING" &&
                          primary_booking.payment_claimed_at
                        ? "shield-checkmark"
                        : primary_booking.status === "ACTIVE" &&
                            primary_booking.days_remaining <= 5
                          ? "warning"
                          : "checkmark-circle",
                iconColor:
                  primary_booking.status === "PENDING"
                    ? "#2563EB"
                    : primary_booking.status === "PAYMENT_PENDING" &&
                        !primary_booking.payment_claimed_at
                      ? COLORS.brandAccent
                      : primary_booking.status === "PAYMENT_PENDING" &&
                          primary_booking.payment_claimed_at
                        ? "#CA8A04"
                        : primary_booking.status === "ACTIVE" &&
                            primary_booking.days_remaining <= 5
                          ? "#EA580C"
                          : "#059669",
                title:
                  primary_booking.status === "PENDING"
                    ? "Approval Pending"
                    : primary_booking.status === "PAYMENT_PENDING" &&
                        !primary_booking.payment_claimed_at
                      ? "Payment Pending"
                      : primary_booking.status === "PAYMENT_PENDING" &&
                          primary_booking.payment_claimed_at
                        ? "Payment Verification Pending"
                        : primary_booking.status === "ACTIVE" &&
                            primary_booking.days_remaining <= 5
                          ? `Expiring in ${primary_booking.days_remaining} days!`
                          : "Active",
                textColor:
                  primary_booking.status === "PENDING"
                    ? "text-blue-800"
                    : primary_booking.status === "PAYMENT_PENDING" &&
                        !primary_booking.payment_claimed_at
                      ? "text-brandAccent"
                      : primary_booking.status === "PAYMENT_PENDING" &&
                          primary_booking.payment_claimed_at
                        ? "text-yellow-800"
                        : primary_booking.status === "ACTIVE" &&
                            primary_booking.days_remaining <= 5
                          ? "text-orange-800"
                          : "text-emerald-800",
                subtitle:
                  ["PENDING", "PAYMENT_PENDING"].includes(
                    primary_booking.status,
                  ) && !primary_booking.payment_claimed_at
                    ? `Since ${formatCleanDate(primary_booking.updated_at)}`
                    : null,
                rightElement: ["ACTIVE", "PAYMENT_PENDING"].includes(
                  primary_booking.status,
                ) ? (
                  <Text className="text-base font-m-bold text-dark">
                    {formatPrice(primary_booking.price)}
                  </Text>
                ) : null,
              }}
              footer={
                <>
                  <TouchableOpacity
                    onPress={() =>
                      openMaps(
                        primary_booking.latitude,
                        primary_booking.longitude,
                        primary_booking.library_name,
                      )
                    }
                    className={`flex-1 flex-row items-center justify-center py-3.5 ${
                      ["PENDING", "PAYMENT_PENDING", "ACTIVE"].includes(
                        primary_booking.status,
                      )
                        ? "border-r border-borderLight"
                        : ""
                    }`}
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
                      className="flex-1 flex-row items-center justify-center py-3.5"
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

                  {["PENDING", "PAYMENT_PENDING"].includes(
                    primary_booking.status,
                  ) && (
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
                </>
              }
            >
              <View className="flex-row justify-between items-center mb-4">
                <View className="flex-1 pr-4">
                  <View className="flex-row flex-wrap gap-1">
                    <Chip label={primary_booking.shift} />
                    <Chip label={primary_booking.amenity} />
                    <Chip label={primary_booking.reservation} />
                    {primary_booking.start_time && primary_booking.end_time && (
                      <Chip
                        type="TIME"
                        label={`${formatTime(primary_booking.start_time)} - ${formatTime(primary_booking.end_time)}`}
                      />
                    )}
                  </View>
                </View>

                {primary_booking.assigned_seat && (
                  <View className="bg-brand/10 border border-brand/20 w-16 h-16 rounded-2xl items-center justify-center ml-2">
                    <Text className="text-[10px] font-m-bold text-brand uppercase mb-0.5">
                      Seat
                    </Text>
                    <Text className="text-lg font-m-extra text-brand leading-5">
                      {primary_booking.assigned_seat}
                    </Text>
                  </View>
                )}
              </View>

              {primary_booking.status === "PENDING" && (
                <View className="mb-2 bg-gray-50 p-3 rounded-xl border border-borderLight">
                  <Text className="text-textLight font-m text-sm leading-5">
                    Your request has been sent! Waiting for the library owner to
                    approve it before you can pay.
                  </Text>
                </View>
              )}

              {primary_booking.status === "PAYMENT_PENDING" &&
                !primary_booking.payment_claimed_at && (
                  <View className="mb-2">
                    <Text className="text-textDark font-m text-sm leading-5 mb-4">
                      Your seat is approved! Please pay{" "}
                      <Text className="font-m-bold text-brand">
                        ₹{parseInt(primary_booking.price)}
                      </Text>{" "}
                      directly to the library via Cash or UPI.
                    </Text>
                    <Button
                      title="Complete Payment"
                      variant="primary"
                      className="py-3.5"
                      onPress={() => setPaymentConfig(primary_booking)}
                    />
                  </View>
                )}

              {primary_booking.status === "PAYMENT_PENDING" &&
                primary_booking.payment_claimed_at && (
                  <View className="mb-2 bg-yellow-50/50 p-3 rounded-xl border border-yellow-200">
                    <Text className="text-yellow-800 font-m text-sm leading-5">
                      You notified the owner. Your seat will activate
                      automatically once they confirm receipt of your payment.
                    </Text>
                  </View>
                )}

              {primary_booking.status === "ACTIVE" && hasRecentRenewalClaim && (
                <View className="mb-4 bg-purple-50 p-3 rounded-xl border border-purple-200">
                  <Text className="text-purple-800 font-m text-sm leading-5">
                    Renewal requested! Your seat will be extended by 30 days
                    once the owner confirms your payment.
                  </Text>
                </View>
              )}

              {primary_booking.status === "ACTIVE" && (
                <View>
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

                  <View className="flex-row gap-3 mt-5">
                    <Button
                      title="Get Receipt"
                      variant="outline"
                      icon={
                        <Ionicons
                          name="mail-outline"
                          size={18}
                          color={COLORS.brand}
                        />
                      }
                      className="flex-1 py-3.5"
                      onPress={openReceiptModal}
                    />

                    {primary_booking.days_remaining <= 5 && (
                      <Button
                        title={hasRecentRenewalClaim ? "Pending" : "Renew Seat"}
                        variant={hasRecentRenewalClaim ? "outline" : "primary"}
                        disabled={hasRecentRenewalClaim}
                        className="flex-1 py-3.5"
                        onPress={() => setPaymentConfig(primary_booking)}
                      />
                    )}
                  </View>
                </View>
              )}
            </ActionCard>

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
                {/* 📌 FUTURE ENROLLMENTS */}
                {future_enrollments.length > 0 && (
                  <View className="mb-2">
                    <Text className="text-xs font-m-bold text-textLight mb-2 px-1">
                      Future Enrollment
                    </Text>
                    {future_enrollments.map((booking, index) => {
                      const hasStudentClaimed = !!booking.payment_claimed_at;

                      return (
                        <ActionCard
                          key={`future-${index}`}
                          className="mb-3"
                          header={{
                            bg: "bg-indigo-50",
                            border: "border-indigo-100",
                            icon: "calendar",
                            iconColor: "#4F46E5",
                            title:
                              booking.status === "PAYMENT_PENDING"
                                ? hasStudentClaimed
                                  ? "Payment Verification Pending"
                                  : "Payment Pending"
                                : "Upcoming Plan",
                            textColor: "text-indigo-800",
                            rightElement: (
                              <Text className="text-base font-m-bold text-dark">
                                {formatPrice(booking.price)}
                              </Text>
                            ),
                          }}
                          footer={
                            <>
                              {["PENDING", "PAYMENT_PENDING"].includes(
                                booking.status,
                              ) && (
                                <TouchableOpacity
                                  onPress={() =>
                                    handleCancelFuturePlan(
                                      booking.enrollment_id,
                                    )
                                  }
                                  disabled={
                                    cancellingId === booking.enrollment_id
                                  }
                                  className={`flex-1 flex-row items-center justify-center py-3.5 ${
                                    booking.status === "PAYMENT_PENDING" &&
                                    !hasStudentClaimed
                                      ? "border-r border-borderLight"
                                      : ""
                                  }`}
                                >
                                  {cancellingId === booking.enrollment_id ? (
                                    <ActivityIndicator
                                      size="small"
                                      color="#DC2626"
                                    />
                                  ) : (
                                    <>
                                      <Ionicons
                                        name="close-circle-outline"
                                        size={18}
                                        color="#DC2626"
                                      />
                                      <Text className="text-sm font-m-bold text-red-600 ml-1">
                                        Cancel Request
                                      </Text>
                                    </>
                                  )}
                                </TouchableOpacity>
                              )}

                              {booking.status === "PAYMENT_PENDING" &&
                                !hasStudentClaimed && (
                                  <TouchableOpacity
                                    onPress={() => setPaymentConfig(booking)}
                                    className="flex-1 flex-row items-center justify-center py-3.5 bg-brand"
                                  >
                                    <Text className="text-sm font-m-bold text-white">
                                      Pay Now
                                    </Text>
                                  </TouchableOpacity>
                                )}
                            </>
                          }
                        >
                          <View className="flex-row justify-between items-start mb-2">
                            <View className="flex-1 pr-4">
                              <Text className="text-xs font-m text-textLight mb-2">
                                Starts {formatCleanDate(booking.start_date)}
                              </Text>

                              <View className="flex-row flex-wrap gap-1">
                                <Chip label={booking.shift} />
                                <Chip label={booking.amenity} />
                                <Chip label={booking.reservation} />
                                {booking.assigned_seat && (
                                  <Chip
                                    label={booking.assigned_seat}
                                    type="SEAT"
                                  />
                                )}
                                {booking.start_time && booking.end_time && (
                                  <Chip
                                    type="TIME"
                                    label={`${formatTime(booking.start_time)} - ${formatTime(booking.end_time)}`}
                                  />
                                )}
                              </View>
                            </View>
                          </View>
                        </ActionCard>
                      );
                    })}
                  </View>
                )}

                {/* 📌 REJECTED ENROLLMENTS */}
                {rejected_enrollments.length > 0 && (
                  <View className="mb-4">
                    <Text className="text-xs font-m-bold text-textLight mb-2 px-1">
                      {rejected_enrollments.some((b) => {
                        const start = new Date(b.start_date);
                        start.setHours(0, 0, 0, 0);
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        return start > today;
                      })
                        ? "Rejected Future Requests"
                        : "Rejected Requests"}
                    </Text>
                    {rejected_enrollments.map((booking, index) => (
                      <ActionCard
                        key={`rejected-${index}`}
                        className="mb-3 opacity-80"
                        header={{
                          bg: "bg-red-50",
                          border: "border-red-100",
                          icon: "close-circle",
                          iconColor: "#DC2626",
                          title: "Request Rejected",
                          textColor: "text-red-800",
                        }}
                      >
                        <View className="flex-row justify-between items-start mb-2">
                          <View className="flex-1 pr-4">
                            <Text className="text-xs font-m text-textLight mb-2">
                              Was going to start on{" "}
                              {formatCleanDate(booking.start_date)}
                            </Text>

                            <View className="flex-row flex-wrap gap-1">
                              <Chip label={booking.shift} />
                              <Chip label={booking.amenity} />
                              <Chip label={booking.reservation} />
                              {booking.assigned_seat && (
                                <Chip
                                  label={booking.assigned_seat}
                                  type="SEAT"
                                />
                              )}
                              {booking.start_time && booking.end_time && (
                                <Chip
                                  type="TIME"
                                  label={`${formatTime(booking.start_time)} - ${formatTime(booking.end_time)}`}
                                />
                              )}
                            </View>
                          </View>
                        </View>

                        <View className="flex-row pt-2 border-t border-borderLight mt-2">
                          <Text className="flex-1 text-xs font-m text-red-600 mt-1">
                            Rejected on{" "}
                            {formatCleanDate(booking.updated_at, true)}
                          </Text>
                        </View>
                      </ActionCard>
                    ))}
                  </View>
                )}

                {/* 📌 HISTORY BOOKINGS */}
                {history_bookings.length > 0 && (
                  <View className="mb-4">
                    <Text className="text-xs font-m-bold text-textLight mb-2 px-1">
                      Past Bookings
                    </Text>
                    {history_bookings.map((booking, index) => (
                      <ActionCard
                        key={`history-${index}`}
                        className="mb-3 opacity-70"
                        header={{
                          bg: "bg-gray-50",
                          border: "border-gray-200",
                          icon:
                            booking.status === "CANCELLED"
                              ? "close-circle"
                              : "time",
                          iconColor: "#6B7280",
                          title:
                            booking.status === "EXPIRED"
                              ? "Expired"
                              : "Cancelled",
                          textColor: "text-gray-800",
                          rightElement: (
                            <Text className="text-[10px] font-m text-textLight text-right">
                              {booking.status === "EXPIRED"
                                ? `Ended ${booking.end_date ? formatCleanDate(booking.end_date) : "N/A"}`
                                : `Cancelled ${booking.updated_at ? formatCleanDate(booking.updated_at, true) : "N/A"}`}
                            </Text>
                          ),
                        }}
                      >
                        <View className="flex-row justify-between items-start">
                          <View className="flex-1">
                            <View className="flex-row flex-wrap gap-1">
                              <Chip label={booking.shift} />
                              <Chip label={booking.amenity} />
                              <Chip label={booking.reservation} />
                              {booking.assigned_seat && (
                                <Chip
                                  label={booking.assigned_seat}
                                  type="SEAT"
                                />
                              )}
                              {booking.start_time && booking.end_time && (
                                <Chip
                                  type="TIME"
                                  label={`${formatTime(booking.start_time)} - ${formatTime(booking.end_time)}`}
                                />
                              )}
                            </View>
                          </View>
                        </View>
                      </ActionCard>
                    ))}
                  </View>
                )}
              </View>
            )}
          </View>
        )}
        <View className="h-8" />
      </ScrollView>

      <Modal visible={showReceiptModal} transparent animationType="fade">
        <View className="flex-1 bg-black/60 justify-center items-center px-6">
          <View className="bg-white rounded-3xl p-6 w-full shadow-lg">
            <View className="w-14 h-14 bg-brand/10 rounded-full items-center justify-center mb-4">
              <Ionicons name="document-text" size={26} color={COLORS.brand} />
            </View>

            <Text className="text-xl font-m-bold text-textDark mb-2">
              Request Official Receipt
            </Text>
            <Text className="text-textLight font-m text-sm mb-5 leading-5">
              To prevent fraudulent editing, official receipts are generated
              securely on our servers and emailed directly to you.
            </Text>

            <Text className="text-xs font-m-bold text-textDark mb-1.5 ml-1 uppercase tracking-wider">
              Email Address
            </Text>
            <TextInput
              value={receiptEmail}
              onChangeText={setReceiptEmail}
              placeholder="student@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              className="border border-borderLight rounded-xl px-4 py-3.5 mb-6 font-m text-textDark bg-surface focus:border-brand"
            />

            <View className="flex-row gap-3">
              <Button
                title="Cancel"
                variant="outline"
                className="flex-1 py-3"
                onPress={() => setShowReceiptModal(false)}
              />
              <Button
                title="Email Me"
                variant="primary"
                className="flex-1 py-3"
                loading={isSendingReceipt}
                onPress={sendReceiptToEmail}
              />
            </View>
          </View>
        </View>
      </Modal>

      <PaymentModal
        visible={!!paymentConfig}
        onClose={() => setPaymentConfig(null)}
        price={paymentConfig?.price}
        ownerPhone={paymentConfig?.owner_phone || primary_booking?.owner_phone}
        enrollmentId={paymentConfig?.enrollment_id}
        onSuccess={() => {
          setPaymentConfig(null);
          fetchDashboard();
        }}
      />
    </View>
  );
}
