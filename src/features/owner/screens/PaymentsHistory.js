import apiClient from "@/api/client";
import Header from "@/components/ui/Header";
import { COLORS } from "@/constants/theme";
import { useLibraryStore } from "@/store/libraryStore";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";

const Av = ({ initials, src, size = 38 }) => {
  if (src) {
    return (
      <Image
        source={{ uri: src }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }
  return (
    <View
      style={{ width: size, height: size, borderRadius: size / 2 }}
      className="bg-brand/10 items-center justify-center border border-brand/20"
    >
      <Text className="text-brand font-m-bold" style={{ fontSize: size * 0.4 }}>
        {initials?.charAt(0)?.toUpperCase() || "?"}
      </Text>
    </View>
  );
};

export default function PaymentsHistory() {
  const { libraryId } = useLibraryStore();

  const [view, setView] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [totalCollected, setTotalCollected] = useState(0);
  const [pendingPayments, setPendingPayments] = useState([]);
  const [historyPayments, setHistoryPayments] = useState([]);

  const loadedLibIdRef = useRef(null);

  const fetchData = async () => {
    if (!libraryId) return;

    try {
      const response = await apiClient.get(`/owner/payments/${libraryId}`);
      if (response.data.success) {
        setTotalCollected(response.data.data.totalCollected);
        setPendingPayments(response.data.data.pendingPayments);
        setHistoryPayments(response.data.data.historyPayments);
      }
    } catch (error) {
      Toast.show({ type: "error", text1: "Failed to load payments" });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const init = async () => {
        if (loadedLibIdRef.current !== libraryId) {
          setLoading(true);
          setPendingPayments([]);
          setHistoryPayments([]);
          setTotalCollected(0);
        }

        if (libraryId) {
          await fetchData();
        }

        if (isActive) {
          loadedLibIdRef.current = libraryId;
        }
      };

      init();

      return () => {
        isActive = false;
      };
    }, [libraryId]),
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // 📌 THE FIX: Added Confirmation Alert & Smart Text for Renewals
  const onMarkPaid = (enrollmentId, studentName, isRenewal) => {
    Alert.alert(
      "Confirm Payment",
      isRenewal
        ? `Did ${studentName.trim()} pay you for their renewal? This will instantly extend their seat by 30 days and log the revenue.`
        : `Did ${studentName.trim()} pay you directly? This will instantly activate their seat and log the revenue.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes, Confirm",
          onPress: async () => {
            try {
              const response = await apiClient.patch(
                `/owner/requests/${enrollmentId}/mark-paid`,
              );
              if (response.data.success) {
                Toast.show({
                  type: "success",
                  text1: "Success",
                  text2: isRenewal
                    ? "Seat renewed successfully!"
                    : "Payment Marked as Paid!",
                });
                fetchData();
              }
            } catch (error) {
              Toast.show({
                type: "error",
                text1: "Error",
                text2: error.response?.data?.error || "Failed to mark paid",
              });
            }
          },
        },
      ],
    );
  };

  const totalPending = pendingPayments.reduce((s, p) => s + p.amount, 0);
  const overdueCount = pendingPayments.filter((p) => p.overdue).length;

  if (loading) {
    return (
      <View className="flex-1 bg-background justify-center items-center">
        <ActivityIndicator size="large" color={COLORS.brand} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <Header title="Payments" showLibraryDropdown={true} />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View className="px-4 pt-4 pb-3">
          <LinearGradient
            colors={[COLORS.brand, COLORS.brandAccent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ borderRadius: 24 }}
            className="rounded-xl p-4 flex-row"
          >
            <View className="flex-1 items-center">
              <Text className="text-white/50 text-[10px] font-m-bold uppercase tracking-wider mb-1">
                Collected
              </Text>
              <Text className="text-white text-[20px] font-m-bold">
                ₹{totalCollected}
              </Text>
            </View>
            <View className="w-[1px] bg-white/15" />
            <View className="flex-1 items-center">
              <Text className="text-white/50 text-[10px] font-m-bold uppercase tracking-wider mb-1">
                Pending
              </Text>
              <Text className="text-amber-400 text-[20px] font-m-bold">
                ₹{totalPending}
              </Text>
            </View>
            <View className="w-[1px] bg-white/15" />
            <View className="flex-1 items-center">
              <Text className="text-white/50 text-[10px] font-m-bold uppercase tracking-wider mb-1">
                Overdue
              </Text>
              <Text className="text-red-400 text-[20px] font-m-bold">
                {overdueCount}
              </Text>
            </View>
          </LinearGradient>
        </View>

        <View className="px-4 mb-3">
          <View className="flex-row bg-gray-200 p-1 rounded-2xl">
            {["pending", "history"].map((v) => {
              const isActive = view === v;
              return (
                <TouchableOpacity
                  key={v}
                  onPress={() => setView(v)}
                  activeOpacity={0.8}
                  className={`flex-1 py-2.5 rounded-xl items-center justify-center ${
                    isActive ? "bg-white" : "bg-transparent"
                  }`}
                >
                  <Text
                    className={`text-[13px] font-m-bold ${
                      isActive ? "text-[#0F1E35]" : "text-gray-500"
                    }`}
                  >
                    {v === "pending"
                      ? `Pending (${pendingPayments.length})`
                      : "History"}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View className="px-4 space-y-3 mt-2">
          {view === "pending" ? (
            pendingPayments.length === 0 ? (
              <View className="py-16 items-center">
                <Ionicons name="checkmark-circle" size={48} color="#10B981" />
                <Text className="font-m-bold text-gray-500 text-sm mt-3">
                  All payments collected!
                </Text>
              </View>
            ) : (
              pendingPayments.map((p) => {
                // 📌 Identify if it's a renewal
                const isRenewal = p.status === "ACTIVE";

                return (
                  <View
                    key={p.id}
                    className={`bg-white rounded-2xl p-4 mb-3 border ${
                      p.overdue
                        ? "border-red-200 bg-red-50/30"
                        : "border-borderLight"
                    }`}
                  >
                    <View className="flex-row items-center">
                      <Av initials={p.name} src={p.avatar} size={42} />
                      <View className="flex-1 ml-3 pr-2">
                        <View className="flex-row items-center">
                          <Text
                            className="text-[14px] font-m-bold text-textDark flex-shrink"
                            numberOfLines={1}
                          >
                            {p.name}
                          </Text>
                          {/* 📌 RENEWAL BADGE */}
                          {isRenewal && (
                            <View className="bg-purple-100 px-2 py-0.5 rounded border border-purple-200 ml-2">
                              <Text className="text-[9px] font-m-bold text-purple-700 uppercase tracking-widest">
                                Renewal
                              </Text>
                            </View>
                          )}
                          {/* Only show overdue if it isn't an active renewal (optional tweak) */}
                          {p.overdue && !isRenewal && (
                            <View className="bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-full ml-2">
                              <Text className="text-[9px] font-m-bold text-red-600 uppercase">
                                Overdue
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text className="text-[12px] text-textLight mt-0.5">
                          {/* 📌 Dynamic Text based on renewal status */}
                          {p.plan} •{" "}
                          {isRenewal && p.end_date
                            ? `Ends on ${p.end_date}`
                            : `Due ${p.dueDate}`}
                        </Text>
                      </View>
                      <View className="items-end">
                        <Text className="text-[16px] font-m-extra text-textDark">
                          ₹{p.amount.toLocaleString("en-IN")}
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      onPress={() => onMarkPaid(p.id, p.name, isRenewal)}
                      activeOpacity={0.8}
                      className="mt-4 w-full py-3 rounded-xl flex-row items-center justify-center bg-[#0F1E35]"
                    >
                      <Ionicons
                        name="checkbox-outline"
                        size={16}
                        color="white"
                        style={{ marginRight: 6 }}
                      />
                      <Text className="text-white text-[13px] font-m-bold">
                        {isRenewal
                          ? "Confirm Renewal Payment"
                          : "Mark as Paid (Offline)"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })
            )
          ) : historyPayments.length === 0 ? (
            <View className="py-16 items-center">
              <Ionicons
                name="receipt-outline"
                size={48}
                color={COLORS.borderLight}
              />
              <Text className="font-m-bold text-gray-500 text-sm mt-3">
                No payment history yet.
              </Text>
            </View>
          ) : (
            historyPayments.map((tx) => (
              <View
                key={tx.id}
                className="bg-white rounded-2xl p-4 mb-3 flex-row items-center border border-borderLight"
              >
                <Av initials={tx.name} src={tx.avatar} size={42} />
                <View className="flex-1 ml-3 pr-2">
                  <Text
                    className="text-[14px] font-m-bold text-textDark"
                    numberOfLines={1}
                  >
                    {tx.name}
                  </Text>
                  <Text className="text-[11px] text-textLight mt-0.5">
                    {tx.time}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="text-[15px] font-m-bold text-emerald-600">
                    +₹{tx.amount.toLocaleString("en-IN")}
                  </Text>
                  <Text
                    className={`text-[10px] font-m-bold mt-0.5 uppercase tracking-wider ${
                      tx.method === "Online"
                        ? "text-sky-500"
                        : "text-violet-600"
                    }`}
                  >
                    {tx.method}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}
