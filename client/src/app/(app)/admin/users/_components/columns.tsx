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
    accessorKey: 'id',
    header: 'ID',
    cell: ({ row }) => (
      <div className="text-xs font-mono text-muted-foreground">
        {row.original.id}
      </div>
    ),
  },
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => {
      const user = row.original;
      const isSubUser = user.level === 1;
      const isParent = user.isParent;
      
      return (
        <div className="flex items-center gap-2">
          {isSubUser && (
            <div className="w-4 h-4 border-l-2 border-b-2 border-muted-foreground ml-2"></div>
          )}
          <Avatar className="h-8 w-8">
            {/* <AvatarImage src={`https://picsum.photos/seed/${user.id}/40/40`} /> */}
            <AvatarFallback>{user.name?.charAt(0) || 'U'}</AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium flex items-center gap-2">
              {user.name || '-'}
              {isParent && (
                <Badge variant="secondary" className="text-xs">
                  Parent User
                </Badge>
              )}
              {isSubUser && (
                <Badge variant="outline" className="text-xs">
                  Sub User
                </Badge>
              )}
            </div>
            <div className="text-sm text-muted-foreground">{user.email || '-'}</div>
            {user.isOrphaned && (
              <div className="text-xs text-orange-600">Parent not accessible</div>
            )}
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: 'role',
    header: 'Role',
  },
  {
    accessorKey: 'relationship',
    header: 'Relationship',
    cell: ({ row }) => {
      const user = row.original;
      if (user.isParent && user.subUsers && user.subUsers.length > 0) {
        return (
          <div className="text-sm">
            <div className="font-medium">Parent</div>
            <div className="text-muted-foreground">{user.subUsers.length} sub-users</div>
          </div>
        );
      }
      if (user.level === 1 && user.parentId) {
        const parent = row.original.parent; // This would need to be populated in the data
        return (
          <div className="text-sm text-muted-foreground">
            Sub-user of {parent?.name || 'Unknown'}
          </div>
        );
      }
      return <div className="text-sm text-muted-foreground">-</div>;
    },
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
                <DropdownMenuItem onClick={() => onEdit(user)} className="data-[highlighted]:text-emerald-600">
                  Edit user
                </DropdownMenuItem>
              )}

              {/* Change role - only for admins */}
              {/* {canEdit && (
                <DropdownMenuItem>Change role</DropdownMenuItem>
              )} */}

              {/* Status change - for admins and managers */}
              {/* {canChangeStatus && (
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
              )} */}

              {/* Delete action - only for admins */}
              {canDelete && canChangeStatus && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive data-[highlighted]:text-red-600" onClick={() => onDelete(user)}>
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
