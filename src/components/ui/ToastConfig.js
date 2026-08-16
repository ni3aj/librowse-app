import { BaseToast, ErrorToast } from "react-native-toast-message";

const createToast =
  (Component, backgroundColor, borderRadius = 0) =>
  (props) => (
    <Component
      {...props}
      style={{
        height: "auto",
        minHeight: 105,
        paddingTop: 25,
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
      text1NumberOfLines={1}
      text2NumberOfLines={0}
    />
  );

export const toastConfig = {
  success: createToast(BaseToast, "#28a745"),
  error: createToast(ErrorToast, "#DC3545"),
  info: createToast(BaseToast, "#3498db"),
};
