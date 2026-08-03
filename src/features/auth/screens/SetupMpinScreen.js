import apiClient from "@/api/client";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { ONBOARDING_ROUTE_MAP } from "@/constants/config";
import { useAuthStore } from "@/store/authStore";
import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Keyboard,
  Text,
  TouchableWithoutFeedback,
  View,
} from "react-native";

export default function SetupMpinScreen() {
  const [mpin, setMpin] = useState("");
  const [confirmMpin, setConfirmMpin] = useState("");
  const [loading, setLoading] = useState(false);

  // 📌 1. Pull the exact tools we need from Zustand
  const { setMpinConfigured, account_state } = useAuthStore();

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
        // 📌 2. Update Zustand! It will auto-save to AsyncStorage in the background
        setMpinConfigured(true);

        Alert.alert(
          "Success!",
          "Your MPIN is set. You can use it next time for faster login.",
        );

        // Route based on backend response
        if (response.data.role === "owner" && !response.data.hasLibrary) {
          router.replace("/create-library-wizard");
        } else if (response.data.role === "owner") {
          router.replace("/(owner)/dashboard");
        } else {
          router.replace(ONBOARDING_ROUTE_MAP.ACTIVE_STUDENT);
        }
      }
    } catch (error) {
      console.log("CRITICAL ERROR:", error);
      Alert.alert(
        "Error",
        error.response?.data?.error || "Failed to save MPIN",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    // 📌 3. Smart Skip: Route them to their proper home based on Zustand state
    const nextRoute = ONBOARDING_ROUTE_MAP[account_state];
    if (nextRoute) {
      router.replace(nextRoute);
    } else {
      router.replace("/(student)/dashboard"); // Fallback
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View className="flex-1 justify-center px-8 bg-background">
        <View className="items-center mb-10">
          <Text className="text-3xl font-m-extra text-textDark mb-2 text-center">
            Set up Quick Login
          </Text>
          <Text className="text-base font-m text-textLight text-center">
            Create a 4-digit MPIN so you don't need an OTP next time.
          </Text>
        </View>

        <View className="space-y-4 mb-8">
          <Input
            label="Create MPIN"
            placeholder="••••"
            keyboardType="number-pad"
            maxLength={4}
            secureTextEntry
            value={mpin}
            onChangeText={setMpin}
          />

          <Input
            label="Confirm MPIN"
            placeholder="••••"
            keyboardType="number-pad"
            maxLength={4}
            secureTextEntry
            value={confirmMpin}
            onChangeText={setConfirmMpin}
          />
        </View>

        {/* 📌 Replaced raw TouchableOpacity with your custom Button components */}
        <Button
          title="Save MPIN & Continue"
          variant="primary"
          onPress={handleSaveMpin}
          loading={loading}
          className="mb-4"
        />

        {/* <Button
          title="Skip for now"
          variant="outline"
          onPress={handleSkip}
          disabled={loading}
        /> */}
      </View>
    </TouchableWithoutFeedback>
  );
}
