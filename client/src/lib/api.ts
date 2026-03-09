import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BACKEND_URL || '',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      // Add company ID header for multi-tenancy
      const selectedCompanyId = localStorage.getItem('selectedCompanyId');
      if (selectedCompanyId) {
        config.headers['x-company-id'] = selectedCompanyId;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle authentication errors globally
    if (error.response?.status === 401) {
      const errorMessage = error.response?.data?.message || '';
      if (errorMessage.includes('expired') || errorMessage.includes('invalid') || errorMessage.includes('Unauthorized')) {
        // Clear expired tokens and redirect to login
        if (typeof window !== 'undefined') {
          console.log('Token expired, clearing and redirecting to login');
          localStorage.removeItem('token');
          localStorage.removeItem('companies');
          localStorage.removeItem('selectedCompany');
          localStorage.removeItem('selectedCompanyId');
          // Only redirect if not already on auth pages
          if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/signup')) {
            window.location.href = '/login';
          }
        }
      }
    }

    // Handle company access errors
    if (error.response?.status === 403) {
      const errorMessage = error.response?.data?.message || '';
      if (errorMessage.includes('company') || errorMessage.includes('access denied')) {
        // Clear invalid company selection
        if (typeof window !== 'undefined') {
          localStorage.removeItem('selectedCompanyId');
          // Redirect to login page instead of non-existent company-select page
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
