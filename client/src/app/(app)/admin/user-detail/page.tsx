'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function UserDetailRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/crm/subscriber-detail');
  }, [router]);

  return null;
}
