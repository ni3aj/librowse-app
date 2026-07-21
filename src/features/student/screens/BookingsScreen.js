// app/(student)/bookings.js
import apiClient from "@/api/client";
import Header from "@/components/ui/Header";
import { COLORS } from "@/constants/theme";
import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Text, View } from "react-native";

import { WidgetRegistry } from "@/components/sdui/WidgetRegistry";

export default function BookingsScreen() {
  const [layout, setLayout] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUI();
  }, []);

  const fetchUI = async () => {
    try {
      // 📌 We hit the new backend route that sends the JSON UI Payload
      const response = await apiClient.get("/student/sdui/bookings");
      if (response.data.success) {
        setLayout(response.data.layout);
      }
    } catch (error) {
      console.error("Failed to load UI", error);
    } finally {
      setLoading(false);
    }
  };

  const renderWidget = ({ item, index }) => {
    // 1. Look up the component in the registry
    const WidgetComponent = WidgetRegistry[item.type];

    // 2. If the backend sent a widget we haven't built yet, ignore it safely
    if (!WidgetComponent) {
      console.warn(`Unknown widget type: ${item.type}`);
      return null;
    }

    // 3. Render the widget and pass all the JSON props to it!
    return <WidgetComponent {...item.props} />;
  };

  return (
    <View className="flex-1 bg-background">
      <Header title="My Bookings" subtitle="Manage your active seats" />

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={COLORS.brand} />
        </View>
      ) : (
        <FlatList
          data={layout}
          keyExtractor={(item, index) => `${item.type}-${index}`}
          renderItem={renderWidget}
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="flex-1 justify-center items-center mt-20">
              <Text className="text-lg font-m-bold text-textLight">
                No active bookings found.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
