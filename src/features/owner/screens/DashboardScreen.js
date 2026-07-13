import apiClient from "@/api/client";
import AlertModal from "@/components/ui/AlertModal";
import Button from "@/components/ui/Button";
import Header from "@/components/ui/Header";
import RefreshableScrollView from "@/components/ui/RefreshableScrollView";
import { COLORS } from "@/constants/theme";
import { formatCleanDate } from "@/utils/dateFormatter";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function DashboardScreen() {
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: "",
    message: "",
    type: "info",
  });
  const hideAlert = () =>
    setAlertConfig((prev) => ({ ...prev, visible: false }));
  const [libraries, setLibraries] = useState([]);
  const [selectedLibrary, setSelectedLibrary] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [hasInventory, setHasInventory] = useState(true);

  useEffect(() => {
    fetchMyLibraries();
    checkSetupStatus();
  }, []);

  useEffect(() => {
    if (selectedLibrary) fetchDashboardStats(selectedLibrary.id);
  }, [selectedLibrary]);

  const handleMarkAsPaid = (enrollmentId, studentName) => {
    setAlertConfig({
      visible: true,
      type: "warning", // Uses the Amber warning colors
      title: "Confirm Offline Payment",
      message: `Did ${studentName} pay you directly? This will instantly activate their seat and log the revenue.`,
      primaryButtonText: "Mark as Paid",
      secondaryButtonText: "Cancel",
      onPrimaryPress: async () => {
        // 2. When they click Yes, fire the API
        try {
          const response = await apiClient.patch(
            `/owner/requests/${enrollmentId}/mark-paid`,
          );

          if (response.data.success) {
            // 3. Update the modal to a Success state!
            setAlertConfig({
              visible: true,
              type: "success", // Smoothly animates to the Emerald checkmark
              title: "Success!",
              message: `${studentName}'s seat is now Active!`,
              primaryButtonText: "Awesome",
              secondaryButtonText: null, // Hides the cancel button
              onPrimaryPress: () => {
                hideAlert(); // Close the modal
                fetchDashboardStats(selectedLibrary.id); // Refresh the UI
              },
            });
          }
        } catch (error) {
          // 4. Update the modal to an Error state!
          setAlertConfig({
            visible: true,
            type: "error", // Smoothly animates to the Coral Red cross
            title: "Error",
            message: error.response?.data?.error || "Failed to mark as paid.",
            primaryButtonText: "OK",
            secondaryButtonText: null,
            onPrimaryPress: hideAlert, // Close the modal on click
          });
        }
      },
    });
  };

  const handlePullToRefresh = async () => {
    if (selectedLibrary) {
      await fetchDashboardStats(selectedLibrary.id);
    } else {
      await fetchMyLibraries();
    }
  };

  const checkSetupStatus = async () => {
    const inventoryFlag = await AsyncStorage.getItem("hasInventory");
    if (inventoryFlag === "false") {
      setHasInventory(false);
    }
  };

  const fetchMyLibraries = async () => {
    try {
      const response = await apiClient.get("/owner/my-libraries");
      if (response.data.success && response.data.libraries.length > 0) {
        setLibraries(response.data.libraries);
        setSelectedLibrary(response.data.libraries[0]);
      } else {
        setLoading(false);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to load your libraries.");
      setLoading(false);
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

  const handleAcceptRequest = async (enrollmentId) => {
    try {
      const response = await apiClient.patch(
        `/owner/requests/${enrollmentId}/approve`,
      );

      if (response.data.success) {
        Alert.alert("Success", "Student approved! Awaiting their payment.");
        fetchDashboardStats(selectedLibrary.id);
      }
    } catch (error) {
      console.log(error);
      Alert.alert(
        "Error",
        error.response?.data?.error || "Failed to approve student.",
      );
    }
  };

  const handleDenyRequest = async (enrollmentId) => {
    Alert.alert(
      "Deny Request",
      "Are you sure you want to reject this student?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes, Reject",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await apiClient.patch(
                `/owner/requests/${enrollmentId}/reject`,
              );
              if (response.data.success) {
                fetchDashboardStats(selectedLibrary.id);
              }
            } catch (error) {
              Alert.alert(
                "Error",
                error.response?.data?.error || "Failed to reject student.",
              );
            }
          },
        },
      ],
    );
  };

  const getSubscriptionUI = () => {
    const sub = stats?.platformSubscription || {
      status: "ACTIVE",
      daysRemaining: 30,
    };

    if (sub.daysRemaining <= 0) {
      return {
        label: "Payment Due",
        value: "Pay Now",
        color: "red-500",
        bg: "red-50",
      };
    } else if (sub.daysRemaining <= 5) {
      return {
        label: "Expiring Soon",
        value: `${sub.daysRemaining} days`,
        color: "orange-500",
        bg: "orange-50",
      };
    } else {
      return {
        label: "Subscription",
        value: "Active",
        color: "green-600",
        bg: "green-50",
      };
    }
  };

  const subUI = getSubscriptionUI();

  return (
    <View className="flex-1 bg-background">
      {/* --- HEADER --- */}
      <Header
        title="Dashboard"
        subtitle="View statistics and manage students"
        rightComponent={
          libraries?.length > 1 && (
            <TouchableOpacity
              onPress={() => setModalVisible(true)}
              className="flex-row items-center bg-white border border-borderLight rounded-full px-2 py-2 mt-1"
            >
              <Text className="text-textDark font-m-bold text-sm mr-2">
                {selectedLibrary?.name || "Select"}
              </Text>

              <Ionicons name="chevron-down" size={16} color={COLORS.textDark} />
            </TouchableOpacity>
          )
        }
      />

      <RefreshableScrollView
        className="px-6 mt-6"
        onRefresh={handlePullToRefresh}
      >
        {loading ? (
          <ActivityIndicator
            className="mt-20"
            size="large"
            color={COLORS.brand}
          />
        ) : stats ? (
          <>
            {/* 📌 EMPTY STATE */}
            {!hasInventory && (
              <View className="bg-white p-6 rounded-3xl border border-brandAccent/30 mb-6 items-center mt-4">
                <View className="bg-brand/10 h-16 w-16 rounded-full items-center justify-center mb-4">
                  <Text className="text-3xl">🪑</Text>
                </View>
                <Text className="text-xl font-m-bold text-textDark text-center mb-2">
                  Finish Setting Up
                </Text>
                <Text className="text-textLight text-center font-m mb-6 leading-5 px-2">
                  You haven't added any seat capacities yet. Students cannot
                  find or book your library until you add your shifts and
                  prices!
                </Text>
                <Button
                  title="Add Seats Now"
                  onPress={() => router.push("/manage-seats")}
                  className="w-full"
                />
              </View>
            )}

            {/* 📌 FULL DASHBOARD */}
            {hasInventory && (
              <>
                {/* --- 2x2 METRICS GRID --- */}
                <View className="flex-row flex-wrap justify-between mb-4">
                  <MetricCard
                    label="Pending"
                    value={stats.metrics.pending_count}
                    color="brandAccent"
                  />
                  <MetricCard
                    label="Unpaid"
                    value={stats.metrics.awaiting_payment_count}
                    color="textLight"
                  />
                  <MetricCard
                    label="Occupied seats"
                    value={`${stats.metrics.active_users_count}/${stats.metrics.total_capacity}`}
                    color="brand"
                  />
                  <MetricCard
                    label="Active Students"
                    onPress={() =>
                      router.push({
                        pathname: "/students-list",
                        params: { id: selectedLibrary?.id },
                      })
                    }
                    value={`${stats.metrics.active_users_count}/${stats.metrics.total_students_count}`}
                    color="brand"
                  />
                  <MetricCard
                    label="My Revenue"
                    value={`₹${Math.round(stats.metrics.monthly_revenue)}`}
                    color="textDark"
                  />
                  <MetricCard
                    label={subUI.label}
                    value={subUI.value}
                    color={subUI.color} // You may need to update MetricCard component to accept hex/tailwind colors directly
                    onPress={() => router.push("/billing")}
                  />
                </View>

                {/* --- PENDING APPROVALS --- */}
                {stats.pendingRequests.length > 0 && (
                  <Text className="text-lg font-m-bold px-1 text-textDark mb-4">
                    New Requests
                  </Text>
                )}
                {stats.pendingRequests.map((req) => (
                  <Pressable
                    key={req.id}
                    onPress={() => router.push(`/user/${req.student_id}`)}
                    className="bg-white p-4 rounded-2xl mb-3 border border-borderLight active:opacity-70"
                  >
                    <View className="flex-row justify-between items-center">
                      <Text className="font-m-bold text-textDark text-lg">
                        {req.student_name}
                      </Text>
                      <Ionicons
                        name="chevron-forward"
                        size={18}
                        color={COLORS.textLight}
                      />
                    </View>
                    <Text className="text-sm font-m text-textLight mt-1">
                      {req.seat_type}
                    </Text>
                    <Text className="text-sm font-m text-textLight mt-1">
                      Requested on {formatCleanDate(req.start_date)}
                    </Text>
                    <View className="flex-row mt-4">
                      <View className="flex-1 mr-2">
                        <Button
                          title="Accept"
                          variant="primary"
                          className="py-2 w-full"
                          onPress={() => handleAcceptRequest(req.id)}
                        />
                      </View>
                      <View className="flex-1 ml-2">
                        <Button
                          title="Deny"
                          variant="outline"
                          className="py-2 w-full"
                          onPress={() => handleDenyRequest(req.id)}
                        />
                      </View>
                    </View>
                  </Pressable>
                ))}

                {/* --- AWAITING PAYMENT (APPROVED STUDENTS) --- */}
                {/* --- AWAITING PAYMENT (APPROVED STUDENTS) --- */}
                {stats.awaitingPayment.length > 0 && (
                  <Text className="text-lg font-m-bold px-1 text-textDark mb-4 mt-4">
                    Awaiting Payment
                  </Text>
                )}
                {stats.awaitingPayment.map((req) => (
                  <View
                    key={req.id}
                    className="bg-white p-4 rounded-2xl mb-3 border border-borderLight active:opacity-70"
                  >
                    <View className="flex-row justify-between items-center mb-1">
                      <Text className="font-m-bold text-textDark text-lg">
                        {req.student_name}
                      </Text>
                    </View>
                    <Text className="text-sm font-m text-textLight">
                      {req.seat_type} • Approved {req.start_date}
                    </Text>

                    {/* Info Banner */}
                    <View className="mt-3 bg-brandAccent/10 py-2 px-3 rounded-lg flex-row items-center mb-3">
                      <Ionicons
                        name="time-outline"
                        size={16}
                        color={COLORS.brandAccent}
                        className="mr-2"
                      />
                      <Text className="font-m-bold text-brandAccent ml-2 text-sm flex-1">
                        Waiting for Student to Pay
                      </Text>
                    </View>

                    {/* 📌 NEW: Offline Payment Button */}
                    <View className="flex-row mt-2 border-t border-borderLight pt-4">
                      {/* Left Side: View Profile */}
                      <View className="flex-1 mr-2">
                        <Button
                          title="View Profile"
                          variant="outline"
                          className="py-1 w-full"
                          onPress={() => router.push(`/user/${req.student_id}`)}
                        />
                      </View>

                      {/* Right Side: Mark as Paid */}
                      <View className="flex-1 ml-2">
                        <Button
                          title="Mark as Paid"
                          variant="primary"
                          className="py-2 w-full"
                          onPress={() =>
                            handleMarkAsPaid(req.id, req.student_name)
                          }
                        />
                      </View>
                    </View>
                  </View>
                ))}
              </>
            )}
          </>
        ) : (
          /* --- NO LIBRARIES SCENARIO --- */
          <View className="items-center bg-white p-8 rounded-3xl border border-borderLight">
            <Text className="text-4xl mb-4">🏢</Text>
            <Text className="text-xl font-m-bold text-textDark mb-2 text-center">
              No Libraries Yet
            </Text>
            <Text className="text-textLight font-m text-center mb-6">
              You haven't added any libraries to your account yet. Let's get
              started!
            </Text>
            <Button
              title="Add a Library"
              variant="primary"
              onPress={() => router.push("/create-library-wizard")}
              className="w-full"
            />
          </View>
        )}
      </RefreshableScrollView>

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
      <AlertModal
        visible={alertConfig.visible}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        primaryButtonText={alertConfig.primaryButtonText}
        secondaryButtonText={alertConfig.secondaryButtonText}
        onPrimaryPress={alertConfig.onPrimaryPress}
        onSecondaryPress={hideAlert}
        onClose={hideAlert}
      />
    </View>
  );
}

// Small helper component for the metrics
function MetricCard({ label, value, color, onPress }) {
  const CardContainer = onPress ? TouchableOpacity : View;

  return (
    <CardContainer
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      className={`w-[48%] bg-white p-5 rounded-3xl mb-4 border border-borderLight`}
    >
      <Text className="text-xs font-m-bold text-textLight uppercase tracking-widest mb-1">
        {label}
      </Text>
      {/* 📌 Dynamic text color based on status */}
      <Text className={`text-2xl font-m-extra text-${color}`}>{value}</Text>
    </CardContainer>
  );
}
