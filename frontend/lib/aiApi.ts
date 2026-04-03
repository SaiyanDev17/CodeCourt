// Axios instance for FastAPI AI Service
import axios from 'axios'

const aiApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_AI_URL || 'http://localhost:8000',
})

export default aiApi
