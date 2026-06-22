# User Creation Notification System

## Overview

When a new user is created (for all roles except admin), a popup notification appears showing the user's account information including email, password, and other details.

## Components

### 1. UserCreationNotification Component
**Location**: `/src/components/UserCreationNotification.tsx`

**Features**:
- Displays user information (name, role, phone, company, creation date)
- Shows login credentials (email, password) with copy functionality
- Password visibility toggle (show/hide)
- Auto-dismisses after 30 seconds
- Copy-to-clipboard functionality with visual feedback
- Important instructions for admin

### 2. UserCreationNotification Hook
**Location**: `/src/hooks/useUserCreationNotification.ts`

**Features**:
- Context provider for managing notification state
- Prevents notifications for admin users
- Provides showNotification function to trigger notifications
- Auto-cleanup of notification data

### 3. Integration Example

The system is integrated into the dealers page:

```typescript
// In your component that creates users:
import { UserCreationProvider } from '@/hooks/useUserCreationNotification';
import { useUserCreationNotification } from '@/hooks/useUserCreationNotification';

function UserManagementPage() {
    const { showNotification } = useUserCreationNotification();
    
    const handleCreateUser = async (userData) => {
        // Create user via API
        await api.post('/users', userData);
        
        // Show notification with user details
        showNotification({
            name: userData.name,
            email: userData.email,
            password: userData.password,
            phone: userData.phone,
            role: userData.role,
            company: 'Company Name',
            createdAt: new Date().toISOString()
        });
    };
    
    return (
        <UserCreationProvider>
            {/* Your existing UI */}
            <UserCreationNotification />
        </UserCreationProvider>
    );
}
```

## Notification Features

### Visual Design
- **User Info Section**: Gray background with user icon
- **Credentials Section**: Red background with lock icon for security
- **Instructions Section**: Blue background with calendar icon
- **Auto-dismiss**: Timer showing 30-second countdown

### Functionality
- **Copy Email**: Copies email to clipboard with checkmark feedback
- **Copy Password**: Copies password to clipboard with checkmark feedback
- **Show/Hide Password**: Toggle password visibility
- **Manual Close**: Okay button to dismiss immediately
- **Auto Close**: Automatic dismissal after 30 seconds

### Security Considerations
- Password is masked by default (•••••••••••)
- Clear visual separation between user info and credentials
- Instructions for secure sharing
- Admin-only exclusion (no notifications for admin role)

### Usage Guidelines

1. **Wrap your page** with `UserCreationProvider`
2. **Call `showNotification()`** after successful user creation
3. **Include user details**: name, email, password, role, phone, company
4. **Add notification component**: `<UserCreationNotification />`

### Customization

The component can be easily customized:
- Modify colors and styling in the component
- Add/remove fields from UserCreationData interface
- Adjust auto-dismiss timer
- Change role restrictions
- Add company name fetching logic

This system provides a professional way to share newly created user credentials with administrators while maintaining security best practices.
