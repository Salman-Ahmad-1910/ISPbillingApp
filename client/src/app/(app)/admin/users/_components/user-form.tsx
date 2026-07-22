'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMemo, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, EyeOff } from 'lucide-react';
import type { User, Role } from '@/lib/types';
import { userSchema } from '@/lib/schemas';
import { Loader2 } from 'lucide-react';


type UserFormValues = z.infer<typeof userSchema>;

interface UserFormProps {
  user: User | null;
  roles: Role[];
  onSave: (data: UserFormValues) => void;
  onCancel: () => void;
  isSaving?: boolean;
}

export function UserForm({ user, roles, onSave, onCancel, isSaving }: UserFormProps) {
  const isEditMode = !!user;
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      contact1: '',
      contact2: '',
      role: '',
      status: 'active',
      id: '',
    },
  });

  // Log form errors to console for debugging
  const errors = form.formState.errors;
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      console.log('UserForm Validation Errors:', errors);
    }
  }, [errors]);

  // Set form values when editing a user
  useEffect(() => {
    if (user) {
      form.reset({
        name: user.name || '',
        email: user.email || '',
        password: '', // Never populate password in edit mode
        contact1: user.contact1 || '',
        contact2: user.contact2 || '',
        role: user.role || '',
        status: user.status || 'active',
        id: user.id,
      });
    } else {
      // Reset to empty defaults for add user
      form.reset({
        name: '',
        email: '',
        password: '',
        contact1: '',
        contact2: '',
        role: '',
        status: 'active',
        id: '',
      });
    }
  }, [user, form]);

  function onSubmit(values: UserFormValues) {
    console.log('UserForm - onSubmit triggered with values:', values);
    onSave(values);
  }

  const onInvalid = (errors: any) => {
    console.error('UserForm - Validation failed:', errors);
  };

  // Default role options
  const defaultRoles = [
    { id: 'manager', name: 'Manager' },
    { id: 'recovery_officer', name: 'Recovery Officer' },
    { id: 'dealer', name: 'Dealer' },
    { id: 'staff', name: 'Staff' },
  ];

  // Combine default roles with API roles, remove duplicates
  const allRoles = useMemo(() => {
    const roleNames = new Set();
    const combined = [...defaultRoles];

    // Add API roles that aren't already in default roles
    roles.forEach(role => {
      if (!roleNames.has(role.name)) {
        combined.push(role);
        roleNames.add(role.name);
      }
    });

    // Add default roles to set for deduplication
    defaultRoles.forEach(role => {
      roleNames.add(role.name);
    });

    return combined;
  }, [roles]);

  // ... rest of the component
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-4">
        {/* Hidden field for ID to ensure it is registered in the form */}
        <FormField
          control={form.control}
          name="id"
          render={({ field }) => (
            <input type="hidden" {...field} value={field.value || ''} />
          )}
        />

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., John Doe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="e.g., john.doe@example.com"
                  {...field}
                  disabled={isEditMode}
                  className={isEditMode ? 'bg-gray-100' : ''}
                />
              </FormControl>
              <FormMessage />
              {isEditMode && (
                <p className="text-xs text-muted-foreground">Email cannot be changed in edit mode</p>
              )}
            </FormItem>
          )}
        />

        {/* Password field - only show for new users */}
        {!isEditMode && (
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter password (min 6 characters)"
                      {...field}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="contact1"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contact 1</FormLabel>
                <FormControl>
                  <Input placeholder="Primary contact number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="contact2"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contact 2</FormLabel>
                <FormControl>
                  <Input placeholder="Secondary contact number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Role</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {allRoles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving} className="bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-sm hover:from-emerald-600 hover:to-green-700">
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSaving ? 'Saving...' : (user ? 'Update User' : 'Create User')}
          </Button>
        </div>
      </form>
    </Form>
  );
}
