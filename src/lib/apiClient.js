import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle token expiration
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  async login(email, password, role = 'user') {
    const response = await apiClient.post('/auth/login', { email, password, role });
    if (response.data.accessToken) {
      localStorage.setItem('accessToken', response.data.accessToken);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  async me() {
    const response = await apiClient.get('/users/me');
    return response.data;
  },

  logout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
  },
};

// Generic Entity API creator
function createEntityAPI(endpoint) {
  return {
    async list(orderBy = 'created_at', limit = 100, offset = 0) {
      const response = await apiClient.get(endpoint, {
        params: { limit, offset }
      });
      return response.data;
    },

    async filter(filters = {}, orderBy = 'created_at', limit = 100) {
      const response = await apiClient.get(endpoint, {
        params: { ...filters, limit }
      });
      return response.data;
    },

    async get(id) {
      const response = await apiClient.get(`${endpoint}/${id}`);
      return response.data;
    },

    async create(data) {
      const response = await apiClient.post(endpoint, data);
      return response.data;
    },

    async update(id, data) {
      const response = await apiClient.put(`${endpoint}/${id}`, data);
      return response.data;
    },

    async delete(id) {
      const response = await apiClient.delete(`${endpoint}/${id}`);
      return response.data;
    },
  };
}

// Entity APIs
export const PledgeAPI = createEntityAPI('/pledges/pledges');
export const PledgeSessionAPI = createEntityAPI('/pledges/sessions');
export const PledgeExecutionRecordAPI = createEntityAPI('/pledges/executions');
export const PledgeAccessRequestAPI = createEntityAPI('/pledges/access-requests');
export const FundTransactionAPI = createEntityAPI('/funds/transactions');
export const FeatureConfigAPI = {
  async list() {
    const response = await apiClient.get('/features');
    return response.data;
  },
  async get(key) {
    const response = await apiClient.get(`/features/${key}`);
    return response.data;
  },
};

export default apiClient;
