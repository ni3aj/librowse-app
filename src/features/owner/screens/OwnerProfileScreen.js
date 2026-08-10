import apiClient from "@/api/client";
import Button from "@/components/ui/Button";
import Header from "@/components/ui/Header";
import { COLORS } from "@/constants/theme";
import { useAuthStore } from "@/store/authStore";
import { useLibraryStore } from "@/store/libraryStore";
import { formatCleanDate } from "@/utils/dateFormatter";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";

export default function OwnerProfileScreen() {
  const [owner, setOwner] = useState(null);
  const [libraries, setLibraries] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isUploading, setIsUploading] = useState(false);
  const [isPhotoViewerVisible, setIsPhotoViewerVisible] = useState(false);

  // --- NEW STATES FOR ACCOUNT DELETION ---
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [deleteCheckData, setDeleteCheckData] = useState(null);
  const [isCheckingDelete, setIsCheckingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { logout } = useAuthStore();
  const clearLibrary = useLibraryStore((state) => state.clearLibrary);

  useFocusEffect(
    useCallback(() => {
      fetchProfileData();
    }, []),
  );

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get("/owner/profile");
      if (res.data.success) {
        setOwner(res.data.owner);
        setLibraries(res.data.libraries);
      }
    } catch (error) {
      console.log("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePickImage = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Toast.show({
        type: "error",
        text1: "Permission Required",
        text2: "Please allow access to your photos.",
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      uploadPhoto(result.assets[0].uri);
    }
  };

  const uploadPhoto = async (uri) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      const filename = uri.split("/").pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpeg`;

      formData.append("photo", { uri, name: filename, type });

      const response = await apiClient.patch("/owner/profile/photo", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.data.success) {
        setOwner({ ...owner, profile_photo: response.data.photo_url });
        Toast.show({
          type: "success",
          text1: "Success",
          text2: "Profile photo updated!",
        });
      }
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Upload Failed",
        text2: error.response?.data?.error || "Could not upload photo.",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: () => {
          try {
            logout();
            if (clearLibrary) clearLibrary();
            router.replace("/");
          } catch (e) {
            console.error("Logout failed", e);
          }
        },
      },
    ]);
  };

  // --- NEW HANDLERS FOR ACCOUNT DELETION ---
  const handleDeleteCheck = async () => {
    try {
      setIsCheckingDelete(true);
      const res = await apiClient.get("/auth/account/delete-check");
      setDeleteCheckData(res.data);
      setIsDeleteModalVisible(true);
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2:
          error.response?.data?.error || "Could not check deletion status.",
      });
    } finally {
      setIsCheckingDelete(false);
    }
  };

  const handleFinalDelete = async () => {
    Alert.alert(
      "Final Confirmation",
      "Are you absolutely sure? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes, Delete Everything",
          style: "destructive",
          onPress: async () => {
            // Placeholder for actual delete API
            Toast.show({ type: "info", text1: "Coming next!" });
          },
        },
      ],
    );
  };

  // 📌 THE FIX: Sync store properly before navigating to target screens
  const handleNavigateToLibrary = (route, lib) => {
    useLibraryStore.setState({
      libraryId: lib.id,
      libraryStatus: lib.status,
    });
    router.push(route);
  };

  const handleNavigateToBilling = () => {
    // Determine the current library or fallback to the first one to ensure context
    const currentStoreId = useLibraryStore.getState().libraryId;
    const activeLib =
      libraries.find((l) => l.id === currentStoreId) || libraries[0];

    if (activeLib) {
      useLibraryStore.setState({
        libraryId: activeLib.id,
        libraryStatus: activeLib.status,
      });
    }
    router.push("/billing");
  };

  if (loading || !owner) {
    return (
      <View className="flex-1 bg-background justify-center items-center">
        <ActivityIndicator size="large" color={COLORS.brand} />
      </View>
    );
  }

  const profilePhotoUrl =
    owner?.profile_photo ||
    "https://ui-avatars.com/api/?name=" +
      (owner?.full_name || "Owner") +
      "&background=C13383&color=fff&size=256";

  return (
    <View className="flex-1 bg-background">
      {/* HEADER */}
      <Header title="Profile" />

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* 📌 SECTION 1: CENTERED OWNER DETAILS WITH PHOTO UPLOAD */}
        <View className="items-center mb-8 px-6">
          <View className="relative">
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setIsPhotoViewerVisible(true)}
            >
              <Image
                source={{ uri: profilePhotoUrl }}
                className="w-28 h-28 rounded-full border-4 border-white bg-gray-100 shadow-sm"
              />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.9}
              onPress={handlePickImage}
              disabled={isUploading}
              className="absolute bottom-0 right-0 bg-brand w-9 h-9 rounded-full items-center justify-center border-2 border-white shadow-sm"
            >
              {isUploading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="camera" size={16} color="#fff" />
              )}
            </TouchableOpacity>
          </View>

          <Text className="text-2xl font-m-extra text-textDark mt-4 text-center">
            {owner?.full_name || "Business Owner"}
          </Text>
          <View className="flex-row items-center mt-1">
            <Ionicons name="call" size={14} color={COLORS.textLight} />
            <Text className="text-base font-m text-textLight ml-1.5">
              +91 {owner?.phone || "XXXXXXXXXX"}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => router.push("/edit-profile")}
            className="mt-3 bg-brand/10 px-5 py-2 rounded-full border border-brand/20"
          >
            <Text className="text-brand font-m-bold text-xs uppercase tracking-wider">
              Edit Personal Details
            </Text>
          </TouchableOpacity>
        </View>

        <View className="px-6 pb-12">
          {/* SECTION 2: MY LIBRARIES */}
          <View className="mb-4">
            <View className="flex-row justify-between items-center mb-4 ml-1">
              <Text className="text-lg font-m-bold text-textDark">
                My Libraries
              </Text>
              {libraries.length > 0 && libraries.length < 3 && (
                <TouchableOpacity
                  onPress={() => router.push("/(owner)/create-library-wizard")}
                >
                  <Text className="text-brand font-m-bold mr-3">+ Add New</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* EMPTY STATE */}
            {libraries.length === 0 ? (
              <View className="bg-surface p-6 rounded-3xl border border-borderLight items-center mb-4">
                <View className="bg-brand/10 h-16 w-16 rounded-full items-center justify-center mb-4">
                  <Text className="text-3xl">🏢</Text>
                </View>
                <Text className="text-xl font-m-bold text-textDark text-center mb-2">
                  No Library Created Yet
                </Text>
                <Text className="text-textLight text-center font-m mb-6 leading-5 px-2">
                  You haven't created any libraries to your account yet. Let's
                  get started!
                </Text>
                <Button
                  title="Create New Library"
                  variant="primary"
                  onPress={() => router.push("/(owner)/create-library-wizard")}
                  className="w-full"
                />
              </View>
            ) : (
              /* MAP LIBRARIES */
              libraries.map((lib) => (
                <View
                  key={lib.id}
                  className="bg-surface p-2 rounded-2xl border border-borderLight mb-3"
                >
                  <View className="flex-row justify-between items-start p-2">
                    <View>
                      <Text className="text-base font-m-bold text-textDark">
                        {lib.name}
                      </Text>
                      <Text className="text-sm text-textLight">{lib.city}</Text>
                    </View>
                    <View
                      className={`px-2 py-1 rounded-md ${lib.status === "VERIFIED" ? "bg-green-100" : "bg-orange-100"}`}
                    >
                      <Text
                        className={`text-xs font-bold ${lib.status === "VERIFIED" ? "text-green-700" : "text-orange-700"}`}
                      >
                        {lib.status === "VERIFIED" ? "Active" : "Pending"}
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row space-x-3 mt-2">
                    <TouchableOpacity
                      className="flex-1 bg-background py-2.5 rounded-xl border border-borderLight items-center mr-1"
                      onPress={() =>
                        handleNavigateToLibrary(`/edit-library`, lib)
                      }
                    >
                      <Text className="text-textDark font-m-bold text-xs">
                        Edit Details
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="flex-1 bg-background py-2.5 px-2 rounded-xl border border-borderLight items-center mr-1"
                      onPress={() =>
                        handleNavigateToLibrary("/manage-seats", lib)
                      }
                    >
                      <Text className="text-textDark font-m-bold text-xs">
                        Manage Seats
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="flex-1 bg-background py-2.5 rounded-xl border border-borderLight items-center"
                      onPress={() => handleNavigateToLibrary(`/reviews`, lib)}
                    >
                      <Text className="text-textDark font-m-bold text-xs">
                        Reviews
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>

          {/* SECTION 3: BILLING & SETTINGS */}
          <View className="mb-8 space-y-3">
            <Text className="text-lg font-m-bold text-textDark mb-4 ml-1">
              App & Billing
            </Text>

            {libraries?.length > 0 && (
              <TouchableOpacity
                className="bg-surface p-4 rounded-2xl border border-borderLight flex-row items-center justify-between mb-2"
                onPress={handleNavigateToBilling}
              >
                <View className="flex-row items-center">
                  <View className="w-10 h-10 rounded-full bg-brand/10 items-center justify-center mr-3">
                    <Ionicons name="card" size={20} color={COLORS.brand} />
                  </View>
                  <Text className="text-base font-m-bold text-textDark">
                    Platform Subscription
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={COLORS.textLight}
                />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              className="bg-surface p-4 rounded-2xl border border-borderLight flex-row items-center justify-between"
              onPress={() => router.push("/auth/reset-mpin")}
            >
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-full bg-brand/10 items-center justify-center mr-3">
                  <Ionicons name="lock-closed" size={20} color={COLORS.brand} />
                </View>
                <Text className="text-base font-m-bold text-textDark">
                  Change MPIN
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={COLORS.textLight}
              />
            </TouchableOpacity>
          </View>

          {/* LOGOUT BUTTON */}
          <Button
            title="Logout"
            variant="primary"
            onPress={handleLogout}
            className="text-brandAccent bg-transparent border border-red-100 mb-4"
          />

          {/* DELETE ACCOUNT TRIGGER */}
          <TouchableOpacity
            onPress={handleDeleteCheck}
            disabled={isCheckingDelete}
            className="items-center py-3"
          >
            {isCheckingDelete ? (
              <ActivityIndicator size="small" color="#EF4444" />
            ) : (
              <Text className="text-red-500 font-m-bold text-sm">
                Delete Account
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* --- 📌 FULL SCREEN PHOTO VIEWER MODAL --- */}
      <Modal
        visible={isPhotoViewerVisible}
        transparent={false}
        animationType="fade"
        onRequestClose={() => setIsPhotoViewerVisible(false)}
      >
        <View className="flex-1 bg-black justify-center items-center">
          <View className="absolute top-12 left-0 right-0 z-10 flex-row justify-between items-center px-6">
            <View className="w-10" />
            <Text className="text-white font-m-bold text-lg">
              Profile Photo
            </Text>
            <TouchableOpacity
              onPress={() => setIsPhotoViewerVisible(false)}
              className="p-2 bg-white/20 rounded-full"
            >
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <Image
            source={{ uri: profilePhotoUrl }}
            style={{ width: "100%", height: "70%" }}
            resizeMode="contain"
          />
        </View>
      </Modal>

      {/* --- 📌 ACCOUNT DELETION MODAL --- */}
      <Modal
        visible={isDeleteModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsDeleteModalVisible(false)}
      >
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-white w-full rounded-t-3xl p-6 pb-20 max-h-[85%]">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-xl font-m-bold text-textDark">
                {deleteCheckData?.can_delete
                  ? "Delete Account"
                  : "Cannot Delete Account"}
              </Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {deleteCheckData && (
                <>
                  {/* SCENARIO A: BLOCKED */}
                  {!deleteCheckData.can_delete && (
                    <View>
                      <View className="bg-red-50 border border-red-100 p-4 rounded-2xl mb-5">
                        <Text className="text-red-800 font-m text-base leading-5">
                          {deleteCheckData.reason}
                        </Text>
                      </View>

                      <Text className="font-m-bold text-textDark mb-3 text-base">
                        Active Enrollments Found:
                      </Text>

                      {deleteCheckData.blockers?.libraries?.map((lib) => (
                        <View
                          key={lib.library_id}
                          className="bg-surface p-4 rounded-xl border border-borderLight mb-3"
                        >
                          <Text className="font-m-bold text-textDark text-base">
                            {lib.library_name}
                          </Text>
                          <View className="flex-row items-center mt-2">
                            <Ionicons
                              name="people"
                              size={16}
                              color={COLORS.textLight}
                            />
                            <Text className="text-textLight font-m ml-2">
                              {lib.active_students} Active Student(s)
                            </Text>
                          </View>
                          <View className="flex-row items-center mt-1">
                            <Ionicons
                              name="calendar"
                              size={16}
                              color={COLORS.textLight}
                            />
                            <Text className="text-textLight font-m ml-2">
                              Latest expiry:{" "}
                              {formatCleanDate(lib.latest_membership_end)}
                            </Text>
                          </View>
                        </View>
                      ))}

                      <Text className="text-textLight font-m text-sm mt-2 mb-6">
                        <Text className="font-m-bold">Action Required: </Text>
                        {deleteCheckData.action_required}
                      </Text>

                      <Button
                        title="Understood"
                        onPress={() => setIsDeleteModalVisible(false)}
                        className="w-full bg-gray-200 border border-gray-200"
                        textClassName="text-textDark"
                      />
                    </View>
                  )}

                  {/* SCENARIO B: ALLOWED */}
                  {deleteCheckData.can_delete && (
                    <View>
                      <View className="bg-orange-50 border border-orange-200 p-4 rounded-2xl mb-6 flex-row">
                        <Ionicons
                          name="warning"
                          size={24}
                          color="#C2410C"
                          className="mr-3"
                        />
                        <Text className="text-orange-800 font-m text-sm leading-5 flex-1 ml-2">
                          This action is permanent and cannot be undone. You
                          will lose access to your libraries, history, and
                          settings immediately.
                        </Text>
                      </View>

                      <Text className="font-m-bold text-textDark mb-3 text-base">
                        What will happen:
                      </Text>

                      <View className="mb-8">
                        {deleteCheckData.warnings?.map((warning, idx) => (
                          <View key={idx} className="flex-row items-start mb-3">
                            <Text className="text-red-500 mr-2 mt-0.5">•</Text>
                            <Text className="text-textDark font-m text-sm leading-5 flex-1">
                              {warning}
                            </Text>
                          </View>
                        ))}
                      </View>

                      <Button
                        title="Permanently Delete Account"
                        onPress={handleFinalDelete}
                        className="w-full bg-red-500 border-red-500"
                        textClassName="text-white"
                        loading={isDeleting}
                      />
                      <TouchableOpacity
                        onPress={() => setIsDeleteModalVisible(false)}
                        className="py-4 items-center mt-2"
                      >
                        <Text className="text-textLight font-m-bold text-sm">
                          Cancel
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
