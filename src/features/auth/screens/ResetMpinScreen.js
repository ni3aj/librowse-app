import apiClient from "@/api/client";
import Button from "@/components/ui/Button";
import Header from "@/components/ui/Header";
import Input from "@/components/ui/Input";
import { router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import Toast from "react-native-toast-message";

export default function ResetMpinScreen() {
  const [currentMpin, setCurrentMpin] = useState("");
  const [newMpin, setNewMpin] = useState("");
  const [confirmMpin, setConfirmMpin] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChangeMpin = async () => {
    if (!currentMpin || !newMpin || !confirmMpin) {
      return Toast.show({
        type: "error",
        text1: "Missing Fields",
        text2: "Please fill in all MPIN fields.",
      });
    }

    if (newMpin.length !== 4) {
      return Toast.show({
        type: "error",
        text1: "Invalid MPIN",
        text2: "Your new MPIN must be exactly 4 digits.",
      });
    }

    if (newMpin !== confirmMpin) {
      return Toast.show({
        type: "error",
        text1: "Mismatch",
        text2: "New MPIN and Confirm MPIN do not match.",
      });
    }

    if (currentMpin === newMpin) {
      return Toast.show({
        type: "info",
        text1: "No Change",
        text2: "Your new MPIN must be different from your current one.",
      });
    }

    try {
      setLoading(true);
      const response = await apiClient.put("/auth/change-mpin", {
        currentMpin,
        newMpin,
      });

      if (response.data.success) {
        Toast.show({
          type: "success",
          text1: "Success",
          text2: "Your MPIN has been updated.",
        });
        router.back();
      }
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Update Failed",
        text2: error.response?.data?.error || "Could not change MPIN.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View className="flex-1 bg-background">
        <Header title="Change MPIN" />

        <ScrollView
          className="flex-1 px-6"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* THE SEXY UNIFIED CARD */}
          <View className="bg-white p-6 rounded-[24px] border border-borderLight mb-10">
            <View>
              <Input
                label="Current MPIN"
                placeholder="Enter 4-digit MPIN"
                value={currentMpin}
                onChangeText={setCurrentMpin}
                keyboardType="number-pad"
                maxLength={4}
                secureTextEntry
              />
            </View>

            <View>
              <Input
                label="New MPIN"
                placeholder="Enter new 4-digit MPIN"
                value={newMpin}
                onChangeText={setNewMpin}
                keyboardType="number-pad"
                maxLength={4}
                secureTextEntry
              />
            </View>

            <View>
              <Input
                label="Confirm New MPIN"
                placeholder="Re-enter new MPIN"
                value={confirmMpin}
                onChangeText={setConfirmMpin}
                keyboardType="number-pad"
                maxLength={4}
                secureTextEntry
              />
            </View>

            <Button
              title="Update MPIN"
              onPress={handleChangeMpin}
              loading={loading}
              disabled={
                loading ||
                currentMpin.length < 4 ||
                newMpin.length < 4 ||
                confirmMpin.length < 4
              }
              className="w-full"
            />
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}
