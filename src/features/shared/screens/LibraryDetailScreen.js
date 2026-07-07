import Button from "@/components/ui/Button";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import apiClient from "../../../api/client";
import { COLORS } from "../../../constants/theme";

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

  const [library, setLibrary] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSeat, setSelectedSeat] = useState(null);

  const [myEnrollment, setMyEnrollment] = useState(null);
  const [isBooking, setIsBooking] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    fetchLibraryDetails();
  }, [id]);

  const fetchLibraryDetails = async () => {
    try {
      const response = await apiClient.get(`/student/libraries/${id}`);

      if (response.data.success) {
        setLibrary(response.data.library);
        setInventory(response.data.inventory);

        if (response.data.my_enrollment) {
          setMyEnrollment(response.data.my_enrollment || null);
          const bookedSeat = response.data.inventory.find(
            (s) => s.id === response.data.my_enrollment.inventory_id,
          );
          if (bookedSeat) setSelectedSeat(bookedSeat);
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
      const response = await apiClient.post("/student/enroll", {
        inventory_id: selectedSeat.id,
        start_date: today,
      });

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
              const response = await apiClient.delete(
                `/student/enrollments/${myEnrollment.id}`,
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

  if (loading) {
    return (
      <View className="flex-1 bg-background justify-center items-center">
        <ActivityIndicator size="large" color={COLORS.brand} />
      </View>
    );
  }

  if (!library) return null;

  const amenitiesList = Array.isArray(library.amenities)
    ? library.amenities
    : [];

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

          {/* Top Floating Buttons */}
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

          {/* Rating Badge Overlay */}
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
          {/* Title & Location Row */}
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
            {/* Map Button */}
            <TouchableOpacity className="bg-surface p-3 rounded-2xl border border-borderLight">
              <Ionicons name="map-outline" size={24} color={COLORS.brand} />
            </TouchableOpacity>
          </View>

          {/* Status Chip */}
          <View className="flex-row items-center mt-4 border-b border-borderLight pb-6">
            <View className="bg-brand/20 px-3 py-1.5 rounded-full flex-row items-center mr-3">
              <View className="w-2 h-2 rounded-full bg-brand mr-1.5" />
              <Text className="text-brand font-m-bold text-sm">Open Now</Text>
            </View>
            <Text className="text-textLight text-sm font-medium">
              8:00 AM – 10:00 PM
            </Text>
          </View>

          {/* Amenities Grid */}
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

          {/* Seat Inventory */}
          <Text className="text-xl font-m-bold text-textDark mb-1 mt-6">
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
            const disableSelection =
              myEnrollment && myEnrollment.inventory_id !== item.id;

            return (
              <TouchableOpacity
                key={item.id}
                onPress={() =>
                  !isSoldOut && !disableSelection && setSelectedSeat(item)
                }
                activeOpacity={isSoldOut || disableSelection ? 1 : 0.8}
                className={`flex-row justify-between items-center p-4 rounded-3xl mb-3 border-2 
                  ${
                    isSoldOut || disableSelection
                      ? "border-transparent bg-surface opacity-60"
                      : isSelected
                        ? "border-brand bg-brand"
                        : "border-transparent bg-white"
                  }`}
              >
                {/* Radio Button */}
                <Ionicons
                  name={isSelected ? "radio-button-on" : "radio-button-off"}
                  size={24}
                  color={isSelected ? "#fff" : COLORS.textLight}
                  style={{ marginRight: 12 }} // 📌 THE FIX: Replaced className with style
                />

                {/* Info Center */}
                <View className="flex-1 pr-2">
                  <View className="flex-row items-center">
                    <Text
                      className={`text-lg font-m-bold ${isSelected ? "text-white" : "text-textDark"}`}
                    >
                      {item.amenity}
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
                    {item.shift}
                  </Text>
                </View>

                {/* Price Right */}
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
      </ScrollView>

      {/* --- DYNAMIC BOTTOM BOOKING BAR --- */}
      <View className="absolute bottom-0 w-full bg-white border-t border-borderLight px-6 py-4 pb-4 shadow-[0_-10px_20px_-5px_rgba(0,0,0,0.1)]">
        {/* SCENARIO 1: Pending */}
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
              className="py-3" // Slightly thinner for the bottom bar aesthetic
            />
          </View>
        ) : /* SCENARIO 2: Accepted, Ready to Pay */
        myEnrollment?.status === "PAYMENT_PENDING" ? (
          <View className="flex-row justify-between items-center">
            <View className="flex-1 mr-4">
              <Text className="text-[10px] font-m-bold text-brand uppercase tracking-widest mb-0.5">
                Approved
              </Text>
              <Text className="text-base font-m-bold text-textDark">
                Ready for Payment
              </Text>
            </View>
            <Button
              title={`Pay ₹${selectedSeat?.price}`}
              variant="dark"
              className="py-3 px-8"
            />
          </View>
        ) : (
          /* SCENARIO 3: Normal Booking Flow */
          <View className="flex-row justify-between items-center">
            <View className="flex-1">
              <Text className="text-[10px] font-m-bold text-textLight uppercase tracking-widest mb-0.5">
                {selectedSeat ? "Selected" : "No Seat Selected"}
              </Text>
              {selectedSeat ? (
                <Text className="text-base font-m-bold text-textDark">
                  {selectedSeat.amenity} • ₹{selectedSeat.price}/mo
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
              className={`py-3.5 px-8 ml-4`}
            />
          </View>
        )}
      </View>
    </View>
  );
}
