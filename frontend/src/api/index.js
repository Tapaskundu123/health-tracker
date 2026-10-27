import api from './client';

// Get today's date string in the user's local timezone
export function getLocalToday() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Auth
export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
};

// Habits
export const habitsApi = {
  list: (archived = false) => api.get(`/habits?archived=${archived}`),
  create: (data) => api.post('/habits', data),
  update: (id, data) => api.put(`/habits/${id}`, data),
  delete: (id) => api.delete(`/habits/${id}`),
  archive: (id) => api.post(`/habits/${id}/archive`),
  restore: (id) => api.post(`/habits/${id}/restore`),
};

// Completions
export const completionsApi = {
  getForHabit: (habitId, params) =>
    api.get(`/habits/${habitId}/completions`, { params: { ...params, today: getLocalToday() } }),
  markComplete: (habitId, date) =>
    api.post(`/habits/${habitId}/completions/complete`, { date, today: getLocalToday() }),
  unmark: (habitId, date) =>
    api.delete(`/habits/${habitId}/completions/complete/${date}`),
};

// Stats
export const statsApi = {
  get: () => api.get(`/stats?today=${getLocalToday()}`),
};
