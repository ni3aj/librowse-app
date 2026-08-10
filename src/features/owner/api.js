import apiClient from "@/api/client";

// Existing dashboard fetcher...
export const fetchOwnerDashboardStats = async (libraryId) => {
  /* ... */
};

export const updateInventoryBucket = async (inventoryId, payload) => {
  try {
    const response = await apiClient.put(
      `/owner/library/inventory/${inventoryId}`,
      payload,
    );
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.error || "Failed to update category",
    };
  }
};

export const deleteInventoryBucket = async (inventoryId) => {
  try {
    const response = await apiClient.delete(
      `/owner/library/inventory/${inventoryId}`,
    );
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.error || "Failed to delete category",
    };
  }
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

export const fetchBillingStatusApi = async (libraryId) => {
  try {
    // 📌 Pass libraryId as a query parameter for the GET request
    const response = await apiClient.get(
      `/owner/billing/status?libraryId=${libraryId}`,
    );
    return response.data; // Returns { success, data, error }
  } catch (error) {
    throw error.response?.data || { success: false, error: "Network Error" };
  }
};

export const createRazorpayOrderApi = async (libraryId) => {
  try {
    // 📌 Pass libraryId inside the request body for the POST request
    const response = await apiClient.post("/owner/billing/create-order", {
      libraryId,
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, error: "Network Error" };
  }
};

export const verifyRazorpayPaymentApi = async (paymentData) => {
  try {
    // 📌 paymentData already includes `library_id` from your component
    const response = await apiClient.post("/owner/billing/verify", paymentData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, error: "Network Error" };
  }
};

export const calculateUpgradeDiscountApi = async (libraryId, targetTierId) => {
  try {
    const response = await apiClient.post("/owner/billing/upgrade-plan", {
      libraryId,
      targetTierId,
    });

    // Return the clean data object on success
    return response.data;
  } catch (error) {
    // Return a standardized error object so the UI never crashes
    return {
      success: false,
      error:
        error.response?.data?.error || "Could not calculate upgrade discount.",
    };
  }
};
