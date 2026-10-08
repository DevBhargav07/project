import api from "./axios";

export const getChatUsers = () => api.get("/chat/users");
export const getConversations = () => api.get("/chat/conversations");
export const openDirectConversation = (userId) =>
  api.post("/chat/conversations/direct", { user_id: userId });
export const getMessages = (conversationId) =>
  api.get(`/chat/conversations/${conversationId}/messages`);
export const markConversationRead = (conversationId) =>
  api.post(`/chat/conversations/${conversationId}/read`);