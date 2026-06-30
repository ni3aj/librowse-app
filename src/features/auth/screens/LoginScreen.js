import apiClient from "@/api/client";
import BackgroundBlobs from "@/components/ui/BackgroundBlobs";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
  Keyboard,
  Text,
  TouchableWithoutFeedback,
  View,
} from "react-native";

export default function LoginScreen() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [mpin, setMpin] = useState("");
  const [hasExistingSession, setHasExistingSession] = useState(false);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const checkSession = async () => {
        const token = await AsyncStorage.getItem("jwt_token");
        const mpinConfigured = await AsyncStorage.getItem("mpin_configured");
        setHasExistingSession(!!token && mpinConfigured === "true");
      };
      checkSession();
    }, []),
  );

  const handleSendOtp = async () => {
    if (phone.length !== 10)
      return Alert.alert("Error", "Enter 10-digit number.");
    setLoading(true);
    try {
      const response = await apiClient.post("/auth/send-otp", {
        phone,
        role: "student",
      });
      if (response.data.success) setStep(2);
    } catch (error) {
      Alert.alert("Error", error.response?.data?.error || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) return Alert.alert("Error", "Enter 6-digit OTP.");
    setLoading(true);
    try {
      const response = await apiClient.post("/auth/verify-otp", {
        phone,
        otp,
        role: "student",
      });
      if (response.data.success) {
        await AsyncStorage.setItem("jwt_token", response.data.token);
        router.replace("/setup-mpin");
      }
    } catch (error) {
      Alert.alert("Login Failed", "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleMpinLogin = async () => {
    if (mpin.length !== 4) return Alert.alert("Error", "Enter 4-digit MPIN.");
    setLoading(true);
    try {
      const response = await apiClient.post("/auth/login-mpin", { mpin });
      if (response.data.success) {
        router.replace(
          response.data.role === "owner"
            ? "/(owner)/dashboard"
            : "/(student)/home",
        );
      }
    } catch (error) {
      Alert.alert(
        "Login Failed",
        error.response?.data?.error || "Invalid MPIN",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View className="flex-1 justify-center px-8 bg-background">
        <BackgroundBlobs />
        <View className="items-center mb-12">
          <Text className="text-4xl font-m-extra text-textDark mb-2">
            LiBrowse 📚
          </Text>
          <Text className="text-base text-textLight">
            Browse. Enroll. Bloom.
          </Text>
        </View>

        {/* STEP 1: PHONE */}
        {step === 1 && (
          <View className="w-full">
            {hasExistingSession && (
              <View>
                <Button
                  title="Login with MPIN"
                  variant="dark"
                  onPress={() => setStep(3)}
                  className="mb-6"
                />
                <View className="flex-row items-center my-6">
                  <View className="flex-1 h-[1px] bg-borderLight" />
                  <Text className="mx-4 text-textLight font-m-semi uppercase tracking-widest text-xs">
                    OR
                  </Text>
                  <View className="flex-1 h-[1px] bg-borderLight" />
                </View>
              </View>
            )}

            <Input
              label="Phone Number"
              placeholder="9876543210"
              keyboardType="number-pad"
              maxLength={10}
              value={phone}
              onChangeText={setPhone}
            />

            <Button
              title="Get OTP"
              variant="primary"
              onPress={handleSendOtp}
              loading={loading}
            />
          </View>
        )}

        {/* STEP 2: OTP */}
        {step === 2 && (
          <View className="w-full">
            <Input
              label="Enter 6-Digit OTP"
              placeholder="------"
              keyboardType="number-pad"
              maxLength={6}
              secureTextEntry
              value={otp}
              onChangeText={setOtp}
            />
            <Button
              title="Verify"
              onPress={handleVerifyOtp}
              loading={loading}
              className="mb-4"
            />
            <Button
              title="Wrong Number? Back"
              variant="outline"
              onPress={() => setStep(1)}
            />
          </View>
        )}

        {/* STEP 3: MPIN */}
        {step === 3 && (
          <View className="w-full">
            <Input
              label="Enter 4-Digit MPIN"
              placeholder="••••"
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
              value={mpin}
              onChangeText={setMpin}
            />
            <Button
              title="Unlock App"
              variant="dark"
              onPress={handleMpinLogin}
              loading={loading}
              className="mb-4"
            />
            <Button
              title="Forgot MPIN? Use OTP"
              variant="primary"
              onPress={() => setStep(1)}
            />
          </View>
        )}
      </View>
    </TouchableWithoutFeedback>
  );
}
