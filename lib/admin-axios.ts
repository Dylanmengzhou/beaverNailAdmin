import axios from "axios";
import { handleExpiredAdminSession } from "./admin-session";
const client = axios.create();
client.interceptors.request.use((config) => {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (typeof window !== "undefined" && error.config?.url) {
      handleExpiredAdminSession(
        new URL(error.config.url, window.location.origin),
        error.response?.status,
      );
    }
    return Promise.reject(error);
  },
);
export default client;
