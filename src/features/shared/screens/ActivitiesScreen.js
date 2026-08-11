import apiClient from "@/api/client";
import Header from "@/components/ui/Header";
import { COLORS } from "@/constants/theme";
import { useAuthStore } from "@/store/authStore";
import { useLibraryStore } from "@/store/libraryStore";
import { formatCleanDate } from "@/utils/dateFormatter";
import {
  clearLocalActivities,
  getLastSyncTime,
  getLocalActivities,
  initDB,
  resetDatabaseSchema,
  saveActivitiesToLocal,
} from "@/utils/db";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";

const isSameDay = (d1, d2) => {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};

const getDateLabel = (dateString) => {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (isSameDay(date, today)) return "Today";
  if (isSameDay(date, yesterday)) return "Yesterday";

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export default function ActivitiesScreen() {
  const { role: currentUserRole, userId: currentUserId } = useAuthStore();
  const { libraryId } = useLibraryStore();

  const [activities, setActivities] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isAnnouncement, setIsAnnouncement] = useState(false);

  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const [dbFailed, setDbFailed] = useState(false);
  const [isNetworkOffline, setIsNetworkOffline] = useState(false);

  const flatListRef = useRef(null);

  // 📌 1. Initialize DB and Load Local Data ONCE on Mount
  useEffect(() => {
    const setupAndLoad = async () => {
      if (!libraryId) {
        setLoading(false);
        return;
      }

      try {
        await initDB();
        await fetchLocalActivities();

        // 📌 Run sync ONE time safely in the background after mount
        await syncNewActivities();
      } catch (error) {
        console.error("Local DB Dead. Falling back to Live API", error);
        setDbFailed(true);

        try {
          const res = await apiClient.get(
            `/shared/libraries/${libraryId}/activities`,
            { params: { limit: 50 } },
          );
          setActivities(res.data.activities);
          setHasMore(res.data.activities.length === 50);
        } catch (e) {
          setIsNetworkOffline(true);
        } finally {
          setLoading(false);
        }
      }
    };

    setupAndLoad();
  }, [libraryId]);

  // 📌 FAST LOCAL LOAD (Does NOT call sync anymore)
  const fetchLocalActivities = async () => {
    try {
      const localMsgs = await getLocalActivities(libraryId, 50);
      setActivities(localMsgs);
      setHasMore(localMsgs.length === 50);
    } catch (error) {
      console.error("Failed to load local DB", error);
    } finally {
      setLoading(false);
    }
  };

  // 📌 PAGINATION (Scroll Up)
  const fetchOlderActivities = async () => {
    if (isLoadingOlder || !hasMore || activities.length === 0) return;

    setIsLoadingOlder(true);
    const oldestMessage = activities[activities.length - 1];

    try {
      let olderMessages = [];

      if (dbFailed) {
        const res = await apiClient.get(
          `/shared/libraries/${libraryId}/activities`,
          { params: { cursor: oldestMessage.created_at, limit: 50 } },
        );
        if (res.data.success) olderMessages = res.data.activities;
      } else {
        olderMessages = await getLocalActivities(
          libraryId,
          50,
          oldestMessage.created_at,
        );

        if (olderMessages.length === 0) {
          const res = await apiClient.get(
            `/shared/libraries/${libraryId}/activities`,
            { params: { cursor: oldestMessage.created_at, limit: 50 } },
          );

          if (res.data.success && res.data.activities.length > 0) {
            const serverMsgs = res.data.activities.map((m) => ({
              ...m,
              library_id: libraryId,
            }));

            try {
              await saveActivitiesToLocal(serverMsgs);
            } catch (e) {
              Toast.show({
                type: "info",
                text1: "Phone storage full!",
                text2: "Messages won't be saved offline.",
              });
            }

            olderMessages = serverMsgs;
          }
        }
      }

      setActivities((prev) => [...prev, ...olderMessages]);
      setHasMore(olderMessages.length === 50);
      setIsNetworkOffline(false);
    } catch (error) {
      console.error("Failed to load older messages", error);
      setIsNetworkOffline(true);
    } finally {
      setIsLoadingOlder(false);
    }
  };

  // 📌 DELTA SYNC (Now strictly controlled: runs on mount, manual refresh, or send/delete)
  const syncNewActivities = async () => {
    if (!libraryId || syncing) return; // Prevent concurrent overlaps
    setSyncing(true);

    try {
      const lastSyncTime = dbFailed ? null : await getLastSyncTime(libraryId);

      const res = await apiClient.get(
        `/shared/libraries/${libraryId}/activities`,
        { params: lastSyncTime ? { since: lastSyncTime } : { limit: 50 } },
      );

      if (res.data.success && res.data.activities.length > 0) {
        const serverMsgs = res.data.activities.map((m) => ({
          ...m,
          library_id: libraryId,
        }));

        if (!dbFailed) {
          try {
            await saveActivitiesToLocal(serverMsgs);
            const updatedLocal = await getLocalActivities(libraryId, 50);
            setActivities(updatedLocal);
          } catch (e) {
            Toast.show({
              type: "info",
              text1: "Phone storage full!",
              text2: "Messages won't be saved offline.",
            });
            setActivities((prev) => {
              const updatedList = [...prev];
              serverMsgs.forEach((msg) => {
                const idx = updatedList.findIndex((m) => m.id === msg.id);
                if (idx > -1) updatedList[idx] = msg;
                else updatedList.unshift(msg);
              });
              return updatedList.sort(
                (a, b) => new Date(b.created_at) - new Date(a.created_at),
              );
            });
          }
        } else {
          setActivities(serverMsgs);
        }
      }
      setIsNetworkOffline(false);
    } catch (error) {
      console.log("Sync failed.", error);
      setIsNetworkOffline(true);
    } finally {
      setSyncing(false);
      setLoading(false);
    }
  };

  const forceHardReset = () => {
    Alert.alert(
      "Reset Chat Cache",
      "Are messages not loading properly? This will rebuild your chat history.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            setSyncing(true);
            try {
              const res = await apiClient.get(
                `/shared/libraries/${libraryId}/activities`,
                { params: { limit: 50 } },
              );
              if (res.data.success) {
                const serverMsgs = res.data.activities.map((m) => ({
                  ...m,
                  library_id: libraryId,
                }));
                if (!dbFailed) {
                  try {
                    await clearLocalActivities(libraryId);
                    await saveActivitiesToLocal(serverMsgs);
                  } catch (e) {
                    await resetDatabaseSchema();
                    await saveActivitiesToLocal(serverMsgs);
                  }
                }
                setActivities(serverMsgs);
                Toast.show({
                  type: "success",
                  text1: "Success",
                  text2: "Chat cache rebuilt.",
                });
              }
            } catch (error) {
              Toast.show({
                type: "error",
                text1: "Failed to reset. Check your network.",
              });
            } finally {
              setSyncing(false);
            }
          },
        },
      ],
    );
  };

  const handleSend = async () => {
    if (!inputText.trim() || !libraryId) return;

    const messageType =
      currentUserRole === "owner" && isAnnouncement ? "ANNOUNCEMENT" : "NORMAL";
    const payload = { content: inputText.trim(), type: messageType };

    setInputText("");
    setIsAnnouncement(false);

    try {
      const res = await apiClient.post(
        `/shared/libraries/${libraryId}/activities`,
        payload,
      );
      if (res.data.success) {
        await syncNewActivities();
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
        setIsNetworkOffline(false);
      }
    } catch (error) {
      Toast.show({ type: "error", text1: "Failed to send message." });
      setInputText(payload.content);
      setIsAnnouncement(payload.type === "ANNOUNCEMENT");
    }
  };

  const handleDelete = async (activityId) => {
    try {
      const res = await apiClient.delete(
        `/shared/libraries/${libraryId}/activities/${activityId}`,
      );
      if (res.data.success) {
        await syncNewActivities();
      }
    } catch (error) {
      Toast.show({ type: "error", text1: "Failed to delete message." });
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

  const newestFirstActivities = [...activities].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at),
  );
  const flatListData = [];

  newestFirstActivities.forEach((item, index) => {
    const currentLabel = getDateLabel(item.created_at);
    flatListData.push(item);

    const nextItem = newestFirstActivities[index + 1];
    const nextLabel = nextItem ? getDateLabel(nextItem.created_at) : null;

    if (currentLabel !== nextLabel) {
      flatListData.push({
        id: `date-${currentLabel}-${item.id}`,
        isDateSeparator: true,
        label: currentLabel,
      });
    }
  });

  const renderItem = ({ item }) => {
    if (item.isDateSeparator) {
      return (
        <View className="flex-row items-center justify-center my-4 px-6">
          <View className="flex-1 h-[1px] bg-borderLight" />
          <View className="bg-surface border border-borderLight px-3 py-1 rounded-lg mx-3 shadow-sm shadow-black/5">
            <Text className="text-textLight text-[10px] font-m-bold uppercase tracking-widest">
              {item.label}
            </Text>
          </View>
          <View className="flex-1 h-[1px] bg-borderLight" />
        </View>
      );
    }

    const isMyMessage = String(item.sender_id) === String(currentUserId);
    const canDelete =
      currentUserRole === "owner" || currentUserId === item.sender_id;

    if (item.is_deleted) {
      return (
        <View
          className={`mb-4 p-3 max-w-[80%] ${isMyMessage ? "self-end bg-surface border border-borderLight rounded-3xl rounded-tr-md mr-6" : "self-start bg-surface border border-borderLight rounded-3xl rounded-tl-md ml-6"}`}
        >
          <View className="flex-row items-center opacity-60">
            <Ionicons name="ban-outline" size={14} color={COLORS.textLight} />
            <Text className="text-textLight font-m italic ml-2 text-[13px]">
              This message was deleted
            </Text>
          </View>
        </View>
      );
    }

    const isAnnounce = item.type === "ANNOUNCEMENT";

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
        className={`mb-4 p-4 max-w-[80%] ${isMyMessage ? "self-end bg-surface border border-borderLight rounded-3xl rounded-tr-md mr-6" : "self-start bg-surface border border-borderLight rounded-3xl rounded-tl-md ml-6"}`}
      >
        <View className="flex-row justify-between items-center mb-1.5 gap-x-4">
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push(`/user/${item.sender_id}`)}
            className="flex-row items-center mr-2"
          >
            {!isMyMessage &&
              (item.sender_photo ? (
                <Image
                  source={{ uri: item.sender_photo }}
                  style={{ width: 28, height: 28, borderRadius: 14 }}
                  className="mr-2"
                />
              ) : (
                <View className="w-7 h-7 bg-brand/10 rounded-full items-center justify-center mr-2 border border-brand/20">
                  <Text className="text-brand font-m-bold text-xs uppercase">
                    {item.sender_name?.charAt(0) || "U"}
                  </Text>
                </View>
              ))}
            <Text
              className="text-textDark font-m-bold text-sm"
              numberOfLines={1}
            >
              {isMyMessage ? "You" : item.sender_name}
            </Text>
            {item.sender_role === "owner" && !isMyMessage && (
              <View className="ml-2 bg-blue-100 px-2 py-0.5 rounded-md">
                <Text className="text-blue-700 text-[10px] font-m-bold">
                  Owner
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <Text className="text-xs text-textLight font-m shrink-0">
            {new Date(item.created_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </View>
        <Text className="text-textDark font-m text-[15px] leading-5 mt-1">
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
        <Header
          title="Activities"
          showLibraryDropdown={true}
          rightComponent={
            <TouchableOpacity
              onPress={syncNewActivities}
              onLongPress={forceHardReset}
              delayLongPress={800}
              disabled={syncing}
              className="p-2 -mr-2"
            >
              {syncing ? (
                <ActivityIndicator size="small" color={COLORS.textDark} />
              ) : (
                <Ionicons name="refresh" size={22} color={COLORS.textDark} />
              )}
            </TouchableOpacity>
          }
        />

        {loading ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color={COLORS.brand} />
          </View>
        ) : !libraryId ? (
          <View className="flex-1 justify-center items-center px-6 pb-20">
            <View className="bg-surface border border-borderLight rounded-[24px] p-8 items-center w-full">
              <View className="w-16 h-16 bg-white rounded-full items-center justify-center mb-4">
                <Text className="text-3xl">🏢</Text>
              </View>
              <Text className="text-xl font-m-bold text-textDark text-center mb-2">
                {currentUserRole === "owner"
                  ? "No Library Created Yet"
                  : "No Library Enrolled"}
              </Text>
              <Text className="text-textLight text-center font-m leading-5">
                {currentUserRole === "owner"
                  ? "You need to set up your library first to access the community chat and post announcements."
                  : "You haven't joined a library yet. Book a seat to unlock the community chat!"}
              </Text>
            </View>
          </View>
        ) : (
          <>
            <FlatList
              ref={flatListRef}
              data={flatListData}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              inverted={true}
              contentContainerStyle={{ paddingVertical: 20, flexGrow: 1 }}
              showsVerticalScrollIndicator={false}
              keyboardDismissMode="on-drag"
              keyboardShouldPersistTaps="handled"
              onEndReached={fetchOlderActivities}
              onEndReachedThreshold={0.5}
              ListFooterComponent={
                isLoadingOlder && (
                  <ActivityIndicator
                    size="small"
                    color={COLORS.brand}
                    style={{ marginVertical: 20 }}
                  />
                )
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
                    trackColor={{ false: "#E5E7EB", true: COLORS.brandAccent }}
                    thumbColor={"#FFFFFF"}
                    style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                    disabled={isNetworkOffline}
                  />
                  <Text
                    className={`ml-1 text-xs font-m-bold ${isAnnouncement ? "text-brandAccent" : "text-textLight"}`}
                  >
                    {isAnnouncement
                      ? "Sending as Announcement"
                      : "Send as Normal Message"}
                  </Text>
                </View>
              )}

              <View className="flex-row items-end">
                <TextInput
                  className={`flex-1 border rounded-2xl px-4 py-3 min-h-[48px] max-h-32 text-textDark font-m ${isNetworkOffline ? "bg-gray-100 border-gray-200 opacity-70" : "bg-background border-borderLight"}`}
                  placeholder={
                    isNetworkOffline
                      ? "Waiting for network..."
                      : isAnnouncement
                        ? "Type an announcement..."
                        : "Type your message..."
                  }
                  placeholderTextColor={COLORS.textLight}
                  value={inputText}
                  onChangeText={setInputText}
                  multiline
                  editable={!isNetworkOffline}
                />
                <TouchableOpacity
                  onPress={handleSend}
                  disabled={!inputText.trim() || isNetworkOffline}
                  className={`ml-3 mb-1 w-12 h-12 rounded-full items-center justify-center ${
                    !inputText.trim() || isNetworkOffline
                      ? "bg-borderLight"
                      : isAnnouncement
                        ? "bg-brandAccent"
                        : "bg-brand"
                  }`}
                >
                  <Ionicons
                    name="send"
                    size={18}
                    color={
                      !inputText.trim() || isNetworkOffline
                        ? COLORS.textLight
                        : "white"
                    }
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
