'use client';

import api from '@/lib/api';
import type { User } from '@/lib/types';
import { useState, useEffect } from 'react';

export function useUser() {
  const [user, setUser] = useState<User | undefined | null>(undefined); // undefined: loading, null: no user

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.get('/auth/me')
        .then(res => {
          console.log('User data from API:', res.data.data);
          setUser(res.data.data); // Extract correct user data
        })
        .catch((error) => {
          console.error('Auth check failed:', error);
          // Clear expired token and redirect to login
          localStorage.removeItem('token');
          localStorage.removeItem('companies');
          localStorage.removeItem('selectedCompany');
          setUser(null);
          // Only redirect if not already on login/signup pages
          if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/signup')) {
            window.location.href = '/login';
          }
        });
    } else {
      setUser(null);
    }
  }, []);

  const logout = async () => {
    try {
      // Call backend logout
      await api.post('/auth/logout', {});
      
      // Update user status to offline
      await api.put('/auth/status', { status: 'offline' });
      
      // Clear local storage
      localStorage.removeItem('token');
      localStorage.removeItem('companies');
      localStorage.removeItem('selectedCompany');
      
      // Clear user state
      setUser(null);
      
      // Redirect to login page
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
      // Even if API call fails, clear local storage and redirect
      localStorage.removeItem('token');
      localStorage.removeItem('companies');
      localStorage.removeItem('selectedCompany');
      setUser(null);
      window.location.href = '/login';
    }
  };

  const updateStatus = async (status: 'online' | 'offline' | 'away') => {
    try {
      const response = await api.put('/auth/status', { status });
      console.log('Status updated:', response.data);
      return response.data;
    } catch (error) {
      console.error('Status update error:', error);
      throw error;
    }
  };

  return { user, logout, updateStatus };
}
