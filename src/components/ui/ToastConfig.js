import { BaseToast, ErrorToast } from "react-native-toast-message";

// 1. Create a reusable factory function for your toasts
const createToast =
  (Component, backgroundColor, borderRadius = 0) =>
  (props) => (
    <Component
      {...props}
      style={{
        height: 100,
        paddingTop: 20,
        backgroundColor,
        borderLeftWidth: 0,
        borderRadius,
        width: "100%",
      }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 16,
        fontFamily: "m-bold",
        color: "#ffffff",
      }}
      text2Style={{
        fontSize: 14,
        fontFamily: "m",
        color: "#ffffff",
      }}
    />
  );

// 2. Map your states using the factory
export const toastConfig = {
  success: createToast(BaseToast, "green"),
  error: createToast(ErrorToast, "#ef233c"),
  info: createToast(BaseToast, "#4361ee"),
};
