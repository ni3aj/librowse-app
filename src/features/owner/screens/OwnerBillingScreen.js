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

import Header from "@/components/ui/Header";
import { COLORS } from "@/constants/theme";
import {
  createRazorpayOrderApi,
  fetchBillingStatusApi,
  verifyRazorpayPaymentApi,
} from "@/features/owner/api";
import { formatCleanDate } from "@/utils/dateFormatter";
// import RazorpayCheckout from "react-native-razorpay";
import AlertModal from "@/components/ui/AlertModal";

export default function OwnerBillingScreen() {
  const [loading, setLoading] = useState(true);
  const [billingData, setBillingData] = useState(null);
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: "",
    message: "",
    type: "info",
  });
  const hideAlert = () =>
    setAlertConfig((prev) => ({ ...prev, visible: false }));

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
      setLoading(true);
      const orderResponse = await createRazorpayOrderApi();
      if (!orderResponse.success) throw new Error(orderResponse.error);
      const options = {
        description: `${billingData?.currentTier?.name} (1 Month)`,
        currency: "INR",
        key: "rzp_test_T1wmUuoMg0txLR",
        amount: parseInt(orderResponse.amount, 10),
        name: "LiBrowse Technologies",
        order_id: String(orderResponse.order_id),
        theme: { color: "#C13383" },
        prefill: {
          name: billingData?.ownerDetails?.name,
          contact: billingData?.ownerDetails?.phone,
          email: billingData?.ownerDetails?.email,
        },
      };
      RazorpayCheckout.open(options)
        .then(async (data) => {
          const verifyResponse = await verifyRazorpayPaymentApi({
            razorpay_order_id: data.razorpay_order_id,
            razorpay_payment_id: data.razorpay_payment_id,
            razorpay_signature: data.razorpay_signature,
          });
          if (verifyResponse.success) {
            setTimeout(() => {
              Alert.alert("Success!", "Your plan has been renewed.");
              loadBillingData();
            }, 500);
          } else {
            Alert.alert("Verification Failed", verifyResponse.error);
            setLoading(false);
          }
        })
        .catch((error) => {
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

  const handleUpgradeClick = (tier) => {
    setAlertConfig({
      visible: true,
      type: "info", // Uses your brand magenta color
      title: `Upgrade to ${tier.name}`,
      message: `Our system will calculate the unused days on your current plan and apply it as a discount towards the ₹${tier.price} fee.\n\n(Backend math coming soon!)`,
      primaryButtonText: "Calculate",
      secondaryButtonText: "Cancel",
      onPrimaryPress: () => {
        hideAlert(); // Close the modal
        console.log(`Trigger upgrade API for tier ID: ${tier.id}`);
      },
    });
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-background">
        <ActivityIndicator size="large" color={COLORS.brand} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background mt-12">
      <Header title="Billing & Plans" />

      <ScrollView
        className="flex-1 px-6 pt-4"
        showsVerticalScrollIndicator={false}
      >
        {/* --- SECTION 1: CURRENT PLAN CARD --- */}
        <Text className="text-sm font-m-bold text-textLight uppercase tracking-wider mb-3">
          Current Subscription
        </Text>
        <View className="bg-white rounded-2xl p-5 mb-8 border border-borderLight shadow-sm shadow-black/5">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-xl font-m-bold text-textDark">
              {billingData?.currentTier?.name || "Loading Plan..."}
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

          <Text className="text-sm font-m-regular text-textLight mb-5">
            Up to {billingData?.currentTier?.maxStudents || 0} Active Students
          </Text>

          <View className="bg-background rounded-xl p-4 mb-5 border border-borderLight/50">
            <Text className="text-sm font-m-regular text-textLight">
              Valid Until
            </Text>
            <Text className="text-lg font-m-bold text-textDark">
              {billingData?.validUntil
                ? formatCleanDate(billingData.validUntil)
                : "N/A"}
            </Text>
            {billingData?.status !== "EXPIRED" &&
              billingData?.daysRemaining !== undefined && (
                <Text className="text-xs font-m-semi text-brand mt-1">
                  {billingData?.daysRemaining} days remaining
                </Text>
              )}
          </View>

          {/* --- RENEWAL / TRIAL BUTTONS --- */}
          {Number(billingData?.currentTier?.price) > 0 ? (
            // NORMAL PAID TIER LOGIC
            <>
              {billingData?.status === "EXPIRED" && (
                <TouchableOpacity
                  onPress={handlePayNow}
                  disabled={loading}
                  className={`bg-brandAccent py-3.5 rounded-xl items-center ${loading ? "opacity-50" : ""}`}
                >
                  <Text className="text-white font-m-bold text-base">
                    {loading
                      ? "Processing..."
                      : `Pay Now to Unlock (₹${billingData?.currentTier?.price})`}
                  </Text>
                </TouchableOpacity>
              )}

              {billingData?.status === "EXPIRING_SOON" && (
                <TouchableOpacity
                  onPress={handlePayNow}
                  disabled={loading}
                  className={`bg-brand py-3.5 rounded-xl items-center ${loading ? "opacity-50" : ""}`}
                >
                  <Text className="text-white font-m-bold text-base">
                    {loading
                      ? "Processing..."
                      : `Renew in Advance (₹${billingData?.currentTier?.price})`}
                  </Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            // 📌 THE FIX: FREE TRIAL EXPIRATION LOGIC
            (billingData?.status === "EXPIRED" ||
              billingData?.status === "EXPIRING_SOON") && (
              <View className="bg-red-50 border border-red-200 p-4 rounded-xl mt-2">
                <Text className="text-sm font-m-bold text-red-600 text-center">
                  {billingData?.status === "EXPIRED"
                    ? "Your Free Trial has expired. Please select a paid plan below to restore access."
                    : "Your Free Trial ends soon! Please select a paid plan below to avoid service interruption."}
                </Text>
              </View>
            )
          )}
        </View>

        {/* --- SECTION 2: DYNAMIC UPGRADE OPTIONS --- */}
        {billingData?.upgradeTiers && billingData.upgradeTiers.length > 0 && (
          <>
            <Text className="text-sm font-m-bold text-textLight uppercase tracking-wider mb-3">
              Need More Capacity?
            </Text>
            <View className="mb-8">
              {billingData.upgradeTiers.map((tier, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => handleUpgradeClick(tier)}
                  className="bg-white border border-brand/20 rounded-2xl p-5 mb-4 flex-row justify-between items-center"
                >
                  <View className="flex-1">
                    <Text className="text-lg font-m-bold text-brand">
                      {tier.name}
                    </Text>
                    <Text className="text-sm font-m-regular text-textLight mt-1">
                      Up to {tier.maxStudents} Students
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-lg font-m-bold text-textDark">
                      ₹{tier.price}
                    </Text>
                    <Text className="text-xs font-m-regular text-textLight">
                      / month
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* --- SECTION 3: PAYMENT HISTORY --- */}
        <Text className="text-sm font-m-bold text-textLight uppercase tracking-wider mb-3">
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
      <AlertModal
        visible={alertConfig.visible}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        primaryButtonText={alertConfig.primaryButtonText}
        secondaryButtonText={alertConfig.secondaryButtonText}
        onPrimaryPress={alertConfig.onPrimaryPress}
        onSecondaryPress={hideAlert}
        onClose={hideAlert}
      />
    </View>
  );
}
