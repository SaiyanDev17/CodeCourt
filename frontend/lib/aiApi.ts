/**
 * Axios API Client for FastAPI AI Service
 * 
 * This file creates a lightweight Axios instance for the AI service.
 * Unlike lib/api.ts (Express backend), this client is intentionally simple:
 * - No automatic token refresh (AI service doesn't manage auth)
 * - No complex interceptors (AI service is stateless)
 * - No cookie handling (AI service doesn't use cookies)
 * 
 * Why a separate instance instead of reusing lib/api.ts?
 * 1. Different base URLs (Express :5000 vs FastAPI :8000)
 * 2. Different authentication patterns (Express uses JWT refresh, AI doesn't)
 * 3. Different error handling (FastAPI returns different error formats)
 * 4. Separation of concerns (clear distinction between services)
 * 5. Independent scaling (can add AI-specific config without affecting Express)
 */

import axios from 'axios'

/**
 * Create the AI Service Axios Instance
 * 
 * This is a simple, stateless HTTP client for the AI service.
 * It's pre-configured with:
 * - baseURL: Points to our FastAPI AI service
 * - timeout: 30 seconds (AI requests can take longer due to LLM processing)
 */
const aiApi = axios.create({
  // Base URL for all AI service requests
  // In production: NEXT_PUBLIC_AI_API_URL = https://ai.codecourt.com
  // In development: defaults to http://localhost:8000
  baseURL: process.env.NEXT_PUBLIC_AI_API_URL || 'http://localhost:8000',
  
  // Timeout for AI requests (30 seconds)
  // AI requests can take longer than typical API calls because:
  // 1. LLM inference takes time (Groq API call)
  // 2. Agent tool-calling loop may make multiple backend calls
  // 3. Hint generation requires context analysis
  // 
  // Default Axios timeout is 0 (no timeout), but we set 30s to prevent hanging
  timeout: 30000,
  
  // Headers for all requests
  headers: {
    'Content-Type': 'application/json',
  },
})

/**
 * Export the configured Axios instance
 * 
 * Usage in components:
 * 
 * ```tsx
 * import aiApi from '@/lib/aiApi'
 * 
 * // Request a hint from the AI service
 * const response = await aiApi.post('/hint', {
 *   user_id: userId,
 *   problem_id: problemId,
 *   user_code: code,
 *   problem_description: description,
 * })
 * 
 * const { hint, hints_used } = response.data
 * ```
 * 
 * Note: Authentication is handled by the Express backend proxy.
 * The frontend calls POST /api/agent/hint (Express), which then
 * proxies to POST /hint (FastAPI). This keeps auth logic centralized.
 */
export default aiApi
