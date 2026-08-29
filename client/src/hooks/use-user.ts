'use client';

import api from '@/lib/api';
import type { User } from '@/lib/types';
import { useState, useEffect, useCallback } from 'react';

type UserState = User | undefined | null;

let cachedUser: UserState = undefined;
let fetchPromise: Promise<UserState> | null = null;
let currentLoading = false;
const listeners = new Set<(user: UserState) => void>();
const loadingListeners = new Set<(loading: boolean) => void>();

function notifyListeners(user: UserState) {
  cachedUser = user;
  listeners.forEach((fn) => fn(user));
}

function setLoading(loading: boolean) {
  currentLoading = loading;
  loadingListeners.forEach((fn) => fn(loading));
}

// Reset the shared user cache to "unknown" (undefined) so the next mount
// re-fetches the authed user instead of reading a stale value. This is called
// right after a fresh login so a page mounted immediately after navigation
// doesn't read a leftover `null` and bounce the user back out.
export function resetUserCache() {
  cachedUser = undefined;
  fetchPromise = null;
  setLoading(false);
}

function fetchUser(): Promise<UserState> {
  if (fetchPromise) return fetchPromise;

  const token = localStorage.getItem('token');
  if (!token) {
    notifyListeners(null);
    return Promise.resolve(null);
  }

  setLoading(true);
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
      setLoading(false);
    });

  return fetchPromise;
}

export function useUser() {
  const [user, setUser] = useState<UserState>(cachedUser);
  const [loading, setLoadingState] = useState<boolean>(currentLoading);

  useEffect(() => {
    if (cachedUser !== undefined) {
      setUser(cachedUser);
    }

    const listener = (u: UserState) => setUser(u);
    listeners.add(listener);

    const loadingListener = (l: boolean) => setLoadingState(l);
    loadingListeners.add(loadingListener);

    if (cachedUser === undefined || (cachedUser === null && typeof window !== 'undefined' && localStorage.getItem('token'))) {
      fetchUser();
    }

    return () => {
      listeners.delete(listener);
      loadingListeners.delete(loadingListener);
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

  return { user, loading, logout, updateStatus };
}
