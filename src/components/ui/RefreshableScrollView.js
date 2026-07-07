import { useCallback, useState } from "react";
import { RefreshControl, ScrollView } from "react-native";
// 📌 Make sure to import your colors schema so the spinner matches your brand!
import { COLORS } from "@/constants/theme";

export default function RefreshableScrollView({
  children,
  onRefresh,
  className,
  ...props
}) {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    if (!onRefresh) return;

    setRefreshing(true);
    try {
      // Await whatever API call function the parent screen passes in
      await onRefresh();
    } catch (error) {
      console.error("Refresh failed:", error);
    } finally {
      // Always stop the spinner, even if the API call fails
      setRefreshing(false);
    }
  }, [onRefresh]);

  return (
    <ScrollView
      className={className}
      {...props}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={COLORS.brand} // iOS Spinner Color
          colors={[COLORS.brand, COLORS.textDark]} // Android Spinner Colors
        />
      }
    >
      {children}
    </ScrollView>
  );
}
