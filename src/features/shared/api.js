import apiClient from "@/api/client";

export const studentApi = {
  // Fetch Library Details & Inventory
  getLibraryDetails: (libraryId) =>
    apiClient.get(`/student/libraries/${libraryId}`),

  // Initial Enrollment Booking
  enrollSeat: (inventoryId, startDate) =>
    apiClient.post("/student/enroll", {
      inventory_id: inventoryId,
      start_date: startDate,
    }),

  // Cancel Pending Request
  cancelEnrollment: (enrollmentId) =>
    apiClient.delete(`/student/enrollments/${enrollmentId}`),

  // 📌 NEW: Request Plan Change for Next Billing Cycle
  requestFuturePlanChange: (currentEnrollmentId, newInventoryId) =>
    apiClient.post(
      `/student/enrollments/${currentEnrollmentId}/future-change`,
      {
        new_inventory_id: newInventoryId,
      },
    ),

  fetchMyReview: (libraryId) =>
    apiClient.get(`/reviews/libraries/${libraryId}/me`),
};
