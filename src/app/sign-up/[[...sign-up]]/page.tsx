import type { Metadata } from 'next';
import AuthPage from '@/components/AuthPage';

export const metadata: Metadata = {
  title: 'Make Yourself at Home | DreamVault',
  description: 'Create your DreamVault account and find your next favorite art print.',
};

export default function SignUpPage() {
  return <AuthPage mode="sign-up" />;
}
