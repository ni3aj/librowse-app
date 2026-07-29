import apiClient from "@/api/client";
import Header from "@/components/ui/Header";
import { COLORS } from "@/constants/theme";
import { useAuthStore } from "@/store/authStore";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient"; // 📌 Used for that beautiful blue card
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";

// 📌 Reusable Avatar Component
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
  const [view, setView] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [totalCollected, setTotalCollected] = useState(0);
  const [pendingPayments, setPendingPayments] = useState([]);
  const [historyPayments, setHistoryPayments] = useState([]);

  const fetchData = async () => {
    try {
      const { libraryId } = useAuthStore();
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

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // 📌 Calls the existing mark-paid endpoint
  const onMarkPaid = async (enrollmentId) => {
    try {
      const response = await apiClient.patch(
        `/owner/requests/${enrollmentId}/mark-paid`,
      );
      if (response.data.success) {
        Toast.show({ type: "success", text1: "Payment Marked as Paid!" });
        fetchData(); // Refresh list automatically
      }
    } catch (error) {
      Toast.show({ type: "error", text1: "Failed to mark paid" });
    }
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
      <Header title="Payments" />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View className="px-4 pt-4 pb-3">
          {/* Summary Card */}
          <LinearGradient
            colors={[COLORS.textDark, COLORS.textLight]}
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

        {/* Toggle */}
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

        {/* List Section */}
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
              pendingPayments.map((p) => (
                <View
                  key={p.id}
                  className={`bg-white rounded-2xl p-4 mb-3 border ${
                    p.overdue ? "border-red-200" : "border-borderLight"
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
                        {p.overdue && (
                          <View className="bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-full ml-2">
                            <Text className="text-[9px] font-m-bold text-red-600 uppercase">
                              Overdue
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text className="text-[12px] text-textLight mt-0.5">
                        {p.plan} • Due {p.dueDate}
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-[16px] font-m-extra text-textDark">
                        ₹{p.amount.toLocaleString("en-IN")}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => onMarkPaid(p.id)}
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
                      Mark as Paid (Offline)
                    </Text>
                  </TouchableOpacity>
                </View>
              ))
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
