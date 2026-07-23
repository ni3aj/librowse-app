import { create } from "zustand";

export const useLibraryStore = create((set) => ({
  libraryStatus: "UNVERIFIED",
  setLibraryStatus: (status) => set({ libraryStatus: status }),
  clearLibrary: () => set({ libraryStatus: "UNVERIFIED" }),
}));
