import apiClient from "@/api/client";
import Header from "@/components/ui/Header";
import { COLORS } from "@/constants/theme";
import { formatCleanDate } from "@/utils/dateFormatter";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function ActivitiesScreen() {
  // 📌 TODO: Fetch userRole dynamically from your global Auth/Zustand store
  const currentUserRole = "owner";

  const [activities, setActivities] = useState([]);
  const [libraryId, setLibraryId] = useState(null);

  const [inputText, setInputText] = useState("");
  const [isAnnouncement, setIsAnnouncement] = useState(false);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // --- INITIAL LOAD ---
  useEffect(() => {
    loadLibraryAndFetchActivities();
  }, []);

  const loadLibraryAndFetchActivities = async () => {
    try {
      const storedLibId = await AsyncStorage.getItem("libraryId");
      if (storedLibId) {
        setLibraryId(storedLibId);
        await fetchActivities(storedLibId);
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error("Failed to load library ID", error);
      setLoading(false);
    }
  };

  // --- API: GET ACTIVITIES ---
  const fetchActivities = async (idToUse) => {
    const activeId = idToUse || libraryId;
    if (!activeId) return;

    try {
      const response = await apiClient.get(
        `/shared/libraries/${activeId}/activities`,
      );
      if (response.data.success) {
        setActivities(response.data.activities);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to load messages.");
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // --- PULL TO REFRESH HANDLER ---
  const handleRefresh = () => {
    setRefreshing(true);
    fetchActivities();
  };

  // --- API: POST ACTIVITY ---
  const handleSend = async () => {
    if (!inputText.trim() || !libraryId) return;

    const payload = {
      content: inputText.trim(),
      type: isAnnouncement ? "ANNOUNCEMENT" : "NORMAL",
    };

    // Optimistically clear input to feel fast
    setInputText("");
    setIsAnnouncement(false);

    try {
      const response = await apiClient.post(
        `/shared/libraries/${libraryId}/activities`,
        payload,
      );
      if (response.data.success) {
        fetchActivities(); // Fetch fresh list to include new message and DB generated ID
      }
    } catch (error) {
      Alert.alert(
        "Error",
        error.response?.data?.error || "Failed to send message.",
      );
      // Restore text on failure
      setInputText(payload.content);
      setIsAnnouncement(payload.type === "ANNOUNCEMENT");
    }
  };

  // --- API: DELETE ACTIVITY ---
  const handleDelete = async (activityId) => {
    try {
      const response = await apiClient.delete(
        `/shared/libraries/${libraryId}/activities/${activityId}`,
      );
      if (response.data.success) {
        // Instantly remove it from the screen for a snappy UX
        setActivities((prev) => prev.filter((msg) => msg.id !== activityId));
      }
    } catch (error) {
      Alert.alert(
        "Error",
        error.response?.data?.error || "Failed to delete message.",
      );
    }
  };

  // 📌 Trigger Confirmation Alert on Long Press
  const confirmDelete = (activityId) => {
    Alert.alert(
      "Delete Message",
      "Are you sure you want to delete this message?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => handleDelete(activityId),
        },
      ],
    );
  };

  // Sort logic: Announcements always at top, then sort the rest by date (newest first)
  const sortedActivities = [...activities].sort((a, b) => {
    if (a.type === "ANNOUNCEMENT" && b.type !== "ANNOUNCEMENT") return -1;
    if (a.type !== "ANNOUNCEMENT" && b.type === "ANNOUNCEMENT") return 1;
    return new Date(b.created_at) - new Date(a.created_at);
  });

  // --- RENDER SINGLE MESSAGE CARD ---
  const renderItem = ({ item }) => {
    const isAnnounce = item.type === "ANNOUNCEMENT";

    if (isAnnounce) {
      return (
        <TouchableOpacity
          activeOpacity={0.8}
          delayLongPress={400}
          onLongPress={() => confirmDelete(item.id)}
          className="mb-4 bg-brandAccent/10 border border-brandAccent/30 rounded-2xl p-4 ml-6 mr-6"
        >
          <View className="flex-row items-center mb-2">
            <View className="bg-brandAccent p-1.5 rounded-full mr-2">
              <Ionicons name="megaphone" size={14} color="white" />
            </View>
            <Text className="text-brandAccent font-m-bold text-sm uppercase tracking-widest flex-1">
              Announcement
            </Text>
            <Text className="text-xs text-textLight font-m">
              {formatCleanDate(item.created_at)}
            </Text>
          </View>
          <Text className="text-textDark font-m text-base leading-6">
            {item.content}
          </Text>
        </TouchableOpacity>
      );
    }

    // Normal Message UI
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        delayLongPress={400}
        onLongPress={() => confirmDelete(item.id)}
        className="mb-4 bg-white border border-borderLight rounded-2xl p-4 ml-6 mr-6"
      >
        <View className="flex-row justify-between items-center mb-2">
          <View className="flex-row items-center">
            <View className="w-8 h-8 bg-brand/10 rounded-full items-center justify-center mr-2 border border-brand/20">
              <Text className="text-brand font-m-bold text-xs uppercase">
                {item.sender_name?.charAt(0) || "U"}
              </Text>
            </View>
            <Text className="text-textDark font-m-bold text-sm">
              {item.sender_name}
            </Text>
            {item.sender_role === "owner" && (
              <View className="ml-2 bg-blue-100 px-2 py-0.5 rounded-md">
                <Text className="text-blue-700 text-[10px] font-m-bold">
                  ADMIN
                </Text>
              </View>
            )}
          </View>
          <Text className="text-xs text-textLight font-m">
            {new Date(item.created_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </View>
        <Text className="text-textDark font-m text-sm leading-5">
          {item.content}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View className="flex-1 bg-background">
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={COLORS.brand} />
        </View>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1, backgroundColor: COLORS.background }}
          behavior={Platform.OS === "ios" ? "padding" : "height"} // Added height for Android
          // 📌 Offset pushes past your custom Tab Bar height
          keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
        >
          <Header title="Activities" subtitle="Library Announcements" />

          {loading ? ( // Double loading check acts as a fallback UI guard
            <View className="flex-1 justify-center items-center">
              <ActivityIndicator size="large" color={COLORS.brand} />
            </View>
          ) : (
            <>
              <FlatList
                data={sortedActivities}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={{ paddingVertical: 20, flexGrow: 1 }}
                showsVerticalScrollIndicator={false}

                // 📌 Dismiss keyboard when the user scrolls the chat
                keyboardDismissMode="on-drag"
                keyboardShouldPersistTaps="handled"

                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={handleRefresh}
                    tintColor={COLORS.brand}
                    colors={[COLORS.brand]}
                  />
                }
                ListEmptyComponent={
                  <View className="flex-1 items-center justify-center px-6">
                    <Ionicons
                      name="chatbubbles-outline"
                      size={54}
                      color={COLORS.borderLight}
                    />
                    <Text className="text-center text-textLight mt-4 font-m text-base">
                      No new messages
                    </Text>
                  </View>
                }
              />

              {/* --- INPUT BOTTOM BAR (ONLY FOR OWNERS) --- */}
              {currentUserRole === "owner" && (
                <View className="bg-white border-t border-borderLight p-4 pt-3 pb-3">
                  <View className="flex-row items-center mb-3 ml-1">
                    <Switch
                      value={isAnnouncement}
                      onValueChange={setIsAnnouncement}
                      trackColor={{
                        false: "#E5E7EB",
                        true: COLORS.brandAccent,
                      }}
                      thumbColor={"#FFFFFF"}
                      style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                    />
                    <Text
                      className={`ml-1 text-xs font-m-bold ${
                        isAnnouncement ? "text-brandAccent" : "text-textLight"
                      }`}
                    >
                      {isAnnouncement
                        ? "Sending as Announcement"
                        : "Send as Normal Message"}
                    </Text>
                  </View>

                  <View className="flex-row items-end">
                    <TextInput
                      className="flex-1 bg-background border border-borderLight rounded-2xl px-4 py-3 min-h-[48px] max-h-32 text-textDark font-m"
                      placeholder={
                        isAnnouncement
                          ? "Type an announcement..."
                          : "Type your message..."
                      }
                      placeholderTextColor={COLORS.textLight}
                      value={inputText}
                      onChangeText={setInputText}
                      multiline
                    />
                    <TouchableOpacity
                      onPress={handleSend}
                      disabled={!inputText.trim()}
                      className={`ml-3 mb-1 w-12 h-12 rounded-full items-center justify-center ${
                        !inputText.trim()
                          ? "bg-borderLight"
                          : isAnnouncement
                            ? "bg-brandAccent"
                            : "bg-brand"
                      }`}
                    >
                      <Ionicons
                        name="send"
                        size={18}
                        color={!inputText.trim() ? COLORS.textLight : "white"}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </>
          )}
        </KeyboardAvoidingView>
      )}
    </View>
  );
}
