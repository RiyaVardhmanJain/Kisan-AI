import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const TOKEN_KEY = 'kisan_token';

const api = axios.create({ baseURL: API_URL });

// Attach token to every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const authService = {
    async register(data: {
        name: string;
        phone: string;
        password: string;
        email?: string;
        location?: { state?: string; district?: string; tahsil?: string };
    }) {
        const res = await api.post('/auth/register', data);
        localStorage.setItem(TOKEN_KEY, res.data.token);
        return res.data;
    },

    async login(phone: string, password: string) {
        const res = await api.post('/auth/login', { phone, password });
        localStorage.setItem(TOKEN_KEY, res.data.token);
        return res.data;
    },

    async getMe() {
        const res = await api.get('/auth/me');
        return res.data;
    },

    logout() {
        localStorage.removeItem(TOKEN_KEY);
    },

    getToken() {
        return localStorage.getItem(TOKEN_KEY);
    },

    isLoggedIn() {
        return !!localStorage.getItem(TOKEN_KEY);
    },
};

export { api };
export default authService;
