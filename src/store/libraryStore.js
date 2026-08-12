import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export const useLibraryStore = create(
  persist(
    (set) => ({
      libraries: [],
      libraryId: null,
      hasInventory: false,
      libraryStatus: "UNVERIFIED",

      setLibraries: (librariesArray) => set({ libraries: librariesArray }),

      setLibraryStatus: (newStatus) => set({ libraryStatus: newStatus }),

      setActiveLibrary: (id, hasInv, status) =>
        set({
          libraryId: id,
          hasInventory: hasInv || false,
          libraryStatus: status || "UNVERIFIED",
        }),

      setLibraries: (libsArray) => set({ libraries: libsArray }),

      clearLibrary: () =>
        set({
          libraries: [],
          libraryId: null,
          hasInventory: false,
          libraryStatus: "UNVERIFIED",
        }),

      hasActiveBooking: false,

      setHasActiveBooking: (status) => set({ hasActiveBooking: status }),
    }),
    {
      name: "librowse-library-storage",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
