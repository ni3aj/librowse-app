import apiClient from "@/api/client";
import Button from "@/components/ui/Button";
import Header from "@/components/ui/Header";
import { useAuthStore } from "@/store/authStore";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";
import Toast from "react-native-toast-message";

export default function KycScreen() {
  const { is_kyc_verified, kyc_reference_id, updateKycStatus } = useAuthStore();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [idNumber, setIdNumber] = useState("");

  const status = is_kyc_verified
    ? "VERIFIED"
    : kyc_reference_id
      ? "PENDING"
      : "UNVERIFIED";

  useEffect(() => {
    if (kyc_reference_id) {
      handleIdChange(kyc_reference_id);
    }
  }, [kyc_reference_id]);

  const handleIdChange = (text) => {
    const cleaned = text.replace(/\D/g, "");
    const match = cleaned.match(/.{1,4}/g);
    const formatted = match ? match.join(" ") : cleaned;
    setIdNumber(formatted.substring(0, 14));
  };

  const handleSubmit = async () => {
    if (idNumber.length !== 14) {
      Toast.show({
        type: "error",
        text1: "Invalid Input",
        text2: "Please enter a valid 12-digit Aadhaar number.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const cleanIdNumber = idNumber.replace(/\s/g, "");

      const response = await apiClient.post("/student/kyc/submit", {
        id_number: cleanIdNumber,
      });

      if (response.data.success) {
        updateKycStatus(
          response.data.user.is_kyc_verified,
          response.data.user.kyc_reference_id,
        );

        Toast.show({
          type: "success",
          text1: "Submitted for Review",
          text2: "The library owner will verify your details.",
        });
      }
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Submission Failed",
        text2: error.response?.data?.error || "Please try again later.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusConfig = () => {
    switch (status) {
      case "VERIFIED":
        return {
          bg: "bg-emerald-50",
          border: "border-emerald-200",
          icon: "checkmark-circle",
          iconColor: "#059669",
          title: "Identity Verified",
          desc: "Your KYC is complete. You can seamlessly book any library.",
        };
      case "PENDING":
        return {
          bg: "bg-yellow-50",
          border: "border-yellow-200",
          icon: "time",
          iconColor: "#D97706",
          title: "Submitted for Owner Review",
          desc: "Please show your physical Aadhaar card to the library owner on your next visit to get approved.",
        };
      default:
        return {
          bg: "bg-blue-50",
          border: "border-blue-200",
          icon: "shield-checkmark",
          iconColor: "#2563EB",
          title: "KYC Required",
          desc: "Enter your 12-digit Aadhaar number. The owner will review and approve it.",
        };
    }
  };

  const config = getStatusConfig();
  const isEditable = status === "UNVERIFIED";

  return (
    <View className="flex-1 bg-background">
      <Header title="KYC" enableBack={true} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          className="flex-1 px-6 pt-2"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View
            className={`p-4 rounded-2xl mb-8 border flex-row items-start ${config.bg} ${config.border}`}
          >
            <Ionicons
              name={config.icon}
              size={24}
              color={config.iconColor}
              className="mt-0.5"
            />
            <View className="flex-1 ml-3">
              <Text
                style={{ color: config.iconColor }}
                className="text-base font-m-bold mb-1"
              >
                {config.title}
              </Text>
              <Text className="text-textDark font-m text-sm leading-5 opacity-80">
                {config.desc}
              </Text>
            </View>
          </View>

          <View className="mb-8">
            <Text className="text-sm font-m-bold text-textDark mb-2 ml-1">
              Aadhaar Number
            </Text>
            <TextInput
              value={idNumber}
              onChangeText={handleIdChange}
              editable={isEditable}
              placeholder="XXXX XXXX XXXX"
              keyboardType="number-pad"
              maxLength={14}
              className={`border rounded-xl px-4 py-3.5 font-m-bold text-lg tracking-widest ${
                isEditable
                  ? "bg-white border-borderLight text-textDark focus:border-brand"
                  : "bg-surface border-transparent text-textLight"
              }`}
            />
            {isEditable && (
              <Text className="text-xs font-m text-textLight mt-2 ml-1">
                Your data is securely sent to the library owner for physical
                verification only.
              </Text>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {isEditable && (
        <View className="bg-white border-t border-borderLight px-6 py-4 pb-8">
          <Button
            title="Submit for Verification"
            variant="primary"
            loading={isSubmitting}
            onPress={handleSubmit}
            className="py-4"
          />
        </View>
      )}
    </View>
  );
}
