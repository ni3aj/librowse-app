import apiClient from "@/api/client";
import Header from "@/components/ui/Header";
import { COLORS } from "@/constants/theme";
import { useAuthStore } from "@/store/authStore";
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
  const currentUserRole = useAuthStore((state) => state.userRole);
  const currentUserId = useAuthStore((state) => state.userId);

  const [activities, setActivities] = useState([]);
  const [libraryId, setLibraryId] = useState(null);
  const [hasNoLibrary, setHasNoLibrary] = useState(false); // 📌 NEW: Tracks if the user lacks a library

  const [inputText, setInputText] = useState("");
  const [isAnnouncement, setIsAnnouncement] = useState(false);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadLibraryAndFetchActivities();
  }, []);

  const loadLibraryAndFetchActivities = async () => {
    try {
      // 📌 THE FIX: Read strictly from AsyncStorage for everyone
      const storedLibId = await AsyncStorage.getItem("libraryId");

      // Sometimes AsyncStorage returns the literal string "null" or "undefined", so we check for that too
      if (
        storedLibId &&
        storedLibId !== "null" &&
        storedLibId !== "undefined"
      ) {
        setLibraryId(storedLibId);
        await fetchActivities(storedLibId);
      } else {
        // Trigger the empty state card and stop loading
        setHasNoLibrary(true);
        setLoading(false);
      }
    } catch (error) {
      console.error("Failed to load library ID", error);
      setHasNoLibrary(true);
      setLoading(false);
    }
  };

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

  const handleRefresh = () => {
    setRefreshing(true);
    fetchActivities();
  };

  const handleSend = async () => {
    if (!inputText.trim() || !libraryId) return;

    const messageType =
      currentUserRole === "owner" && isAnnouncement ? "ANNOUNCEMENT" : "NORMAL";

    const payload = {
      content: inputText.trim(),
      type: messageType,
    };

    setInputText("");
    setIsAnnouncement(false);

    try {
      const response = await apiClient.post(
        `/shared/libraries/${libraryId}/activities`,
        payload,
      );
      if (response.data.success) {
        fetchActivities();
      }
    } catch (error) {
      Alert.alert(
        "Error",
        error.response?.data?.error || "Failed to send message.",
      );
      setInputText(payload.content);
      setIsAnnouncement(payload.type === "ANNOUNCEMENT");
    }
  };

  const handleDelete = async (activityId) => {
    try {
      const response = await apiClient.delete(
        `/shared/libraries/${libraryId}/activities/${activityId}`,
      );
      if (response.data.success) {
        setActivities((prev) => prev.filter((msg) => msg.id !== activityId));
      }
    } catch (error) {
      Alert.alert(
        "Error",
        error.response?.data?.error || "Failed to delete message.",
      );
    }
  };

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

  const sortedActivities = [...activities].sort((a, b) => {
    if (a.type === "ANNOUNCEMENT" && b.type !== "ANNOUNCEMENT") return -1;
    if (a.type !== "ANNOUNCEMENT" && b.type === "ANNOUNCEMENT") return 1;
    return new Date(b.created_at) - new Date(a.created_at);
  });

  const renderItem = ({ item }) => {
    const isAnnounce = item.type === "ANNOUNCEMENT";
    const canDelete =
      currentUserRole === "owner" || currentUserId === item.sender_id;

    if (isAnnounce) {
      return (
        <TouchableOpacity
          activeOpacity={0.8}
          delayLongPress={400}
          onLongPress={() => canDelete && confirmDelete(item.id)}
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

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        delayLongPress={400}
        onLongPress={() => canDelete && confirmDelete(item.id)}
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
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: COLORS.background }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <Header title="Activities" subtitle="Library Chat & Announcements" />

        {loading ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color={COLORS.brand} />
          </View>
        ) : hasNoLibrary ? (
          /* 📌 THE FIX: Beautiful Error Card for new users. Completely replaces the Chat & Input */
          <View className="flex-1 justify-center items-center px-6 pb-20">
            <View className="bg-white border border-borderLight rounded-[24px] p-8 items-center w-full">
              <View className="w-16 h-16 bg-brand/10 rounded-full items-center justify-center mb-4">
                <Text className="text-3xl">🏢</Text>
              </View>
              <Text className="text-xl font-m-bold text-textDark text-center mb-2">
                No Library Enrolled
              </Text>
              <Text className="text-textLight text-center font-m leading-5">
                {currentUserRole === "owner"
                  ? "You need to set up your library first to access the community chat and post announcements."
                  : "You haven't joined a library yet. Book a seat to unlock the community chat!"}
              </Text>
            </View>
          </View>
        ) : (
          /* Normal Chat UI (Only renders if they have a libraryId) */
          <>
            <FlatList
              data={sortedActivities}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              contentContainerStyle={{ paddingVertical: 20, flexGrow: 1 }}
              showsVerticalScrollIndicator={false}
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
                    No messages yet. Say hi!
                  </Text>
                </View>
              }
            />

            <View className="bg-white border-t border-borderLight p-4 pt-3 pb-3">
              {currentUserRole === "owner" && (
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
              )}

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
          </>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}
