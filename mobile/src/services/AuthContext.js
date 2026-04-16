import React, {createContext, useContext, useState, useEffect} from 'react';
import {StorageService} from './StorageService';
import api from './api';

const AuthContext = createContext(null);

export function AuthProvider({children}) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    restoreSession();
  }, []);

  const restoreSession = async () => {
    try {
      const token = await StorageService.getItem('token');
      if (token) {
        const res = await api.get('/api/auth/me');
        setUser(res.data.user);
      }
    } catch {
      await StorageService.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const res = await api.post('/api/auth/login', {email, password});
    await StorageService.setItem('token', res.data.token);
    setUser(res.data.user);
  };

  const register = async (name, email, password) => {
    const res = await api.post('/api/auth/register', {name, email, password});
    await StorageService.setItem('token', res.data.token);
    setUser(res.data.user);
  };

  const logout = async () => {
    await StorageService.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{user, loading, login, register, logout}}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
