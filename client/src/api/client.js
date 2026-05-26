import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 10000,
  withCredentials: true, // This is CRITICAL for the browser to accept and send cookies!
})

// We no longer need the request interceptor for Bearer token because
// withCredentials: true automatically sends the HTTP-only cookie!

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      // If server returns 401, redirect to login
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)

export default api
