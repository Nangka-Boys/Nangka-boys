import axios from 'axios';

// Dynamically resolve hostname so mobile phones, tablets, or other desktop machines
// on the same LAN or port-forwarded tunnel automatically connect to the right backend host
const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    // When opened from another device (e.g. 10.1.0.101 or ngrok/tunnel domain),
    // point to the same host on backend port 5000
    return `http://${hostname}:5000/api`;
  }
  return 'http://localhost:5000/api';
};

export const getMediaBaseUrl = () => {
  if (typeof window !== 'undefined') {
    return `http://${window.location.hostname}:5000`;
  }
  return 'http://localhost:5000';
};

const api = axios.create({
  baseURL: getApiBaseUrl(),
});

// Automatically inject JWT token from localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('dapitan_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Automatically handle account suspension in real-time
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 403 && error.response.data?.account_suspended) {
      localStorage.removeItem('dapitan_token');
      alert('Your account has been suspended by an administrator. You have been logged out.');
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

export default api;
