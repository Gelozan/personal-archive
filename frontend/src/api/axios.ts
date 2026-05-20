import axios from "axios";
import { useAuthStore } from "@/store/authStore";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
let queue: Array<(token: string) => void> = [];

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    original._retry = true;

    if (isRefreshing) {
      return new Promise((resolve) => {
        queue.push((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          resolve(axios(original));
        });
      });
    }

    isRefreshing = true;

    try {
      const refreshToken = useAuthStore.getState().refreshToken;
 const baseUrl = import.meta.env.VITE_API_URL;
const { data } = await axios.post(
  `${baseUrl}/api/v1/auth/refresh`, // Убрали лишний дубль /api/v1, если он уже есть в baseUrl
  { refresh_token: refreshToken }
);

      useAuthStore.getState().setAuth(data.access_token, data.refresh_token);
      queue.forEach((cb) => cb(data.access_token));
      queue = [];

      original.headers.Authorization = `Bearer ${data.access_token}`;
      return axios(original);
    } catch {
      useAuthStore.getState().clearAuth();
      window.location.href = "/login";
      return Promise.reject(error);
    } finally {
      isRefreshing = false;
    }
  }
);