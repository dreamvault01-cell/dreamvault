import 'server-only';

import { currentUser } from '@clerk/nextjs/server';
import prisma from './prisma';

/** Resolve the signed-in Clerk identity to the local customer row used by Prisma. */
export async function getCurrentCustomer() {
  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const email = (clerkUser.primaryEmailAddress?.emailAddress
    ?? clerkUser.emailAddresses[0]?.emailAddress
    ?? `${clerkUser.id}@customer.invalid`).trim().toLowerCase();

  return prisma.user.upsert({
    where: { clerkId: clerkUser.id },
    update: {
      email,
      firstName: clerkUser.firstName,
      lastName: clerkUser.lastName,
    },
    create: {
      clerkId: clerkUser.id,
      email,
      firstName: clerkUser.firstName,
      lastName: clerkUser.lastName,
      role: 'USER',
    },
  });
}
