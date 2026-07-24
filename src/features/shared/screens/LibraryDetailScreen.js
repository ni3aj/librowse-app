import WriteReviewModal from "@/components/home/WriteReviewModal";
import Button from "@/components/ui/Button";
import { COLORS } from "@/constants/theme";
import { formatCleanDate } from "@/utils/dateFormatter";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions, // 📌 1. Imported Dimensions for full-screen width
  FlatList, // 📌 2. Imported FlatList for the slider
  Image,
  Linking,
  Modal,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { studentApi } from "../api";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

const getAmenityIcon = (name) => {
  const n = name.toLowerCase();
  if (n.includes("wi-fi") || n.includes("wifi")) return "wifi";
  if (n.includes("ac") || n.includes("air")) return "snow-outline";
  if (n.includes("power") || n.includes("outlet")) return "flash-outline";
  if (n.includes("park")) return "car-outline";
  if (n.includes("print") || n.includes("scan")) return "print-outline";
  if (n.includes("book") || n.includes("reference")) return "book-outline";
  if (n.includes("cafe") || n.includes("pantry")) return "cafe-outline";
  if (n.includes("cctv") || n.includes("security"))
    return "shield-checkmark-outline";
  return "checkmark-circle-outline";
};

export default function LibraryDetailScreen() {
  const { id } = useLocalSearchParams();
  const [myReview, setMyReview] = useState(null);
  const [library, setLibrary] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [myEnrollment, setMyEnrollment] = useState(null);
  const [futureEnrollment, setFutureEnrollment] = useState(null);
  const [isBooking, setIsBooking] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const [isChangeModalVisible, setIsChangeModalVisible] = useState(false);
  const [selectedFutureSeat, setSelectedFutureSeat] = useState(null);
  const [isChangingPlan, setIsChangingPlan] = useState(false);
  const [isReviewModalVisible, setIsReviewModalVisible] = useState(false);

  // 📌 3. States for the Airbnb-style Full Screen Image Slider
  const [isImageViewerVisible, setIsImageViewerVisible] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    fetchLibraryDetails();
    fetchMyReview();
  }, [id]);

  const fetchMyReview = async () => {
    try {
      const response = await studentApi.fetchMyReview(id);
      if (response.data.success && response.data.review) {
        setMyReview(response.data.review);
      }
    } catch (error) {
      console.log("No existing review found.");
    }
  };

  const handleOpenMaps = async () => {
    const { latitude, longitude, name } = library;

    if (!latitude || !longitude) {
      Alert.alert(
        "Location Unavailable",
        "The library owner hasn't configured GPS coordinates for this study room yet.",
      );
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
      Alert.alert("Error", "Failed to launch default maps application.");
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

  const fetchLibraryDetails = async () => {
    try {
      const response = await studentApi.getLibraryDetails(id);

      if (response.data.success) {
        setLibrary(response.data.library);
        setInventory(response.data.inventory);

        if (response.data.my_enrollment) {
          setMyEnrollment(response.data.my_enrollment);
          const bookedSeat = response.data.inventory.find(
            (s) => s.id === response.data.my_enrollment.inventory_id,
          );
          if (bookedSeat) setSelectedSeat(bookedSeat);
        }
        if (response.data.future_enrollment) {
          setFutureEnrollment(response.data.future_enrollment);
        } else {
          setFutureEnrollment(null);
        }
      }
    } catch (error) {
      console.log("Error fetching details:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBooking = async () => {
    if (!selectedSeat) return;
    setIsBooking(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const response = await studentApi.enrollSeat(selectedSeat.id, today);

      if (response.data.success) {
        setMyEnrollment({
          id: response.data.enrollment_id,
          status: "PENDING",
          inventory_id: selectedSeat.id,
        });
        Alert.alert(
          "Request Sent! 🎉",
          "Waiting for the library owner to accept.",
        );
      }
    } catch (error) {
      Alert.alert(
        "Booking Failed",
        error.response?.data?.error || "Something went wrong.",
      );
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
                Alert.alert("Cancelled", "Your request has been withdrawn.");
              }
            } catch (error) {
              Alert.alert(
                "Error",
                error.response?.data?.error || "Failed to cancel.",
              );
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
                fetchLibraryDetails();
                Alert.alert(
                  "Cancelled",
                  "Your request for next month has been withdrawn.",
                );
              }
            } catch (error) {
              Alert.alert(
                "Error",
                error.response?.data?.message || "Failed to cancel.",
              );
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
        Alert.alert(
          "Plan Updated! 🔄",
          "Your request for next month has been sent to the owner.",
        );
        fetchLibraryDetails();
      }
    } catch (error) {
      Alert.alert(
        "Update Failed",
        error.response?.data?.error || "Something went wrong.",
      );
    } finally {
      setIsChangingPlan(false);
    }
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

  // Safe fallback for photos
  const photosArray =
    library.photos?.length > 0
      ? library.photos
      : ["https://images.unsplash.com/photo-1497366216548-37526070297c?w=800"];
  const coverPhoto = photosArray[0];

  return (
    <View className="flex-1 bg-background">
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        {/* --- HEADER IMAGE & ACTIONS --- */}
        <View className="relative">
          {/* 📌 4. Wrapped image in TouchableOpacity to open slider */}
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

          {/* Review Badge (Bottom Left) */}
          <View className="absolute bottom-4 left-6 bg-black/70 px-3 py-1.5 rounded-full flex-row items-center">
            <Ionicons name="star" size={14} color="#fff" />
            <Text className="text-white font-m-bold ml-1 text-sm">
              {library.rating || "New"}{" "}
              <Text className="font-normal text-gray-300">
                • {library.total_reviews || 0} reviews
              </Text>
            </Text>
          </View>

          {/* 📌 5. Image Counter Badge (Bottom Right - Airbnb Style) */}
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

        {/* --- DETAILS SECTION --- */}
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
              <Ionicons name="map-outline" size={24} color={COLORS.brand} />
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
            <Text className="text-textLight text-sm font-medium">
              {library.timing_string}
            </Text>
          </View>

          <Text className="text-xl font-m-bold text-textDark mt-6 mb-4">
            Amenities
          </Text>
          <View className="flex-row flex-wrap justify-between">
            {Array.isArray(library.amenities)
              ? library.amenities.map((amenity, index) => {
                  const normalized = amenity.toLowerCase();
                  let displayAmenity =
                    amenity.charAt(0).toUpperCase() +
                    amenity.slice(1).toLowerCase();

                  if (normalized === "ac") displayAmenity = "AC";
                  if (normalized === "cctv") displayAmenity = "CCTV";
                  if (normalized === "wifi" || normalized === "wi-fi")
                    displayAmenity = "Wi-Fi";
                  if (normalized === "ro water" || normalized === "ro_water")
                    displayAmenity = "RO Water";

                  return (
                    <View
                      key={index}
                      className="w-[48%] bg-white border border-borderLight rounded-2xl p-3 flex-row items-center mb-3"
                    >
                      <View className="bg-surface p-1 rounded-full mr-3">
                        <Ionicons
                          name={getAmenityIcon(amenity)}
                          size={18}
                          color={COLORS.brand}
                        />
                      </View>
                      <Text className="text-textDark font-medium flex-1 text-sm">
                        {displayAmenity}
                      </Text>
                    </View>
                  );
                })
              : null}
          </View>

          {/* --- SMART ENROLLMENT UI --- */}
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

                  <View className="bg-surface rounded-3xl p-5 border border-borderLight opacity-90 shadow-sm">
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
                    onPress={() => !isSoldOut && setSelectedSeat(item)}
                    activeOpacity={isSoldOut ? 1 : 0.8}
                    className={`flex-row justify-between items-center p-4 rounded-3xl mb-3 border-2 
                      ${isSoldOut ? "border-transparent bg-surface opacity-60" : isSelected ? "border-brand bg-brand" : "border-transparent bg-white"}`}
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
                          {item.amenity?.replace("_", " ")}
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
                        {item.shift?.replace("_", " ")}
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
            </View>
          )}
        </View>
      </ScrollView>

      {/* --- BOTTOM ACTIONS / BOOKING BAR (Unchanged) --- */}
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
              onPress={() =>
                Alert.alert("Coming Soon", "Payment gateway will open here.")
              }
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
                {selectedSeat ? "Selected" : "No Seat Selected"}
              </Text>
              {selectedSeat ? (
                <Text className="text-base font-m-bold text-textDark">
                  {selectedSeat.amenity?.replace("_", " ")} • ₹
                  {selectedSeat.price}/mo
                </Text>
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
              disabled={!selectedSeat}
              loading={isBooking}
              className="py-3.5 px-8 ml-4"
            />
          </View>
        )}
      </View>

      {/* --- MODALS --- */}

      <WriteReviewModal
        visible={isReviewModalVisible}
        onClose={() => setIsReviewModalVisible(false)}
        libraryId={id}
        existingReview={myReview}
        onSuccess={() => {
          fetchLibraryDetails();
          fetchMyReview();
        }}
      />

      {/* 📌 THE CLEANED AIRBNB-STYLE IMAGE VIEWER MODAL */}
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
          <View className="bg-background rounded-t-3xl p-6 pb-10 shadow-lg">
            {/* Modal Header */}
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
                  // EMPTY STATE: User is already on the only available plan
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

                // NORMAL STATE: Render the list of options
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
