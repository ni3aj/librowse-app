import apiClient from "@/api/client";
import AlertModal from "@/components/ui/AlertModal";
import Button from "@/components/ui/Button";
import Chip from "@/components/ui/Chip";
import Header from "@/components/ui/Header";
import { COLORS } from "@/constants/theme";
import { useAuthStore } from "@/store/authStore";
import { useLibraryStore } from "@/store/libraryStore";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";

export default function DashboardScreen() {
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: "",
    message: "",
    type: "info",
  });
  const hideAlert = () =>
    setAlertConfig((prev) => ({ ...prev, visible: false }));

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const { userName } = useAuthStore();
  const firstName = userName ? userName.split(" ")[0] : "Owner";

  // 📌 Extract global store values
  const { libraryId, hasInventory, libraryStatus, libraries } =
    useLibraryStore();
  const lastFetchedId = useRef(null);

  // 📌 THE FIX: Rely strictly on `libraryStatus` from the store!
  // We removed `selectedLibrary` from these checks because the libraries array might be empty
  // immediately after a new user creates their first library.
  const isPending = libraryStatus === "PENDING_ADMIN_APPROVAL";
  const isUnverified = libraryStatus === "UNVERIFIED";
  const isLocked = isPending || isUnverified;

  const fetchDashboardStats = async (targetLibraryId) => {
    try {
      const response = await apiClient.get(
        `/owner/dashboard/${targetLibraryId}`,
      );
      if (response.data.success) {
        let currentStatus = response.data.libraryStatus;
        const currentHasInventory = response.data.metrics?.total_capacity > 0;

        // Auto-submit for review if unverified but setup is complete
        if (currentStatus === "UNVERIFIED" && currentHasInventory) {
          const libRes = await apiClient.get(
            `/owner/library/${targetLibraryId}`,
          );
          if (libRes.data.success) {
            const lib = libRes.data.library;
            if (lib.photos && lib.photos.length > 0) {
              const payload = {
                name: lib.name,
                city: lib.city,
                address: lib.address,
                amenities:
                  typeof lib.amenities === "string"
                    ? JSON.parse(lib.amenities)
                    : lib.amenities || [],
                photos: lib.photos,
                status: "PENDING_ADMIN_APPROVAL",
              };
              await apiClient.put(`/owner/library/${targetLibraryId}`, payload);
              currentStatus = "PENDING_ADMIN_APPROVAL";
            }
          }
        }

        // Sync fetched status and inventory back to global store
        useLibraryStore.setState({
          libraryStatus: currentStatus,
          hasInventory: currentHasInventory,
        });

        setStats(response.data);
      }
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to fetch stats.",
      });
    }
  };

  // 📌 Fetch stats safely whenever libraryId changes
  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadStats = async () => {
        if (libraryId) {
          // If we switched libraries, show loading & wipe old stats so UI resets cleanly
          if (lastFetchedId.current !== libraryId) {
            setLoading(true);
            setStats(null);
          }

          await fetchDashboardStats(libraryId);

          if (isActive) {
            lastFetchedId.current = libraryId;
            setLoading(false);
          }
        } else if (!libraries || libraries.length === 0) {
          // Failsafe if user has zero libraries
          setLoading(false);
        }
      };

      loadStats();
      return () => {
        isActive = false;
      };
    }, [libraryId, libraries]),
  );

  // App State listener for returning from background
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active" && libraryId) {
        fetchDashboardStats(libraryId);
      }
    });
    return () => subscription.remove();
  }, [libraryId]);

  const handlePullToRefresh = async () => {
    if (!libraryId) return;
    setRefreshing(true);
    await fetchDashboardStats(libraryId);
    setRefreshing(false);
  };

  const handleMarkAsPaid = (enrollmentId, studentName) => {
    setAlertConfig({
      visible: true,
      type: "warning",
      title: "Confirm Offline Payment",
      message: `Did ${studentName} pay you directly? This will instantly activate their seat and log the revenue.`,
      primaryButtonText: "Mark as Paid",
      secondaryButtonText: "Cancel",
      onPrimaryPress: async () => {
        try {
          const response = await apiClient.patch(
            `/owner/requests/${enrollmentId}/mark-paid`,
          );

          if (response.data.success) {
            setAlertConfig({
              visible: true,
              type: "success",
              title: "Success!",
              message: `${studentName}'s seat is now Active!`,
              primaryButtonText: "Awesome",
              secondaryButtonText: null,
              onPrimaryPress: () => {
                hideAlert();
                if (libraryId) fetchDashboardStats(libraryId);
              },
            });
          }
        } catch (error) {
          setAlertConfig({
            visible: true,
            type: "error",
            title: "Error",
            message: error.response?.data?.error || "Failed to mark as paid.",
            primaryButtonText: "OK",
            secondaryButtonText: null,
            onPrimaryPress: hideAlert,
          });
        }
      },
    });
  };

  const handleAcceptRequest = async (enrollmentId) => {
    try {
      const response = await apiClient.patch(
        `/owner/requests/${enrollmentId}/approve`,
      );

      if (response.data.success) {
        Toast.show({
          type: "success",
          text1: "Approved!",
          text2: "Awaiting their payment.",
        });
        if (libraryId) fetchDashboardStats(libraryId);
      }
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: error.response?.data?.error || "Failed to approve student.",
      });
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
                if (libraryId) fetchDashboardStats(libraryId);
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

  const getSubscriptionUI = () => {
    const sub = stats?.platformSubscription || {
      status: "",
      daysRemaining: 0,
    };

    if (sub.daysRemaining <= 0) {
      return {
        label: "Payment Due",
        value: "Pay Now",
        color: "red-500",
        iconColor: "#EF4444",
        iconName: "warning-outline",
      };
    } else if (sub.daysRemaining <= 5) {
      return {
        label: "Expiring Soon",
        value: `${sub.daysRemaining} days`,
        color: "orange-500",
        iconColor: "#F97316",
        iconName: "time-outline",
      };
    } else {
      return {
        label: "Subscription",
        value: "Active",
        color: "green-600",
        iconColor: "#16A34A",
        iconName: "shield-checkmark-outline",
      };
    }
  };

  const subUI = getSubscriptionUI();

  const handleLockedClick = () => {
    if (isUnverified) {
      Toast.show({
        type: "error",
        text1: "Setup Incomplete",
        text2: "Please upload your library photos to unlock these features.",
        position: "top",
      });
    } else {
      Toast.show({
        type: "info",
        text1: "Library Under Review",
        text2:
          "This feature will unlock once your library is verified by LiBrowse team.",
        position: "top",
      });
    }
  };

  return (
    <View className="flex-1 bg-background">
      <Header
        title={`Hi, ${firstName} 👋`}
        enableBack={false}
        showLibraryDropdown={true}
      />

      <ScrollView
        className="px-6"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handlePullToRefresh}
            tintColor={COLORS.brand}
            colors={[COLORS.brand]}
          />
        }
      >
        {loading ? (
          <ActivityIndicator
            className="mt-20"
            size="large"
            color={COLORS.brand}
          />
        ) : stats ? (
          <>
            {isUnverified && hasInventory && (
              <View className="bg-surface border border-borderLight p-4 rounded-2xl mb-6 flex-row items-start">
                <View className="flex-1">
                  <Text className="text-textDark font-m-bold text-base mb-2">
                    <Text className="text-l mr-3">🛑</Text> Setup Incomplete
                  </Text>
                  <Text className="text-textDark text-sm font-m leading-5 mb-3">
                    Your library is currently Unverified. Students cannot book
                    seats until you upload library photos and submit your
                    profile.
                  </Text>
                  <Button
                    title="Upload Photos"
                    variant="primary"
                    onPress={() => router.push("/edit-library")}
                    className="py-2"
                  />
                </View>
              </View>
            )}

            {isPending && (
              <View className="bg-orange-50 border border-orange-200 p-4 rounded-2xl mb-6 flex-row items-start">
                <View className="flex-1">
                  <Text className="text-orange-900 font-m-bold text-base mb-2">
                    <Text className="text-l">⚠️</Text> Library Under Review
                  </Text>
                  <Text className="text-orange-800 text-sm font-m leading-5">
                    Your library is currently being verified. You can set up
                    your seat category in the Seats tab below, but student
                    requests and payments are temporarily disabled.
                  </Text>
                </View>
              </View>
            )}

            {!hasInventory && (
              <View className="bg-surface p-6 rounded-3xl border border-borderLight mb-6 items-center mt-4">
                <View className="bg-background h-16 w-16 rounded-full items-center justify-center mb-4">
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
                  title="Add Seats"
                  onPress={() => router.push("/manage-seats")}
                  className="w-full"
                />
              </View>
            )}

            {hasInventory && (
              <>
                <View className="flex-row flex-wrap justify-between mb-4">
                  <MetricCard
                    label="Pending Requests"
                    value={stats.metrics.pending_count}
                    color="brandAccent"
                    iconName="person-add-outline"
                    iconColor={COLORS.brandAccent}
                  />
                  <MetricCard
                    label="Unpaid Students"
                    value={stats.metrics.awaiting_payment_count}
                    color="textLight"
                    iconName="wallet-outline"
                    iconColor={COLORS.textLight}
                  />
                  <MetricCard
                    label="Occupied seats"
                    value={`${stats.metrics.active_users_count}/${stats.metrics.total_capacity}`}
                    color="brand"
                    iconName="grid-outline"
                    iconColor={COLORS.brand}
                  />
                  <MetricCard
                    label="Active Students"
                    onPress={
                      isLocked
                        ? handleLockedClick
                        : () =>
                            router.push({
                              pathname: "/students-list",
                              params: { id: libraryId },
                            })
                    }
                    value={`${stats.metrics.active_users_count}/${stats.metrics.total_students_count}`}
                    color="brand"
                    iconName="people-outline"
                    iconColor={COLORS.brand}
                  />
                  <MetricCard
                    label="My Revenue"
                    value={`₹${Math.round(stats.metrics.monthly_revenue)}`}
                    color="textDark"
                    iconName="trending-up-outline"
                    iconColor={COLORS.textDark}
                    onPress={
                      isLocked
                        ? handleLockedClick
                        : () =>
                            router.push({
                              pathname: "/payments-history",
                            })
                    }
                  />
                  <MetricCard
                    label={subUI.label}
                    value={subUI.value}
                    color={subUI.color}
                    iconName={subUI.iconName}
                    iconColor={subUI.iconColor}
                    onPress={
                      isLocked
                        ? handleLockedClick
                        : () => router.push("/billing")
                    }
                  />
                </View>

                <View
                  pointerEvents={isLocked ? "none" : "auto"}
                  className={isLocked ? "opacity-50" : ""}
                >
                  {stats.pendingRequests.length > 0 && (
                    <View className="flex-row justify-between">
                      <Text className="text-lg font-m-bold px-1 text-textDark mb-4">
                        New Requests
                      </Text>
                      <Text
                        className="text-sm font-m-bold px-1 text-textDark mb-4"
                        onPress={
                          isLocked
                            ? handleLockedClick
                            : () =>
                                router.push({
                                  pathname: "/students-list",
                                  params: { id: libraryId },
                                })
                        }
                      >
                        See all
                      </Text>
                    </View>
                  )}
                  {stats.pendingRequests.map((req) => (
                    <Pressable
                      key={req.id}
                      onPress={() => router.push(`/user/${req.student_id}`)}
                      className="bg-white rounded-2xl p-3.5 flex-row items-center mb-2 border border-borderLight active:opacity-70"
                    >
                      <Avatar src={req.student_photo} name={req.student_name} />

                      <View className="flex-1 pr-2">
                        <Text
                          className="text-[14px] font-m-bold text-textDark"
                          numberOfLines={1}
                        >
                          {req.student_name}
                        </Text>
                        <Text
                          className="text-[12px] text-xs text-textLight"
                          numberOfLines={1}
                        >
                          {req.amenity} / {req.shift} / {req.reservation}{" "}
                          {req.assigned_seat && `(${req.assigned_seat})`}
                        </Text>
                      </View>

                      <View className="flex-row items-center">
                        <TouchableOpacity
                          onPress={() => handleAcceptRequest(req.id)}
                          activeOpacity={0.7}
                          className="w-10 h-10 rounded-3xl items-center justify-center"
                          style={{ backgroundColor: "#D1FAE5" }}
                        >
                          <Ionicons
                            name="checkmark"
                            size={20}
                            color="#059669"
                          />
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => handleDenyRequest(req.id)}
                          activeOpacity={0.7}
                          className="w-10 h-10 rounded-3xl items-center justify-center ml-2"
                          style={{ backgroundColor: "#FEE2E2" }}
                        >
                          <Ionicons name="close" size={20} color="#DC2626" />
                        </TouchableOpacity>
                      </View>
                    </Pressable>
                  ))}

                  {stats.awaitingPayment.length > 0 && (
                    <View className="flex-row items-center justify-between">
                      <Text className="text-lg font-m-bold px-1 text-textDark mb-4 mt-6">
                        Awaiting Payment
                      </Text>
                      <Text
                        className="text-sm font-m-bold px-1 text-textDark mb-4 mt-6"
                        onPress={
                          isLocked
                            ? handleLockedClick
                            : () =>
                                router.push({
                                  pathname: "/students-list",
                                  params: { id: libraryId },
                                })
                        }
                      >
                        See all
                      </Text>
                    </View>
                  )}
                  {stats.awaitingPayment.map((req) => (
                    <View
                      key={req.id}
                      className="bg-white p-4 rounded-2xl mb-3 border border-borderLight active:opacity-70"
                    >
                      <View className="flex-row items-center mb-2">
                        <Avatar
                          src={req.student_photo}
                          name={req.student_name}
                          size={40}
                        />
                        <View className="flex-1">
                          <Text className="font-m-bold text-textDark text-lg">
                            {req.student_name}
                          </Text>
                        </View>
                      </View>

                      <View className="flex-row flex-wrap gap-1 mt-1">
                        <Chip label={req.shift} />
                        <Chip label={req.amenity} />
                        <Chip label={req.reservation} />
                      </View>
                      <Text className="text-sm font-m text-textLight mt-1">
                        Approved {req.start_date}
                      </Text>

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

                      <View className="flex-row mt-1">
                        <View className="flex-1 mr-2">
                          <Button
                            title="View Profile"
                            variant="outline"
                            className="py-1 w-full"
                            onPress={() =>
                              router.push(`/user/${req.student_id}`)
                            }
                          />
                        </View>
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
                </View>
              </>
            )}
          </>
        ) : (
          <View className="items-center bg-surface p-8 rounded-3xl border border-borderLight">
            <Text className="text-4xl mb-4">🏢</Text>
            <Text className="text-xl font-m-bold text-textDark mb-2 text-center">
              No Library Created Yet
            </Text>
            <Text className="text-textLight font-m text-center mb-6">
              You haven't created any libraries to your account yet. Let's get
              started!
            </Text>
            <Button
              title="Create New Library"
              variant="primary"
              onPress={() => router.push("/create-library-wizard")}
              className="w-full"
            />
          </View>
        )}
        <View className="h-10" />
      </ScrollView>

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

// 📌 Reusable Avatar Component
function Avatar({ src, name, size = 40 }) {
  if (src) {
    return (
      <Image
        source={{ uri: src }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        className="mr-3 bg-gray-100"
      />
    );
  }
  return (
    <View
      style={{ width: size, height: size, borderRadius: size / 2 }}
      className="bg-brand/10 items-center justify-center border border-brand/20 mr-3"
    >
      <Text className="text-brand font-m-bold text-base">
        {name?.charAt(0)?.toUpperCase() || "?"}
      </Text>
    </View>
  );
}

function MetricCard({ label, value, color, iconName, iconColor, onPress }) {
  const CardContainer = onPress ? TouchableOpacity : View;

  return (
    <CardContainer
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      className="w-[48%] bg-white p-4 rounded-[24px] mb-4 border border-borderLight"
    >
      <View className="flex-row items-center mb-3">
        <View
          className="w-8 h-8 rounded-full items-center justify-center border"
          style={{
            backgroundColor: `${iconColor}15`,
            borderColor: `${iconColor}30`,
          }}
        >
          <Ionicons name={iconName} size={16} color={iconColor} />
        </View>

        <Text
          className={`text-2xl font-m-extra ml-3 mb-1 text-${color}`}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {value}
        </Text>
      </View>
      <View className="flex-row">
        <Text className="text-[10px] font-m-bold text-textLight uppercase tracking-widest">
          {label}
        </Text>
        {onPress && (
          <Ionicons
            name="chevron-forward"
            className="ml-1"
            size={14}
            color={COLORS.textLight}
          />
        )}
      </View>
    </CardContainer>
  );
}
