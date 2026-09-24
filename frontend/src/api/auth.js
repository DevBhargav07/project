import api from "./axios";

// 👉 Adjust these paths to match your FastAPI router prefixes.
// These match a typical FastAPI + OAuth2PasswordBearer + JWT setup.

export const loginUser = (email, password) => {
  // FastAPI's OAuth2PasswordRequestForm expects FORM-ENCODED data,
  // not JSON — this is the #1 gotcha when connecting React to FastAPI auth.
  const formData = new URLSearchParams();
  formData.append("username", email);
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

// Fetches the list of all users. Requires a valid JWT — the axios
// interceptor in ./axios.js attaches it automatically.
// Expected response: an array like
// [{ id: 1, username: "neo", email: "neo@zion.io" }, ...]
export const getAllUsers = () => {
  return api.get("/users/");
};

// Returns the currently logged-in user's own profile: username, email,
// created_at, groups, permissions, is_superuser.
export const getMyProfile = () => {
  return api.get("/users/me")
}



// Deletes a user by ID. Requires delete_users permission (or superuser)
// on the backend — the button is also hidden on the frontend unless
// the current user has that permission, but the backend check is
// what actually enforces it.
// export const deleteUser = (userId) => {
//   return api.delete(`/users/${userId}`);
// };


// List all available groups (for the assign-group functions)
export const getAllGroups= () => {
  return api.get("/users/groups");
}

// Update which groups for a specific user belogs to
export const updateUserGroups= (user_id, groupIds) => {
  return api.put(`/users/${user_id}/groups`, { group_ids: groupIds})
}

export const getUserDetail = (userId) => api.get(`/users/${userId}`);

export const getGroupsDetailed = () => api.get("/users/admin/groups");
export const createGroup = (name, permissionIds) =>
  api.post("/users/admin/groups", { name, permission_ids: permissionIds });
export const deleteGroup = (groupId) => api.delete(`/users/admin/groups/${groupId}`);

export const getAllPermissions = () => api.get("/users/admin/permissions");
export const createPermission = (codename, name, modelName, description) =>
  api.post("/users/admin/permissions", {
    codename,
    name,
    model_name: modelName,
    description,
  });