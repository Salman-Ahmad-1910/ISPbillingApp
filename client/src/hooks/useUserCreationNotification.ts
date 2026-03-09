'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useUser } from './use-user';

interface UserCreationData {
  name?: string;
  email?: string;
  password?: string;
  phone?: string;
  role?: string;
  company?: string;
  createdAt?: string;
}

interface UserCreationContextType {
  showNotification: (userData: UserCreationData) => void;
  notificationData: UserCreationData | null;
  isOpen: boolean;
  onClose: () => void;
}

const UserCreationContext = createContext<UserCreationContextType | undefined>(undefined);

export function useUserCreationNotification() {
  const context = useContext(UserCreationContext);
  if (context === undefined) {
    throw new Error('useUserCreationNotification must be used within a UserCreationProvider');
  }
  return context;
}

interface UserCreationProviderProps {
  children: ReactNode;
}

export function UserCreationProvider({ children }: UserCreationProviderProps) {
  const [notificationData, setNotificationData] = useState<UserCreationData | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useUser();

  const showNotification = (userData: UserCreationData) => {
    setNotificationData(userData);
    setIsOpen(true);
  };

  const onClose = () => {
    setIsOpen(false);
    // Don't clear notification data immediately to allow fade out animation
    setTimeout(() => setNotificationData(null), 300);
  };

  // Don't show notifications for admin users
  const shouldShowNotification = user?.role !== 'admin' && user?.role !== 'owner';

  const value: UserCreationContextType = {
    showNotification: shouldShowNotification ? showNotification : () => {},
    notificationData: shouldShowNotification ? notificationData : null,
    isOpen: shouldShowNotification ? isOpen : false,
    onClose: shouldShowNotification ? onClose : () => {},
  };

  return React.createElement(
    UserCreationContext.Provider,
    { value },
    children
  );
}
