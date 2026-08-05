import apiClient from "@/api/client";
import Button from "@/components/ui/Button";
import Header from "@/components/ui/Header";
import Input from "@/components/ui/Input";
import { useLibraryStore } from "@/store/libraryStore";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";

export default function LinkBankAccountScreen() {
  const { libraryId } = useLibraryStore();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [applyToAll, setApplyToAll] = useState(true);

  const [formData, setFormData] = useState({
    accountName: "",
    accountNumber: "",
    confirmAccountNumber: "",
    ifscCode: "",
  });

  const [errors, setErrors] = useState({});

  const validateForm = () => {
    let newErrors = {};

    if (!formData.accountName.trim()) {
      newErrors.accountName = "Account holder name is required.";
    }

    if (!formData.accountNumber.trim()) {
      newErrors.accountNumber = "Account number is required.";
    } else if (!/^\d+$/.test(formData.accountNumber)) {
      newErrors.accountNumber = "Account number must contain only digits.";
    }

    if (formData.accountNumber !== formData.confirmAccountNumber) {
      newErrors.confirmAccountNumber = "Account numbers do not match.";
    }

    if (!formData.ifscCode.trim()) {
      newErrors.ifscCode = "IFSC code is required.";
    } else if (formData.ifscCode.length !== 11) {
      newErrors.ifscCode = "IFSC code must be exactly 11 characters.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLinkAccount = async () => {
    if (!libraryId) {
      return Toast.show({
        type: "error",
        text1: "Error",
        text2: "No active library selected.",
      });
    }

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const payload = {
        library_id: libraryId,
        account_name: formData.accountName.trim(),
        account_number: formData.accountNumber.trim(),
        ifsc_code: formData.ifscCode.trim().toUpperCase(),
        apply_to_all: applyToAll,
      };

      const response = await apiClient.post("/owner/bank-details", payload);

      if (response.data.success) {
        Toast.show({
          type: "success",
          text1: "Bank Linked",
          text2: applyToAll
            ? "Account successfully linked to all your libraries."
            : "Your account is ready to receive payments.",
        });

        setTimeout(() => router.back(), 1500);
      }
    } catch (error) {
      console.log("Bank Link Error:", error.response?.data || error.message);

      Toast.show({
        type: "error",
        text1: "Linking Failed",
        text2:
          error.response?.data?.error ||
          "Could not connect to Razorpay. Please try again later.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View className="flex-1 bg-background">
      <Header title="Bank Details" />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingLeft: 24,
            paddingRight: 24,
            paddingBottom: 60,
          }}
        >
          <View className="mb-6 flex-row items-center bg-blue-50 border border-blue-200 p-4 rounded-2xl">
            <View className="bg-blue-100 w-12 h-12 rounded-full items-center justify-center mr-4">
              <Ionicons name="shield-checkmark" size={24} color="#2563EB" />
            </View>
            <View className="flex-1">
              <Text className="text-blue-900 font-m-bold text-sm">
                Secure Automated Payouts
              </Text>
              <Text className="text-blue-800 font-m text-xs mt-0.5 leading-5">
                Payments from students are automatically transferred to this
                bank account within 2-3 business days securely via Razorpay. We
                do not store your bank details.
              </Text>
            </View>
          </View>

          <View className="space-y-4">
            <Input
              label="Account Holder Name"
              placeholder="Exactly as it appears on bank statement"
              value={formData.accountName}
              error={errors.accountName}
              onChangeText={(text) => {
                setFormData({ ...formData, accountName: text });
                if (errors.accountName)
                  setErrors({ ...errors, accountName: null });
              }}
              autoCapitalize="words"
            />

            <Input
              label="Account Number"
              placeholder="Enter bank account number"
              value={formData.accountNumber}
              error={errors.accountNumber}
              onChangeText={(text) => {
                setFormData({ ...formData, accountNumber: text });
                if (errors.accountNumber)
                  setErrors({ ...errors, accountNumber: null });
              }}
              keyboardType="number-pad"
              secureTextEntry={true}
            />

            <Input
              label="Confirm Account Number"
              placeholder="Re-enter bank account number"
              value={formData.confirmAccountNumber}
              error={errors.confirmAccountNumber}
              onChangeText={(text) => {
                setFormData({ ...formData, confirmAccountNumber: text });
                if (errors.confirmAccountNumber)
                  setErrors({ ...errors, confirmAccountNumber: null });
              }}
              keyboardType="number-pad"
            />

            <Input
              label="IFSC Code"
              placeholder="e.g., HDFC0001234"
              value={formData.ifscCode}
              error={errors.ifscCode}
              onChangeText={(text) => {
                setFormData({ ...formData, ifscCode: text });
                if (errors.ifscCode) setErrors({ ...errors, ifscCode: null });
              }}
              autoCapitalize="characters"
              maxLength={11}
            />

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setApplyToAll(!applyToAll)}
              className="flex-row items-center mt-2 mb-2 p-3 bg-surface border border-borderLight rounded-xl"
            >
              <View
                className={`w-5 h-5 rounded items-center justify-center mr-3 border ${applyToAll ? "bg-brand border-brand" : "bg-white border-gray-300"}`}
              >
                {applyToAll && (
                  <Ionicons name="checkmark" size={14} color="white" />
                )}
              </View>
              <Text className="text-textDark font-m-semi text-sm flex-1">
                Use this bank account for all my libraries
              </Text>
            </TouchableOpacity>
          </View>

          <Button
            title="Verify & Link Account"
            variant="primary"
            className="mt-4 py-4"
            loading={isSubmitting}
            onPress={handleLinkAccount}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
