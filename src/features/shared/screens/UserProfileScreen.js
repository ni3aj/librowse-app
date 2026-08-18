import apiClient from "@/api/client";
import ActionCard from "@/components/ui/ActionCard";
import Chip from "@/components/ui/Chip";
import Header from "@/components/ui/Header";
import { COLORS } from "@/constants/theme";
import { useAuthStore } from "@/store/authStore";
import { useLibraryStore } from "@/store/libraryStore";
import { formatCleanDate } from "@/utils/dateFormatter";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

function fmtCurrency(val) {
  if (!val) return "₹0";
  return "₹" + parseFloat(val).toLocaleString("en-IN");
}

const STATUS_CONFIG = {
  ACTIVE: { label: "Active", bg: "bg-emerald-500", dot: "bg-emerald-400" },
  PAYMENT_PENDING: {
    label: "Payment Pending",
    bg: "bg-amber-400",
    dot: "bg-amber-300",
  },
  PAYMENT_CLAIMED: {
    label: "Verification Pending",
    bg: "bg-yellow-500",
    dot: "bg-yellow-300",
  },
  PENDING: {
    label: "Pending Approval",
    bg: "bg-blue-500",
    dot: "bg-blue-400",
  },
  SUCCESSFUL: { label: "Paid", bg: "bg-emerald-500", dot: "bg-emerald-400" },
  FAILED: { label: "Failed", bg: "bg-red-500", dot: "bg-red-400" },
  EXPIRED: { label: "Expired", bg: "bg-red-500", dot: "bg-red-400" },
  REJECTED: { label: "Rejected", bg: "bg-gray-500", dot: "bg-gray-400" },
  CANCELLED: { label: "Cancelled", bg: "bg-gray-500", dot: "bg-gray-400" },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] ?? {
    label: status?.replace("_", " ") || "UNKNOWN",
    bg: "bg-gray-400",
    dot: "bg-gray-300",
  };
  return (
    <View
      className={`flex-row items-center gap-1.5 rounded-full px-3 py-1 ${cfg.bg}`}
    >
      <View className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      <Text className="text-[11px] font-m-bold text-white uppercase">
        {cfg.label}
      </Text>
    </View>
  );
}

function SectionLabel({
  title,
  count,
  rightElement,
  isCollapsible,
  isExpanded,
  onPress,
}) {
  const Wrapper = isCollapsible ? TouchableOpacity : View;

  return (
    <Wrapper
      onPress={isCollapsible ? onPress : undefined}
      activeOpacity={0.7}
      className="flex-row items-center justify-between mb-3 px-1"
    >
      <View className="flex-row items-center gap-2">
        <Text className="text-[12px] font-m-bold tracking-widest uppercase text-textDark">
          {title}
        </Text>
        {count !== undefined && (
          <View className="bg-pink-100 rounded-full px-2.5 py-0.5">
            <Text className="text-[10px] font-m-semi text-pink-600">
              {count}
            </Text>
          </View>
        )}
      </View>
      <View className="flex-row items-center gap-2">
        {rightElement}
        {isCollapsible && (
          <Ionicons
            name={isExpanded ? "chevron-up" : "chevron-down"}
            size={18}
            color={COLORS.textLight}
          />
        )}
      </View>
    </Wrapper>
  );
}

function InfoRow({ emoji, label, value, mono = false }) {
  return (
    <View className="flex-row items-start gap-3 py-2.5">
      <View className="w-9 h-9 rounded-xl bg-surface items-center justify-center shrink-0">
        <Text className="text-base">{emoji}</Text>
      </View>
      <View className="flex-1">
        <Text className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">
          {label}
        </Text>
        <Text
          className={`text-sm font-semibold text-indigo-900 ${mono ? "font-mono" : ""}`}
          numberOfLines={2}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

function PaymentCard({ payment }) {
  return (
    <View className="bg-white rounded-2xl border border-pink-100 mb-3 overflow-hidden">
      <View className="px-4 py-4">
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-row items-center gap-3 flex-1 min-w-0">
            <View className="w-11 h-11 rounded-2xl bg-surface items-center justify-center shrink-0">
              <Text className="text-xl">💳</Text>
            </View>
            <View className="flex-1 min-w-0">
              <Text className="text-lg font-m-bold text-indigo-900">
                {fmtCurrency(payment.amount)}
              </Text>
              <Text className="text-[11px] text-gray-400 font-m mt-0.5">
                {formatCleanDate(payment.paid_on)} · {payment.mode}
              </Text>
            </View>
          </View>
          <StatusBadge status={payment.payment_status} />
        </View>

        <View className="flex-row flex-wrap mt-3 gap-1">
          <Chip label={payment.shift} />
          <Chip label={payment.amenity} />
          <Chip label={payment.assigned_seat} />
        </View>

        <View className="mt-3 pt-3 border-t border-pink-50 flex-row gap-6">
          <View>
            <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">
              Period
            </Text>
            <Text className="text-xs font-m-semi text-gray-600">
              {formatCleanDate(payment.start_date)} →{" "}
              {formatCleanDate(payment.end_date)}
            </Text>
          </View>
          <View>
            <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">
              Reservation
            </Text>
            <Text className="text-xs font-semibold text-gray-600">
              {payment.reservation}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams();
  const { role, userId } = useAuthStore();
  const { libraryId } = useLibraryStore();

  const isViewerOwner = role === "owner";
  const isSelf = String(userId) === String(id);
  const canViewSensitiveData = isViewerOwner || isSelf;

  const [user, setUser] = useState(null);
  const [enrollment, setEnrollment] = useState(null);
  const [futureEnrollment, setFutureEnrollment] = useState(null);
  const [rejectedEnrollments, setRejectedEnrollments] = useState([]);
  const [cancelledEnrollments, setCancelledEnrollments] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isFutureExpanded, setIsFutureExpanded] = useState(false);
  const [isRejectedExpanded, setIsRejectedExpanded] = useState(false);
  const [isCancelledExpanded, setIsCancelledExpanded] = useState(false);
  const [isPaymentsExpanded, setIsPaymentsExpanded] = useState(false);

  useEffect(() => {
    fetchUserProfile();
  }, [id, libraryId]);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const endpoint = `/user/${id}${libraryId ? `?libraryId=${libraryId}` : ""}`;
      const response = await apiClient.get(endpoint);

      if (response.data.success) {
        setUser(response.data.user);
        setEnrollment(response.data.enrollment);
        setFutureEnrollment(response.data.future_enrollment);
        setRejectedEnrollments(response.data.rejected_enrollments || []);
        setCancelledEnrollments(response.data.cancelled_enrollments || []);
        setPayments(response.data.payments || []);
      }
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to load user profile.",
      });
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const openMap = () => {
    if (user?.latitude && user?.longitude) {
      Linking.openURL(
        `http://maps.google.com/maps?q=${user.latitude},${user.longitude}`,
      );
    } else {
      Toast.show({ type: "info", text1: "Location Unavailable" });
    }
  };

  // 📌 Helper to configure the ActionCard header globally
  const getHeaderConfig = (booking, defaultTitle) => {
    const isClaimed = !!booking.payment_claimed_at;
    let config = {
      title: defaultTitle,
      textColor: "text-gray-800",
      bg: "bg-gray-50",
      border: "border-gray-200",
      icon: "information-circle",
      iconColor: "#6B7280",
    };

    if (booking.status === "ACTIVE") {
      config = {
        title: "Active Subscription",
        textColor: "text-emerald-800",
        bg: "bg-emerald-50",
        border: "border-emerald-100",
        icon: "checkmark-circle",
        iconColor: "#059669",
      };
    } else if (booking.status === "PENDING") {
      config = {
        title: "Approval Pending",
        textColor: "text-blue-800",
        bg: "bg-blue-50",
        border: "border-blue-100",
        icon: "time",
        iconColor: "#2563EB",
      };
    } else if (booking.status === "PAYMENT_PENDING" && !isClaimed) {
      config = {
        title: "Payment Pending",
        textColor: "text-brandAccent",
        bg: "bg-brandAccent/10",
        border: "border-brandAccent/20",
        icon: "alert-circle",
        iconColor: COLORS.brandAccent,
      };
    } else if (booking.status === "PAYMENT_PENDING" && isClaimed) {
      config = {
        title: "Verification Pending",
        textColor: "text-yellow-800",
        bg: "bg-yellow-50",
        border: "border-yellow-200",
        icon: "shield-checkmark",
        iconColor: "#CA8A04",
      };
    } else if (booking.status === "REJECTED") {
      config = {
        title: "Request Rejected",
        textColor: "text-red-800",
        bg: "bg-red-50",
        border: "border-red-100",
        icon: "close-circle",
        iconColor: "#DC2626",
      };
    } else if (booking.status === "CANCELLED") {
      config = {
        title: "Request Cancelled",
        textColor: "text-gray-800",
        bg: "bg-gray-100",
        border: "border-gray-200",
        icon: "close-circle",
        iconColor: "#4B5563",
      };
    }

    return config;
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-[#F7F5FA] justify-center items-center">
        <ActivityIndicator size="large" color="#C13383" />
      </SafeAreaView>
    );
  }

  if (!user) return null;

  const isActive = enrollment?.status === "ACTIVE";

  return (
    <View className="flex-1 bg-background">
      <Header title={canViewSensitiveData ? "Student Profile" : "Profile"} />

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pt-2 pb-12"
        showsVerticalScrollIndicator={false}
      >
        <View className="rounded-3xl overflow-hidden mb-5">
          <LinearGradient
            colors={[COLORS.brandAccent, COLORS.brand]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View className="px-5 pt-7 pb-5 flex-row gap-4 items-start">
              <View className="relative shrink-0">
                <Image
                  source={{
                    uri:
                      user.profile_photo ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name)}&background=C13383&color=fff&size=128`,
                  }}
                  className="w-20 h-20 rounded-2xl"
                  style={{ backgroundColor: COLORS.textDark }}
                  resizeMode="cover"
                />
                <View
                  className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${isActive ? "bg-emerald-400" : "bg-gray-400"}`}
                />
              </View>

              <View className="flex-1 pt-0">
                <Text className="text-[18px] font-m-bold text-white leading-tight">
                  {user.full_name}
                </Text>
                <View className="flex-row items-center gap-1 mt-2">
                  {user.is_kyc_verified ? (
                    <View className="flex-row items-center gap-1 bg-emerald-400/20 rounded-full px-2 py-0.5 border border-emerald-400/30">
                      <Text className="text-[11px] font-m-bold text-emerald-300">
                        <Ionicons
                          name="shield-checkmark-outline"
                          size={14}
                          color="text-emerald-300"
                        />{" "}
                        KYC Verified
                      </Text>
                    </View>
                  ) : (
                    <View className="flex-row items-center gap-1 bg-amber-400/20 rounded-full px-2 py-0.5 border border-amber-400/30">
                      <Text className="text-[10px] font-m-bold text-amber-300">
                        <Ionicons
                          name="shield-outline"
                          size={14}
                          color="text-amber-300"
                        />{" "}
                        KYC Pending
                      </Text>
                    </View>
                  )}
                </View>
                <Text className="text-[11px] text-white/50 font-m mt-1.5">
                  Member since {formatCleanDate(user.member_since)}
                </Text>
              </View>
            </View>

            <View className="px-5 py-4 gap-2 border-t border-white/10 bg-black/5">
              <View className="flex-row gap-4">
                <View className="flex-row items-center gap-2 flex-1 min-w-0">
                  <Ionicons name="call-outline" size={14} color="white" />
                  <Text
                    className={`text-xs font-m-semi ${canViewSensitiveData ? "text-white/85" : "text-emerald-300"}`}
                    numberOfLines={1}
                  >
                    {canViewSensitiveData ? user.phone : "Hidden for safety"}
                  </Text>
                </View>

                <View className="flex-row items-center gap-2 flex-1 min-w-0">
                  <Ionicons name="location-outline" size={14} color="white" />
                  <Text
                    className="text-xs font-m-semi text-white/85"
                    numberOfLines={1}
                  >
                    {user.city || "Not Provided"}
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center gap-2 min-w-0">
                <Ionicons name="mail-outline" size={14} color="white" />
                <Text
                  className={`text-xs font-m-semi flex-1 ${canViewSensitiveData ? "text-white/85" : "text-emerald-300"}`}
                  numberOfLines={1}
                >
                  {canViewSensitiveData
                    ? user.email || "No Email"
                    : "Hidden for safety"}
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        <SectionLabel title="More Details" />
        <View className="bg-white rounded-2xl border border-borderLight overflow-hidden mb-4">
          <View className="px-4 py-2">
            <InfoRow
              emoji="🏠"
              label="Full Address"
              value={
                canViewSensitiveData
                  ? `${user.address || "N/A"}, ${user.city || "N/A"}`
                  : "🔒 Hidden for safety purpose"
              }
            />
            <View className="h-px bg-gray-100" />
            <View className="flex-row items-center justify-between">
              <InfoRow
                emoji="🌐"
                label="Location"
                value={
                  canViewSensitiveData
                    ? user.latitude != null
                      ? `${user.latitude}, ${user.longitude}`
                      : "Not mapped"
                    : "🔒 Hidden for safety purpose"
                }
              />
              {canViewSensitiveData && user.latitude && (
                <TouchableOpacity
                  onPress={openMap}
                  className="bg-indigo-50 p-2 rounded-full mr-2"
                >
                  <Ionicons name="map" size={18} color="#443199" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {canViewSensitiveData && (
          <>
            {/* Current Enrollment */}
            {enrollment && (
              <>
                <SectionLabel title="Current Enrollment" />
                <ActionCard
                  header={{
                    ...getHeaderConfig(enrollment, "Current Plan"),
                    rightElement: (
                      <Text className="text-base font-m-bold text-dark">
                        {fmtCurrency(enrollment.price)}
                      </Text>
                    ),
                  }}
                >
                  <View className="flex-row flex-wrap mb-1 gap-1">
                    <Chip label={enrollment.shift} />
                    <Chip label={enrollment.amenity} />
                    <Chip label={enrollment.reservation} />
                    {enrollment.assigned_seat && (
                      <Chip label={enrollment.assigned_seat} type="SEAT" />
                    )}
                  </View>
                  <View className="flex-row items-center gap-1.5 mt-3">
                    <Ionicons
                      name="calendar-outline"
                      size={14}
                      color={COLORS.textLight}
                    />
                    <Text className="text-xs font-m-semi text-gray-500">
                      {formatCleanDate(enrollment.start_date)}
                      {enrollment.end_date &&
                        ` → ${formatCleanDate(enrollment.end_date)}`}
                    </Text>
                  </View>
                  {isViewerOwner && (
                    <Text className="text-[10px] text-textLight mt-2">
                      Requested: {formatCleanDate(enrollment.requested_on)}
                    </Text>
                  )}
                </ActionCard>
              </>
            )}

            {/* Upcoming Enrollment */}
            {futureEnrollment && (
              <>
                <SectionLabel
                  title="Upcoming Enrollment"
                  isCollapsible
                  isExpanded={isFutureExpanded}
                  onPress={() => setIsFutureExpanded(!isFutureExpanded)}
                />
                {isFutureExpanded && (
                  <ActionCard
                    header={{
                      ...getHeaderConfig(futureEnrollment, "Upcoming Plan"),
                      bg: "bg-indigo-50",
                      border: "border-indigo-100",
                      textColor: "text-indigo-800",
                      icon: "calendar",
                      iconColor: "#4F46E5",
                      rightElement: (
                        <Text className="text-base font-m-bold text-dark">
                          {fmtCurrency(futureEnrollment.price)}
                        </Text>
                      ),
                    }}
                  >
                    <View className="flex-row flex-wrap mb-1 gap-1">
                      <Chip label={futureEnrollment.shift} />
                      <Chip label={futureEnrollment.amenity} />
                      <Chip label={futureEnrollment.reservation} />
                      {futureEnrollment.assigned_seat && (
                        <Chip
                          label={futureEnrollment.assigned_seat}
                          type="SEAT"
                        />
                      )}
                    </View>
                    <View className="flex-row items-center gap-1.5 mt-3">
                      <Ionicons
                        name="calendar-outline"
                        size={14}
                        color={COLORS.textLight}
                      />
                      <Text className="text-xs font-m-semi text-gray-500">
                        {formatCleanDate(futureEnrollment.start_date)}
                        {futureEnrollment.end_date &&
                          ` → ${formatCleanDate(futureEnrollment.end_date)}`}
                      </Text>
                    </View>
                  </ActionCard>
                )}
              </>
            )}

            {/* Rejected Requests */}
            {rejectedEnrollments.length > 0 && (
              <>
                <SectionLabel
                  title="Rejected Requests"
                  count={rejectedEnrollments.length}
                  isCollapsible
                  isExpanded={isRejectedExpanded}
                  onPress={() => setIsRejectedExpanded(!isRejectedExpanded)}
                />
                {isRejectedExpanded &&
                  rejectedEnrollments.map((rejEnrollment, idx) => (
                    <ActionCard
                      key={`rej-${idx}`}
                      header={getHeaderConfig(rejEnrollment, "Rejected Plan")}
                    >
                      <View className="flex-row flex-wrap mb-1 gap-1">
                        <Chip label={rejEnrollment.shift} />
                        <Chip label={rejEnrollment.amenity} />
                        <Chip label={rejEnrollment.reservation} />
                      </View>
                      <Text className="text-xs font-m text-red-600 mt-3">
                        Rejected on{" "}
                        {formatCleanDate(rejEnrollment.updated_at, true)}
                      </Text>
                    </ActionCard>
                  ))}
              </>
            )}

            {/* Cancelled Requests */}
            {cancelledEnrollments.length > 0 && (
              <>
                <SectionLabel
                  title="Cancelled Requests"
                  count={cancelledEnrollments.length}
                  isCollapsible
                  isExpanded={isCancelledExpanded}
                  onPress={() => setIsCancelledExpanded(!isCancelledExpanded)}
                />
                {isCancelledExpanded &&
                  cancelledEnrollments.map((cancEnrollment, idx) => (
                    <ActionCard
                      key={`canc-${idx}`}
                      header={getHeaderConfig(cancEnrollment, "Cancelled Plan")}
                    >
                      <View className="flex-row flex-wrap mb-1 gap-1">
                        <Chip label={cancEnrollment.shift} />
                        <Chip label={cancEnrollment.amenity} />
                        <Chip label={cancEnrollment.reservation} />
                      </View>
                      <Text className="text-xs font-m text-gray-500 mt-3">
                        Cancelled on{" "}
                        {formatCleanDate(cancEnrollment.updated_at, true)}
                      </Text>
                    </ActionCard>
                  ))}
              </>
            )}

            {/* Payment History */}
            <SectionLabel
              title="Payment History"
              count={payments.length}
              isCollapsible
              isExpanded={isPaymentsExpanded}
              onPress={() => setIsPaymentsExpanded(!isPaymentsExpanded)}
            />
            {isPaymentsExpanded &&
              (payments.length === 0 ? (
                <View className="bg-white border border-borderLight p-6 rounded-2xl items-center mb-4">
                  <Ionicons
                    name="receipt-outline"
                    size={32}
                    color="#9ca3af"
                    className="mb-2"
                  />
                  <Text className="text-gray-400 font-medium mt-2 text-xs">
                    No payment history yet.
                  </Text>
                </View>
              ) : (
                payments.map((payment, i) => (
                  <PaymentCard key={i} payment={payment} />
                ))
              ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}
