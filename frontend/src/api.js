export const API_BASE = (import.meta.env.VITE_API_BASE || "https://dreamarc-1.onrender.com").replace(/\/$/, "");

export async function fetchToken(username, password) {
  const body = new URLSearchParams();
  body.set("username", username);
  body.set("password", password);

  const response = await fetch(`${API_BASE}/api/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Token request failed: ${response.status} ${text}`);
  }

  return await response.json();
}

export async function registerUser(payload) {
  const response = await fetch(`${API_BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Register failed: ${response.status} ${text}`);
  }

  return await response.json();
}

// Backward-compatible export used by AuthContext
export { registerUser as register };

