// src/api/errors.js
export function getErrorMessage(error, fallback = "Something went wrong") {
  const detail = error.response?.data?.detail;
  if (!detail) return fallback;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    // Pydantic validation error array — take the first message
    return detail[0]?.msg || fallback;
  }
  return fallback;
}