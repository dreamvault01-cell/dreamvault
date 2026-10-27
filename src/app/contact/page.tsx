import { getSupportConfig } from '@/lib/support-config';
import ContactPageClient from './ContactPageClient';

export const dynamic = 'force-dynamic';

export default function ContactPage() {
  const { supportEmail, mode } = getSupportConfig();
  return <ContactPageClient supportEmail={supportEmail || 'support@soliheleug.resend.app'} developmentMode={mode === 'development'} />;
}
