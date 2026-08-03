import apiClient from "@/api/client";
import Button from "@/components/ui/Button";
import { COLORS } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import Toast from "react-native-toast-message";

export default function WriteReviewModal({
  visible,
  onClose,
  libraryId,
  onSuccess,
  existingReview = null, // 📌 NEW PROP
}) {
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [loading, setLoading] = useState(false);

  // 📌 PRE-FILL DATA WHEN OPENED
  useEffect(() => {
    if (visible && existingReview) {
      setRating(existingReview.rating || 0);
      setReviewText(existingReview.review_text || "");
    } else if (visible && !existingReview) {
      // Reset if it's a new review
      setRating(0);
      setReviewText("");
    }
  }, [visible, existingReview]);

  const handleSubmit = async () => {
    if (rating === 0) {
      return Toast.show({
        type: "error",
        text1: "Rating Required",
        text2: "Please tap a star to leave a rating.",
      });
    }

    setLoading(true);
    try {
      let response;

      // 📌 SMART TOGGLE: PUT vs POST
      if (existingReview) {
        response = await apiClient.put(`/reviews/${existingReview.id}`, {
          rating: rating,
          review_text: reviewText.trim(),
        });
      } else {
        response = await apiClient.post("/reviews", {
          library_id: libraryId,
          rating: rating,
          review_text: reviewText.trim(),
        });
      }

      if (response.data.success) {
        Toast.show({
          type: "success",
          text1: "Success",
          text2: existingReview
            ? "Your review was updated."
            : "Your review was posted.",
        });
        onSuccess();
        onClose();
      }
    } catch (error) {
      if (error.response?.status === 409) {
        Toast.show({
          type: "info",
          text1: "Already Reviewed",
          text2: "You have already left a review for this library.",
        });
      } else {
        Toast.show({
          type: "error",
          text1: "Error",
          text2: error.response?.data?.error || "Failed to process review.",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 justify-center bg-black/60 px-6"
      >
        <View className="bg-white rounded-[24px] p-6 shadow-xl">
          <View className="items-center mb-4">
            <View className="w-16 h-16 bg-orange-100 rounded-full items-center justify-center mb-3">
              <Ionicons
                name={existingReview ? "create" : "star"}
                size={32}
                color="#F59E0B"
              />
            </View>
            <Text className="text-xl font-m-bold text-textDark text-center mb-1">
              {existingReview ? "Edit your review" : "Rate your experience"}
            </Text>
          </View>

          {/* Interactive Star Rating */}
          <View className="flex-row justify-center mb-6">
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => setRating(star)}
                className="px-2 active:scale-90"
              >
                <Ionicons
                  name={star <= rating ? "star" : "star-outline"}
                  size={40}
                  color={star <= rating ? "#F59E0B" : COLORS.borderLight}
                />
              </TouchableOpacity>
            ))}
          </View>

          {/* Review Text Input */}
          <View className="mb-6">
            <Text className="text-xs font-m-bold text-textLight uppercase tracking-wider mb-2">
              Write a Review (Optional)
            </Text>
            <TextInput
              className="bg-surface border border-borderLight rounded-2xl px-4 py-3 min-h-[100px] text-textDark font-m text-base"
              placeholder="Tell others what you think..."
              placeholderTextColor={COLORS.textLight}
              value={reviewText}
              onChangeText={setReviewText}
              multiline
              textAlignVertical="top"
              maxLength={500}
            />
          </View>

          {/* Actions */}
          <View className="flex-row space-x-3">
            <View className="flex-1 mr-2">
              <Button
                title="Cancel"
                variant="outline"
                onPress={onClose}
                disabled={loading}
                className="py-3"
              />
            </View>
            <View className="flex-1 ml-2">
              <Button
                title={existingReview ? "Save Changes" : "Submit"}
                variant="primary"
                onPress={handleSubmit}
                loading={loading}
                disabled={loading || rating === 0}
                className="py-3"
              />
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
