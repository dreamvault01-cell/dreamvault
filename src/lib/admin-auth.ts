import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

/**
 * Server-side helper to enforce admin access.
 * Call this at the top of any admin server component or API route.
 * Redirects non-admin users to the homepage.
 */
export async function requireAdmin() {
  const user = await currentUser();

  if (!user) {
    redirect('/sign-in?redirect_url=/admin');
  }

  const role = (user.publicMetadata as { role?: string })?.role;

  if (role !== 'admin') {
    redirect('/');
  }

  return user;
}

/**
 * Server-side helper for API routes (throws instead of redirecting).
 */
export async function requireAdminApi() {
  const user = await currentUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  const role = (user.publicMetadata as { role?: string })?.role;

  if (role !== 'admin') {
    throw new Error('Forbidden');
  }

  return user;
}
