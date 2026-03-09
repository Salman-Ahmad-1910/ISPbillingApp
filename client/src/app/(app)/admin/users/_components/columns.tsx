'use client';

import { type ColumnDef } from '@tanstack/react-table';
import type { User } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { AvatarImage } from '@radix-ui/react-avatar';

interface UserColumnsProps {
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
  onChangeStatus: (user: User) => void;
  currentUserRole?: string;
}

export const getColumns = ({ onEdit, onDelete, onChangeStatus, currentUserRole }: UserColumnsProps): ColumnDef<User>[] => [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => (
        <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
                {/* <AvatarImage src={`https://picsum.photos/seed/${row.original.id}/40/40`} /> */}
                <AvatarFallback>{row.original.name?.charAt(0) || 'U'}</AvatarFallback>
            </Avatar>
            <div>
                <div className="font-medium">{row.original.name || '-'}</div>
                <div className="text-sm text-muted-foreground">{row.original.email || '-'}</div>
            </div>
        </div>
    ),
  },
  {
    accessorKey: 'role',
    header: 'Role',
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.original.status;
      return (
        <Badge
          variant={
            status === 'active'
              ? 'default'
              : 'secondary'
          }
          className={status === 'active' ? 'bg-green-600' : ''}
        >
          {status || '-'}
        </Badge>
      );
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const user = row.original;
      
      // Define permissions based on current user role
      const canEdit = currentUserRole === 'admin' || currentUserRole === 'owner';
      const canDelete = currentUserRole === 'admin' || currentUserRole === 'owner';
      const canChangeStatus = currentUserRole === 'admin' || currentUserRole === 'owner' || currentUserRole === 'manager';
      
      return (
        <div className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              
              {/* Edit action - only for admins */}
              {canEdit && (
                <DropdownMenuItem onClick={() => onEdit(user)}>
                  Edit user
                </DropdownMenuItem>
              )}
              
              {/* Change role - only for admins */}
              {/* {canEdit && (
                <DropdownMenuItem>Change role</DropdownMenuItem>
              )} */}
              
              {/* Status change - for admins and managers */}
              {canChangeStatus && (
                <>
                  {canEdit && <DropdownMenuSeparator />}
                  {user.status === 'active' ? (
                    <DropdownMenuItem className="text-destructive" onClick={() => onChangeStatus(user)}>
                      Deactivate user
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={() => onChangeStatus(user)}>
                      Activate user
                    </DropdownMenuItem>
                  )}
                </>
              )}
              
              {/* Delete action - only for admins */}
              {canDelete && canChangeStatus && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive" onClick={() => onDelete(user)}>
                    Delete user
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];
