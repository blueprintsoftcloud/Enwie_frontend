import axios from "axios";
import { domainUrl } from "./constant";
import { getCsrfToken } from "./csrf";

// Plain axios instance — no auto-refresh/retry interceptors.
// Used for requests that should NOT trigger the auto-refresh loop (e.g. auth/status).
const apiPlain = axios.create({
  baseURL: domainUrl,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

apiPlain.interceptors.request.use((config) => {
  const token = getCsrfToken();
  if (token) config.headers["X-CSRF-Token"] = token;
  return config;
});

export default apiPlain;
