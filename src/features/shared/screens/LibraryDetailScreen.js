import Button from "@/components/ui/Button";
import { COLORS } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

// Helper function to pick an icon based on amenity text
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

  // Core Data State
  const [library, setLibrary] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [myEnrollment, setMyEnrollment] = useState(null);
  const [futureEnrollment, setFutureEnrollment] = useState(null);
  // Loading States
  const [isBooking, setIsBooking] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  // 📌 NEW: Change Plan Modal State
  const [isChangeModalVisible, setIsChangeModalVisible] = useState(false);
  const [selectedFutureSeat, setSelectedFutureSeat] = useState(null);
  const [isChangingPlan, setIsChangingPlan] = useState(false);

  useEffect(() => {
    fetchLibraryDetails();
  }, [id]);

  const handleOpenMaps = async () => {
    const { latitude, longitude, name } = library;

    if (!latitude || !longitude) {
      Alert.alert(
        "Location Unavailable",
        "The library owner hasn't configured GPS coordinates for this study room yet.",
      );
      return;
    }

    // Standard native URI schemes for iOS maps and Android geo intents
    const label = encodeURIComponent(name);
    const iosUrl = `maps://app?daddr=${latitude},${longitude}&q=${label}`;
    const androidUrl = `geo:${latitude},${longitude}?q=${latitude},${longitude}(${label})`;

    const url = Platform.OS === "ios" ? iosUrl : androidUrl;

    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        // Fallback to web browser mapping if deep linking scheme fails
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
      // 📌 Uses separated API
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
      // 📌 Uses separated API
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
              // 📌 Uses separated API
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
          style: "destructive", // Makes the button red on iOS!
          onPress: async () => {
            setIsCancelling(true);
            try {
              const response = await studentApi.cancelEnrollment(
                futureEnrollment.id,
              );
              if (response.data.success) {
                setFutureEnrollment(null); // Instantly hide the upcoming card
                fetchLibraryDetails(); // Refresh data from server
                Alert.alert(
                  "Cancelled",
                  "Your request for next month has been withdrawn.",
                );
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

  // 📌 NEW: Handle Future Change Request
  const handleFutureChange = async () => {
    if (!selectedFutureSeat) return;
    setIsChangingPlan(true);

    try {
      // 📌 Uses separated API
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
        fetchLibraryDetails(); // Refresh to show pending status!
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

  const amenitiesList = library.amenities
    ? Object.entries(library.amenities)
        .filter(([key, value]) => value === true)
        .map(([key]) => {
          if (key === "ac") return "AC";
          if (key === "cctv") return "CCTV";
          if (key === "wifi") return "Wi-Fi";
          if (key === "ro_water") return "RO Water";
          return key.charAt(0).toUpperCase() + key.slice(1).replace("_", " ");
        })
    : [];

  const futureSeat = futureEnrollment
    ? inventory.find((s) => s.id === futureEnrollment.inventory_id)
    : null;

  return (
    <View className="flex-1 bg-background">
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        {/* --- HEADER IMAGE & ACTIONS --- */}
        <View className="relative">
          <Image
            source={{
              uri:
                library.image_url ||
                "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800",
            }}
            className="w-full h-72 bg-surface"
          />
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
              <Text className="font-normal text-gray-300">• 0 reviews</Text>
            </Text>
          </View>
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
              onPress={handleOpenMaps} // 📌 PLUGGED IN MAP DEEP LINK
              className="bg-surface p-3 rounded-2xl border border-borderLight active:opacity-70"
            >
              <Ionicons name="map-outline" size={24} color={COLORS.brand} />
            </TouchableOpacity>
          </View>

          <View className="flex-row items-center mt-4 border-b border-borderLight pb-6">
            <View className="bg-brand/20 px-3 py-1.5 rounded-full flex-row items-center mr-3">
              <View className="w-2 h-2 rounded-full bg-brand mr-1.5" />
              <Text className="text-brand font-m-bold text-sm">Open Now</Text>
            </View>
            <Text className="text-textLight text-sm font-medium">
              8:00 AM – 10:00 PM
            </Text>
          </View>

          <Text className="text-xl font-m-bold text-textDark mt-6 mb-4">
            Amenities
          </Text>
          <View className="flex-row flex-wrap justify-between">
            {amenitiesList.map((amenity, index) => (
              <View
                key={index}
                className="w-[48%] bg-white border border-borderLight rounded-2xl p-3 flex-row items-center mb-3"
              >
                <View className="bg-surface p-2 rounded-full mr-3">
                  <Ionicons
                    name={getAmenityIcon(amenity)}
                    size={18}
                    color={COLORS.brand}
                  />
                </View>
                <Text className="text-textDark font-medium flex-1 text-sm">
                  {amenity}
                </Text>
              </View>
            ))}
          </View>

          {/* --- SMART ENROLLMENT UI --- */}
          {myEnrollment ? (
            <View className="mt-6">
              <View className="flex-row items-center mb-4">
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
              <View className="bg-white rounded-3xl p-5 mb-2 border border-borderLight">
                <Text className="text-xs font-m-bold text-textLight uppercase tracking-wider mb-1">
                  Status
                </Text>
                <Text className="text-lg font-m-extra text-brand mb-4">
                  {myEnrollment.status
                    ? String(myEnrollment.status).replace("_", " ")
                    : "N/A"}
                </Text>
                <Text className="text-xs font-m-bold text-textLight uppercase tracking-wider mb-1">
                  Current Plan
                </Text>
                <Text className="text-base font-m-bold text-textDark mb-1">
                  {selectedSeat?.amenity?.replace("_", " ")} •{" "}
                  {selectedSeat?.shift?.replace("_", " ")}
                </Text>
                <Text className="text-sm font-m text-textLight">
                  ₹{selectedSeat?.price} / month
                </Text>
              </View>
              {/* 📌 2. UPCOMING PLAN CARD */}
              {futureEnrollment && (
                <View className="mb-2 mt-4">
                  <View className="flex-row items-center mb-4">
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
                      {futureSeat?.shift?.replace("_", " ")}
                    </Text>
                    <Text className="text-sm font-m text-textLight">
                      ₹{futureSeat?.price} / month
                    </Text>
                    <Button
                      title="Cancel Request"
                      variant="outline"
                      className="py-2 px-2 mt-4"
                      loading={isCancelling}
                      onPress={handleCancelFuturePlan} // 📌 Just plug in the new function!
                    />
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

      {/* --- DYNAMIC BOTTOM BOOKING BAR --- */}
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
            {/* 📌 OPEN MODAL INSTEAD OF ROUTING */}
            <Button
              title="Change Plan"
              variant="outline"
              className="py-3 px-6"
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

      {/* 📌 NEW: CHANGE PLAN MODAL (BOTTOM SHEET) */}
      <Modal
        visible={isChangeModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsChangeModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-background rounded-t-3xl p-6 pb-10 shadow-lg">
            {/* Modal Header */}
            <View className="flex-row justify-between items-center mb-6">
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

            <Text className="text-sm text-textLight mb-4 leading-5">
              Select a new seat plan. This change will take effect immediately
              after your current billing cycle expires.
            </Text>

            {/* List Available Seats (Excluding current) */}
            <ScrollView
              className="max-h-80 mb-6"
              showsVerticalScrollIndicator={false}
            >
              {inventory
                .filter((item) => item.id !== myEnrollment?.inventory_id)
                .map((item) => {
                  const isSelected = selectedFutureSeat?.id === item.id;
                  const seatsAvailable =
                    parseInt(item.total_seats) - parseInt(item.occupied_seats);
                  const isSoldOut = seatsAvailable <= 0;

                  return (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => !isSoldOut && setSelectedFutureSeat(item)}
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
                            isSelected ? "radio-button-on" : "radio-button-off"
                          }
                          size={20}
                          color={isSelected ? "#fff" : COLORS.textLight}
                          style={{ marginRight: 12 }}
                        />
                        <View>
                          <Text
                            className={`text-base font-m-bold ${isSelected ? "text-white" : "text-textDark"}`}
                          >
                            {item.amenity?.replace("_", " ")}
                          </Text>
                          <Text
                            className={`text-xs mt-0.5 ${isSelected ? "text-white/80" : "text-textLight"}`}
                          >
                            {item.shift?.replace("_", " ")}
                          </Text>
                        </View>
                      </View>

                      <View className="items-end">
                        <Text
                          className={`text-lg font-m-extra ${isSelected ? "text-white" : "text-brand"}`}
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
          </View>
        </View>
      </Modal>
    </View>
  );
}
