import axios from "axios";

// Relative URL: in dev Vite proxies /api to the backend, in Docker nginx does.
const api = axios.create({ baseURL: "/api" });

export const getToken = () => localStorage.getItem("token");

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Expired or invalid session: clear it and send the user to the login page.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !err.config.url.startsWith("/auth/login")) {
      localStorage.removeItem("token");
      window.location.assign("/login");
    }
    return Promise.reject(err);
  }
);

// Message to show the user for any failed request.
export const errorMessage = (err) => err.response?.data?.message || (err.request ? "Cannot reach the server." : err.message);

// POST /query answers with Server-Sent Events. EventSource only supports GET, so we read the
// response body with fetch. Calls handlers.onSources / onToken / onDone / onError as events arrive.
export async function streamQuery(body, handlers, signal) {
  let res;
  try {
    res = await fetch("/api/query", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if (err.name !== "AbortError") handlers.onError("Cannot reach the server.");
    return;
  }

  if (!res.ok) {
    // Validation, auth and rate-limit errors come back as normal JSON, not as a stream.
    if (res.status === 401) {
      localStorage.removeItem("token");
      window.location.assign("/login");
    }
    const data = await res.json().catch(() => ({}));
    handlers.onError(data.message || `Request failed (${res.status})`);
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      // Each SSE message ends with a blank line.
      let end;
      while ((end = buffer.indexOf("\n\n")) >= 0) {
        const block = buffer.slice(0, end);
        buffer = buffer.slice(end + 2);
        const event = /^event: (.*)$/m.exec(block)?.[1];
        const data = /^data: (.*)$/m.exec(block)?.[1];
        if (!event || !data) continue;
        const payload = JSON.parse(data);
        if (event === "sources") handlers.onSources(payload);
        else if (event === "token") handlers.onToken(payload.text);
        else if (event === "done") handlers.onDone(payload);
        else if (event === "error") handlers.onError(payload.message);
      }
    }
  } catch (err) {
    if (err.name !== "AbortError") handlers.onError("The connection was interrupted.");
  }
}

export default api;
