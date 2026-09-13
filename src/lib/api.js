const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

async function request(path, options = {}) {
  if (!API_BASE)
    throw new Error("The shared API is not configured. Set VITE_API_BASE_URL.");
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: { "content-type": "application/json", ...(options.headers || {}) },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(body.error || `Request failed (${response.status})`);
  return body;
}

export const api = {
  configured: Boolean(API_BASE),
  products: ({
    page = 1,
    pageSize = 12,
    search = "",
    category = "",
    room = "",
  } = {}) => {
    const query = new URLSearchParams({
      page,
      pageSize,
      search,
      category,
      room,
    });
    return request(`/api/products?${query}`);
  },
  createEnquiry: (payload) =>
    request("/api/enquiries", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  admin: (path) => request(`/api/admin${path}`),
  adminAction: (path, payload) =>
    request(`/api/admin${path}`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};
