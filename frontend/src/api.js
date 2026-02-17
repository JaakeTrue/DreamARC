export const API_BASE = (import.meta.env.VITE_API_BASE || "https://dreamarc-1.onrender.com").replace(/\/$/, "");

// Added fetchToken function
export const fetchToken = async (username, password) => {
  const response = await fetch(`${API_BASE}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ username, password }),
  });
  if (!response.ok) throw new Error("Login failed");
  return response.json();
};

// Added register function
export const register = async (userData) => {
  const response = await fetch(`${API_BASE}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(userData),
  });
  if (!response.ok) throw new Error("Registration failed");
  return response.json();
};