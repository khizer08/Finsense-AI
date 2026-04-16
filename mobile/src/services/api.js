import axios from "axios";
import { StorageService } from "./StorageService";

// ─── Base URL ────────────────────────────────────────────────────────────────
// Android emulator  → http://10.0.2.2:3000
// Real device       → http://<YOUR_LOCAL_IP>:3000
// iOS simulator     → http://localhost:3000
export const BASE_URL = "http://192.168.0.5:3000";

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
    return Promise.reject(err);
  },
);

export default api;
