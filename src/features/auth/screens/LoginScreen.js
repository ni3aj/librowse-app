import apiClient from "@/api/client";
import BackgroundBlobs from "@/components/ui/BackgroundBlobs";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { ONBOARDING_ROUTE_MAP } from "@/constants/config";
import { fetchCurrentUserStatus } from "@/features/auth/api";
import { useAuthStore } from "@/store/authStore";
import { Ionicons } from "@expo/vector-icons";
import * as LocalAuthentication from "expo-local-authentication";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
  Keyboard,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

export default function LoginScreen() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [mpin, setMpin] = useState("");
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  const [biometricSupported, setBiometricSupported] = useState(false);
  const [cachedRouteState, setCachedRouteState] = useState(null);

  // 📌 Pull everything we need from our Zustand "Bucket"
  const {
    jwt_token,
    force_mpin_reset,
    loginSuccess,
    logout,
    triggerMpinReset,
    clearMpinResetFlag,
    setMpinConfigured,
  } = useAuthStore();

  useFocusEffect(
    useCallback(() => {
      const checkSession = async () => {
        setIsChecking(true);

        const compatible = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        setBiometricSupported(compatible && enrolled);

        // 📌 No need to ask AsyncStorage, just check if Zustand has the token!
        if (!jwt_token) {
          setIsChecking(false);
          return;
        }

        const { success, data, error, isUnauthorized } =
          await fetchCurrentUserStatus();

        if (!success) {
          if (isUnauthorized) {
            console.log("Token expired. Wiping storage.");
            logout(); // 📌 Zustand handles the wiping automatically
          } else {
            console.log("Network error. Keeping token safe in wallet.", error);
          }
          setIsChecking(false);
          return;
        }

        // 📌 Zustand handles saving all this to AsyncStorage automatically!
        loginSuccess(data);

        const currentState = data.account_state;
        setCachedRouteState(currentState);

        if (currentState.startsWith("ACTIVE")) {
          setMpinConfigured(true);

          if (compatible && enrolled) {
            handleBiometricLogin(currentState);
          } else {
            setStep(3);
          }
        } else {
          const nextRoute = ONBOARDING_ROUTE_MAP[currentState];
          if (!nextRoute) {
            Alert.alert("Routing Error", `Missing route for: ${currentState}`);
            setLoading(false);
            return;
          }
          router.replace(nextRoute);
        }

        setIsChecking(false);
      };

      checkSession();
    }, [jwt_token]), // Added jwt_token as dependency so it reacts to changes
  );

  const handleBiometricLogin = async (targetState) => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Unlock LiBrowse",
        fallbackLabel: "Use MPIN",
        disableDeviceFallback: false,
        cancelLabel: "Cancel",
      });

      if (result.success) {
        const finalState = targetState || cachedRouteState;
        if (finalState && ONBOARDING_ROUTE_MAP[finalState]) {
          router.replace(ONBOARDING_ROUTE_MAP[finalState]);
        } else {
          setStep(3);
        }
      } else {
        setStep(3);
      }
    } catch (error) {
      setStep(3);
    }
  };

  const handleForgotMpin = () => {
    Alert.alert(
      "Reset MPIN",
      "You will be securely logged out. You must verify your phone number via OTP to set a new MPIN.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Proceed",
          style: "destructive",
          onPress: () => {
            triggerMpinReset(); // 📌 Zustand logs them out and sets the flag instantly
            setCachedRouteState(null);
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

        // 📌 Save everything to Zustand (and automatically AsyncStorage) at once
        loginSuccess(data);

        let finalState = data.account_state;

        if (force_mpin_reset) {
          clearMpinResetFlag(); // Clear the flag now that they passed OTP
          finalState = "REQUIRES_MPIN";
        }

        if (finalState.startsWith("ACTIVE")) {
          setMpinConfigured(true);
        }

        const nextRoute = ONBOARDING_ROUTE_MAP[finalState];
        if (!nextRoute) {
          Alert.alert("Routing Error", `Missing route for: ${finalState}`);
          setLoading(false);
          return;
        }

        router.replace(nextRoute);
      }
    } catch (error) {
      Alert.alert(
        "Error",
        error.response?.data?.error || "Verification failed",
      );
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

        // 📌 Save everything to Zustand at once
        loginSuccess(data);

        const currentState = data.account_state;
        const nextRoute = ONBOARDING_ROUTE_MAP[currentState];

        if (!nextRoute) {
          Alert.alert("Routing Error", `Missing route for: ${currentState}`);
          setLoading(false);
          return;
        }

        router.replace(nextRoute);
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
            <Input
              label="Mobile Number"
              keyboardType="number-pad"
              maxLength={10}
              value={phone}
              onChangeText={setPhone}
            />
            {/* 📌 New Privacy Reassurance Message */}
            <View className="flex-row items-center mb-5 mt-[-10]">
              <Ionicons
                name="shield-checkmark"
                size={14}
                color="#10B981"
                className="mr-1.5"
              />
              <Text className="text-[11px] font-m text-textLight/80 flex-1 leading-4">
                We value your privacy. Your number is kept hidden and is only
                shared with the library owner if you explicitly book a seat with
                them.
              </Text>
            </View>

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

            <View className="flex-row justify-between mb-4">
              <View className="flex-1 mr-2">
                <Button
                  title="Unlock App"
                  variant="dark"
                  onPress={handleMpinLogin}
                  loading={loading}
                />
              </View>

              {biometricSupported && (
                <TouchableOpacity
                  onPress={() => handleBiometricLogin()}
                  className="bg-brand/10 w-14 items-center justify-center rounded-2xl border border-brand/20"
                >
                  <Ionicons name="finger-print" size={28} color="#C13383" />
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
