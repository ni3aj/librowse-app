import apiClient from "@/api/client";
import BackgroundBlobs from "@/components/ui/BackgroundBlobs";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { fetchCurrentUserStatus } from "@/features/auth/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as LocalAuthentication from "expo-local-authentication"; // 📌 NEW IMPORT
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Text,
  TouchableWithoutFeedback,
  View,
} from "react-native";
// 📌 Optional Icon for the Biometric Button
import { Ionicons } from "@expo/vector-icons";

export default function LoginScreen() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [mpin, setMpin] = useState("");
  const [hasExistingSession, setHasExistingSession] = useState(false);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [biometricSupported, setBiometricSupported] = useState(false); // 📌 Track biometric support

  useFocusEffect(
    useCallback(() => {
      const checkSession = async () => {
        setIsChecking(true);

        // 📌 1. Check if device supports FaceID / Fingerprint
        const compatible = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        setBiometricSupported(compatible && enrolled);

        const token = await AsyncStorage.getItem("jwt_token");
        if (!token) {
          setHasExistingSession(false);
          setIsChecking(false);
          return;
        }

        const { success, data, error, isUnauthorized } =
          await fetchCurrentUserStatus();

        if (!success) {
          if (isUnauthorized) {
            console.log("Token expired. Wiping storage.");
            await AsyncStorage.clear();
          } else {
            console.log("Network error. Keeping token safe in wallet.", error);
          }
          setHasExistingSession(false);
          setIsChecking(false);
          return;
        }

        if (data.token) await AsyncStorage.setItem("jwt_token", data.token);
        if (data.libraryId)
          await AsyncStorage.setItem("libraryId", data.libraryId);
        await AsyncStorage.setItem(
          "hasInventory",
          data.hasInventory ? "true" : "false",
        );
        const currentState = data.account_state;
        if (currentState.startsWith("ACTIVE")) {
          await AsyncStorage.setItem("mpin_configured", "true");
          setHasExistingSession(true);
          if (compatible && enrolled) {
            handleBiometricLogin(data.user.role);
          } else {
            setStep(3);
          }
        } else {
          router.replace(ONBOARDING_ROUTE_MAP[currentState]);
        }

        setIsChecking(false);
      };
      checkSession();
    }, []),
  );

  // 📌 3. THE BIOMETRIC LOGIN HANDLER
  const handleBiometricLogin = async (knownRole = null) => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Unlock LiBrowse",
        fallbackLabel: "Use MPIN",
        disableDeviceFallback: false, // Allows them to use device passcode if FaceID fails
        cancelLabel: "Cancel",
      });

      if (result.success) {
        // If they successfully used fingerprint/face, we need to know where to route them.
        // If we know their role from the boot check, use it. Otherwise, fetch it.
        let finalRole = knownRole;
        if (!finalRole) {
          const { data } = await fetchCurrentUserStatus();
          finalRole = data?.user?.role;
        }

        if (finalRole === "owner") {
          router.replace("/(owner)/dashboard");
        } else {
          router.replace("/(student)/home");
        }
      } else {
        // If they cancel or fail, ensure they are on the MPIN screen
        setStep(3);
      }
    } catch (error) {
      console.log("Biometric Auth Error", error);
      setStep(3); // Fallback to MPIN on error
    }
  };

  if (isChecking) {
    return (
      <View className="flex-1 bg-background justify-center items-center">
        <ActivityIndicator size="large" color="#C13383" />
      </View>
    );
  }

  const handleForgotMpin = async () => {
    Alert.alert(
      "Reset MPIN",
      "You will be securely logged out. You must verify your phone number via OTP to set a new MPIN.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Proceed",
          style: "destructive",
          onPress: async () => {
            await AsyncStorage.removeItem("jwt_token");
            await AsyncStorage.removeItem("mpin_configured");
            await AsyncStorage.setItem("force_mpin_reset", "true");
            setHasExistingSession(false);
            setStep(1);
          },
        },
      ],
    );
  };

  const handleSendOtp = async () => {
    if (phone.length !== 10)
      return Alert.alert("Error", "Enter 10-digit number.");
    setLoading(true);
    try {
      const response = await apiClient.post("/auth/send-otp", { phone });
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
      const response = await apiClient.post("/auth/verify-otp", { phone, otp });

      if (response.data.success) {
        const { data } = response;
        await AsyncStorage.setItem("jwt_token", data.token);
        if (data.libraryId)
          await AsyncStorage.setItem("libraryId", data.libraryId);
        await AsyncStorage.setItem(
          "hasInventory",
          data.hasInventory ? "true" : "false",
        );
        const needsReset = await AsyncStorage.getItem("force_mpin_reset");
        let finalState = data.account_state;
        if (needsReset === "true") {
          await AsyncStorage.removeItem("force_mpin_reset");
          finalState = "REQUIRES_MPIN";
        }
        if (finalState.startsWith("ACTIVE")) {
          await AsyncStorage.setItem("mpin_configured", "true");
        }
        router.replace(ONBOARDING_ROUTE_MAP[finalState]);
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
        const { data } = response;
        if (data.libraryId)
          await AsyncStorage.setItem("libraryId", data.libraryId);
        if (data.hasInventory !== undefined) {
          await AsyncStorage.setItem(
            "hasInventory",
            data.hasInventory ? "true" : "false",
          );
        }
        router.replace(ONBOARDING_ROUTE_MAP[data.account_state]);
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
            Your Perfect Desk, Waiting.
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
              keyboardType="number-pad"
              maxLength={6}
              secureTextEntry
              value={otp}
              onChangeText={setOtp}
              textContentType="oneTimeCode"
              autoComplete="sms-otp"
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

        {/* STEP 3: MPIN (With Optional Biometric Button) */}
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

            <View className="flex-row justify-between mb-4">
              <View className="flex-1 mr-2">
                <Button
                  title="Unlock App"
                  variant="dark"
                  onPress={handleMpinLogin}
                  loading={loading}
                />
              </View>

              {/* 📌 Optional: Show a quick fingerprint icon button if they closed the auto-prompt */}
              {biometricSupported && (
                <TouchableOpacity
                  onPress={() => handleBiometricLogin()}
                  className="bg-brand/10 w-14 items-center justify-center rounded-2xl border border-brand/20"
                >
                  <Ionicons name="fingerprint" size={28} color="#C13383" />
                </TouchableOpacity>
              )}
            </View>

            <Button
              title="Forgot MPIN? Use OTP"
              variant="primary"
              onPress={handleForgotMpin}
            />
          </View>
        )}
      </View>
    </TouchableWithoutFeedback>
  );
}
