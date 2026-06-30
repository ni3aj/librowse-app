import apiClient from "@/api/client";
import Button from "@/components/ui/Button";
import { COLORS } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function DashboardScreen() {
  const [libraries, setLibraries] = useState([]);
  const [selectedLibrary, setSelectedLibrary] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    fetchMyLibraries();
  }, []);

  useEffect(() => {
    if (selectedLibrary) fetchDashboardStats(selectedLibrary.id);
  }, [selectedLibrary]);

  const fetchMyLibraries = async () => {
    try {
      const response = await apiClient.get("/owner/my-libraries");
      if (response.data.success && response.data.libraries.length > 0) {
        setLibraries(response.data.libraries);
        setSelectedLibrary(response.data.libraries[0]);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to load your libraries.");
    }
  };

  const fetchDashboardStats = async (libraryId) => {
    setLoading(true);
    try {
      const response = await apiClient.get(`/owner/dashboard/${libraryId}`);
      if (response.data.success) {
        setStats(response.data);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to fetch stats.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* --- HEADER --- */}
      <View className="flex-row justify-between items-center px-6 pt-4 pb-6">
        <Text className="text-2xl font-m-extra text-textDark">Dashboard</Text>
        <TouchableOpacity
          onPress={() => setModalVisible(true)}
          className="flex-row items-center bg-white border border-borderLight rounded-full px-4 py-2 shadow-sm"
        >
          <Text className="text-textDark font-m-bold text-sm mr-2">
            {selectedLibrary?.name || "Select"}
          </Text>
          <Ionicons name="chevron-down" size={16} color={COLORS.textDark} />
        </TouchableOpacity>
      </View>

      <ScrollView className="px-6">
        {loading ? (
          <ActivityIndicator
            className="mt-20"
            size="large"
            color={COLORS.brand}
          />
        ) : stats ? (
          <>
            {/* --- METRICS --- */}
            <View className="flex-row flex-wrap justify-between mb-6">
              <MetricCard
                label="Pending"
                value={stats.metrics.pending_count}
                color="brandAccent"
              />
              <MetricCard
                label="Occupied"
                value={`${stats.metrics.active_users_count}/${stats.metrics.total_capacity}`}
                color="brand"
              />
              <MetricCard
                label="Revenue"
                value={`₹${Math.round(stats.metrics.monthly_revenue)}`}
                color="textLight"
                full
              />
            </View>

            {/* --- PENDING REQUESTS --- */}
            <Text className="text-lg font-m-bold text-textDark mb-4">
              Pending Approvals
            </Text>
            {stats.pendingRequests.map((req) => (
              <View
                key={req.id}
                className="bg-white p-4 rounded-2xl mb-3 border border-borderLight"
              >
                <Text className="font-m-bold text-textDark">
                  {req.student_name}
                </Text>
                <Text className="text-sm font-m text-textLight">
                  {req.seat_type} • Since {req.start_date}
                </Text>
                <View className="flex-row mt-3">
                  <Button
                    title="Accept"
                    variant="primary"
                    className="py-2 px-6 mr-2"
                  />
                  <Button
                    title="Deny"
                    variant="outline"
                    className="py-2 px-6"
                  />
                </View>
              </View>
            ))}
          </>
        ) : (
          <Text className="text-center font-m text-textLight mt-10">
            No library selected.
          </Text>
        )}
      </ScrollView>

      {/* --- LIBRARY SELECTOR MODAL --- */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View className="flex-1 bg-black/50 justify-center items-center p-6">
          <View className="bg-white w-full rounded-3xl p-6">
            <Text className="text-xl font-m-bold text-textDark mb-4">
              Select Library
            </Text>
            {libraries.map((lib) => (
              <TouchableOpacity
                key={lib.id}
                className="py-4 border-b border-borderLight"
                onPress={() => {
                  setSelectedLibrary(lib);
                  setModalVisible(false);
                }}
              >
                <Text className="text-textDark font-m-med">{lib.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Small helper component for the metrics
function MetricCard({ label, value, color, full }) {
  return (
    <View
      className={`${full ? "w-full" : "w-[48%]"} bg-white p-5 rounded-3xl mb-4 border border-borderLight`}
    >
      <Text
        className={`text-xs font-m-bold text-${color} uppercase tracking-widest mb-1`}
      >
        {label}
      </Text>
      <Text className="text-2xl font-m-extra text-textDark">{value}</Text>
    </View>
  );
}
