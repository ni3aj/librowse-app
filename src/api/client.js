import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { router } from "expo-router";
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

    if (!isPublicRoute) {
      const token = await AsyncStorage.getItem("jwt_token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// --- RESPONSE INTERCEPTOR ---
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    if (__DEV__) {
      if (error.response) {
        console.log(
          `❌ [API ERROR] ${error.config?.method?.toUpperCase()} ${error.config?.url} | Status: ${error.response.status}`,
        );
        console.log(`📄 [ERROR DATA]`, error.response.data);
      } else {
        console.log(`🛑 [API NETWORK/TIMEOUT ERROR]`, error.message);
      }
    }

    if (error.response && error.response.status === 401) {
      console.warn("Global Interceptor: Token expired! Logging user out.");
      await AsyncStorage.clear();
      router.replace("/");
    }

    return Promise.reject(error);
  },
);

export default apiClient;
