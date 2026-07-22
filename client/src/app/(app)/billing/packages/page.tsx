'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PackagesPageRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/crm/packages');
  }, [router]);

  return null;
}
