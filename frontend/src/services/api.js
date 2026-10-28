// frontend/src/services/api.js
import axios from 'axios';

// Create configured Axios instance
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request Interceptor: Attach JWT Token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle Authentication Expiry
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Session expired or unauthorized
      if (!window.location.pathname.includes('/login')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login?expired=true';
      }
    }
    return Promise.reject(error);
  }
);

// ==============================================================================
// API SERVICE METHODS
// ==============================================================================

export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getProfile: () => api.get('/auth/me')
};

export const claimsAPI = {
  getAll: (params) => api.get('/claims', { params }),
  getById: (id) => api.get(`/claims/${id}`),
  create: (formData) => api.post('/claims', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  bulkImport: (formData) => api.post('/claims/bulk-import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  update: (id, formData) => api.put(`/claims/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  review: (id, reviewData) => api.patch(`/claims/${id}/review`, reviewData),
  getStats: () => api.get('/claims/stats/summary')
};

export const policyAPI = {
  getAll: (params) => api.get('/policies', { params }),
  create: (policyData) => api.post('/policies', policyData),
  update: (id, policyData) => api.put(`/policies/${id}`, policyData),
  delete: (id) => api.delete(`/policies/${id}`)
};

export const rpaAPI = {
  getStatus: () => api.get('/rpa/status'),
  exportToBot: (params) => api.post('/rpa/export', params),
  importResults: () => api.post('/rpa/import'),
  simulateBot: () => api.post('/rpa/simulate'),
  resetBatch: () => api.post('/rpa/reset-batch')
};

export const auditAPI = {
  getLogs: (params) => api.get('/audit', { params })
};

export const reportAPI = {
  downloadExcelReport: () => api.get('/reports/export', { responseType: 'blob' })
};

export const monitoringAPI = {
  getSummary: () => api.get('/monitoring/summary'),
  getRuns: (params) => api.get('/monitoring/runs', { params })
};

export const aiAPI = {
  generateClaimSummary: (claimId) => api.post(`/claims/${claimId}/ai-summary`)
};

export default api;
