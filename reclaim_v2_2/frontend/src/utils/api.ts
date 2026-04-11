// In production, VITE_API_URL is set to the Railway backend URL.
// In local dev, it falls back to localhost:8001.
const BASE = (import.meta.env.VITE_API_URL || "http://localhost:8001") + "/api";

function getToken() {
  return localStorage.getItem("reclaim_token");
}

async function request(path: string, options: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    let msg = `Request failed: ${res.status}`;
    try {
      const err = await res.json();
      msg = err.detail || err.message || msg;
    } catch {}
    throw new Error(msg);
  }

  return res.json();
}

async function upload(path: string, file: File) {
  const token = getToken();
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (!res.ok) {
    let msg = `Upload failed: ${res.status}`;
    try { const e = await res.json(); msg = e.detail || msg; } catch {}
    throw new Error(msg);
  }
  return res.json();
}

export const api = {
  // Auth
  login: (data: { email: string; password: string }) =>
    request("/auth/login", { method: "POST", body: JSON.stringify(data) }),
  signup: (data: { store_name: string; email: string; password: string }) =>
    request("/auth/signup", { method: "POST", body: JSON.stringify(data) }),
  me: () => request("/auth/me"),

  // Settings
  updateSettings: (data: any) =>
    request("/settings", { method: "PUT", body: JSON.stringify(data) }),
  confirmSenderVerified: () =>
    request("/settings/confirm-sender-verified", { method: "POST" }),
  resendSenderVerification: () =>
    request("/settings/verify-sender", { method: "POST" }),

  // Customers
  getCustomers: () => request("/customers"),
  uploadCustomers: (file: File) => upload("/customers/upload", file),
  deleteCustomer: (id: number) => request(`/customers/${id}`, { method: "DELETE" }),

  // Campaign
  runCampaign: () => request("/campaign/run", { method: "POST" }),
  previewMessage: (data: { customer_id: number; touchpoint_number: number; channel: string }) =>
    request("/campaign/preview", { method: "POST", body: JSON.stringify(data) }),
  sendMessage: (data: any) =>
    request("/campaign/send", { method: "POST", body: JSON.stringify(data) }),

  // Analytics
  getAnalytics: () => request("/analytics"),

  // Logs
  getLogs: () => request("/logs"),

  // Admin
  adminOverview: () => request("/admin/overview"),
  adminRetailers: () => request("/admin/retailers"),
  adminCustomers: () => request("/admin/customers"),
  adminLogs: () => request("/admin/logs"),
};
