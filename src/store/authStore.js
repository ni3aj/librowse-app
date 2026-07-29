import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export const useAuthStore = create(
  persist(
    (set, get) => ({
      // 1. The State (The Bucket's Contents)
      jwt_token: null,
      libraryId: null,
      hasInventory: false,
      account_state: "UNKNOWN",
      mpin_configured: false,
      force_mpin_reset: false,
      role: null,
      userId: null,

      // 2. The Actions (How we update the Bucket)

      // Called when OTP or MPIN login is successful
      loginSuccess: (data) =>
        set({
          jwt_token: data.token,
          libraryId: data.libraryId || null,
          hasInventory: data.hasInventory || false,
          account_state: data.account_state || "UNKNOWN",
          role: data.user?.role || null,
          userId: data.user?.id || null,
        }),

      // Updates MPIN config status
      setMpinConfigured: (status) => set({ mpin_configured: status }),

      // Called when user forgets MPIN
      triggerMpinReset: () =>
        set({
          jwt_token: null, // Log them out
          mpin_configured: false, // Reset MPIN status
          force_mpin_reset: true, // Flag that they need a new MPIN
          account_state: "UNKNOWN",
        }),

      // Clears the flag after they successfully reset via OTP
      clearMpinResetFlag: () => set({ force_mpin_reset: false }),

      // Full logout
      logout: () =>
        set({
          jwt_token: null,
          libraryId: null,
          hasInventory: false,
          account_state: "UNKNOWN",
          role: null,
          userId: null,
        }),
    }),
    {
      name: "librowse-auth-storage", // The key used in AsyncStorage
      storage: createJSONStorage(() => AsyncStorage), // Auto-saves to AsyncStorage
    },
  ),
);
