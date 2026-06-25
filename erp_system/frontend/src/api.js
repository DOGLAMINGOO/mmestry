import axios from 'axios'
import { ACCESS_TOKEN, REFRESH_TOKEN } from './constants'

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL
})

let isRefreshing = false
let refreshSubscribers = []
let refreshSubscribersReject = []

const onRefreshed = (token) => {
    refreshSubscribers.forEach((callback) => callback(token))
    refreshSubscribers = []
    refreshSubscribersReject = []
}

const onRefreshedError = (error) => {
    refreshSubscribersReject.forEach((reject) => reject(error))
    refreshSubscribers = []
    refreshSubscribersReject = []
}

const addRefreshSubscriber = (resolve, reject) => {
    refreshSubscribers.push(resolve)
    refreshSubscribersReject.push(reject)
}

const refreshAccessToken = async () => {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN)
    if (!refreshToken) {
        throw new Error('No refresh token available')
    }

    const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/token/refresh/`,
        { refresh: refreshToken }
    )

    const newAccessToken = response.data.access
    if (!newAccessToken) {
        throw new Error('Refresh response did not include access token')
    }

    localStorage.setItem(ACCESS_TOKEN, newAccessToken)
    return newAccessToken
}

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem(ACCESS_TOKEN)
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }
        return config
    },
    (error) => Promise.reject(error)
)

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const status = error.response?.status
        const data = error.response?.data
        const originalRequest = error.config

        const invalidTokenError =
            status === 401 &&
            typeof data === 'object' &&
            (data.detail?.toString().toLowerCase().includes('token') ||
                data.detail?.toString().toLowerCase().includes('credentials') ||
                data.code === 'token_not_valid')

        if (!originalRequest || originalRequest._retry) {
            return Promise.reject(error)
        }

        if (invalidTokenError || status === 401 || status === 403) {
            if (!isRefreshing) {
                isRefreshing = true
                try {
                    const newToken = await refreshAccessToken()
                    onRefreshed(newToken)
                } catch (refreshError) {
                    onRefreshedError(refreshError)
                    localStorage.removeItem(ACCESS_TOKEN)
                    localStorage.removeItem(REFRESH_TOKEN)
                    if (window.location.pathname !== '/login') {
                        window.location.href = '/login'
                    }
                    return Promise.reject(refreshError)
                } finally {
                    isRefreshing = false
                }
            }

            return new Promise((resolve, reject) => {
                addRefreshSubscriber(
                    (token) => {
                        originalRequest._retry = true
                        originalRequest.headers.Authorization = `Bearer ${token}`
                        resolve(api(originalRequest))
                    },
                    (refreshError) => reject(refreshError)
                )
            })
        }

        return Promise.reject(error)
    }
)

export default api