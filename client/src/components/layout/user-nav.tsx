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
import { useTheme } from 'next-themes';
import { LogoutButton } from '@/components/shared/logout-button';
import { useUser } from '@/hooks/use-user';
import { useCompany } from '@/context/company-context';
import api from '@/lib/api';
import { Sun, Moon } from 'lucide-react';

export function UserNav() {
  const { user } = useUser();
  const { companyId, companyName } = useCompany(); // Get current selected company from context
  const { theme, setTheme } = useTheme();


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
            <AvatarImage src={imageUrl || undefined} alt={user?.name || 'user'} data-ai-hint="profile picture" />
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
          {/* <Link href="/billing/subscription">
            <DropdownMenuItem>
              Billing
            </DropdownMenuItem>
          </Link>
          <Link href="/admin/settings">
            <DropdownMenuItem>
              Settings
            </DropdownMenuItem>
          </Link> */}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            <Sun className="mr-2 h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="mr-2 h-4 w-4 absolute rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </DropdownMenuItem>
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
