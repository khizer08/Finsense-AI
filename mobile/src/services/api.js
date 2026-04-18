import axios from "axios";
import { NativeModules, Platform } from "react-native";
import { StorageService } from "./StorageService";

// ─── Base URL ────────────────────────────────────────────────────────────────
// Android emulator  → http://10.0.2.2:3000
// Real device       → http://<YOUR_LOCAL_IP>:3000
// iOS simulator     → http://localhost:3000

const FALLBACK_DEVICE_URL = "http://192.168.0.5:3000";

function resolveBaseUrl() {
  const scriptURL = NativeModules?.SourceCode?.scriptURL;
  const metroHost = scriptURL?.match(/^https?:\/\/([^/:]+)(?::\d+)?/i)?.[1];

  if (metroHost) {
    if (
      Platform.OS === "android" &&
      (metroHost === "localhost" || metroHost === "127.0.0.1")
    ) {
      return "http://10.0.2.2:3000";
    }

    return `http://${metroHost}:3000`;
  }

  return FALLBACK_DEVICE_URL;
}

export const BASE_URL = resolveBaseUrl();

console.log("[API] Using base URL:", BASE_URL);

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000,
  headers: { "Content-Type": "application/json" },
});

// ─── Request interceptor: attach JWT ────────────────────────────────────────
api.interceptors.request.use(async (config) => {
  const token = await StorageService.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Response interceptor: clear token on 401 ───────────────────────────────
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401) {
      await StorageService.removeItem("token");
    }

    if (!err.response && err.message === "Network Error") {
      err.message = `Cannot reach backend at ${BASE_URL}. Make sure the backend server is running and your phone is on the same Wi-Fi as this computer.`;
    }

    return Promise.reject(err);
  },
);

export default api;
