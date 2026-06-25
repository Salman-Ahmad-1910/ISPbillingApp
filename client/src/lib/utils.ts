import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Resolve a backend-stored image path (e.g. "/uploads/product_images/abc.png")
 * to a fully-qualified URL using the configured backend base URL.
 */
export function backendImageUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (/^https?:\/\//i.test(path)) return path;
  const base = process.env.NEXT_PUBLIC_BACKEND_URL || '';
  return `${base}${path.startsWith('/') ? '' : '/'}${path}`;
}

