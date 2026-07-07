export type UserRole = 'admin' | 'student' | 'coordinator'

export interface AuthSession {
  role: UserRole
  email: string
  name: string
  department?: string
  rollNumber?: string
}

const STORAGE_KEY = 'placepro-auth'

export function getAuthSession(): AuthSession | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as AuthSession
  } catch {
    return null
  }
}

export function getAuthToken(): string | null {
  return sessionStorage.getItem('placepro-token')
}

export function setAuthSession(session: AuthSession, token: string) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  sessionStorage.setItem('placepro-token', token)
}

export function clearAuthSession() {
  sessionStorage.removeItem(STORAGE_KEY)
  sessionStorage.removeItem('placepro-token')
}

export function getPortalPath(role: UserRole) {
  return `/${role}`
}

export const roleDefaults: Record<UserRole, Omit<AuthSession, 'role'>> = {
  admin: {
    email: 'admin@college.edu',
    name: 'Admin User',
  },
  student: {
    email: 'student@college.edu',
    name: 'Aarav Sharma',
  },
  coordinator: {
    email: 'coordinator-cse@college.edu',
    name: 'CSE Coordinator',
  },
}
