import apiClient from "@/api/client";
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
  Alert,
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
  PENDING: {
    label: "Pending Approval",
    bg: "bg-orange-500",
    dot: "bg-orange-400",
  },
  SUCCESSFUL: { label: "Paid", bg: "bg-emerald-500", dot: "bg-emerald-400" },
  FAILED: { label: "Failed", bg: "bg-red-500", dot: "bg-red-400" },
  EXPIRED: { label: "Expired", bg: "bg-red-500", dot: "bg-red-400" },
  REJECTED: { label: "Rejected", bg: "bg-gray-500", dot: "bg-gray-400" },
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

function SectionLabel({ title, count, rightElement }) {
  return (
    <View className="flex-row items-center justify-between gap-2 mb-3 px-1">
      <Text className="text-[12px] font-m-bold tracking-widest uppercase text-textDark">
        {title}
      </Text>
      <View className="flex-2">
        {count !== undefined && (
          <View className="bg-pink-100 rounded-full px-2.5 py-0.5">
            <Text className="text-[10px] font-m-semi text-pink-600">
              {count}
            </Text>
          </View>
        )}
      </View>
      <View className="flex-1">{rightElement && rightElement}</View>
    </View>
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

function EnrollmentCard({
  enrollment,
  isFuture = false,
  isRejected = false,
  isOwner = false,
  children,
}) {
  const headerBg = "bg-background";
  const borderCl = "border-borderLight";

  let titleCl = "text-emerald-600";
  let title = "Current Plan";

  if (isRejected) {
    titleCl = "text-gray-600";
    title = "Rejected Request";
  } else if (isFuture) {
    titleCl = "text-red-500";
    title = "Upcoming Plan";
  }

  return (
    <View
      className={`rounded-2xl overflow-hidden bg-white border mb-4 ${borderCl}`}
    >
      <View
        className={`flex-row items-center justify-between px-4 py-3 border-b ${headerBg} ${borderCl}`}
      >
        <View className="flex-row items-center gap-2">
          <Text className={`text-s font-m-bold ${titleCl}`}>{title}</Text>
        </View>
        <StatusBadge status={enrollment.status} />
      </View>

      <View className="px-4 py-4 pb-2">
        <View className="flex-row items-center gap-1.5 mb-3">
          <Text className="text-xs">📅</Text>
          <Text className="text-xs font-m-semi text-gray-500">
            {formatCleanDate(enrollment.start_date)}
            {enrollment.end_date &&
              ` → ${formatCleanDate(enrollment.end_date)}`}
          </Text>
        </View>

        <View className="flex-row flex-wrap mb-1 mt-2 gap-1">
          <Chip label={enrollment.shift} />
          <Chip label={enrollment.amenity} />
          <Chip label={enrollment.reservation} />
          <Chip label={enrollment.assigned_seat} />
        </View>

        <View className="h-px bg-gray-100 my-3" />

        <View className="flex-row items-center justify-between pb-2">
          <Text className={`text-3xl font-black text-textDark/80`}>
            {fmtCurrency(enrollment.price)}
          </Text>
          {isOwner && (
            <View className="items-end">
              <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                Requested
              </Text>
              <Text className="text-xs font-m-semi text-gray-500 mt-0.5">
                {formatCleanDate(enrollment.requested_on)}
              </Text>
            </View>
          )}
        </View>
      </View>

      {children && (
        <View className="px-4 pb-4">
          <View className="h-px bg-gray-100 mb-3" />
          {children}
        </View>
      )}
    </View>
  );
}

function PaymentCard({ payment }) {
  return (
    <View className="bg-white rounded-2xl border border-pink-100 mb-3 overflow-hidden">
      <View className="px-4 py-4">
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-row items-center gap-3 flex-1 min-w-0">
            <View className="w-11 h-11 rounded-2xl bg-pink-50 items-center justify-center shrink-0">
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
  const [rejectedEnrollments, setRejectedEnrollments] = useState([]); // 📌 Added state for rejected
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

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
        setRejectedEnrollments(response.data.rejected_enrollments || []); // 📌 Populate rejected list
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

  const handleApprove = async (enrollment_id) => {
    try {
      const response = await apiClient.patch(
        `/owner/requests/${enrollment_id}/approve`,
      );
      if (response.data.success) {
        Toast.show({
          type: "success",
          text1: "Approved!",
          text2: "Awaiting student payment.",
        });
        fetchUserProfile();
      }
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: error.response?.data?.error || "Failed to approve.",
      });
    }
  };

  const handleDeny = async (enrollment_id) => {
    Alert.alert(
      "Deny Request",
      "Are you sure you want to reject this student?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reject",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await apiClient.patch(
                `/owner/requests/${enrollment_id}/reject`,
              );
              if (response.data.success) {
                Toast.show({ type: "success", text1: "Rejected" });
                fetchUserProfile();
              }
            } catch (error) {
              Toast.show({
                type: "error",
                text1: "Error",
                text2: error.response?.data?.error || "Failed to reject.",
              });
            }
          },
        },
      ],
    );
  };

  const handleMarkPaid = async (enrollment_id) => {
    Alert.alert(
      "Confirm Payment",
      `Did ${user.full_name} pay you directly offline?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Mark as Paid",
          onPress: async () => {
            try {
              const response = await apiClient.patch(
                `/owner/requests/${enrollment_id}/mark-paid`,
              );
              if (response.data.success) {
                Toast.show({
                  type: "success",
                  text1: "Success",
                  text2: "Seat is now Active.",
                });
                fetchUserProfile();
              }
            } catch (error) {
              Toast.show({
                type: "error",
                text1: "Error",
                text2: error.response?.data?.error || "Failed to mark paid.",
              });
            }
          },
        },
      ],
    );
  };

  const handleSendReminder = async () => {
    if (user?.phone) {
      const message = `Hi ${user.full_name}, your library subscription expired on ${formatCleanDate(enrollment?.end_date)}. Please let us know if you'd like to renew your seat!`;
      Linking.openURL(
        `whatsapp://send?phone=91${user.phone}&text=${encodeURIComponent(message)}`,
      );
    }
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

  const renderActionButtons = (plan) => {
    if (!plan || !isViewerOwner) return null;

    if (plan.status === "PENDING") {
      return (
        <View className="flex-row space-x-3 pt-1">
          <TouchableOpacity
            onPress={() => handleApprove(plan.enrollment_id)}
            className="flex-1 bg-[#C13383] py-3 rounded-xl items-center mr-2"
          >
            <Text className="text-white font-m-bold">Approve</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleDeny(plan.enrollment_id)}
            className="flex-1 bg-red-100 border border-red-200 py-3 rounded-xl items-center"
          >
            <Text className="text-red-700 font-m-bold">Deny</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (plan.status === "PAYMENT_PENDING") {
      return (
        <TouchableOpacity
          onPress={() => handleMarkPaid(plan.enrollment_id)}
          className="w-full bg-[#2563EB] py-3.5 rounded-xl items-center "
        >
          <Text className="text-white font-m-bold">Mark as Paid Offline</Text>
        </TouchableOpacity>
      );
    }

    if (plan.status === "EXPIRED") {
      return (
        <TouchableOpacity
          onPress={handleSendReminder}
          className="w-full bg-red-500 py-3.5 rounded-xl flex-row justify-center items-center "
        >
          <Ionicons name="logo-whatsapp" size={18} color="white" />
          <Text className="text-white font-m-bold ml-2">
            Send Renewal Reminder
          </Text>
        </TouchableOpacity>
      );
    }

    return null;
  };

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
            {enrollment && (
              <>
                <SectionLabel title="Current Enrollment" />
                <EnrollmentCard enrollment={enrollment} isOwner={isViewerOwner}>
                  {renderActionButtons(enrollment)}
                </EnrollmentCard>
              </>
            )}

            {futureEnrollment && (
              <>
                <SectionLabel title="Upcoming Enrollment" />
                <EnrollmentCard
                  enrollment={futureEnrollment}
                  isFuture={true}
                  isOwner={isViewerOwner}
                >
                  {renderActionButtons(futureEnrollment)}
                </EnrollmentCard>
              </>
            )}

            {/* 📌 New: Render Rejected Enrollments */}
            {rejectedEnrollments.length > 0 && (
              <>
                <SectionLabel
                  title="Rejected Requests"
                  count={rejectedEnrollments.length}
                />
                {rejectedEnrollments.map((rejEnrollment, idx) => (
                  <EnrollmentCard
                    key={`rej-${idx}`}
                    enrollment={rejEnrollment}
                    isRejected={true}
                    isOwner={isViewerOwner}
                  />
                ))}
              </>
            )}

            <SectionLabel title="Payment History" count={payments.length} />

            {payments.length === 0 ? (
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
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}
