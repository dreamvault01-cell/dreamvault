import { getSupportConfig } from '@/lib/support-config';
import FAQPageClient from './FAQPageClient';

export default function FAQPage() {
  const supportEmail = getSupportConfig().supportEmail || 'support@soliheleug.resend.app';
  return <FAQPageClient supportEmail={supportEmail} />;
}
