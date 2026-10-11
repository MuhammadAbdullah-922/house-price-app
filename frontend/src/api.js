import axios from "axios";

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000", timeout: 20000 });

api.interceptors.request.use((c) => {
  const t = localStorage.getItem("hp_token");
  if (t) c.headers.Authorization = `Bearer ${t}`;
  return c;
});

api.interceptors.response.use((r) => r, (e) => {
  const url = e.config?.url || "";
  if (e.response?.status === 401 && !url.startsWith("/auth")) {
    localStorage.removeItem("hp_token");
    localStorage.removeItem("hp_user");
    window.location.href = "/login";
  }
  return Promise.reject(e);
});

export const errMsg = (e) => {
  const d = e.response?.data?.detail;
  if (Array.isArray(d)) return d[0]?.msg || "Please check the values you entered.";
  if (typeof d === "string") return d;
  return "Cannot reach the server. Start the backend with: uvicorn main:app --reload";
};

export const usd = (n) => "$" + Math.round(n).toLocaleString("en-US");
export default api;