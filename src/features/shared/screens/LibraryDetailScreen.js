import apiClient from "@/api/client";
import PaymentModal from "@/components/student/PaymentModal";
import WriteReviewModal from "@/components/student/WriteReviewModal";
import Button from "@/components/ui/Button";
import { COLORS } from "@/constants/theme";
import { useAuthStore } from "@/store/authStore";
import { formatCleanDate } from "@/utils/dateFormatter";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Linking,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import { studentApi } from "../api";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

export default function LibraryDetailScreen() {
  const { id } = useLocalSearchParams();

  const { user } = useAuthStore();
  const isStudent = user?.role !== "OWNER" && user?.account_type !== "OWNER";

  const [myReview, setMyReview] = useState(null);
  const [library, setLibrary] = useState(null);
  const [inventory, setInventory] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [availableAmenities, setAvailableAmenities] = useState([]);

  const [selectedSeat, setSelectedSeat] = useState(null);
  const [selectedSeatNumber, setSelectedSeatNumber] = useState(null);

  const [myEnrollment, setMyEnrollment] = useState(null);
  const [futureEnrollment, setFutureEnrollment] = useState(null);
  const [isBooking, setIsBooking] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const [isEnquiring, setIsEnquiring] = useState(false);

  // Modals state
  const [isChangeModalVisible, setIsChangeModalVisible] = useState(false);
  const [selectedFutureSeat, setSelectedFutureSeat] = useState(null);
  const [isChangingPlan, setIsChangingPlan] = useState(false);
  const [isReviewModalVisible, setIsReviewModalVisible] = useState(false);

  const [isPaymentModalVisible, setIsPaymentModalVisible] = useState(false);

  const [isImageViewerVisible, setIsImageViewerVisible] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const fetchAmenities = async () => {
      try {
        const response = await apiClient.get("/shared/amenities");
        if (response.data.success) {
          setAvailableAmenities(response.data.amenities);
        }
      } catch (error) {
        console.log("Failed to fetch amenities", error);
      }
    };
    fetchAmenities();
  }, []);

  const loadLibraryData = async () => {
    try {
      const [detailsRes, reviewRes] = await Promise.all([
        studentApi.getLibraryDetails(id),
        studentApi
          .fetchMyReview(id)
          .catch(() => ({ data: { success: false } })),
      ]);

      if (detailsRes.data.success) {
        setLibrary(detailsRes.data.library);
        setInventory(detailsRes.data.inventory);

        if (detailsRes.data.my_enrollment) {
          setMyEnrollment(detailsRes.data.my_enrollment);
          const bookedSeat = detailsRes.data.inventory.find(
            (s) => s.id === detailsRes.data.my_enrollment.inventory_id,
          );
          if (bookedSeat) setSelectedSeat(bookedSeat);
        } else {
          setMyEnrollment(null);
        }

        if (detailsRes.data.future_enrollment) {
          setFutureEnrollment(detailsRes.data.future_enrollment);
        } else {
          setFutureEnrollment(null);
        }
      }

      if (reviewRes.data?.success && reviewRes.data?.review) {
        setMyReview(reviewRes.data.review);
      } else {
        setMyReview(null);
      }
    } catch (error) {
      console.log("Error loading library data:", error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setSelectedSeat(null);
      setSelectedSeatNumber(null);
      setSelectedFutureSeat(null);
      setIsChangeModalVisible(false);
      setIsReviewModalVisible(false);
      setIsImageViewerVisible(false);
      setIsPaymentModalVisible(false);

      const init = async () => {
        if (!library) setLoading(true);
        await loadLibraryData();
        setLoading(false);
      };

      if (id) {
        init();
      }
    }, [id]),
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadLibraryData();
    setRefreshing(false);
  };

  const handleEnquiry = async () => {
    setIsEnquiring(true);
    try {
      await studentApi
        .sendEnquiry(id)
        .catch((e) => console.log("Silent error tracking:", e));
      const phoneToCall = library.owner_phone;
      if (phoneToCall) {
        Linking.openURL(`tel:${phoneToCall}`);
      } else {
        Toast.show({
          type: "success",
          text1: "Enquiry Sent",
          text2:
            "The library owner has been notified and will contact you soon.",
        });
      }
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Could not process enquiry. Please try again.",
      });
    } finally {
      setIsEnquiring(false);
    }
  };

  const handleOpenMaps = async () => {
    const { latitude, longitude, name } = library;

    if (!latitude || !longitude) {
      Toast.show({
        type: "info",
        text1: "Location Unavailable",
        text2:
          "The library owner hasn't configured GPS coordinates for this study room yet.",
      });
      return;
    }

    const label = encodeURIComponent(name);
    const iosUrl = `maps://app?daddr=${latitude},${longitude}&q=${label}`;
    const androidUrl = `geo:${latitude},${longitude}?q=${latitude},${longitude}(${label})`;

    const url = Platform.OS === "ios" ? iosUrl : androidUrl;

    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        const browserUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
        await Linking.openURL(browserUrl);
      }
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to launch default maps application.",
      });
    }
  };

  const safeFormatDate = (dateStr) => {
    if (!dateStr) return "Next Cycle";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "Next Cycle";
      return d.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch (e) {
      return "Next Cycle";
    }
  };

  const handleBooking = async () => {
    if (!selectedSeat) return;
    setIsBooking(true);
    try {
      const today = new Date().toISOString().split("T")[0];

      const response = await studentApi.enrollSeat(
        selectedSeat.id,
        today,
        selectedSeatNumber,
      );

      if (response.data.success) {
        setMyEnrollment({
          id: response.data.enrollment_id,
          status: "PENDING",
          inventory_id: selectedSeat.id,
        });
        Toast.show({
          type: "success",
          text1: "Request Sent",
          text2: "Waiting for the library owner to accept.",
        });
        await loadLibraryData();
      }
    } catch (error) {
      console.log(error);
      Toast.show({
        type: "error",
        text1: "Booking Failed",
        text2: error.response?.data?.error || "Something went wrong.",
      });
    } finally {
      setIsBooking(false);
    }
  };

  const handleCancel = async () => {
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
                myEnrollment.id,
              );
              if (response.data.success) {
                setMyEnrollment(null);
                setSelectedSeat(null);
                setSelectedSeatNumber(null);
                Toast.show({
                  type: "success",
                  text1: "Cancelled",
                  text2: "Your request has been cancelled.",
                });
                await loadLibraryData();
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

  const handleCancelFuturePlan = () => {
    Alert.alert(
      "Cancel Upcoming Plan",
      "Are you sure you want to cancel your seat change for next month? You will keep your current seat.",
      [
        { text: "No, Keep It", style: "cancel" },
        {
          text: "Yes, Cancel Plan",
          style: "destructive",
          onPress: async () => {
            setIsCancelling(true);
            try {
              const response = await studentApi.cancelEnrollment(
                futureEnrollment.id,
              );
              if (response.data.success) {
                setFutureEnrollment(null);
                await loadLibraryData();
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
              setIsCancelling(false);
            }
          },
        },
      ],
    );
  };

  const handleFutureChange = async () => {
    if (!selectedFutureSeat) return;
    setIsChangingPlan(true);

    try {
      const response = await studentApi.requestFuturePlanChange(
        myEnrollment.id,
        selectedFutureSeat.id,
      );

      if (response.data.success) {
        setIsChangeModalVisible(false);
        Toast.show({
          type: "success",
          text1: "Plan Updated",
          text2: "Your request for next month has been sent to the owner.",
        });
        await loadLibraryData();
      }
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Update Failed",
        text2: error.response?.data?.error || "Something went wrong.",
      });
    } finally {
      setIsChangingPlan(false);
    }
  };

  const getAmenityDetails = (amenityId) => {
    const found = availableAmenities.find((a) => a.id === amenityId);
    if (found) return found;
    return {
      label: amenityId.replace(/_/g, " "),
      icon: "checkmark-circle-outline",
    };
  };

  if (loading) {
    return (
      <View className="flex-1 bg-background justify-center items-center">
        <ActivityIndicator size="large" color={COLORS.brand} />
      </View>
    );
  }

  if (!library) return null;

  const futureSeat = futureEnrollment
    ? inventory.find((s) => s.id === futureEnrollment.inventory_id)
    : null;

  const photosArray =
    library.photos?.length > 0
      ? library.photos
      : ["https://images.unsplash.com/photo-1497366216548-37526070297c?w=800"];
  const coverPhoto = photosArray[0];

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-1"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.brand}
            colors={[COLORS.brand]}
          />
        }
      >
        <View className="relative">
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => setIsImageViewerVisible(true)}
          >
            <Image
              source={{ uri: coverPhoto }}
              className="w-full h-72 bg-surface"
            />
          </TouchableOpacity>

          <View className="absolute top-12 left-6 right-6 flex-row justify-between items-center">
            <TouchableOpacity
              onPress={() => router.back()}
              className="bg-black/40 p-2.5 rounded-full"
            >
              <Ionicons name="chevron-back" size={24} color="#fff" />
            </TouchableOpacity>
            <View className="flex-row">
              <TouchableOpacity className="bg-black/40 p-2.5 rounded-full mr-3">
                <Ionicons name="heart-outline" size={24} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity className="bg-black/40 p-2.5 rounded-full">
                <Ionicons name="share-social-outline" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          <View className="absolute bottom-4 left-6 bg-black/70 px-3 py-1.5 rounded-full flex-row items-center">
            <Ionicons name="star" size={14} color="#fff" />
            <Text className="text-white font-m-bold ml-1 text-sm">
              {library.rating || "New"}{" "}
              <Text className="font-normal text-gray-300">
                • {library.total_reviews || 0} reviews
              </Text>
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => setIsImageViewerVisible(true)}
            className="absolute bottom-4 right-6 bg-black/70 px-3 py-1.5 rounded-full flex-row items-center border border-white/20"
          >
            <Ionicons name="images-outline" size={14} color="#fff" />
            <Text className="text-white font-m-bold ml-1.5 text-xs tracking-widest">
              1 / {photosArray.length}
            </Text>
          </TouchableOpacity>
        </View>

        <View className="px-6 pt-6 pb-40">
          <View className="flex-row justify-between items-start mb-2">
            <View className="flex-1 pr-4">
              <Text className="text-3xl font-m-extra text-textDark mb-1">
                {library.name}
              </Text>
              <View className="flex-row items-center">
                <Ionicons
                  name="location-outline"
                  size={16}
                  color={COLORS.textLight}
                />
                <Text className="text-[15px] text-textLight ml-1">
                  {library.address}, {library.city}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={handleOpenMaps}
              className="bg-surface p-3 rounded-2xl border border-borderLight active:opacity-70"
            >
              <Ionicons
                name="location-outline"
                size={24}
                color={COLORS.brand}
              />
            </TouchableOpacity>
          </View>

          <View className="flex-row items-center mt-4 border-b border-borderLight pb-6">
            <View
              className={`px-3 py-1.5 rounded-full flex-row items-center mr-3 ${library.is_open ? "bg-emerald-500" : "bg-gray-200"}`}
            >
              <View
                className={`w-2 h-2 rounded-full mr-1.5 ${library.is_open ? "bg-white" : "bg-gray-500"}`}
              />
              <Text
                className={`font-m-bold text-sm ${library.is_open ? "text-white" : "text-gray-600"}`}
              >
                {library.is_open ? "Open Now" : "Closed"}
              </Text>
            </View>

            <Text className="text-textLight text-sm font-medium flex-1">
              {library.timing_string}
            </Text>

            {isStudent && (
              <TouchableOpacity
                onPress={handleEnquiry}
                disabled={isEnquiring}
                className="bg-brand/10 px-4 py-2.5 rounded-xl flex-row items-center border border-brand/20 ml-2"
              >
                {isEnquiring ? (
                  <ActivityIndicator size="small" color={COLORS.brand} />
                ) : (
                  <>
                    <Ionicons name="call" size={16} color={COLORS.brand} />
                    <Text className="text-brand font-m-bold ml-1.5 text-sm">
                      Enquire
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>

          <Text className="text-xl font-m-bold text-textDark mt-6 mb-4">
            Amenities
          </Text>
          <View className="flex-row flex-wrap justify-between">
            {Array.isArray(library.amenities)
              ? library.amenities.map((amenityId, index) => {
                  const details = getAmenityDetails(amenityId);

                  return (
                    <View
                      key={index}
                      className="w-[48%] bg-white border border-borderLight rounded-2xl p-2 flex-row items-center mb-3"
                    >
                      <View className="bg-surface p-1.5 rounded-full mr-3">
                        <Ionicons
                          name={details.icon}
                          size={16}
                          color={COLORS.brand}
                        />
                      </View>
                      <Text className="text-textDark font-medium flex-1 text-sm">
                        {details.label}
                      </Text>
                    </View>
                  );
                })
              : null}
          </View>

          {myEnrollment ? (
            <View className="mt-6">
              <View className="flex-row justify-between items-center mb-4">
                <View className="flex-row items-center">
                  <Ionicons
                    name="checkmark-circle"
                    size={24}
                    color={COLORS.brand}
                    className="mr-2"
                  />
                  <Text className="text-xl font-m-bold text-textDark">
                    Your Enrollment
                  </Text>
                </View>

                {myEnrollment.status === "ACTIVE" && (
                  <TouchableOpacity
                    onPress={() => setIsReviewModalVisible(true)}
                    className="flex-row items-center bg-orange-50 px-3 py-1.5 rounded-full border border-orange-200"
                  >
                    <Ionicons name="star" size={14} color="#F59E0B" />
                    <Text className="text-orange-700 font-m-bold text-xs ml-1">
                      {myReview ? "Edit Review" : "Rate"}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              <View className="bg-white rounded-3xl p-5 mb-2 border border-borderLight">
                <View className="flex-row justify-between items-start mb-4">
                  <View>
                    <Text className="text-xs font-m-bold text-textLight uppercase tracking-wider mb-1">
                      Status
                    </Text>
                    <Text className="text-lg font-m-extra text-brand">
                      {myEnrollment.status
                        ? String(myEnrollment.status).replace("_", " ")
                        : "N/A"}
                    </Text>
                  </View>

                  {myEnrollment.end_date && (
                    <View className="items-end">
                      <Text className="text-xs font-m-bold text-textLight uppercase tracking-wider mb-1 text-right">
                        Expires on
                      </Text>
                      <Text className="text-sm font-m-extra text-textDark text-right">
                        {formatCleanDate(myEnrollment.end_date)}
                      </Text>
                    </View>
                  )}
                </View>

                <Text className="text-xs font-m-bold text-textLight uppercase tracking-wider mb-1">
                  Current Plan
                </Text>
                <Text className="text-base font-m-bold text-textDark mb-1">
                  {selectedSeat?.amenity?.replace("_", " ")} •{" "}
                  {selectedSeat?.shift?.replace("_", " ")} •{" "}
                  {selectedSeat?.reservation}
                </Text>
                <Text className="text-sm font-m text-textLight">
                  ₹{selectedSeat?.price} / month
                </Text>
              </View>

              {futureEnrollment && (
                <View className="mb-2 mt-4">
                  <View className="flex-row items-center mb-4 ml-1">
                    <Ionicons
                      name="calendar"
                      size={24}
                      color={COLORS.textDark}
                      className="mr-2"
                    />
                    <Text className="text-xl font-m-bold text-textDark">
                      Upcoming Plan
                    </Text>
                  </View>

                  <View className="bg-surface rounded-3xl p-5 border border-borderLight opacity-90">
                    <View className="flex-row justify-between items-start mb-4">
                      <View>
                        <Text className="text-xs font-m-bold text-textLight uppercase tracking-wider mb-1">
                          Status
                        </Text>
                        <Text className="text-lg font-m-extra text-textDark">
                          {futureEnrollment.status
                            ? String(futureEnrollment.status).replace("_", " ")
                            : "N/A"}
                        </Text>
                      </View>
                      <View className="bg-gray-200 px-3 py-1.5 rounded-xl">
                        <Text className="text-xs font-m-bold text-gray-700">
                          Starts {safeFormatDate(futureEnrollment.start_date)}
                        </Text>
                      </View>
                    </View>

                    <Text className="text-xs font-m-bold text-textLight uppercase tracking-wider mb-1">
                      Next Plan
                    </Text>
                    <Text className="text-base font-m-bold text-textDark mb-1">
                      {futureSeat?.amenity?.replace("_", " ")} •{" "}
                      {futureSeat?.shift?.replace("_", " ")} •{" "}
                      {futureSeat?.reservation}
                    </Text>
                    <Text className="text-sm font-m text-textLight">
                      ₹{futureSeat?.price} / month
                    </Text>
                    {futureEnrollment.status !== "ACTIVE" && (
                      <Button
                        title="Cancel Request"
                        variant="outline"
                        className="py-2 px-2 mt-4"
                        loading={isCancelling}
                        onPress={handleCancelFuturePlan}
                      />
                    )}
                  </View>
                </View>
              )}
            </View>
          ) : (
            <View className="mt-6">
              <Text className="text-xl font-m-bold text-textDark mb-1">
                Select Your Seat
              </Text>
              <Text className="text-sm text-textLight mb-4">
                Tap to select a seat type for booking
              </Text>
              {inventory.map((item) => {
                const isSelected = selectedSeat?.id === item.id;
                const seatsAvailable =
                  parseInt(item.total_seats) - parseInt(item.occupied_seats);
                const isSoldOut = seatsAvailable <= 0;

                return (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => {
                      if (!isSoldOut) {
                        setSelectedSeat(item);
                        setSelectedSeatNumber(null);
                      }
                    }}
                    activeOpacity={isSoldOut ? 1 : 0.8}
                    className={`flex-row justify-between items-center p-4 rounded-3xl mb-3 border-2 
                      ${isSoldOut ? "border-transparent bg-surface opacity-60" : isSelected ? "border-brand bg-brand" : "border-surface border-1 bg-brand/5"}`}
                  >
                    <Ionicons
                      name={isSelected ? "radio-button-on" : "radio-button-off"}
                      size={24}
                      color={isSelected ? "#fff" : COLORS.textLight}
                      style={{ marginRight: 12 }}
                    />
                    <View className="flex-1 pr-2">
                      <View className="flex-row items-center">
                        <Text
                          className={`text-lg font-m-bold ${isSelected ? "text-white" : "text-textDark"}`}
                        >
                          {item.shift?.replace("_", " ")}
                        </Text>
                        {isSoldOut && (
                          <View className="bg-gray-200 px-2 py-0.5 rounded ml-2">
                            <Text className="text-[10px] font-m-bold text-gray-500 tracking-wider">
                              RESERVED
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text
                        className={`text-sm mt-0.5 ${isSelected ? "text-white/80" : "text-textLight"}`}
                      >
                        {item.amenity?.replace("_", " ")} • {item.reservation}
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text
                        className={`text-xl font-m-extra ${isSelected ? "text-white" : "text-brand"}`}
                      >
                        ₹{item.price}
                      </Text>
                      <Text
                        className={`text-xs font-medium ${isSelected ? "text-white/80" : "text-textLight"}`}
                      >
                        / month
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}

              {selectedSeat?.reservation === "RESERVED" &&
                selectedSeat?.seat_numbers?.length > 0 && (
                  <View className="mt-6 mb-4 mx-2">
                    <Text className="text-xl font-m-bold text-textDark mb-1">
                      Select a Seat Number
                    </Text>
                    <Text className="text-sm text-textLight mb-4">
                      Tap on an available seat below to lock it in.
                    </Text>

                    <View className="flex-row flex-wrap gap-2">
                      {selectedSeat.seat_numbers.map((seatNum) => {
                        const isOccupied =
                          selectedSeat.occupied_seat_list?.includes(seatNum);
                        const isSelectedNum = selectedSeatNumber === seatNum;

                        return (
                          <TouchableOpacity
                            key={seatNum}
                            disabled={isOccupied}
                            onPress={() => setSelectedSeatNumber(seatNum)}
                            activeOpacity={0.7}
                            className="items-center justify-center mb-2"
                          >
                            <View
                              className={`w-18 h-16 rounded-lg items-center justify-center border-2 z-10 
                            ${
                              isOccupied
                                ? "bg-gray-200 border-gray-300 opacity-60"
                                : isSelectedNum
                                  ? "bg-brand border-brand shadow-brand/30"
                                  : "bg-white border-borderLight shadow-black/5"
                            }`}
                            >
                              <Text
                                className={`font-m-bold p-2 text-sm ${
                                  isOccupied
                                    ? "text-gray-400"
                                    : isSelectedNum
                                      ? "text-white"
                                      : "text-textDark"
                                }`}
                              >
                                {seatNum}
                              </Text>
                            </View>

                            <View
                              className={`w-8 h-4 rounded-full mt-[-6px] border border-t-0 z-0
                            ${
                              isOccupied
                                ? "bg-gray-300 border-gray-400 opacity-60"
                                : isSelectedNum
                                  ? "bg-brandAccent border-brandAccent"
                                  : "bg-gray-100 border-borderLight"
                            }`}
                            />
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* --- BOTTOM ACTIONS / BOOKING BAR --- */}
      <View className="absolute bottom-0 w-full bg-white border-t border-borderLight px-6 py-4 pb-4 shadow-[0_-10px_20px_-5px_rgba(0,0,0,0.1)]">
        {myEnrollment?.status === "PENDING" ? (
          <View className="flex-row justify-between items-center">
            <View className="flex-1 mr-4">
              <Text className="text-[10px] font-m-bold text-textLight uppercase tracking-widest mb-0.5">
                Status
              </Text>
              <Text className="text-base font-m-bold text-textDark">
                Request Pending
              </Text>
            </View>
            <Button
              title="Cancel"
              variant="outline"
              onPress={handleCancel}
              loading={isCancelling}
              className="py-3 px-6"
            />
          </View>
        ) : myEnrollment?.status === "PAYMENT_PENDING" ? (
          <View className="flex-row justify-between items-center">
            <View className="flex-1 mr-4">
              <Text className="text-[10px] font-m-bold text-brandAccent uppercase tracking-widest mb-0.5">
                Approved
              </Text>
              <Text className="text-base font-m-bold text-textDark">
                Ready for Payment
              </Text>
            </View>
            <Button
              title={`Pay ₹${selectedSeat?.price}`}
              variant="primary"
              className="py-3 px-8"
              onPress={() => setIsPaymentModalVisible(true)}
            />
          </View>
        ) : myEnrollment?.status === "ACTIVE" ? (
          <View className="flex-row justify-between items-center">
            <View className="flex-1 mr-4">
              <Text className="text-[10px] font-m-bold text-brand uppercase tracking-widest mb-0.5">
                Enrolled
              </Text>
              <Text className="text-base font-m-bold text-textDark">
                Seat is Active
              </Text>
            </View>
            <Button
              title={futureEnrollment ? "Plan Queued" : "Change Plan"}
              variant="outline"
              className="py-3 px-6"
              disabled={!!futureEnrollment}
              onPress={() => setIsChangeModalVisible(true)}
            />
          </View>
        ) : (
          <View className="flex-row justify-between items-center">
            <View className="flex-1">
              <Text className="text-[10px] font-m-bold text-textLight uppercase tracking-widest mb-0.5">
                {selectedSeat
                  ? selectedSeat.reservation === "RESERVED" &&
                    !selectedSeatNumber
                    ? "Pick a Seat Above"
                    : "Selected"
                  : "No Seat Selected"}
              </Text>
              {selectedSeat ? (
                <>
                  <Text className="text-base font-m-bold text-textDark">
                    {selectedSeat.amenity?.replace("_", " ")}{" "}
                    {selectedSeatNumber ? `(Seat ${selectedSeatNumber})` : ""}
                  </Text>
                  <Text className="text-base font-m-bold text-textDark">
                    ₹{selectedSeat.price}/mo
                  </Text>
                </>
              ) : (
                <Text className="text-sm text-textLight">
                  Choose a seat type above
                </Text>
              )}
            </View>

            <Button
              title="Enroll"
              variant="primary"
              onPress={handleBooking}
              disabled={
                !selectedSeat ||
                (selectedSeat.reservation === "RESERVED" && !selectedSeatNumber)
              }
              loading={isBooking}
              className="py-3.5 px-8 ml-4"
            />
          </View>
        )}
      </View>

      <PaymentModal
        visible={isPaymentModalVisible}
        onClose={() => setIsPaymentModalVisible(false)}
        price={selectedSeat?.price}
        ownerPhone={library?.owner_phone}
        enrollmentId={myEnrollment?.id}
        onSuccess={() => router.push("/home")}
      />

      <WriteReviewModal
        visible={isReviewModalVisible}
        onClose={() => setIsReviewModalVisible(false)}
        libraryId={id}
        existingReview={myReview}
        onSuccess={() => loadLibraryData()}
      />

      <Modal
        visible={isImageViewerVisible}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setIsImageViewerVisible(false)}
      >
        <View className="flex-1 bg-black">
          <View className="absolute top-12 left-0 right-0 z-10 flex-row justify-between items-center px-6">
            <TouchableOpacity
              onPress={() => setIsImageViewerVisible(false)}
              className="p-2 bg-black/50 rounded-full"
            >
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            <Text className="text-white font-m-bold text-base">
              {currentImageIndex + 1} / {photosArray.length}
            </Text>
            <View className="w-10" />
          </View>

          <FlatList
            data={photosArray}
            keyExtractor={(item, index) => index.toString()}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              const index = Math.round(
                e.nativeEvent.contentOffset.x / screenWidth,
              );
              setCurrentImageIndex(index);
            }}
            renderItem={({ item }) => (
              <View
                style={{
                  width: screenWidth,
                  height: screenHeight,
                  justifyContent: "center",
                }}
              >
                <Image
                  source={{ uri: item }}
                  style={{ width: "100%", height: undefined, aspectRatio: 1 }}
                  resizeMode="contain"
                />
              </View>
            )}
          />
        </View>
      </Modal>

      <Modal
        visible={isChangeModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsChangeModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-background rounded-t-3xl p-6 pb-20">
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-xl font-m-bold text-textDark">
                Change Seat for Next Month
              </Text>
              <TouchableOpacity
                onPress={() => setIsChangeModalVisible(false)}
                className="bg-surface p-2 rounded-full border border-borderLight"
              >
                <Ionicons name="close" size={20} color={COLORS.textDark} />
              </TouchableOpacity>
            </View>

            {myEnrollment &&
              (() => {
                const availablePlans = inventory.filter(
                  (item) => item.id !== myEnrollment?.inventory_id,
                );

                if (availablePlans.length === 0) {
                  return (
                    <View className="items-center py-6 px-4">
                      <View className="w-12 h-12 bg-brand/10 rounded-full items-center justify-center mb-4">
                        <Ionicons
                          name="information"
                          size={24}
                          color={COLORS.brand}
                        />
                      </View>
                      <Text className="text-lg font-m-bold text-textDark text-center mb-2">
                        No Other Plans Available
                      </Text>
                      <Text className="text-sm text-textLight text-center leading-5">
                        You are already enrolled in the only seat category
                        offered by this library. There are no other plans to
                        switch to at this time.
                      </Text>
                    </View>
                  );
                }

                return (
                  <>
                    <Text className="text-sm text-textLight mb-4 leading-5">
                      Select a new seat plan. This change will take effect after
                      your current billing cycle expires on{" "}
                      {formatCleanDate(myEnrollment.end_date)}.
                    </Text>

                    <ScrollView
                      className="max-h-80 mb-2"
                      showsVerticalScrollIndicator={false}
                    >
                      {availablePlans.map((item) => {
                        const isSelected = selectedFutureSeat?.id === item.id;
                        const seatsAvailable =
                          parseInt(item.total_seats) -
                          parseInt(item.occupied_seats);
                        const isSoldOut = seatsAvailable <= 0;

                        return (
                          <TouchableOpacity
                            key={item.id}
                            onPress={() =>
                              !isSoldOut && setSelectedFutureSeat(item)
                            }
                            activeOpacity={isSoldOut ? 1 : 0.8}
                            className={`flex-row justify-between items-center p-4 rounded-2xl mb-3 border-2 
                            ${
                              isSoldOut
                                ? "border-transparent bg-surface opacity-60"
                                : isSelected
                                  ? "border-brand bg-brand"
                                  : "border-borderLight bg-white"
                            }`}
                          >
                            <View className="flex-row items-center flex-1">
                              <Ionicons
                                name={
                                  isSelected
                                    ? "radio-button-on"
                                    : "radio-button-off"
                                }
                                size={20}
                                color={isSelected ? "#fff" : COLORS.textLight}
                                style={{ marginRight: 12 }}
                              />
                              <View>
                                <Text
                                  className={`text-base font-m-bold ${
                                    isSelected ? "text-white" : "text-textDark"
                                  }`}
                                >
                                  {item.amenity?.replace("_", " ")}
                                </Text>
                                <Text
                                  className={`text-xs mt-0.5 ${
                                    isSelected
                                      ? "text-white/80"
                                      : "text-textLight"
                                  }`}
                                >
                                  {item.shift?.replace("_", " ")}
                                </Text>
                              </View>
                            </View>

                            <View className="items-end">
                              <Text
                                className={`text-lg font-m-extra ${
                                  isSelected ? "text-white" : "text-brand"
                                }`}
                              >
                                ₹{item.price}
                              </Text>
                              {isSoldOut && (
                                <Text className="text-[10px] font-m-bold text-red-500 mt-1 uppercase tracking-wider">
                                  Waitlist Full
                                </Text>
                              )}
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>

                    <Button
                      title="Request Change"
                      variant="primary"
                      disabled={!selectedFutureSeat}
                      loading={isChangingPlan}
                      onPress={handleFutureChange}
                      className="w-full py-4"
                    />
                  </>
                );
              })()}
          </View>
        </View>
      </Modal>
    </View>
  );
}
