import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import apiClient from "../../../api/client";

export default function SetupMpinScreen() {
  const [mpin, setMpin] = useState("");
  const [confirmMpin, setConfirmMpin] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSaveMpin = async () => {
    if (mpin.length !== 4)
      return Alert.alert("Error", "MPIN must be 4 digits.");
    if (mpin !== confirmMpin)
      return Alert.alert("Error", "MPINs do not match.");

    setLoading(true);
    try {
      const response = await apiClient.post("/auth/setup-quick-login", {
        mpin: mpin,
        enableFingerprint: false,
      });

      if (response.data.success) {
        Alert.alert(
          "Success!",
          "Your MPIN is set. You can use it next time for faster login.",
        );
        await AsyncStorage.setItem("mpin_configured", "true");
        if (response.data.role === "owner" && !response.data.hasLibrary) {
          router.replace("/create-library-wizard");
        } else if (response.data.role === "owner") {
          router.replace("/(owner)/dashboard");
        } else {
          router.replace("/(student)/home");
        }
      }
    } catch (error) {
      console.log("CRITICAL ERROR:", error);
      Alert.alert("Error", "Failed to save MPIN");
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View className="flex-1 justify-center px-6 bg-white">
        <Text className="text-3xl font-m-bold text-gray-900 mb-2 text-center">
          Set up Quick Login
        </Text>
        <Text className="text-gray-500 text-center mb-10">
          Create a 4-digit MPIN so you don't need an OTP next time.
        </Text>

        <Text className="text-sm font-m-semi text-gray-700 mb-2 ml-1">
          Create MPIN
        </Text>
        <TextInput
          className="bg-gray-50 px-4 py-4 rounded-xl text-2xl text-gray-900 border border-gray-200 mb-4 text-center tracking-widest"
          placeholder="••••"
          keyboardType="number-pad"
          maxLength={4}
          secureTextEntry
          value={mpin}
          onChangeText={setMpin}
        />

        <Text className="text-sm font-m-semi text-gray-700 mb-2 ml-1 mt-2">
          Confirm MPIN
        </Text>
        <TextInput
          className="bg-gray-50 px-4 py-4 rounded-xl text-2xl text-gray-900 border border-gray-200 mb-8 text-center tracking-widest"
          placeholder="••••"
          keyboardType="number-pad"
          maxLength={4}
          secureTextEntry
          value={confirmMpin}
          onChangeText={setConfirmMpin}
        />

        <TouchableOpacity
          className="bg-gray-900 py-4 rounded-xl items-center mb-4"
          onPress={handleSaveMpin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-m-bold text-lg">
              Save MPIN & Continue
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          className="items-center py-4"
          onPress={() => router.replace("/(student)/home")}
        >
          <Text className="text-gray-500 font-medium">Skip for now</Text>
        </TouchableOpacity>
      </View>
    </TouchableWithoutFeedback>
  );
}
