import apiClient from "@/api/client";
import Header from "@/components/ui/Header";
import { COLORS } from "@/constants/theme";
import { useLibraryStore } from "@/store/libraryStore";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal, // 📌 1. Added Modal to imports
  RefreshControl,
  Text,
  TextInput, // 📌 2. Added TextInput to imports
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";

function Avatar({ src, name, size = 40 }) {
  if (src) {
    return (
      <Image
        source={{ uri: src }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        className="mr-3 bg-gray-100 border border-borderLight"
      />
    );
  }
  return (
    <View
      style={{ width: size, height: size, borderRadius: size / 2 }}
      className="bg-surface justify-center items-center mr-3 border border-borderLight"
    >
      <Text className="text-base font-m-bold text-textDark">
        {name?.charAt(0)?.toUpperCase() || "?"}
      </Text>
    </View>
  );
}

function StarRating({ rating }) {
  return (
    <View className="flex-row">
      {[1, 2, 3, 4, 5].map((star) => (
        <Ionicons
          key={star}
          name={star <= rating ? "star" : "star-outline"}
          size={14}
          color={star <= rating ? "#F59E0B" : COLORS.textLight}
          style={{ marginRight: 2 }}
        />
      ))}
    </View>
  );
}

export default function LibraryReviewsScreen() {
  const { libraryId } = useLibraryStore();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // 📌 3. State variables for the Cross-Platform Prompt Modal
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportingReview, setReportingReview] = useState(null); // stores { id, studentName }
  const [submittingReport, setSubmittingReport] = useState(false);

  const fetchReviews = useCallback(async () => {
    if (!libraryId) return;
    try {
      const response = await apiClient.get(`/reviews/libraries/${libraryId}`);
      if (response.data.success) {
        setReviews(response.data.reviews);
      }
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to load reviews.",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [libraryId]);

  useFocusEffect(
    useCallback(() => {
      fetchReviews();
    }, [fetchReviews]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchReviews();
  };

  // 📌 4. Opens the modal instead of using the iOS-only Alert.prompt
  const handleFlagReviewClick = (reviewId, studentName) => {
    setReportingReview({ id: reviewId, studentName });
    setReportReason("");
    setReportModalVisible(true);
  };

  // 📌 5. The actual API submission logic
  const submitReport = async () => {
    if (!reportReason || reportReason.trim().length < 5) {
      return Toast.show({
        type: "error",
        text1: "Invalid Reason",
        text2: "Please provide a valid reason (min 5 chars).",
      });
    }

    setSubmittingReport(true);
    try {
      const response = await apiClient.post(
        `/reviews/${reportingReview.id}/report`,
        { reason: reportReason.trim() },
      );

      if (response.data.success) {
        Toast.show({
          type: "success",
          text1: "Review Flagged",
          text2: "Our admin team will review it shortly.",
        });
        setReportModalVisible(false);
        fetchReviews();
      }
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: error.response?.data?.error || "Failed to report review.",
      });
    } finally {
      setSubmittingReport(false);
    }
  };

  const formatDate = (dateString) => {
    const options = { day: "numeric", month: "short", year: "numeric" };
    return new Date(dateString).toLocaleDateString("en-IN", options);
  };

  const renderReview = ({ item }) => {
    return (
      <View className="bg-white p-4 pb-3 rounded-2xl mb-4 border border-borderLight">
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-row items-center flex-1 pr-2">
            <Avatar src={item.student_photo} name={item.student_name} />
            <View>
              <Text className="text-sm font-m-bold text-textDark mb-0.5">
                {item.student_name}
              </Text>
              <StarRating rating={item.rating} />
            </View>
          </View>

          <Text className="text-xs font-m text-textLight">
            {formatDate(item.created_at)}
          </Text>
        </View>

        <Text className="text-sm font-m text-textDark leading-5 mb-2">
          {item.review_text || "No written feedback provided."}
        </Text>

        <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-borderLight">
          <Text className="text-[10px] font-m text-textLight italic">
            {item.is_edited ? `Edited on ${formatDate(item.updated_at)}` : ""}
          </Text>

          <TouchableOpacity
            disabled={item.is_reported}
            onPress={() => handleFlagReviewClick(item.id, item.student_name)}
            className={`flex-row items-center px-2 py-1 rounded-md ${
              item.is_reported
                ? "bg-red-50 opacity-50"
                : "bg-transparent active:opacity-60"
            }`}
          >
            <Ionicons
              name={item.is_reported ? "flag" : "flag-outline"}
              size={14}
              color={item.is_reported ? "#EF4444" : COLORS.textLight}
              style={{ marginRight: 4 }}
            />
            <Text
              className={`text-xs font-m-bold ${
                item.is_reported ? "text-red-500" : "text-textLight"
              }`}
            >
              {item.is_reported ? "Reported" : "Report"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
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
      <Header title="Reviews" showLibraryDropdown={true} />

      <FlatList
        data={reviews}
        keyExtractor={(item) => item.id}
        renderItem={renderReview}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          padding: 24,
          paddingTop: 4,
          paddingBottom: 40,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.brand}
          />
        }
        ListEmptyComponent={
          <View className="items-center mt-2">
            <Ionicons
              name="chatbubbles-outline"
              size={48}
              color={COLORS.textLight}
              className="mb-4"
            />
            <Text className="text-lg font-m-bold text-textDark text-center mb-1">
              No Reviews Yet
            </Text>
            <Text className="text-sm font-m text-textLight text-center">
              When students rate your library, their feedback will appear here.
            </Text>
          </View>
        }
      />

      {/* 📌 6. Cross-Platform Custom Report Modal */}
      <Modal visible={reportModalVisible} transparent animationType="fade">
        <View className="flex-1 bg-black/50 justify-center px-6">
          <View className="bg-white rounded-3xl p-6 shadow-lg">
            <Text className="text-xl font-m-bold text-textDark mb-2">
              Report Review
            </Text>
            <Text className="text-sm font-m text-textLight mb-4 leading-5">
              Why are you reporting {reportingReview?.studentName}'s review?
              (e.g., Inappropriate language, spam, fake review)
            </Text>

            <TextInput
              className="bg-background border border-borderLight rounded-xl px-4 py-3 min-h-[100px] text-textDark font-m mb-4"
              placeholder="Type your reason here..."
              placeholderTextColor={COLORS.textLight}
              value={reportReason}
              onChangeText={setReportReason}
              multiline
              textAlignVertical="top"
              autoFocus
            />

            <View className="flex-row justify-end mt-2">
              <TouchableOpacity
                onPress={() => setReportModalVisible(false)}
                className="px-5 py-2.5 mr-2 justify-center"
                disabled={submittingReport}
              >
                <Text className="text-textLight font-m-bold">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={submitReport}
                className="bg-brand px-6 py-2.5 rounded-xl justify-center items-center min-w-[90px]"
                disabled={submittingReport}
              >
                {submittingReport ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text className="text-white font-m-bold">Submit</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
