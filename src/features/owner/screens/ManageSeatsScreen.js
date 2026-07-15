// app/owner/manage-seats.js

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
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function ManageSeatsScreen() {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [libraryId, setLibraryId] = useState(null);
  const scrollViewRef = useRef(null);

  // Track if we are editing an existing category
  const [editingId, setEditingId] = useState(null);

  // Form State
  const [shift, setShift] = useState("");
  const [amenity, setAmenity] = useState("");
  const [reservation, setReservation] = useState("");
  const [seats, setSeats] = useState("");
  const [price, setPrice] = useState("");

  const [seatPrefix, setSeatPrefix] = useState("Seat_");
  const [seatNumbers, setSeatNumbers] = useState([]);

  // Options Constants
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

  // Auto-Generate Seat Numbers
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

  // Populate the form when Edit is clicked
  const handleEditClick = (item) => {
    setEditingId(item.id);
    setShift(item.shift);
    setAmenity(item.amenity);
    setReservation(item.reservation);
    setPrice(item.price ? String(item.price) : "");
    setSeats(item.total_seats ? String(item.total_seats) : "");

    if (
      item.reservation === "RESERVED" &&
      item.seat_numbers &&
      item.seat_numbers.length > 0
    ) {
      const firstSeat = item.seat_numbers[0];
      const match = firstSeat.match(/^(.*?)(\d+)$/);
      if (match) {
        setSeatPrefix(match[1]);
      } else {
        setSeatPrefix("");
      }
    } else {
      setSeatPrefix("Seat_");
    }

    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  // Clear the form and exit edit mode
  const handleCancelEdit = () => {
    setEditingId(null);
    setShift("");
    setAmenity("");
    setReservation("");
    setSeats("");
    setPrice("");
    setSeatPrefix("Seat_");
  };

  const handleDeleteClick = (id) => {
    Alert.alert(
      "Delete Category",
      "Are you sure you want to delete this seat category? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            const { success, error } = await deleteInventoryBucket(id);
            if (error) {
              Alert.alert("Cannot Delete", error); // This will show the "Active Students" warning!
            } else {
              loadInventory(libraryId);
            }
            setLoading(false);
          },
        },
      ],
    );
  };

  const handleSave = async () => {
    if (!shift || !amenity || !reservation || !seats || !price) {
      return Alert.alert(
        "Hold on",
        "Please select all options and fill all fields.",
      );
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
    };

    if (editingId) {
      const { success, error } = await updateInventoryBucket(
        editingId,
        payload,
      );
      if (error) {
        Alert.alert("Error", error);
      } else {
        Alert.alert("Success", "Seat category updated!");
        handleCancelEdit();
        loadInventory(libraryId);
      }
      setLoading(false);
      return;
    }

    const { success, error } = await addInventoryBucket(libraryId, payload);
    if (error) {
      Alert.alert("Error", error);
    } else {
      Alert.alert("Success", "Seat category added!");
      await AsyncStorage.setItem("hasInventory", "true");
      handleCancelEdit();
      loadInventory(libraryId);
    }
    setLoading(false);
  };

  return (
    <ScrollView ref={scrollViewRef} className="flex-1 bg-background">
      <Header
        title="Manage Seats"
        subtitle="Create and edit capacity buckets"
      />

      {/* --- ADD / EDIT INVENTORY FORM --- */}
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
                className={`px-4 py-2 rounded-lg border mr-2 mb-2 ${
                  shift === opt
                    ? "bg-brand border-brand"
                    : "bg-surface border-borderLight"
                }`}
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
                className={`px-4 py-2 rounded-lg border mr-2 mb-2 ${
                  amenity === opt
                    ? "bg-brand border-brand"
                    : "bg-surface border-borderLight"
                }`}
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
                className={`px-4 py-2 rounded-lg border mr-2 mb-2 ${
                  reservation === opt
                    ? "bg-brand border-brand"
                    : "bg-surface border-borderLight"
                }`}
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

        {/* Dynamic Inputs based on Reservation Type */}
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

        {/* Visual Seat Preview (Only shows for RESERVED) */}
        {reservation === "RESERVED" && seatNumbers.length > 0 && (
          <View className="mb-6 p-4 bg-brand/5 rounded-xl border border-brand/10">
            <Text className="text-xs font-bold text-textLight mb-3 uppercase tracking-wider">
              Seat Layout Preview
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {seatNumbers.map((seat) => (
                <View
                  key={seat}
                  className="bg-white border border-borderLight w-12 h-12 rounded-lg items-center justify-center"
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

        {/* Extra Price Row if Reserved */}
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
            {/* Left Side: Info */}
            <View className="flex-1 pr-2">
              <Text className="font-bold text-textDark text-lg uppercase leading-tight">
                {item.shift.replace(/_/g, " ")} •{" "}
                {item.amenity.replace(/_/g, " ")}
              </Text>
              <Text className="text-brandAccent font-bold text-xs uppercase mt-1">
                {item.reservation || "UNRESERVED"}
              </Text>
              <Text className="text-textLight font-medium mt-1">
                ₹{item.price} / month
              </Text>
            </View>

            {/* Right Side: Seat Badge & Vertical Actions */}
            <View className="flex-row items-center">
              {/* Seat Count Badge */}
              <View className="bg-brand/10 px-5 py-4 rounded-xl items-center mr-3 min-w-[60px]">
                <Text className="text-brand font-black text-2xl">
                  {item.total_seats}
                </Text>
                <Text className="text-brand text-[10px] font-bold uppercase tracking-widest mt-0.5">
                  Seats
                </Text>
              </View>

              {/* Vertical Action Buttons (Edit / Delete) */}
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
