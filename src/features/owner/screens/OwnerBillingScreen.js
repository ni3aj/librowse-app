import AlertModal from "@/components/ui/AlertModal";
import Header from "@/components/ui/Header";
import { COLORS } from "@/constants/theme";
import {
  calculateUpgradeDiscountApi,
  createRazorpayOrderApi,
  fetchBillingStatusApi,
  verifyRazorpayPaymentApi,
} from "@/features/owner/api";
import { useLibraryStore } from "@/store/libraryStore";
import { formatCleanDate } from "@/utils/dateFormatter";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import RazorpayCheckout from "react-native-razorpay";
import Toast from "react-native-toast-message";

export default function OwnerBillingScreen() {
  // 📌 Pull the active library ID from the global store
  const libraryId = useLibraryStore((state) => state.libraryId);

  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);

  // 📌 THE FIX: Track exactly which tier card is currently loading
  const [loadingTierId, setLoadingTierId] = useState(null);

  const [billingData, setBillingData] = useState(null);

  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: "",
    message: "",
    type: "info",
    primaryButtonText: "OK",
    secondaryButtonText: null,
    onPrimaryPress: null,
  });

  const hideAlert = () =>
    setAlertConfig((prev) => ({ ...prev, visible: false }));

  useFocusEffect(
    useCallback(() => {
      if (libraryId) {
        loadBillingData();
      }
    }, [libraryId]),
  );

  const loadBillingData = async () => {
    try {
      setLoading(true);
      const response = await fetchBillingStatusApi(libraryId);
      if (response.success) {
        setBillingData(response.data);
      } else {
        setAlertConfig({
          visible: true,
          type: "error",
          title: "Error",
          message: response.error || "Could not fetch billing details",
          primaryButtonText: "Retry",
          onPrimaryPress: () => {
            hideAlert();
            loadBillingData();
          },
        });
      }
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Could not connect to the server.",
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * 📌 MASTER RAZORPAY HANDLER
   * This handles the actual Razorpay UI popup for both Renewals AND Upgrades.
   */
  const processRazorpayPayment = async (orderId, amount, description) => {
    try {
      setProcessingPayment(true);

      const options = {
        description: description,
        currency: "INR",
        key: "rzp_test_T1wmUuoMg0txLR", // ⚠️ Change to Live Key in Production
        amount: parseInt(amount, 10),
        name: "LiBrowse",
        order_id: String(orderId),
        theme: { color: COLORS.brand },
        prefill: {
          name: billingData?.ownerDetails?.name || "Library Owner",
          contact: billingData?.ownerDetails?.phone || "",
          email: billingData?.ownerDetails?.email || "",
        },
      };

      const data = await RazorpayCheckout.open(options);

      // Verify Payment on Backend
      const verifyResponse = await verifyRazorpayPaymentApi({
        razorpay_order_id: data.razorpay_order_id,
        razorpay_payment_id: data.razorpay_payment_id,
        razorpay_signature: data.razorpay_signature,
        library_id: libraryId,
      });

      if (verifyResponse.success) {
        setAlertConfig({
          visible: true,
          type: "success",
          title: "Payment Successful!",
          message: "Your subscription has been updated successfully.",
          primaryButtonText: "Awesome",
          secondaryButtonText: null,
          onPrimaryPress: () => {
            hideAlert();
            loadBillingData(); // Refresh the UI with new dates/tiers
          },
        });
      } else {
        throw new Error(verifyResponse.error || "Verification failed");
      }
    } catch (error) {
      const isCancelled =
        error.code === 0 || error.code === "BAD_REQUEST_ERROR";

      setAlertConfig({
        visible: true,
        type: isCancelled ? "warning" : "error",
        title: isCancelled ? "Payment Cancelled" : "Payment Failed",
        message: isCancelled
          ? "You have not been charged."
          : error.message || "Something went wrong.",
        primaryButtonText: "OK",
        secondaryButtonText: null,
        onPrimaryPress: hideAlert,
      });
    } finally {
      setProcessingPayment(false);
    }
  };

  /**
   * 📌 STANDARD RENEWAL LOGIC
   */
  const handlePayNow = async () => {
    try {
      setProcessingPayment(true);
      const orderResponse = await createRazorpayOrderApi(libraryId);

      if (!orderResponse.success) {
        throw new Error(orderResponse.error);
      }

      await processRazorpayPayment(
        orderResponse.order_id,
        orderResponse.amount,
        `${billingData?.currentTier?.name} (1 Month Renewal)`,
      );
    } catch (error) {
      setProcessingPayment(false);
      setAlertConfig({
        visible: true,
        type: "error",
        title: "Order Error",
        message: error.message || "Failed to initialize payment",
        primaryButtonText: "OK",
        secondaryButtonText: null,
        onPrimaryPress: hideAlert,
      });
    }
  };

  /**
   * 📌 UPGRADE & PRORATION LOGIC
   */
  const handleUpgradeClick = async (tier) => {
    setProcessingPayment(true);
    setLoadingTierId(tier.id); // 📌 Trigger card-specific loader

    if (!libraryId) {
      setProcessingPayment(false);
      setLoadingTierId(null);
      return Toast.show({
        type: "error",
        text1: "Error",
        text2: "Could not identify active library.",
      });
    }

    const response = await calculateUpgradeDiscountApi(libraryId, tier.id);
    setProcessingPayment(false);
    setLoadingTierId(null); // 📌 Turn off loader

    if (response.success) {
      const { amount, discount_applied, original_price, order_id } =
        response.data;

      setAlertConfig({
        visible: true,
        type: "info",
        title: `Upgrade to ${tier.name}`,
        message: `Plan Price: ₹${original_price}\nUnused Days Discount for Current Plan: ₹${discount_applied}\n\nFinal Amount to Pay: ₹${amount}`,
        primaryButtonText: `Pay ₹${amount}`,
        secondaryButtonText: "Cancel",
        onPrimaryPress: () => {
          hideAlert();
          setTimeout(() => {
            processRazorpayPayment(
              order_id,
              amount * 100,
              `Upgrade to ${tier.name}`,
            );
          }, 400);
        },
      });
    } else {
      setAlertConfig({
        visible: true,
        type: "error",
        title: "Upgrade Failed",
        message: response.error,
        primaryButtonText: "OK",
        secondaryButtonText: null,
        onPrimaryPress: hideAlert,
      });
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
      <Header title="Billing" showLibraryDropdown={true} />

      <ScrollView
        className="flex-1 px-6 pt-4"
        showsVerticalScrollIndicator={false}
      >
        {/* --- SECTION 1: CURRENT PLAN CARD --- */}
        <Text className="text-sm font-m-bold text-textLight uppercase tracking-wider mb-3 ml-1">
          Current Subscription
        </Text>
        <View className="bg-white rounded-2xl p-5 mb-8 border border-borderLight shadow-black/5">
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
            <>
              {billingData?.status === "EXPIRED" && (
                <TouchableOpacity
                  onPress={handlePayNow}
                  disabled={processingPayment}
                  className={`bg-brandAccent py-3.5 rounded-xl items-center ${processingPayment ? "opacity-50" : ""}`}
                >
                  <Text className="text-white font-m-bold text-base">
                    {processingPayment && !loadingTierId
                      ? "Processing..."
                      : `Pay Now to Unlock (₹${billingData?.currentTier?.price})`}
                  </Text>
                </TouchableOpacity>
              )}

              {billingData?.status === "EXPIRING_SOON" && (
                <TouchableOpacity
                  onPress={handlePayNow}
                  disabled={processingPayment}
                  className={`bg-brand py-3.5 rounded-xl items-center ${processingPayment ? "opacity-50" : ""}`}
                >
                  <Text className="text-white font-m-bold text-base">
                    {processingPayment && !loadingTierId
                      ? "Processing..."
                      : `Renew in Advance (₹${billingData?.currentTier?.price})`}
                  </Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            (billingData?.status === "EXPIRED" ||
              billingData?.status === "EXPIRING_SOON") && (
              <View className="bg-red-50 border border-red-200 p-4 rounded-xl">
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
            <Text className="text-sm font-m-bold text-textLight uppercase tracking-wider mb-3 ml-1">
              Need More Capacity?
            </Text>
            <View className="mb-4">
              {billingData.upgradeTiers.map((tier, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => handleUpgradeClick(tier)}
                  disabled={processingPayment}
                  className={`bg-white border border-borderLight rounded-2xl p-5 mb-4 flex-row justify-between items-center ${
                    processingPayment && loadingTierId !== tier.id
                      ? "opacity-50"
                      : ""
                  }`}
                >
                  <View className="flex-1">
                    <Text className="text-lg font-m-bold text-brand">
                      {tier.name}
                    </Text>
                    <Text className="text-sm font-m-regular text-textLight mt-1">
                      Up to {tier.maxStudents} Students
                    </Text>
                  </View>

                  {/* 📌 THE FIX: Render loader or price conditionally */}
                  <View className="items-end justify-center min-w-[60px]">
                    {loadingTierId === tier.id ? (
                      <ActivityIndicator size="small" color={COLORS.brand} />
                    ) : (
                      <>
                        <Text className="text-lg font-m-bold text-textDark">
                          ₹{tier.price}
                        </Text>
                        <Text className="text-xs font-m-regular text-textLight">
                          / month
                        </Text>
                      </>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* --- SECTION 3: PAYMENT HISTORY --- */}
        <Text className="text-sm font-m-bold text-textLight uppercase tracking-wider mb-3 ml-1">
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
