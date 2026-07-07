import apiClient from "@/api/client";

export const completeUserProfile = async (fullName, role) => {
  try {
    // Assuming you have a route like PUT /auth/profile or PUT /user/profile
    const response = await apiClient.put("/user/profile", {
      full_name: fullName,
      role: role,
    });
    return { success: true, token: response.data.token, error: null };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.error || "Failed to update profile.",
    };
  }
};
