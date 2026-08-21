import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export const useAuthStore = create(
  persist(
    (set, get) => ({
      jwt_token: null,
      account_state: "UNKNOWN",
      mpin_configured: false,
      force_mpin_reset: false,
      role: null,
      userId: null,
      userName: null,
      userPhone: null,
      is_kyc_verified: null,
      kyc_reference_id: null,

      loginSuccess: (data) =>
        set({
          jwt_token: data.token,
          account_state: data.account_state || "UNKNOWN",
          role: data.user?.role || null,
          userId: data.user?.id || null,
          userName: data.user?.name || null,
          userPhone: data.user?.phone || null,
        }),

      setMpinConfigured: (status) => set({ mpin_configured: status }),

      triggerMpinReset: () =>
        set({
          jwt_token: null,
          mpin_configured: false,
          force_mpin_reset: true,
          account_state: "UNKNOWN",
        }),

      clearMpinResetFlag: () => set({ force_mpin_reset: false }),

      logout: async () => {
        try {
          set({
            jwt_token: null,
            account_state: "UNKNOWN",
            role: null,
            userId: null,
            userName: null,
            userPhone: null,
            is_kyc_verified: null,
            kyc_reference_id: null,
          });
          await AsyncStorage.removeItem("librowse-auth-storage");
          await AsyncStorage.removeItem("librowse-library-storage");
        } catch (error) {
          console.error("Error clearing storage on logout:", error);
        }
      },

      updateKycStatus: (isVerified, referenceId) =>
        set({
          is_kyc_verified: isVerified ?? null,
          kyc_reference_id: referenceId ?? null,
        }),
    }),
    {
      name: "librowse-auth-storage",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
