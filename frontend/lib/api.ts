// Axios instance for Express API
import axios from 'axios'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
  withCredentials: true,
})

// Request interceptor to attach Bearer token
api.interceptors.request.use((config) => {
  // Token attachment will be implemented in Phase 4
  return config
})

// Response interceptor for auto-refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Auto-refresh logic will be implemented in Phase 4
    return Promise.reject(error)
  }
)

export default api
