import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) { config.headers.Authorization = `Bearer ${token}`; }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authService = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  getMe: () => api.get('/auth/me'),
};

export const tableService = {
  getAll: () => api.get('/tables'),
  getById: (id) => api.get(`/tables/${id}`),
  create: (data) => api.post('/tables', data),
  update: (id, data) => api.put(`/tables/${id}`, data),
  delete: (id) => api.delete(`/tables/${id}`),
  uploadImage: (id, formData) =>
    api.post(`/tables/${id}/image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

export const rowService = {
  getByTable: (tableId, search = null) => {
    const params = search ? { search } : {};
    return api.get(`/tables/${tableId}/rows`, { params });
  },
  create: (tableId, data) => api.post(`/tables/${tableId}/rows`, data),
  update: (tableId, rowId, data) => api.put(`/tables/${tableId}/rows/${rowId}`, data),
  delete: (tableId, rowId) => api.delete(`/tables/${tableId}/rows/${rowId}`),
  uploadImages: (tableId, rowId, formData) =>
    api.post(`/tables/${tableId}/rows/${rowId}/images`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  deleteImage: (tableId, rowId, imageIndex) =>
    api.delete(`/tables/${tableId}/rows/${rowId}/images/${imageIndex}`),
};
