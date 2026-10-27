import type { Metadata } from 'next';
import AuthPage from '@/components/AuthPage';

export const metadata: Metadata = {
  title: 'Welcome Back | DreamVault',
  description: 'Sign in to your DreamVault account and find art for the way you live.',
};

export default function SignInPage() {
  return <AuthPage mode="sign-in" />;
}
