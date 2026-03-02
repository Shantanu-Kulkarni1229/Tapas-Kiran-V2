import axios from "axios";

const API = axios.create({
  baseURL: "https://8vpt6tqg-5000.inc1.devtunnels.ms/api",
  withCredentials: true,
});

export const authHeader = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Intercept requests — attach correct token (admin or user)
API.interceptors.request.use((config) => {
  const adminToken = localStorage.getItem("adminToken");
  const userToken  = localStorage.getItem("token");
  // Admin routes use adminToken; everything else uses user token
  if (adminToken && config.url?.startsWith("/admin")) {
    config.headers.Authorization = `Bearer ${adminToken}`;
  } else if (userToken) {
    config.headers.Authorization = `Bearer ${userToken}`;
  }
  return config;
});

// Intercept responses — handle expired / invalid tokens globally
API.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const expired = error.response?.data?.expired;
    if (status === 401) {
      // Clear all stored tokens and redirect to login
      localStorage.removeItem("token");
      localStorage.removeItem("adminToken");
      if (!window.location.pathname.includes("/login") && !window.location.pathname.includes("/admin")) {
        window.location.href = "/login";
      } else if (window.location.pathname.includes("/admin")) {
        window.location.href = "/admin/login";
      }
    }
    return Promise.reject(error);
  }
);

// ─────────────────────────────────────────────────────────────
// Tapas Kiran AI — Conversation API
// ─────────────────────────────────────────────────────────────

/** List all conversations for the logged-in user */
export const listConversations = (page = 1, limit = 30) =>
  API.get(`/ai/conversations?page=${page}&limit=${limit}`);

/** Create a new empty conversation */
export const createConversation = (title = "New Conversation") =>
  API.post("/ai/conversations", { title });

/** Get a conversation with all its messages */
export const getConversation = (id, msgPage = 1) =>
  API.get(`/ai/conversations/${id}?msgPage=${msgPage}&msgLimit=100`);

/** Rename a conversation */
export const renameConversation = (id, title) =>
  API.patch(`/ai/conversations/${id}`, { title });

/** Pin or unpin a conversation */
export const pinConversation = (id, isPinned) =>
  API.patch(`/ai/conversations/${id}`, { isPinned });

/** Soft-delete a single conversation */
export const deleteConversation = (id) =>
  API.delete(`/ai/conversations/${id}`);

/** Hard-delete ALL conversations */
export const clearAllConversations = () =>
  API.delete("/ai/conversations");

/**
 * Send a chat message.
 * Pass conversationId to continue an existing thread, omit to start new.
 */
export const sendChatMessage = (query, conversationId = null) =>
  API.post("/ai/chat", { query, conversationId });

/** Get AI status / health */
export const getAIStatus = () => API.get("/ai/status");

export default API;
