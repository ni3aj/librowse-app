import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

const CHIP_MAPPING = {
  AC: { display: "AC", icon: "snow-outline", variant: "pink" },
  NON_AC: { display: "Non-AC", icon: "thermometer-outline", variant: "gray" },
  RESERVED: { display: "Reserved", icon: "star-outline", variant: "green" },
  UNRESERVED: {
    display: "Unreserved",
    icon: "lock-open-outline",
    variant: "amber",
  },
  FULL_DAY: { display: "Full Day", icon: "sunny-outline", variant: "purple" },
  DAY: { display: "Day", icon: "partly-sunny-outline", variant: "purple" },
  NIGHT: { display: "Night", icon: "moon-outline", variant: "purple" },
};

export default function Chip({ label }) {
  if (!label) return null;

  const styles = {
    pink: {
      container: "bg-pink-50 border border-pink-200",
      text: "text-pink-700",
      hex: "#be185d",
    },
    purple: {
      container: "bg-purple-50 border border-purple-200",
      text: "text-purple-700",
      hex: "#6d28d9",
    },
    green: {
      container: "bg-emerald-50 border border-emerald-200",
      text: "text-emerald-700",
      hex: "#047857",
    },
    amber: {
      container: "bg-amber-50 border border-amber-200",
      text: "text-amber-700",
      hex: "#b45309",
    },
    gray: {
      container: "bg-gray-100 border border-gray-200",
      text: "text-gray-500",
      hex: "#6b7280",
    },
  };

  const rawLabel = String(label).toUpperCase();

  let config = CHIP_MAPPING[rawLabel];

  if (!config) {
    if (rawLabel.includes("SEAT")) {
      config = {
        display: label.replace("_", " "),
        icon: "bed-outline",
        variant: "purple",
      };
    } else {
      config = {
        display: label.replace("_", " "),
        icon: "checkmark-circle-outline",
        variant: "gray",
      };
    }
  }

  const theme = styles[config.variant] || styles.gray;

  return (
    <View
      className={`flex-row items-center rounded-full px-4 py-1 mb-1 ${theme.container}`}
    >
      <Ionicons
        name={config.icon}
        size={10}
        color={theme.hex}
        style={{ marginRight: 4 }}
      />
      <Text className={`text-[8px] font-m-bold uppercase mt-0.5 ${theme.text}`}>
        {config.display}
      </Text>
    </View>
  );
}
