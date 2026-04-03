// Zustand store for authentication state
import { create } from 'zustand'

interface User {
  id: string
  username: string
  email: string
  role: string
}

interface AuthState {
  user: User | null
  accessToken: string | null
  setUser: (user: User | null) => void
  setAccessToken: (token: string | null) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  setUser: (user) => set({ user }),
  setAccessToken: (token) => set({ accessToken: token }),
  logout: () => set({ user: null, accessToken: null }),
}))
