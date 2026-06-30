import { COLORS } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

export default function StudentLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: COLORS.brand,
        tabBarInactiveTintColor: COLORS.textLight,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.background,
          borderTopColor: COLORS.surface,
          height: 90,
          paddingTop: 10,
        },
      }}
    >
      <Tabs.Screen
        name="home" // Matches home.js
        options={{
          title: "Explore",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="compass" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="booking" // Changed from "bookings" to match your folder "booking"
        options={{
          title: "Bookings",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar" size={size} color={color} />
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
      {/* library folder contains [id], so we target 'library' to hide the whole thing */}
      <Tabs.Screen
        name="library/[id]"
        options={{
          href: null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
