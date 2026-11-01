import { requireAdmin } from '@/lib/admin-auth';
import SupportInbox from './SupportInbox';

export const metadata = {
  title: 'Support messages | RareDaze Admin',
  robots: { index: false, follow: false },
};

export default async function AdminMessagesPage() {
  await requireAdmin();
  return <SupportInbox />;
}
