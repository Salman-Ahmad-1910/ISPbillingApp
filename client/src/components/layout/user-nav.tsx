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
import { Sun, Moon, User, LogOut } from 'lucide-react';

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
        <Button variant="ghost" className="relative h-8 w-8 rounded-full ring-1 ring-emerald-500/20 hover:ring-emerald-500/40 transition-all duration-300">
          <Avatar className="h-9 w-9">
            <AvatarImage src={imageUrl || undefined} alt={user?.name || 'user'} data-ai-hint="profile picture" />
            <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-green-600 text-white text-xs">{user?.name?.charAt(0) || 'U'}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 border shadow-lg" align="end" forceMount>
        <DropdownMenuLabel className="font-normal bg-gradient-to-r from-emerald-500/10 to-green-500/5 rounded-t-lg">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user?.name || 'User'}</p>
            <p className="text-xs font-medium leading-none text-emerald-600 dark:text-emerald-400">({companyName || 'Company'})</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user?.email || 'user@example.com'}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <Link href="/admin/company-profile">
            <DropdownMenuItem className="cursor-pointer transition-all duration-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:text-emerald-600 dark:hover:text-emerald-400 focus:bg-emerald-50 dark:focus:bg-emerald-950/30 data-[highlighted]:text-emerald-600 dark:data-[highlighted]:text-emerald-400">
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
          </Link>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="cursor-pointer transition-all duration-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:text-emerald-600 dark:hover:text-emerald-400 focus:bg-emerald-50 dark:focus:bg-emerald-950/30 data-[highlighted]:text-emerald-600 dark:data-[highlighted]:text-emerald-400">
            <Sun className="mr-2 h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-amber-500" />
            <Moon className="mr-2 h-4 w-4 absolute rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-blue-500" />
            <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <LogoutButton>
          <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="cursor-pointer transition-all duration-200 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-400 focus:bg-red-50 dark:focus:bg-red-950/30 text-red-600 dark:text-red-400 data-[highlighted]:text-red-600 dark:data-[highlighted]:text-red-400">
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
          </DropdownMenuItem>
        </LogoutButton>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
