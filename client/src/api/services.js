import api from './client'

// ── Auth ──────────────────────────────────────────────────────────
export const authApi = {
  register:       (data)           => api.post('/auth/register', data),
  login:          (data)           => api.post('/auth/login', data),
  getMe:          ()               => api.get('/auth/me'),
  updateMe:       (data)           => api.patch('/auth/me', data),
  changePassword: (data)           => api.patch('/auth/me/password', data),
}

// ── Quizzes ───────────────────────────────────────────────────────
export const quizApi = {
  getAll:     (params)             => api.get('/quizzes', { params }),
  get:        (id)                 => api.get(`/quizzes/${id}`),
  create:     (data)               => api.post('/quizzes', data),
  update:     (id, data)           => api.patch(`/quizzes/${id}`, data),
  delete:     (id)                 => api.delete(`/quizzes/${id}`),
  duplicate:  (id)                 => api.post(`/quizzes/${id}/duplicate`),
}

// ── Questions ─────────────────────────────────────────────────────
export const questionApi = {
  getAll:   (quizId)               => api.get(`/quizzes/${quizId}/questions`),
  create:   (quizId, data)         => api.post(`/quizzes/${quizId}/questions`, data),
  update:   (quizId, qId, data)    => api.patch(`/quizzes/${quizId}/questions/${qId}`, data),
  delete:   (quizId, qId)          => api.delete(`/quizzes/${quizId}/questions/${qId}`),
  reorder:  (quizId, questions)    => api.patch(`/quizzes/${quizId}/questions/reorder`, { questions }),
}

// ── Sessions ──────────────────────────────────────────────────────
export const sessionApi = {
  getAll:      (params)            => api.get('/sessions', { params }),
  get:         (id)                => api.get(`/sessions/${id}`),
  create:      (quizId)            => api.post('/sessions', { quizId }),
  delete:      (id)                => api.delete(`/sessions/${id}`),
  lookupCode:  (code)              => api.get(`/sessions/join/${code}`),
  leaderboard: (id)                => api.get(`/sessions/${id}/leaderboard`),
  results:     (id)                => api.get(`/sessions/${id}/results`),
}
