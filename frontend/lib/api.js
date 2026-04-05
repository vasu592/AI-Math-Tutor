import axios from 'axios';
import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = Cookies.get('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      Cookies.remove('token');
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;

// Auth
export const register = (data) => api.post('/api/auth/register', data).then(r => r.data);
export const login = (data) => api.post('/api/auth/login', data).then(r => r.data);
export const getMe = () => api.get('/api/auth/me').then(r => r.data);

// Chapters
export const getChapters = () => api.get('/api/chapters').then(r => r.data);
export const getChapterMastery = (slug) => api.get(`/api/chapters/${slug}/mastery`).then(r => r.data);
export const getChapterDetails = (slug) => api.get(`/api/chapters/${slug}`).then(r => r.data);
export const getTodayRecap = () => api.get('/api/chapters/recap/today').then(r => r.data);

// Sessions
export const startSession = (chapter_slug) => api.post('/api/session/start', { chapter_slug }).then(r => r.data);
export const getSessionState = (id) => api.get(`/api/session/${id}/state`).then(r => r.data);
export const getQuestions = (id) => api.post(`/api/session/${id}/questions`).then(r => r.data);
export const submitAnswer = (id, answer, input_mode = 'text') =>
  api.post(`/api/session/${id}/answer`, { answer, input_mode }).then(r => r.data);
export const endSession = (id) => api.post(`/api/session/${id}/end`).then(r => r.data);
export const getSessionSummary = (id) => api.get(`/api/session/${id}/summary`).then(r => r.data);

// Voice
export const transcribeAudio = (blob) => {
  const form = new FormData();
  form.append('audio', blob, 'recording.webm');
  return api.post('/api/voice/transcribe', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data);
};

// Admin
export const getAdminSegments = (password) =>
  api.get('/api/admin/segments', { headers: { 'x-admin-password': password } }).then(r => r.data);
export const saveAdminSegments = (password, data) =>
  api.post('/api/admin/segments', data, { headers: { 'x-admin-password': password } }).then(r => r.data);
