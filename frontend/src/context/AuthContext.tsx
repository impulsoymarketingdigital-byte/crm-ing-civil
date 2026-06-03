import { createContext, useContext, useState, type ReactNode } from 'react'

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  tenantId: string
  permissions: string[]
  isSuperAdmin?: boolean
}

interface Tenant {
  id: string
  name: string
  slug: string
  plan: string
  taxId?: string
  bankAccount?: string
  bankAccountType?: string
}

interface AuthContextType {
  user: User | null
  tenant: Tenant | null
  token: string | null
  login: (token: string, user: User, tenant: Tenant) => void
  logout: () => void
  updateTenant: (tenant: Tenant) => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

function safeParse<T>(key: string): T | null {
  try {
    const v = localStorage.getItem(key)
    return v ? JSON.parse(v) : null
  } catch {
    localStorage.removeItem(key)
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'))
  const [user, setUser] = useState<User | null>(() => safeParse<User>('user'))
  const [tenant, setTenant] = useState<Tenant | null>(() => safeParse<Tenant>('tenant'))

  const login = (t: string, u: User, ten: Tenant) => {
    localStorage.setItem('token', t)
    localStorage.setItem('user', JSON.stringify(u))
    localStorage.setItem('tenant', JSON.stringify(ten))
    setToken(t)
    setUser(u)
    setTenant(ten)
  }

  const logout = () => {
    localStorage.clear()
    setToken(null)
    setUser(null)
    setTenant(null)
  }

  const updateTenant = (ten: Tenant) => {
    localStorage.setItem('tenant', JSON.stringify(ten))
    setTenant(ten)
  }

  return (
    <AuthContext.Provider value={{ user, tenant, token, login, logout, updateTenant, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
