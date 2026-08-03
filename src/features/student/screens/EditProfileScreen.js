import apiClient from "@/api/client";
import Button from "@/components/ui/Button";
import Header from "@/components/ui/Header";
import Input from "@/components/ui/Input";
import { COLORS } from "@/constants/theme";
import { updateStudentProfile } from "@/features/student/api";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
} from "react-native";
import Toast from "react-native-toast-message";

export default function EditProfileScreen() {
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    address: "",
    city: "",
    phone: "",
  });

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const response = await apiClient.get("/student/profile");
      if (response.data.success) {
        const user = response.data.user;
        setFormData({
          full_name: user.full_name || "",
          email: user.email || "",
          address: user.address || "",
          city: user.city || "",
          phone: user.phone || "",
        });
      }
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to load profile data.",
      });
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.full_name.trim()) {
      return Toast.show({
        type: "error",
        text1: "Validation Error",
        text2: "Full Name is required.",
      });
    }

    setIsSaving(true);
    try {
      const payload = {
        full_name: formData.full_name.trim(),
        email: formData.email.trim().toLowerCase(),
        address: formData.address.trim(),
        city: formData.city.trim(),
      };

      const response = await updateStudentProfile(payload);

      if (response.data.success) {
        Toast.show({
          type: "success",
          text1: "Success! 🎉",
          text2: "Your profile has been updated.",
        });
        setTimeout(() => router.push("(student)/profile"), 1000);
      }
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Update Failed",
        text2:
          error.response?.data?.error || "Something went wrong while saving.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-background justify-center items-center">
        <ActivityIndicator size="large" color={COLORS.brand} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <Header title="Edit Profile" />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
        >
          <View>
            <Input
              label="Full Name"
              placeholder="Enter your full name"
              value={formData.full_name}
              onChangeText={(text) =>
                setFormData({ ...formData, full_name: text })
              }
              autoCapitalize="words"
            />

            <Input
              label="Mobile Number"
              value={`+91 ${formData.phone}`}
              editable={false}
              rightIcon="lock-closed"
            />

            <Input
              label="Email Address"
              placeholder="student@example.com"
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Input
              label="City"
              placeholder="e.g., Mumbai, Pune"
              value={formData.city}
              onChangeText={(text) => setFormData({ ...formData, city: text })}
            />

            <Input
              label="Residential Address"
              placeholder="Enter your address"
              value={formData.address}
              onChangeText={(text) =>
                setFormData({ ...formData, address: text })
              }
              multiline
              style={{
                minHeight: 80,
                textAlignVertical: "top",
                paddingTop: 12,
              }}
            />
          </View>

          <Button
            title="Save Changes"
            variant="primary"
            className="mt-2 py-4"
            loading={isSaving}
            onPress={handleSave}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
