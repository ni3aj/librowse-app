import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { ONBOARDING_ROUTE_MAP } from "@/constants/config";
import { completeUserProfile } from "@/features/onboarding/api";
import { useAuthStore } from "@/store/authStore";
import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";

export default function SetupProfileScreen() {
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(false);

  const { logout } = useAuthStore();

  const handleNext = async () => {
    if (!fullName.trim())
      return Toast.show({
        type: "error",
        text1: "Hold on",
        text2: "Please enter your full name.",
      });
    if (!role)
      return Toast.show({
        type: "error",
        text1: "Almost there",
        text2: "Please select if you are a Student or Library Owner.",
      });
    setLoading(true);
    const { success, token, error } = await completeUserProfile(fullName, role);
    setLoading(false);

    if (success) {
      useAuthStore.setState({
        jwt_token: token,
        role: role,
        account_state: "REQUIRES_MPIN",
        userName: fullName.trim(),
      });

      router.replace(ONBOARDING_ROUTE_MAP.REQUIRES_MPIN);
    } else {
      Toast.show({ type: "error", text1: "Error", text2: error });
    }
  };

  const handleStartOver = async () => {
    Alert.alert(
      "Start Over",
      "Are you sure you want to reset and start over?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes, Start Over",
          style: "destructive",
          onPress: () => {
            logout();
            router.replace("/");
          },
        },
      ],
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-background p-6 justify-center"
    >
      <View className="mb-10">
        <Text className="text-3xl font-bold text-gray-900 mb-2">
          Welcome to LiBrowse
        </Text>
        <Text className="text-base text-gray-600">
          Let's get your profile set up.
        </Text>
      </View>

      <View className="mb-4">
        <Input
          label="Full Name"
          placeholder="e.g. Rahul Sharma"
          value={fullName}
          onChangeText={setFullName}
        />
      </View>

      <Text className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider">
        I am a...
      </Text>

      <View className="flex-row justify-between mb-8">
        <TouchableOpacity
          onPress={() => setRole("student")}
          className={`flex-1 p-4 rounded-xl border-2 items-center mr-2 ${
            role === "student"
              ? "border-[#6e3482] bg-[#f5ebfa]"
              : "border-gray-200 bg-white"
          }`}
        >
          <Text
            className={`text-lg font-bold ${role === "student" ? "text-[#6e3482]" : "text-gray-900"}`}
          >
            🎓 Student
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setRole("owner")}
          className={`flex-1 p-4 rounded-xl border-2 items-center ml-2 ${
            role === "owner"
              ? "border-[#6e3482] bg-[#f5ebfa]"
              : "border-gray-200 bg-white"
          }`}
        >
          <Text
            className={`text-lg font-bold ${role === "owner" ? "text-[#6e3482]" : "text-gray-900"}`}
          >
            📚 Owner
          </Text>
        </TouchableOpacity>
      </View>

      <Button title="Continue" onPress={handleNext} loading={loading} />

      <TouchableOpacity onPress={handleStartOver} className="m-6 items-center">
        <Text className="text-gray-500 font-m text-sm">
          Logged in with wrong number?{" "}
          <Text className="text-[#6e3482] font-m-bold">Start Over</Text>
        </Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}
