import axios from "axios";

// 👉 CHANGE THIS to your FastAPI backend's base URL
export const BASE_URL = "http://127.0.0.1:8000";

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// ---- Attach the access token to every outgoing request ----
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ---- Auto-refresh the access token if it has expired (401) ----
// OPTIONAL. Most simple FastAPI setups just issue ONE access token
// with a longer expiry and don't bother with a separate refresh
// endpoint. If that's you, ignore/delete this block entirely —
// login/register still work fine without it.
//
// If you DO have a refresh endpoint (e.g. POST /auth/refresh that
// takes a refresh_token and returns a new access_token), this will
// use it automatically whenever a request comes back 401.
let isRefreshing = false;
let pendingQueue = [];

const processQueue = (error, token = null) => {
  pendingQueue.forEach((p) => {
    if (error) p.reject(error);
    else p.resolve(token);
  });
  pendingQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response &&
      error.response.status === 401 &&
      !originalRequest._retry &&
      localStorage.getItem("refresh_token")
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refresh_token = localStorage.getItem("refresh_token");
        // 👉 Adjust this path/body to match your FastAPI refresh route
        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, {
          refresh_token,
        });

        localStorage.setItem("access_token", data.access_token);
        api.defaults.headers.Authorization = `Bearer ${data.access_token}`;
        processQueue(null, data.access_token);

        originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        window.location.href = "/login";
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
