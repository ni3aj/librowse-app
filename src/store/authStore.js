import { create } from "zustand";

export const useAuthStore = create((set) => ({
  userRole: null,
  userId: null, // 👈 Make sure this exists

  // Call this during your successful login
  setAuthData: (role, id) => set({ userRole: role, userId: id }),

  clearAuth: () => set({ userRole: null, userId: null }),
}));
