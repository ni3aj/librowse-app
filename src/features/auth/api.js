import apiClient from "@/api/client";

export const fetchCurrentUserStatus = async () => {
  try {
    const response = await apiClient.get("/user/me");
    return { success: true, data: response.data };
  } catch (error) {
    const status = error.response?.status;
    const isUnauthorized = status === 401 || status === 404;
    return {
      success: false,
      error: error?.response,
      isUnauthorized: isUnauthorized,
    };
  }
};
