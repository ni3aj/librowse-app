import { useAuthStore } from "@/store/authStore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import * as Location from "expo-location";
import { router } from "expo-router";
import { API_BASE_URL } from "../constants/config";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

const PUBLIC_ROUTES = ["/auth/send-otp", "/auth/verify-otp"];

// 📌 Global Memory Cache (Prevents reading from disk/GPS on every single request)
let cachedDeviceId = null;
let cachedLocation = null;

// Helper: Generates a persistent, safe Device ID
const getDeviceId = async () => {
  if (cachedDeviceId) return cachedDeviceId; // Return instantly if already in memory

  try {
    const storedId = await AsyncStorage.getItem("device_instance_id");
    if (storedId) {
      cachedDeviceId = storedId;
    } else {
      // Create a random ID for this app installation
      const newId = `dev_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      await AsyncStorage.setItem("device_instance_id", newId);
      cachedDeviceId = newId;
    }
  } catch (e) {
    cachedDeviceId = "unknown_device";
  }
  return cachedDeviceId;
};

// Helper: Fast Location Fetcher
const getFastLocation = async () => {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();

    // Only attempt if they already gave permission
    if (status === "granted") {
      // 📌 CRITICAL: Use getLastKnownPositionAsync.
      // It is INSTANT. getCurrentPositionAsync will freeze your API calls!
      const location = await Location.getLastKnownPositionAsync();

      if (location) {
        cachedLocation = {
          lat: location.coords.latitude,
          lng: location.coords.longitude,
        };
      }
    }
  } catch (error) {
    // Silently ignore if location services are disabled
  }
  return cachedLocation;
};

apiClient.interceptors.request.use(
  async (config) => {
    // 1. Authorization Logic
    const isPublicRoute = PUBLIC_ROUTES.some((route) =>
      config.url.includes(route),
    );
    if (!isPublicRoute) {
      const token = useAuthStore.getState().jwt_token;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    // 2. Telemetry / Anti-Fraud Headers
    try {
      const deviceId = await getDeviceId();
      if (deviceId) {
        config.headers["X-Device-ID"] = deviceId;
      }

      // We run this asynchronously but it's near-instant due to the caching
      const loc = await getFastLocation();
      if (loc) {
        config.headers["X-Latitude"] = loc.lat.toString();
        config.headers["X-Longitude"] = loc.lng.toString();
      }
    } catch (e) {
      console.warn("Failed to attach telemetry headers");
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    if (error.response && error.response.status === 401) {
      console.warn("Global Interceptor: Token expired! Logging user out.");
      await AsyncStorage.clear();
      router.replace("/");
    }
    return Promise.reject(error);
  },
);

export default apiClient;
