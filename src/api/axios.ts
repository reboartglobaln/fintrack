import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request Interceptor: Attach JWT Token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('fintrack_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Handle Token Expiration and Errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      // Only clear and redirect if not actively trying to login or register
      if (!url.includes('/auth/login') && !url.includes('/auth/register')) {
        localStorage.removeItem('fintrack_token');
        localStorage.removeItem('fintrack_user');
        window.dispatchEvent(new Event('fintrack_auth_logout'));
      }
    }
    return Promise.reject(error);
  }
);

export default api;
