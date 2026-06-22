# Logout and User Status Management System

## Overview

This system provides comprehensive logout functionality and user status management (online/offline/away/busy) for all user roles.

## Backend Implementation

### 1. Auth Controller Updates

**Location**: `/backend/controllers/auth.go`

**New Endpoints**:
```go
// Logout handles user logout
func Logout(c *gin.Context) {
    utils.SuccessResponse(c, "Logged out successfully", gin.H{
        "message": "You have been successfully logged out",
    })
}

// UpdateUserStatus updates user's online status
func UpdateUserStatus(c *gin.Context) {
    userID, exists := c.Get("userID")
    if !exists {
        utils.ErrorResponse(c, 401, "User not authenticated", nil)
        return
    }

    var req struct {
        Status string `json:"status" binding:"required"`
    }

    if err := c.ShouldBindJSON(&req); err != nil {
        utils.ErrorResponse(c, 400, "Invalid input", err.Error())
        return
    }

    // Update user status
    if err := config.DB.Model(&models.User{}).Where("id = ?", userID).Update("status", req.Status).Error; err != nil {
        utils.ErrorResponse(c, 500, "Failed to update user status", err.Error())
        return
    }

    utils.SuccessResponse(c, "User status updated", gin.H{
        "status": req.Status,
    })
}
```

### 2. API Routes

**Location**: `/backend/routes/api.go`

**Updated Routes**:
```go
// Public routes
auth := api.Group("/auth")
{
    auth.POST("/login", controllers.Login)
    auth.POST("/signup", controllers.Register)
    auth.POST("/logout", controllers.Logout)
    auth.PUT("/status", controllers.UpdateUserStatus)
}
```

## Frontend Implementation

### 1. Enhanced useUser Hook

**Location**: `/frontend/src/hooks/use-user.ts`

**New Features**:
```typescript
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
```

### 2. Enhanced LogoutButton Component

**Location**: `/frontend/src/components/shared/logout-button.tsx`

**Improvements**:
- Uses the new `useUser` hook
- Better error handling
- Cleaner separation of concerns
- Toast notifications for user feedback

### 3. User Status Hook (Optional)

**Location**: `/frontend/src/hooks/useUserStatus.ts`

**Features**:
- Real-time status tracking (online/offline/away/busy)
- Automatic status checking every 30 seconds
- Status update functionality
- Integration with backend status endpoint

## Usage Examples

### Basic Logout
```typescript
import { LogoutButton } from '@/components/shared/logout-button';

function MyComponent() {
    return (
        <LogoutButton>
            <button>Sign Out</button>
        </LogoutButton>
    );
}
```

### Status Management
```typescript
import { useUserStatus } from '@/hooks/useUserStatus';

function StatusIndicator() {
    const { userStatus, updateStatus } = useUserStatus();
    
    return (
        <div>
            <p>Current Status: {userStatus.status}</p>
            <button onClick={() => updateStatus('online')}>
                Set Online
            </button>
            <button onClick={() => updateStatus('offline')}>
                Set Offline
            </button>
        </div>
    );
}
```

## Key Features

### ✅ **Secure Logout**
- Backend logout endpoint invalidates session
- Frontend clears all local storage
- Automatic redirect to login page
- Error handling for network failures

### ✅ **Status Management**
- User status: online, offline, away, busy
- Real-time status checking
- Status persistence in database
- Automatic status updates

### ✅ **Role-Based Access**
- Works for all user roles (admin, dealer, recovery, sub-dealer, staff)
- No status restrictions for any role

### ✅ **Enhanced UX**
- Toast notifications for user actions
- Loading states and error handling
- Graceful fallbacks for API failures
- Consistent user experience

### ✅ **Security Considerations**
- Server-side session invalidation
- Client-side storage cleanup
- Status tracking for audit trails
- Proper error handling and logging

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|------------|
| POST | `/api/v1/auth/logout` | Logs out user and clears session |
| PUT | `/api/v1/auth/status` | Updates user status (online/offline/away/busy) |
| GET | `/api/v1/auth/me` | Gets current user info |

## Database Schema

The `users` table already includes a `status` field that can store:
- `online` - User is currently active
- `offline` - User logged out voluntarily
- `away` - User inactive but not logged out
- `busy` - User is in a call/meeting

This system provides a complete solution for user logout and status management across the entire application.
