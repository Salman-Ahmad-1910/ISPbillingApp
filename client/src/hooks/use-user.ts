'use client';

import api from '@/lib/api';
import type { User } from '@/lib/types';
import { useState, useEffect, useCallback } from 'react';

type UserState = User | undefined | null;

let cachedUser: UserState = undefined;
let fetchPromise: Promise<UserState> | null = null;
const listeners = new Set<(user: UserState) => void>();

function notifyListeners(user: UserState) {
  cachedUser = user;
  listeners.forEach((fn) => fn(user));
}

function fetchUser(): Promise<UserState> {
  if (fetchPromise) return fetchPromise;

  const token = localStorage.getItem('token');
  if (!token) {
    notifyListeners(null);
    return Promise.resolve(null);
  }

  fetchPromise = api
    .get('/auth/me')
    .then((res) => {
      const user = res.data.data;
      notifyListeners(user);
      return user as UserState;
    })
    .catch((error) => {
      console.error('Auth check failed:', error);
      localStorage.removeItem('token');
      localStorage.removeItem('companies');
      localStorage.removeItem('selectedCompany');
      notifyListeners(null);
      return null as UserState;
    })
    .finally(() => {
      fetchPromise = null;
    });

  return fetchPromise;
}

export function useUser() {
  const [user, setUser] = useState<UserState>(cachedUser);

  useEffect(() => {
    if (cachedUser !== undefined) {
      setUser(cachedUser);
    }

    const listener = (u: UserState) => setUser(u);
    listeners.add(listener);

    if (cachedUser === undefined || (cachedUser === null && typeof window !== 'undefined' && localStorage.getItem('token'))) {
      fetchUser();
    }

    return () => {
      listeners.delete(listener);
    };
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout', {});
    } catch {
      // ignore
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('companies');
      localStorage.removeItem('selectedCompany');
      notifyListeners(null);
      window.location.href = '/login';
    }
  }, []);

  const updateStatus = useCallback(async (status: 'online' | 'offline' | 'away') => {
    const response = await api.put('/auth/status', { status });
    return response.data;
  }, []);

  return { user, logout, updateStatus };
}
