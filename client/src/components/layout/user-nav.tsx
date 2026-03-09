'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { LogoutButton } from '@/components/shared/logout-button';
import { useUser } from '@/hooks/use-user';
import { useCompany } from '@/context/company-context';
import api from '@/lib/api';

export function UserNav() {
  const { user } = useUser();
  const { companyId, companyName } = useCompany(); // Get current selected company from context


  const imageUrl = companyId ? `${api?.defaults?.baseURL}/uploads/company_images/${companyId}` : null;

  const [imageExists, setImageExists] = useState(false);

useEffect(() => {
  const check = async () => {
    if (!companyId) {
      setImageExists(false);
      return;
    }
    const url = `${api?.defaults?.baseURL}/uploads/company_images/${companyId}`;
    const exists = await checkImageExists(url);
    setImageExists(exists);
  };

  check();
}, [companyId]);

const checkImageExists = (imageUrl: string): Promise<boolean> => {
  return new Promise((resolve) => {
    const img = new Image();

    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);

    img.src = imageUrl;
  });
};

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-9 w-9">
            <AvatarImage src={imageUrl} alt={user?.name || 'user'} data-ai-hint="profile picture" />
            <AvatarFallback>{user?.name?.charAt(0) || 'U'}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user?.name || 'User'}</p>
            <p className="text-xs font-medium leading-none">({companyName || 'Company'})</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user?.email || 'user@example.com'}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <Link href="/admin/company-profile">
            <DropdownMenuItem>
              Profile
            </DropdownMenuItem>
          </Link>
          <Link href="/billing/subscription">
            <DropdownMenuItem>
              Billing
            </DropdownMenuItem>
          </Link>
          <Link href="/admin/settings">
            <DropdownMenuItem>
              Settings
            </DropdownMenuItem>
          </Link>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <LogoutButton>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                Log out
            </DropdownMenuItem>
        </LogoutButton>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
