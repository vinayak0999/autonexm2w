import axios from 'axios';

// API URL from environment variable (defaults to localhost for dev)
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Create axios instance with configuration
const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000, // 30 second timeout
    headers: {
        'Content-Type': 'application/json',
    }
});

// Simple in-memory cache for GET requests
const cache = new Map();
const CACHE_TTL = 30000; // 30 seconds

// Add Token to every request automatically
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        console.error('Request error:', error);
        return Promise.reject(error);
    }
);

// Response interceptor with caching for GET requests
api.interceptors.response.use(
    (response) => {
        // Cache successful GET responses
        if (response.config.method === 'get' && response.config.cache !== false) {
            const cacheKey = response.config.url;
            cache.set(cacheKey, {
                data: response.data,
                timestamp: Date.now()
            });
        }
        return response;
    },
    (error) => {
        // Network error (no response)
        if (!error.response) {
            console.error('Network Error - No response from server');
            error.isNetworkError = true;
        }

        // Timeout error
        if (error.code === 'ECONNABORTED') {
            console.error('Request timeout');
            error.isTimeout = true;
        }

        // Auth error - logout if 401
        if (error.response?.status === 401) {
            console.error('Unauthorized - token may be invalid');
        }

        return Promise.reject(error);
    }
);

// Helper to get cached data
api.getCached = async (url, config = {}) => {
    const cacheKey = url;
    const cached = cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return { data: cached.data, fromCache: true };
    }

    return api.get(url, config);
};

// Clear cache (call after mutations)
api.clearCache = () => {
    cache.clear();
};

export default api;
