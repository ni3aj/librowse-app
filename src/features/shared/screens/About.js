import Header from "@/components/ui/Header";
import { COLORS } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import * as Application from "expo-application"; // Optional: to get actual version dynamically
import {
  Linking,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// ── Reusable Menu Item ──────────────────────────────────────────────
const AboutMenuItem = ({ icon, title, subtitle, onPress, isLink = false }) => (
  <TouchableOpacity
    activeOpacity={0.7}
    onPress={onPress}
    className="flex-row items-center justify-between py-4 border-b border-borderLight last:border-b-0"
  >
    <View className="flex-row items-center flex-1">
      <View className="w-10 h-10 rounded-full bg-surface border border-borderLight items-center justify-center mr-4">
        <Ionicons name={icon} size={20} color={COLORS.brand} />
      </View>
      <View className="flex-1 pr-4">
        <Text className="text-base font-m-bold text-textDark">{title}</Text>
        {subtitle && (
          <Text className="text-xs font-m text-textLight mt-0.5">
            {subtitle}
          </Text>
        )}
      </View>
    </View>
    <Ionicons
      name={isLink ? "open-outline" : "chevron-forward"}
      size={20}
      color={COLORS.textLight}
    />
  </TouchableOpacity>
);

export default function AboutScreen() {
  const APP_VERSION = Application.nativeApplicationVersion || "1.0.0";

  // Replace these with your actual hosted policy URLs
  const LINKS = {
    privacy: "https://www.librowse.in/privacy",
    terms: "https://www.librowse.in/terms",
    refunds: "https://www.librowse.in/refunds",
    supportEmail: "support@librowse.in",
    website: "https://www.librowse.in",
  };

  const openLink = async (url) => {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    }
  };

  return (
    <View className="flex-1 bg-background">
      <Header title="About LiBrowse" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View className="items-center mt-6 mb-8 px-6">
          <View className="w-24 h-24 bg-brand/10 rounded-3xl items-center justify-center mb-4 border border-brand/20">
            <Text className="text-5xl">📚</Text>
          </View>
          <Text className="text-2xl font-m-extra text-textDark">LiBrowse</Text>
          <Text className="text-sm font-m text-textLight mt-1">
            Version {APP_VERSION}
          </Text>
        </View>

        <View className="px-6 mb-6">
          <Text className="text-xs font-m-bold text-textLight uppercase tracking-wider mb-2 ml-2">
            Legal
          </Text>
          <View className="bg-white rounded-3xl px-5 py-2 border border-borderLight">
            <AboutMenuItem
              icon="shield-checkmark-outline"
              title="Privacy Policy"
              subtitle="How we protect your data & KYC"
              isLink={true}
              onPress={() => openLink(LINKS.privacy)}
            />
            <AboutMenuItem
              icon="document-text-outline"
              title="Terms of Service"
              subtitle="Rules for using our platform"
              isLink={true}
              onPress={() => openLink(LINKS.terms)}
            />
            <AboutMenuItem
              icon="card-outline"
              title="Refund & Cancellation"
              subtitle="Payment policies and disputes"
              isLink={true}
              onPress={() => openLink(LINKS.refunds)}
            />
          </View>
        </View>

        <View className="px-6 mb-8">
          <Text className="text-xs font-m-bold text-textLight uppercase tracking-wider mb-2 ml-2">
            Support
          </Text>
          <View className="bg-white rounded-3xl px-5 py-2 border border-borderLight">
            <AboutMenuItem
              icon="mail-outline"
              title="Contact Us"
              subtitle={LINKS.supportEmail}
              onPress={() =>
                Linking.openURL(
                  `mailto:${LINKS.supportEmail}?subject=App Support - LiBrowse v${APP_VERSION}`,
                )
              }
            />
            <AboutMenuItem
              icon="globe-outline"
              title="Visit Website"
              subtitle={LINKS.website}
              isLink={true}
              onPress={() => openLink(LINKS.website)}
            />
            <AboutMenuItem
              icon="star-outline"
              title="Rate us on App Store"
              subtitle="Love the app? Let us know!"
              onPress={() => {
                // Replace with your actual App Store/Play Store link
                // Linking.openURL("market://details?id=com.your.bundle.id");
              }}
            />
          </View>
        </View>

        <View className="items-center px-6 opacity-60">
          <Text className="text-xs font-m text-textLight text-center mb-1">
            Made with ❤️ for students
          </Text>
          <Text className="text-[10px] font-m text-textLight text-center">
            © {new Date().getFullYear()} LiBrowse. All rights reserved.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
