import { COLORS } from "@/constants/theme";
import { useAuthStore } from "@/store/authStore";
import { useLibraryStore } from "@/store/libraryStore"; // 📌 1. Import library store
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

export default function StudentLayout() {
  // Extract user info for the Profile icon
  const { userName } = useAuthStore();

  // 📌 2. Read the global boolean that tells us if they have an active booking
  const { hasActiveBooking } = useLibraryStore();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: COLORS.textDark,
        tabBarInactiveTintColor: COLORS.textLight,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.background,
          borderTopColor: COLORS.background,
          height: 100,
          paddingTop: 5,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="libraries-listing"
        options={{
          title: "Browse",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="compass" size={size} color={color} />
          ),
        }}
      />

      {/* 📌 3. ACTIVITIES TAB */}
      <Tabs.Screen
        name="activities"
        options={{
          title: "Activities",
          // 👇 The Magic: This hides the tab completely if false!
          href: hasActiveBooking ? "/activities" : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile" // Matches profile.js
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="library/[id]" options={{ href: null }} />
      <Tabs.Screen name="edit-profile" options={{ href: null }} />
      <Tabs.Screen name="about" options={{ href: null }} />
      <Tabs.Screen name="kyc" options={{ href: null }} />
    </Tabs>
  );
}
