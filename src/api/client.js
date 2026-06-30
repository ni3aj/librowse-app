import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { DeviceEventEmitter } from "react-native";
import { API_BASE_URL } from "../constants/config";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

const PUBLIC_ROUTES = ["/auth/send-otp", "/auth/verify-otp"];

apiClient.interceptors.request.use(
  async (config) => {
    const isPublicRoute = PUBLIC_ROUTES.some((route) =>
      config.url.includes(route),
    );

    if (isPublicRoute) {
      return config;
    }

    const token = await AsyncStorage.getItem("jwt_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

apiClient.interceptors.response.use(
  (response) => {
    console.log("✅ Response Received:", response.data);
    return response;
  },
  async (error) => {
    if (error.response && error.response.status === 401) {
      console.warn("Global Interceptor: Token expired! Logging user out.");
      await AsyncStorage.removeItem("jwt_token");

      DeviceEventEmitter.emit("UNAUTHORIZED_LOGOUT");
    }
    return Promise.reject(error);
  },
);

export default apiClient;
