import { Ionicons } from "@expo/vector-icons";
import { Image, Text, View } from "react-native";

function CardAvatar({ src, name, size = 32 }) {
  if (src) {
    return (
      <Image
        source={{ uri: src }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        className="mr-3 bg-gray-100"
      />
    );
  }
  return (
    <View
      style={{ width: size, height: size, borderRadius: size / 2 }}
      className="bg-brand/10 items-center justify-center border border-brand/20 mr-3"
    >
      <Text className="text-brand font-m-bold text-sm">
        {name?.charAt(0)?.toUpperCase() || "?"}
      </Text>
    </View>
  );
}

export default function ActionCard({
  header,
  footer,
  children,
  className = "mb-4",
}) {
  return (
    <View
      className={`bg-gray-50 border border-borderLight rounded-3xl shadow-sm shadow-black/5 overflow-hidden ${className}`}
    >
      {header && (
        <View
          className={`${header.bg || "bg-gray-50"} px-3 py-3 border-b ${
            header.border || "border-gray-200"
          } flex-row justify-between items-center`}
        >
          <View className="flex-row items-center flex-1 pr-2">
            {header.avatarSrc || header.avatarName ? (
              <CardAvatar src={header.avatarSrc} name={header.avatarName} />
            ) : header.icon ? (
              <Ionicons
                name={header.icon}
                size={18}
                color={header.iconColor || "#6B7280"}
                className="mr-2"
              />
            ) : null}

            <View className="flex-1">
              <Text
                className={`font-m-bold text-sm ${header.textColor || "text-gray-800"}`}
                numberOfLines={1}
              >
                {header.title}
              </Text>
              {header.subtitle && (
                <Text
                  className="text-textLight font-m-semi text-xs mt-0.5"
                  numberOfLines={1}
                >
                  {header.subtitle}
                </Text>
              )}
            </View>
          </View>

          {header.rightElement && <View>{header.rightElement}</View>}
        </View>
      )}

      <View className="p-4">{children}</View>

      {footer && (
        <View className="flex-row border-t border-borderLight bg-gray-50/50">
          {footer}
        </View>
      )}
    </View>
  );
}
