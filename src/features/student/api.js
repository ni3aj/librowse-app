import apiClient from "@/api/client";

export const updateStudentProfile = async (profileData) => {
  return await apiClient.patch("/student/profile", profileData);
};
