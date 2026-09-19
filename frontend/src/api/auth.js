import api from "./axios";

// 👉 Adjust these paths to match your FastAPI router prefixes.
// These match a typical FastAPI + OAuth2PasswordBearer + JWT setup.

export const loginUser = (username, password) => {
  // FastAPI's OAuth2PasswordRequestForm expects FORM-ENCODED data,
  // not JSON — this is the #1 gotcha when connecting React to FastAPI auth.
  const formData = new URLSearchParams();
  formData.append("username", username);
  formData.append("password", password);

  // Expected response: { access_token: "...", token_type: "bearer" }
  // (add "refresh_token" too if your backend issues one)
  return api.post("/auth/login", formData, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
};

export const registerUser = (username, email, password) => {
  // Registration endpoints are usually plain JSON in FastAPI (this one
  // isn't part of the OAuth2 spec, so you control the shape).
  return api.post("/auth/register", { username, email, password });
};
