import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { ONBOARDING_ROUTE_MAP } from "@/constants/config";
import { completeUserProfile } from "@/features/onboarding/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
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

export default function SetupProfileScreen() {
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState(null); // 'owner' or 'student'
  const [loading, setLoading] = useState(false);

  const handleNext = async () => {
    if (!fullName.trim())
      return Alert.alert("Hold on", "Please enter your full name.");
    if (!role)
      return Alert.alert(
        "Almost there",
        "Please select if you are a Student or Library Owner.",
      );

    setLoading(true);
    const { success, token, error } = await completeUserProfile(fullName, role);
    setLoading(false);

    if (success) {
      await AsyncStorage.setItem("jwt_token", token);
      router.replace(ONBOARDING_ROUTE_MAP.REQUIRES_MPIN);
    } else {
      Alert.alert("Error", error);
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
          onPress: async () => {
            await AsyncStorage.clear(); // Wipes the old token!
            router.replace("/"); // Sends them back to the onboarding/login screen
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
        <Text className="text-3xl font-bold text-textDark mb-2">
          Welcome to LiBrowse
        </Text>
        <Text className="text-base text-textLight">
          Let's get your profile set up.
        </Text>
      </View>
      <View className="mb-8">
        <Input
          label="Full Name"
          placeholder="e.g. Rahul Sharma"
          value={fullName}
          onChangeText={setFullName}
        />
      </View>
      <Text className="text-sm font-bold text-textDark mb-4 uppercase tracking-wider">
        I am a...
      </Text>
      {/* Role Selection Cards */}
      <View className="flex-row justify-between mb-10">
        <TouchableOpacity
          onPress={() => setRole("student")}
          className={`flex-1 p-4 rounded-xl border-2 items-center mr-2 ${
            role === "student"
              ? "border-brand bg-brand/10"
              : "border-borderLight bg-surface"
          }`}
        >
          <Text
            className={`text-lg font-bold ${role === "student" ? "text-brand" : "text-textDark"}`}
          >
            🎓 Student
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setRole("owner")}
          className={`flex-1 p-4 rounded-xl border-2 items-center ml-2 ${
            role === "owner"
              ? "border-brand bg-brand/10"
              : "border-borderLight bg-surface"
          }`}
        >
          <Text
            className={`text-lg font-bold ${role === "owner" ? "text-brand" : "text-textDark"}`}
          >
            📚 Owner
          </Text>
        </TouchableOpacity>
      </View>
      <Button title="Continue" onPress={handleNext} loading={loading} />
      <TouchableOpacity onPress={handleStartOver} className="m-6 items-center">
        <Text className="text-textLight font-m text-sm">
          Logged in with wrong number?{" "}
          <Text className="text-brand font-m-bold">Start Over</Text>
        </Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}
