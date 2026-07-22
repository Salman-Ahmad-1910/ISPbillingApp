'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';

export type UserStatus = 'online' | 'offline' | 'away' | 'busy';

interface UserStatusState {
  status: UserStatus;
  lastSeen: Date | null;
  isOnline: boolean;
}

export function useUserStatus() {
  const [userStatus, setUserStatus] = useState<UserStatusState>({
    status: 'offline',
    lastSeen: null,
    isOnline: false,
  });

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await api.get('/auth/status');
        if (response.data) {
          setUserStatus({
            status: response.data.status,
            lastSeen: new Date(),
            isOnline: response.data.status === 'online',
          });
        }
      } catch (error) {
        console.error('Failed to check user status:', error);
      }
    };

    // Check status immediately on mount
    checkStatus();

    // Set up periodic status checks
    const interval = setInterval(checkStatus, 30000); // Check every 30 seconds

    // Cleanup on unmount
    return () => {
      clearInterval(interval);
    };
  }, []);

  const updateStatus = async (newStatus: UserStatus) => {
    try {
      await api.put('/auth/status', { status: newStatus });
      setUserStatus(prev => ({
        ...prev,
        status: newStatus,
        isOnline: newStatus === 'online',
      }));
    } catch (error) {
      console.error('Failed to update user status:', error);
    }
  };

  return { userStatus, updateStatus };
}
