import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { addInventoryBucket, getLibraryInventory } from "@/features/owner/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
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

  // Form State
  const [shift, setShift] = useState("");
  const [amenity, setAmenity] = useState("");
  const [reservation, setReservation] = useState(""); // 📌 Fixed State Name
  const [seats, setSeats] = useState("");
  const [price, setPrice] = useState("");

  // Options Constants
  const SHIFT_OPTIONS = ["DAY", "NIGHT", "FULL_DAY"];
  const AMENITY_OPTIONS = ["AC", "NON_AC"];
  // 📌 Exact matches to your DB reservation_type ENUM
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

  const loadInventory = async (id) => {
    setLoading(true);
    const { data, error } = await getLibraryInventory(id);
    console.log(data);
    if (error) Alert.alert("Error", error);
    else setInventory(data.data || []);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!shift || !amenity || !reservation || !seats || !price) {
      return Alert.alert(
        "Hold on",
        "Please select all options and fill all fields.",
      );
    }
    if (!libraryId) {
      return Alert.alert("Error", "Library ID is missing.");
    }

    setLoading(true);

    const { success, error } = await addInventoryBucket(libraryId, {
      shift: shift,
      amenity: amenity,
      reservation: reservation,
      total_seats: parseInt(seats),
      price: parseFloat(price),
    });

    if (error) {
      Alert.alert("Error", error);
    } else {
      Alert.alert("Success", "Seat category added!");
      await AsyncStorage.setItem("hasInventory", "true");
      setShift("");
      setAmenity("");
      setReservation("");
      setSeats("");
      setPrice("");
      loadInventory(libraryId);
    }
    setLoading(false);
  };

  return (
    <ScrollView className="flex-1 bg-background p-6 mb-8 mt-10">
      <Text className="text-2xl font-bold text-textDark mb-2">
        Manage Seats
      </Text>
      <Text className="text-textLight mb-6">
        Create capacity buckets for your students.
      </Text>

      {/* --- ADD NEW INVENTORY FORM --- */}
      <View className="bg-white p-4 rounded-2xl mb-8 border border-borderLight">
        <Text className="font-bold text-textDark text-lg mb-4">
          Add New Category
        </Text>

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
                  {opt}
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
                  {opt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 📌 Reservation Selector */}
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

        <View className="flex-row justify-between">
          <View className="flex-1 mr-2">
            <Input
              label="No. of Seats"
              value={seats}
              onChangeText={setSeats}
              keyboardType="number-pad"
              placeholder="e.g., 50"
            />
          </View>
          <View className="flex-1 ml-2">
            <Input
              label="Monthly Price (₹)"
              value={price}
              onChangeText={setPrice}
              keyboardType="number-pad"
              placeholder="e.g., 1000"
            />
          </View>
        </View>

        <Button title="Save Category" onPress={handleSave} loading={loading} />
      </View>

      {/* --- CURRENT INVENTORY LIST --- */}
      <Text className="font-bold text-textDark text-lg mb-4">
        Current Capacity
      </Text>

      {loading && inventory.length === 0 ? (
        <ActivityIndicator size="large" color="#443199" />
      ) : inventory.length === 0 ? (
        <Text className="text-textLight text-center py-4">
          No seats added yet.
        </Text>
      ) : (
        inventory.map((item) => (
          <View
            key={item.id}
            className="bg-white p-4 rounded-2xl mb-3 flex-row justify-between items-center border border-borderLight"
          >
            <View>
              {/* Displaying formatting cleanly back to the user */}
              <Text className="font-bold text-textDark text-lg uppercase">
                {item.shift.replace(/_/g, " ")} •{" "}
                {item.amenity.replace(/_/g, " ")}
              </Text>
              <Text className="text-brandAccent font-bold text-xs uppercase mt-1">
                {/* Safely display the enum value */}
                {item.reservation || "UNRESERVED"}
              </Text>
              <Text className="text-textLight font-medium mt-1">
                ₹{item.price} / month
              </Text>
            </View>
            <View className="bg-brand/10 px-3 py-2 rounded-lg">
              <Text className="text-brand font-bold">
                {item.total_seats} Seats
              </Text>
            </View>
          </View>
        ))
      )}
      <View className="h-10" />
    </ScrollView>
  );
}
