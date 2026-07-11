import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

// Clean separation of imports
import Header from "@/components/ui/Header";
import { COLORS } from "@/constants/theme";
import {
    createRazorpayOrderApi,
    fetchBillingStatusApi,
    verifyRazorpayPaymentApi,
} from "@/features/owner/api";
import { formatCleanDate } from "@/utils/dateFormatter";
import RazorpayCheckout from "react-native-razorpay";

export default function OwnerBillingScreen() {
  const [loading, setLoading] = useState(true);
  const [billingData, setBillingData] = useState(null);

  useFocusEffect(
    useCallback(() => {
      loadBillingData();
    }, []),
  );

  const loadBillingData = async () => {
    try {
      const response = await fetchBillingStatusApi();
      if (response.success) {
        setBillingData(response.data);
      } else {
        Alert.alert(
          "Error",
          response.error || "Could not fetch billing details",
        );
      }
    } catch (error) {
      Alert.alert("Error", "Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  const handlePayNow = async () => {
    try {
      setLoading(true); // Re-use the existing loading state from your screen

      // 1. Get Order ID from your Fastify Backend
      const orderResponse = await createRazorpayOrderApi();
      if (!orderResponse.success) throw new Error(orderResponse.error);

      // 2. Open Razorpay Checkout UI
      const options = {
        description: "LiBrowse Standard Plan (1 Month)",
        image: "https://your-server.com/logo.png", // Add your LiBrowse logo URL here
        currency: "INR",
        key: "YOUR_RAZORPAY_KEY_ID", // IMPORTANT: Put your public Key ID here too
        amount: orderResponse.amount,
        name: "LiBrowse Technologies",
        order_id: orderResponse.order_id,
        theme: { color: COLORS.brand }, // Matches your React App Colors Schema (#C13383)
        prefill: {
          email: "owner@example.com", // Optional: autofill from your app state
          contact: "9999999999", // Optional: autofill from your app state
          name: "Library Owner",
        },
      };

      // Razorpay throws an error if the user closes the modal, so we wrap it in a promise catch
      RazorpayCheckout.open(options)
        .then(async (data) => {
          // 3. User paid successfully! Now verify the signature on your server
          const verifyResponse = await verifyRazorpayPaymentApi({
            razorpay_order_id: data.razorpay_order_id,
            razorpay_payment_id: data.razorpay_payment_id,
            razorpay_signature: data.razorpay_signature,
          });

          if (verifyResponse.success) {
            Alert.alert("Success!", "Your standard plan has been renewed.");
            // Refresh the screen data to show the new 'Valid Until' date
            loadBillingData();
          } else {
            Alert.alert("Verification Failed", verifyResponse.error);
          }
        })
        .catch((error) => {
          // User closed the Razorpay modal or payment failed inside the gateway
          Alert.alert("Payment Cancelled", "You have not been charged.");
          setLoading(false);
        });
    } catch (error) {
      Alert.alert(
        "Payment Error",
        error.message || "Failed to initialize payment",
      );
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-background">
        <ActivityIndicator size="large" color={COLORS.brand} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <Header title="Billing & Plans" />

      <ScrollView className="flex-1 px-6 pt-4">
        {/* --- CURRENT PLAN CARD --- */}
        <View className="bg-white rounded-2xl p-5 mb-6 border border-borderLight">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-lg font-m-bold text-textDark">
              Standard Plan
            </Text>
            <View
              className={`px-3 py-1 rounded-full ${
                billingData?.status === "EXPIRED"
                  ? "bg-red-100"
                  : "bg-green-100"
              }`}
            >
              <Text
                className={`text-xs font-m-bold ${
                  billingData?.status === "EXPIRED"
                    ? "text-red-600"
                    : "text-green-600"
                }`}
              >
                {billingData?.status === "EXPIRED" ? "EXPIRED" : "ACTIVE"}
              </Text>
            </View>
          </View>

          <Text className="text-sm font-m-regular text-textLight mb-4">
            Up to 100 Active Students
          </Text>

          <View className="bg-background rounded-lg p-4 mb-4">
            <Text className="text-sm font-m-regular text-textLight">
              Valid Until
            </Text>
            <Text className="text-base font-m-bold text-textDark">
              {billingData?.validUntil
                ? formatCleanDate(billingData.validUntil)
                : "N/A"}
            </Text>
            {billingData?.status !== "EXPIRED" &&
              billingData?.daysRemaining !== undefined && (
                <Text className="text-xs font-m-regular text-textLight mt-1">
                  {billingData?.daysRemaining} days remaining
                </Text>
              )}
          </View>

          {/* --- DYNAMIC ACTION BUTTON --- */}
          {billingData?.status === "EXPIRED" && (
            <TouchableOpacity
              onPress={handlePayNow}
              className="bg-brandAccent py-3 rounded-xl items-center"
            >
              <Text className="text-white font-m-bold text-base">
                Pay Now to Unlock (₹1499)
              </Text>
            </TouchableOpacity>
          )}

          {billingData?.status === "EXPIRING_SOON" && (
            <TouchableOpacity
              onPress={handlePayNow}
              className="bg-brand py-3 rounded-xl items-center"
            >
              <Text className="text-white font-m-bold text-base">
                Renew in Advance (₹1499)
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* --- PAYMENT HISTORY --- */}
        <Text className="text-lg font-m-bold text-textDark mb-4">
          Payment History
        </Text>

        {billingData?.history?.length === 0 ? (
          <View className="bg-white rounded-2xl p-6 items-center border border-borderLight mb-10">
            <Ionicons
              name="receipt-outline"
              size={40}
              color={COLORS.textLight}
            />
            <Text className="text-textLight font-m-regular mt-2">
              No past payments found.
            </Text>
          </View>
        ) : (
          <View className="bg-white rounded-2xl border border-borderLight overflow-hidden mb-10">
            {billingData?.history?.map((payment, index) => (
              <View
                key={index}
                className={`p-4 flex-row justify-between items-center ${
                  index !== billingData.history.length - 1
                    ? "border-b border-borderLight"
                    : ""
                }`}
              >
                <View>
                  <Text className="text-base font-m-bold text-textDark">
                    ₹{payment.amount}
                  </Text>
                  <Text className="text-xs font-m-regular text-textLight mt-1">
                    {formatCleanDate(payment.created_at)}
                  </Text>
                </View>

                <TouchableOpacity className="bg-background w-10 h-10 rounded-full items-center justify-center">
                  <Ionicons
                    name="download-outline"
                    size={20}
                    color={COLORS.brand}
                  />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
