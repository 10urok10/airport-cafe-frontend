import { createContext, useContext, useState } from 'react';
import { apiFetch, getToken, setToken, clearToken } from '../api/client';

const AuthContext = createContext(null);

const USER_KEY = 'airport_cafe_user';

function loadStoredUser() {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function AuthProvider({ children }) {
  // Baslangic degeri: sayfa yenilendiginde (F5) localStorage'da token/kullanici
  // varsa oradan okuyoruz, boylece oturum kaybolmuyor.
  const [user, setUser] = useState(loadStoredUser);
  const [token, setTokenState] = useState(getToken);

  async function login(pinCode) {
    const data = await apiFetch('/auth/login', { method: 'POST', body: { pinCode }, skipAuth: true });
    setToken(data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    setTokenState(data.token);
    setUser(data.user);
  }

  function logout() {
    clearToken();
    localStorage.removeItem(USER_KEY);
    setTokenState(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: Boolean(token) }}>
      {children}
    </AuthContext.Provider>
  );
}

// Component'lerin "const { user, login } = useAuth()" seklinde kullanacagi kisayol.
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth, AuthProvider icinde kullanilmali.');
  }
  return ctx;
}
