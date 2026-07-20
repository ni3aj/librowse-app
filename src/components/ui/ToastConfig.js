// components/ui/ToastConfig.js
import { BaseToast, ErrorToast } from "react-native-toast-message";

export const toastConfig = {
  /*
    SUCCESS TOAST
  */
  success: (props) => (
    <BaseToast
      {...props}
      style={{
        height: 70,
        backgroundColor: "#ECFDF5", // Subtle Emerald Green background
        borderLeftWidth: 0, // Removes the library's default thick left line
        borderRadius: 10, // Smoother, modern curves
        borderWidth: 0,
        borderColor: "#D1FAE5", // Very subtle matching border
        width: "90%",
      }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 16,
        fontFamily: "m-bold",
        color: "#065F46", // Dark green text for beautiful contrast
      }}
      text2Style={{
        fontSize: 14,
        fontFamily: "m",
        color: "#047857",
      }}
    />
  ),

  /*
    ERROR TOAST
  */
  error: (props) => (
    <ErrorToast
      {...props}
      style={{
        height: 70,
        backgroundColor: "#FEF2F2", // Subtle Red background
        borderLeftWidth: 0, // Removes the library's default thick left line
        borderRadius: 10,
        borderWidth: 0,
        borderColor: "#FECACA", // Very subtle matching border
        width: "90%",
      }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 16,
        fontFamily: "m-bold",
        color: "#991B1B", // Dark red text for beautiful contrast
      }}
      text2Style={{
        fontSize: 14,
        fontFamily: "m",
        color: "#B91C1C",
      }}
    />
  ),

  /* Optional: INFO TOAST (If you use it for 'Library Under Review' alerts)
   */
  info: (props) => (
    <BaseToast
      {...props}
      style={{
        height: 70,
        backgroundColor: "#EFF6FF", // Subtle Blue background
        borderLeftWidth: 0,
        borderRadius: 10,
        borderWidth: 0,
        borderColor: "#DBEAFE",
        width: "90%",
      }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 16,
        fontFamily: "m-bold",
        color: "#1E40AF",
      }}
      text2Style={{
        fontSize: 14,
        fontFamily: "m",
        color: "#1D4ED8",
      }}
    />
  ),
};
