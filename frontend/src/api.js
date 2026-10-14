const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || 'Request failed');
  }
  return response.status === 204 ? null : response.json();
}

export const api = {
  users: () => request('/users'),
  createUser: (data) => request('/users', { method: 'POST', body: JSON.stringify(data) }),
  deleteUser: (id) => request(`/users/${id}`, { method: 'DELETE' }),
  menu: () => request('/menu'),
  createMenu: (data) => request('/menu', { method: 'POST', body: JSON.stringify(data) }),
  deleteMenu: (id) => request(`/menu/${id}`, { method: 'DELETE' }),
  orders: () => request('/orders'),
  createOrder: (data) => request('/orders', { method: 'POST', body: JSON.stringify(data) }),
  updateOrder: (id, data) => request(`/orders/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteOrder: (id) => request(`/orders/${id}`, { method: 'DELETE' }),
  bill: (userId, from, to) => request(`/bills/${userId}?from=${from}&to=${to}`),
};
