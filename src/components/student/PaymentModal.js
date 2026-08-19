import apiClient from "@/api/client";
import Button from "@/components/ui/Button";
import { COLORS } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Alert, Modal, Text, TouchableOpacity, View } from "react-native";
import Toast from "react-native-toast-message";

export default function PaymentModal({
  visible,
  onClose,
  price,
  ownerPhone,
  enrollmentId,
  onSuccess,
}) {
  const [selectedPaymentMode, setSelectedPaymentMode] = useState("OFFLINE");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNotifyPayment = async () => {
    setIsSubmitting(true);
    try {
      const res = await apiClient.post(
        `/student/enrollments/${enrollmentId}/notify-payment`,
      );
      if (res.data.success) {
        Toast.show({
          type: "success",
          text1: "Owner Notified 🔔",
          text2: "Waiting for their confirmation.",
        });
        onClose();
        if (onSuccess) onSuccess();
      }
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: error.response?.data?.error || "Failed to notify owner.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/50">
        <View className="bg-background rounded-t-3xl p-6 pb-20">
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-xl font-m-bold text-textDark">
              Complete Payment
            </Text>
            <TouchableOpacity
              onPress={onClose}
              className="bg-surface p-2 rounded-full border border-borderLight"
            >
              <Ionicons name="close" size={20} color={COLORS.textDark} />
            </TouchableOpacity>
          </View>

          <View className="flex-row bg-surface p-1 rounded-xl mb-6 border border-borderLight">
            <TouchableOpacity
              onPress={() => setSelectedPaymentMode("ONLINE")}
              className={`flex-1 py-2.5 rounded-lg items-center ${
                selectedPaymentMode === "ONLINE" ? "bg-white" : ""
              }`}
            >
              <Text
                className={`font-m-bold ${
                  selectedPaymentMode === "ONLINE"
                    ? "text-brand"
                    : "text-textLight"
                }`}
              >
                Pay Online
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setSelectedPaymentMode("OFFLINE")}
              className={`flex-1 py-2.5 rounded-lg items-center ${
                selectedPaymentMode === "OFFLINE" ? "bg-white" : ""
              }`}
            >
              <Text
                className={`font-m-bold ${
                  selectedPaymentMode === "OFFLINE"
                    ? "text-brand"
                    : "text-textLight"
                }`}
              >
                Pay Offline
              </Text>
            </TouchableOpacity>
          </View>

          {selectedPaymentMode === "ONLINE" ? (
            <View className="items-center py-4">
              <View className="w-16 h-16 bg-brand/10 rounded-full items-center justify-center mb-4">
                <Ionicons
                  name="rocket-outline"
                  size={32}
                  color={COLORS.brand}
                />
              </View>
              <Text className="text-lg font-m-bold text-textDark text-center mb-2">
                Coming Very Soon!
              </Text>
              <Text className="text-sm font-m text-textLight text-center leading-5 px-4">
                We are a growing startup and are currently setting up secure
                online payments. Please use the offline method to secure your
                seat today!
              </Text>
              <Button
                title="Switch to Offline Payment"
                variant="primary"
                onPress={() => setSelectedPaymentMode("OFFLINE")}
                className="w-full mt-6 py-4"
              />
            </View>
          ) : (
            <View>
              <Text className="text-sm font-m text-textLight mb-4 leading-5 text-center">
                Please pay{" "}
                <Text className="font-m-bold text-textDark">₹{price}</Text>{" "}
                directly to the library owner via Cash or UPI at the reception.
              </Text>

              <View className="bg-brand/5 border border-brand/20 p-4 rounded-2xl mb-6 items-center">
                <Text className="text-xs font-m-bold text-brand uppercase tracking-widest mb-1">
                  Library UPI ID / Phone
                </Text>
                <Text className="text-lg font-m-extra text-textDark">
                  {ownerPhone || "Ask at Reception"}
                </Text>
              </View>

              <Button
                title="I Have Paid (Notify Owner)"
                variant="primary"
                loading={isSubmitting}
                onPress={() => {
                  Alert.alert(
                    "Confirm Payment",
                    "Have you completed the payment directly to the library owner?",
                    [
                      { text: "Not Yet", style: "cancel" },
                      {
                        text: "Yes, I've Paid",
                        onPress: handleNotifyPayment,
                      },
                    ],
                  );
                }}
                className="w-full py-4"
              />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}
