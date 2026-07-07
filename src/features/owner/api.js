import apiClient from "@/api/client";

// Existing dashboard fetcher...
export const fetchOwnerDashboardStats = async (libraryId) => {
  /* ... */
};

// 📌 NEW: Fetch the library's seat inventory
export const getLibraryInventory = async (libraryId) => {
  try {
    const response = await apiClient.get(
      `/owner/library/${libraryId}/inventory`,
    );
    return { success: true, data: response.data, error: null };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error.response?.data?.error || "Failed to load inventory",
    };
  }
};

// 📌 NEW: Add a new seat category/bucket
export const addInventoryBucket = async (libraryId, inventoryData) => {
  try {
    const response = await apiClient.post(
      `/owner/library/${libraryId}/inventory`,
      inventoryData,
    );
    return { success: true, error: null };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.error || "Failed to save seats",
    };
  }
};

export const createLibraryProfile = async (libraryData) => {
  try {
    const response = await apiClient.post("/owner/library", libraryData);
    return { success: true, data: response.data, error: null };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error.response?.data?.error || "Failed to create library.",
    };
  }
};
