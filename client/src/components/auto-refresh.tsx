'use client';

import { useEffect } from 'react';

/**
 * Forces a single reload when a new build is detected, so users always get
 * the latest deployed version without manually clearing the cache.
 */
export function AutoRefresh() {
  useEffect(() => {
    try {
      const script = document.querySelector('script[src*="_next/static"]');
      const src = script?.getAttribute('src') ?? '';
      if (!src) return;
      const key = 'app_build_src';
      const prev = localStorage.getItem(key);
      if (prev && prev !== src) {
        localStorage.setItem(key, src);
        window.location.reload();
      } else if (!prev) {
        localStorage.setItem(key, src);
      }
    } catch {
      // ignore
    }
  }, []);
  return null;
}
