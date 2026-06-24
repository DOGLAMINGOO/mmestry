import axios from 'axios'
import { ACCESS_TOKEN } from "./constants"

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL
})

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem(ACCESS_TOKEN);
        if (token){
            config.headers.Authorization = `Bearer ${token}`
        }
        return config  
    },
    (error) => {
        return Promise.reject(error)
    }
)

api.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error.response?.status;
        const data = error.response?.data;

        if (status === 401 || status === 403) {
            const invalidTokenError =
                typeof data === 'object' &&
                (data.detail?.toString().toLowerCase().includes('token') ||
                 data.detail?.toString().toLowerCase().includes('credentials') ||
                 data.code === 'token_not_valid');

            if (invalidTokenError || status === 401) {
                localStorage.removeItem(ACCESS_TOKEN);
                localStorage.removeItem('refresh');
                if (window.location.pathname !== '/login') {
                    window.location.href = '/login';
                }
            }
        }

        return Promise.reject(error);
    }
)

export default api