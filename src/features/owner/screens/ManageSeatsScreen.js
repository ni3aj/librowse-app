// app/owner/manage-seats.js

import apiClient from "@/api/client"; // 📌 1. Added apiClient
import Button from "@/components/ui/Button";
import Header from "@/components/ui/Header";
import Input from "@/components/ui/Input";
import { COLORS } from "@/constants/theme";
import {
  addInventoryBucket,
  deleteInventoryBucket,
  getLibraryInventory,
  updateInventoryBucket,
} from "@/features/owner/api";
import { useLibraryStore } from "@/store/libraryStore"; // 📌 2. Added global store
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";

export default function ManageSeatsScreen() {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [libraryId, setLibraryId] = useState(null);
  const scrollViewRef = useRef(null);

  const [editingId, setEditingId] = useState(null);

  // Form State
  const [shift, setShift] = useState("");
  const [amenity, setAmenity] = useState("");
  const [reservation, setReservation] = useState("");
  const [seats, setSeats] = useState("");
  const [price, setPrice] = useState("");

  // 📌 TIME PICKER STATE
  const [startTime, setStartTime] = useState(""); // Stores "HH:mm" for backend
  const [endTime, setEndTime] = useState(""); // Stores "HH:mm" for backend
  const [startDate, setStartDate] = useState(new Date()); // Feeds the native picker
  const [endDate, setEndDate] = useState(new Date()); // Feeds the native picker
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const [seatPrefix, setSeatPrefix] = useState("Seat_");
  const [seatNumbers, setSeatNumbers] = useState([]);

  const SHIFT_OPTIONS = ["DAY", "NIGHT", "FULL_DAY"];
  const AMENITY_OPTIONS = ["AC", "NON_AC"];
  const RESERVATION_OPTIONS = ["RESERVED", "UNRESERVED"];

  useEffect(() => {
    const init = async () => {
      const storedLibId = await AsyncStorage.getItem("libraryId");
      if (storedLibId) {
        setLibraryId(storedLibId);
        loadInventory(storedLibId);
      } else {
        Alert.alert(
          "Error",
          "Library profile not found. Please restart the app.",
        );
        setLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (reservation === "RESERVED" && seats) {
      const count = parseInt(seats) || 0;
      const prefix = seatPrefix.trim();
      const generated = Array.from(
        { length: count },
        (_, i) => `${prefix}${i + 1}`,
      );
      setSeatNumbers(generated);
    } else {
      setSeatNumbers([]);
    }
  }, [seats, seatPrefix, reservation]);

  const loadInventory = async (id) => {
    setLoading(true);
    const { data, error } = await getLibraryInventory(id);
    if (error) Alert.alert("Error", error);
    else setInventory(data.data || []);
    setLoading(false);
  };

  const formatTimeForUI = (timeString) => {
    if (!timeString) return "Select Time";
    const [hours, minutes] = timeString.split(":");
    const h = parseInt(hours, 10);
    const ampm = h >= 12 ? "PM" : "AM";
    const formattedHours = h % 12 || 12;
    return `${formattedHours.toString().padStart(2, "0")}:${minutes} ${ampm}`;
  };

  const onStartChange = (event, selectedDate) => {
    setShowStartPicker(Platform.OS === "ios");
    if (selectedDate) {
      setStartDate(selectedDate);
      const hh = selectedDate.getHours().toString().padStart(2, "0");
      const mm = selectedDate.getMinutes().toString().padStart(2, "0");
      setStartTime(`${hh}:${mm}`);
    }
  };

  const onEndChange = (event, selectedDate) => {
    setShowEndPicker(Platform.OS === "ios");
    if (selectedDate) {
      setEndDate(selectedDate);
      const hh = selectedDate.getHours().toString().padStart(2, "0");
      const mm = selectedDate.getMinutes().toString().padStart(2, "0");
      setEndTime(`${hh}:${mm}`);
    }
  };

  const handleEditClick = (item) => {
    setEditingId(item.id);
    setShift(item.shift);
    setAmenity(item.amenity);
    setReservation(item.reservation);
    setPrice(item.price ? String(item.price) : "");
    setSeats(item.total_seats ? String(item.total_seats) : "");

    if (item.start_time) {
      const cleanStart = item.start_time.substring(0, 5);
      setStartTime(cleanStart);
      const dStart = new Date();
      dStart.setHours(cleanStart.split(":")[0], cleanStart.split(":")[1], 0);
      setStartDate(dStart);
    }

    if (item.end_time) {
      const cleanEnd = item.end_time.substring(0, 5);
      setEndTime(cleanEnd);
      const dEnd = new Date();
      dEnd.setHours(cleanEnd.split(":")[0], cleanEnd.split(":")[1], 0);
      setEndDate(dEnd);
    }

    if (
      item.reservation === "RESERVED" &&
      item.seat_numbers &&
      item.seat_numbers.length > 0
    ) {
      const match = item.seat_numbers[0].match(/^(.*?)(\d+)$/);
      setSeatPrefix(match ? match[1] : "");
    } else {
      setSeatPrefix("Seat_");
    }

    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setShift("");
    setAmenity("");
    setReservation("");
    setSeats("");
    setPrice("");
    setSeatPrefix("Seat_");
    setStartTime("");
    setEndTime("");
  };

  const handleDeleteClick = (id) => {
    Alert.alert(
      "Delete Category",
      "Are you sure you want to delete this seat category?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            const { success, error } = await deleteInventoryBucket(id);
            if (error) Alert.alert("Cannot Delete", error);
            else loadInventory(libraryId);
            setLoading(false);
          },
        },
      ],
    );
  };

  // 📌 3. THE FIX: Smart background check for "Photos First, Seats Second"
  const checkAndUpgradeStatus = async (libId) => {
    try {
      const currentStatus = useLibraryStore.getState().libraryStatus;

      // We only care if they are stuck in UNVERIFIED
      if (currentStatus === "UNVERIFIED") {
        const res = await apiClient.get(`/owner/library/${libId}`);

        if (res.data.success) {
          const lib = res.data.library;
          const photos = lib.photos || [];

          // If they ALREADY uploaded photos, they are officially done with setup!
          if (photos.length > 0) {
            const payload = {
              name: lib.name,
              city: lib.city,
              address: lib.address,
              amenities:
                typeof lib.amenities === "string"
                  ? JSON.parse(lib.amenities)
                  : lib.amenities || [],
              photos: photos,
              status: "PENDING_ADMIN_APPROVAL", // 📌 Upgrade the status!
            };

            await apiClient.put(`/owner/library/${libId}`, payload);
            useLibraryStore
              .getState()
              .setLibraryStatus("PENDING_ADMIN_APPROVAL");

            // Show a celebratory toast
            Toast.show({
              type: "success",
              text1: "Setup Complete! 🎉",
              text2: "Your library is now pending admin approval.",
            });
          }
        }
      }
    } catch (error) {
      console.error("Failed to upgrade status:", error);
    }
  };

  const handleSave = async () => {
    if (
      !shift ||
      !amenity ||
      !reservation ||
      !seats ||
      !price ||
      !startTime ||
      !endTime
    ) {
      return Toast.show({
        type: "error",
        text1: "Hold on",
        text2: "Please select all options and ensure times are set.",
      });
    }

    if (!libraryId) return Alert.alert("Error", "Library ID is missing.");

    setLoading(true);

    const payload = {
      shift,
      amenity,
      reservation,
      total_seats: parseInt(seats),
      price: parseFloat(price),
      seat_numbers: reservation === "RESERVED" ? seatNumbers : [],
      start_time: startTime,
      end_time: endTime,
    };

    if (editingId) {
      const { success, error } = await updateInventoryBucket(
        editingId,
        payload,
      );
      if (error) Alert.alert("Error", error);
      else {
        Alert.alert("Success", "Seat category updated!");
        handleCancelEdit();
        loadInventory(libraryId);
      }
    } else {
      const { success, error } = await addInventoryBucket(libraryId, payload);
      if (error) Alert.alert("Error", error);
      else {
        Alert.alert("Success", "Seat category added!");
        await AsyncStorage.setItem("hasInventory", "true");

        // 📌 4. Run the check right after seats are added!
        await checkAndUpgradeStatus(libraryId);

        handleCancelEdit();
        loadInventory(libraryId);
      }
    }
    setLoading(false);
  };

  return (
    <ScrollView ref={scrollViewRef} className="flex-1 bg-background">
      <Header title="Manage Seats" />

      <View
        className={`p-4 m-6 rounded-2xl mb-8 border ${editingId ? "bg-brand/5 border-brand/30" : "bg-white border-borderLight"}`}
      >
        <View className="flex-row justify-between items-center mb-4">
          <Text className="font-bold text-textDark text-lg">
            {editingId ? "Edit Category" : "Add New Category"}
          </Text>
          {editingId && (
            <TouchableOpacity
              onPress={handleCancelEdit}
              className="bg-red-50 px-3 py-1 rounded-full border border-red-100"
            >
              <Text className="text-red-600 font-bold text-l">Cancel</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Shift Selector */}
        <View className="mb-4">
          <Text className="text-textDark font-bold mb-2 text-sm uppercase tracking-wider">
            Shift
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {SHIFT_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt}
                onPress={() => setShift(opt)}
                className={`px-4 py-2 rounded-lg border mr-2 mb-2 ${shift === opt ? "bg-brand border-brand" : "bg-surface border-borderLight"}`}
              >
                <Text
                  className={`font-bold ${shift === opt ? "text-white" : "text-textDark"}`}
                >
                  {opt.replace("_", " ")}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Time Picker */}
        <View className="flex-row justify-between mb-4">
          <View className="flex-1 mr-2">
            <Text className="text-textDark font-bold mb-2 text-sm ml-1">
              Start Time
            </Text>
            <TouchableOpacity
              onPress={() => setShowStartPicker(true)}
              className="flex-row items-center bg-background border border-borderLight rounded-xl p-4 h-14"
            >
              <Ionicons
                name="time-outline"
                size={20}
                color={COLORS.textLight}
              />
              <Text
                className={`ml-2 font-m ${startTime ? "text-textDark font-bold" : "text-textLight"}`}
              >
                {formatTimeForUI(startTime)}
              </Text>
            </TouchableOpacity>
            {showStartPicker && (
              <DateTimePicker
                value={startDate}
                mode="time"
                display="default"
                onChange={onStartChange}
              />
            )}
          </View>

          <View className="flex-1 ml-2">
            <Text className="text-textDark font-bold mb-2 text-sm ml-1">
              End Time
            </Text>
            <TouchableOpacity
              onPress={() => setShowEndPicker(true)}
              className="flex-row items-center bg-background border border-borderLight rounded-xl p-4 h-14"
            >
              <Ionicons
                name="time-outline"
                size={20}
                color={COLORS.textLight}
              />
              <Text
                className={`ml-2 font-m ${endTime ? "text-textDark font-bold" : "text-textLight"}`}
              >
                {formatTimeForUI(endTime)}
              </Text>
            </TouchableOpacity>
            {showEndPicker && (
              <DateTimePicker
                value={endDate}
                mode="time"
                display="default"
                onChange={onEndChange}
              />
            )}
          </View>
        </View>

        {/* Environment Selector */}
        <View className="mb-4">
          <Text className="text-textDark font-bold mb-2 text-sm uppercase tracking-wider">
            Amenity
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {AMENITY_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt}
                onPress={() => setAmenity(opt)}
                className={`px-4 py-2 rounded-lg border mr-2 mb-2 ${amenity === opt ? "bg-brand border-brand" : "bg-surface border-borderLight"}`}
              >
                <Text
                  className={`font-bold ${amenity === opt ? "text-white" : "text-textDark"}`}
                >
                  {opt.replace("_", " ")}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Reservation Selector */}
        <View className="mb-4">
          <Text className="text-textDark font-bold mb-2 text-sm uppercase tracking-wider">
            Reservation Type
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {RESERVATION_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt}
                onPress={() => setReservation(opt)}
                className={`px-4 py-2 rounded-lg border mr-2 mb-2 ${reservation === opt ? "bg-brand border-brand" : "bg-surface border-borderLight"}`}
              >
                <Text
                  className={`font-bold ${reservation === opt ? "text-white" : "text-textDark"}`}
                >
                  {opt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Dynamic Inputs */}
        <View className="flex-row justify-between">
          <View className="flex-1 mr-2">
            <Input
              label="No. of Seats"
              value={seats}
              onChangeText={setSeats}
              keyboardType="number-pad"
              placeholder="e.g., 20"
            />
          </View>
          {reservation === "RESERVED" ? (
            <View className="flex-1 ml-2">
              <Input
                label="Seat Prefix"
                value={seatPrefix}
                onChangeText={setSeatPrefix}
                placeholder="e.g., Seat_"
              />
            </View>
          ) : (
            <View className="flex-1 ml-2">
              <Input
                label="Monthly Price (₹)"
                value={price}
                onChangeText={setPrice}
                keyboardType="number-pad"
                placeholder="e.g., 1000"
              />
            </View>
          )}
        </View>

        {reservation === "RESERVED" && seatNumbers.length > 0 && (
          <View className="mb-6 p-4 bg-brand/5 rounded-xl border border-brand/10 items-center">
            <Text className="text-xs font-bold text-textLight mb-3 uppercase tracking-wider">
              Seat Layout Preview
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {seatNumbers.map((seat) => (
                <View
                  key={seat}
                  className="bg-white border border-borderLight w-16 h-16 rounded-lg items-center justify-center"
                >
                  <Text
                    className="text-textDark font-bold text-xs"
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    {seat}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {reservation === "RESERVED" && (
          <View>
            <Input
              label="Monthly Price (₹)"
              value={price}
              onChangeText={setPrice}
              keyboardType="number-pad"
              placeholder="e.g., 1000"
            />
          </View>
        )}

        <Button
          title={editingId ? "Update Category" : "Save Category"}
          onPress={handleSave}
          loading={loading}
        />
      </View>

      {/* --- CURRENT INVENTORY LIST --- */}
      <Text className="font-bold text-textDark text-lg mb-4 ml-7">
        Current Capacity
      </Text>
      {loading && inventory.length === 0 ? (
        <ActivityIndicator size="large" color={COLORS.textDark} />
      ) : inventory.length === 0 ? (
        <Text className="text-textLight text-center py-4">
          No seats added yet.
        </Text>
      ) : (
        inventory.map((item) => (
          <View
            key={item.id}
            className="bg-white p-4 rounded-2xl mb-3 mx-6 flex-row justify-between items-center border border-borderLight"
          >
            <View className="flex-1 pr-2">
              <Text className="font-bold text-textDark text-lg uppercase leading-tight">
                {item.shift.replace(/_/g, " ")} •{" "}
                {item.amenity.replace(/_/g, " ")}
              </Text>
              <Text className="text-textLight font-bold text-xs mt-0.5">
                {item.start_time
                  ? `${formatTimeForUI(item.start_time.substring(0, 5))} - ${formatTimeForUI(item.end_time.substring(0, 5))}`
                  : "Timings not set"}
              </Text>
              <Text className="text-brandAccent font-bold text-xs uppercase mt-1.5">
                {item.reservation || "UNRESERVED"}
              </Text>
              <Text className="text-textLight font-medium mt-1">
                ₹{item.price} / month
              </Text>
            </View>
            <View className="flex-row items-center">
              <View className="bg-brand/10 px-4 py-4 rounded-xl items-center mr-3 min-w-[60px]">
                <Text className="text-brand font-black text-2xl">
                  {item.total_seats}
                </Text>
                <Text className="text-brand text-[10px] font-bold uppercase tracking-widest mt-0.5">
                  Seats
                </Text>
              </View>
              <View className="justify-center">
                <TouchableOpacity
                  onPress={() => handleEditClick(item)}
                  className="w-8 h-8 bg-blue-50 rounded-full items-center justify-center mb-2 border border-blue-100"
                >
                  <Ionicons name="pencil" size={16} color="#2563EB" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDeleteClick(item.id)}
                  className="w-8 h-8 bg-red-50 rounded-full items-center justify-center border border-red-100"
                >
                  <Ionicons name="trash" size={16} color="#DC2626" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))
      )}
      <View className="h-10" />
    </ScrollView>
  );
}
