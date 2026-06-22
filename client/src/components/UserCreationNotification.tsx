'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Copy, Eye, EyeOff, Check, X, User, Mail, Lock, Phone, Building, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface UserCreationNotificationProps {
  isOpen: boolean;
  onClose: () => void;
  userData: UserCreationData | null;
  currentUserRole?: string;
}

export function UserCreationNotification({ 
  isOpen, 
  onClose, 
  userData, 
  currentUserRole 
}: UserCreationNotificationProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const { toast } = useToast();

  // Auto-hide after 30 seconds
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        onClose();
      }, 30000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      toast({
        title: "Copied!",
        description: `${fieldName} copied to clipboard`,
      });
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const formatRole = (role: string) => {
    const roleMap: { [key: string]: string } = {
      'admin': 'Administrator',
      'dealer': 'Dealer',
      'recovery_officer': 'Recovery Officer',
      'sub_dealer': 'Sub-Dealer',
      'staff': 'Staff'
    };
    return roleMap[role] || role;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Don't show notification for admin users or if no user data
  if (currentUserRole === 'admin' || !userData) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-green-600" />
            User Account Created Successfully
          </DialogTitle>
          <DialogDescription>
            A new user account has been created with the following details.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* User Basic Info */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <User className="h-4 w-4" />
              User Information
            </h4>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Name:</span>
                <span className="text-sm font-semibold">{userData?.name || 'N/A'}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Role:</span>
                <span className="text-sm font-semibold">{userData?.role ? formatRole(userData.role) : 'N/A'}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Phone:</span>
                <span className="text-sm font-semibold">{userData?.phone || 'N/A'}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Company:</span>
                <span className="text-sm font-semibold">{userData?.company || 'N/A'}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Created:</span>
                <span className="text-sm font-semibold">{userData?.createdAt ? formatDate(userData.createdAt) : 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Login Credentials */}
          <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
            <h4 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Login Credentials
            </h4>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-red-700">Email:</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono bg-white px-2 py-1 rounded border">{userData?.email || 'N/A'}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => userData?.email && copyToClipboard(userData.email, 'Email')}
                    className="h-8 w-8 p-0"
                  >
                    {copiedField === 'Email' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-red-700">Password:</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono bg-white px-2 py-1 rounded border">
                    {showPassword && userData?.password ? userData.password : '•••••••••••'}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPassword(!showPassword)}
                    className="h-8 w-8 p-0"
                  >
                    {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => userData?.password && copyToClipboard(userData.password, 'Password')}
                    className="h-8 w-8 p-0"
                  >
                    {copiedField === 'Password' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Important Instructions
            </h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Share these credentials securely with the user</li>
              <li>• User should change password on first login</li>
              <li>• Save these details for future reference</li>
              <li>• This popup will auto-close in 30 seconds</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="flex justify-between items-center">
          <div className="text-xs text-gray-500">
            Auto-closes in 30 seconds
          </div>
          <Button onClick={onClose} className="min-w-[100px]">
            Okay
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
