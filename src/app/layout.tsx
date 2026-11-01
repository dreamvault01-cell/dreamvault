import type { Metadata } from 'next';
import { Outfit, Playfair_Display } from 'next/font/google';
import './globals.css';
import { CartProvider } from '@/context/CartContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { ThemeProvider } from '@/components/ThemeProvider';
import ScrollToTop from '@/components/ScrollToTop';
import { ClerkProvider } from '@clerk/nextjs';
import { ToastProvider } from '@/components/Toast';
import { BRAND_NAME, BRAND_WORDMARK_PATH } from '@/lib/brand';

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
});

const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  variable: '--font-playfair',
  display: 'swap',
});

export const metadata: Metadata = {
  title: `${BRAND_NAME} — Premium Art Prints & Posters`,
  applicationName: BRAND_NAME,
  appleWebApp: { title: BRAND_NAME },
  icons: {
    icon: [{ url: '/brand/raredaze-mark.svg', type: 'image/svg+xml' }],
    shortcut: '/favicon.ico',
    apple: [{ url: '/brand/raredaze-apple-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  description:
    'Discover curated posters, premium art prints, and framed wall art with clear paper, size, and frame choices before checkout.',
  keywords: [
    'posters',
    'art prints',
    'wall art',
    'custom posters',
    'premium posters',
    'wall decor',
    'abstract art',
    'anime posters',
    'movie posters',
  ],
  openGraph: {
    title: `${BRAND_NAME} — Premium Art Prints & Posters`,
    description:
      'Curated posters, premium art prints, and framed wall art for your space.',
    type: 'website',
    siteName: BRAND_NAME,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${playfairDisplay.variable}`}
      suppressHydrationWarning
    >
      <body suppressHydrationWarning>
        <ClerkProvider
          localization={{
            signIn: { start: { title: `Sign in to ${BRAND_NAME}` } },
            signUp: { start: { title: `Create your ${BRAND_NAME} account` } },
          }}
          appearance={{
            options: {
              logoImageUrl: BRAND_WORDMARK_PATH,
              logoLinkUrl: '/',
              helpPageUrl: '/contact',
              privacyPageUrl: '/privacy-policy',
              termsPageUrl: '/terms-of-service',
            },
            variables: {
              colorPrimary: 'var(--accent-gold)',
              colorBackground: 'var(--bg-card)',
              colorForeground: 'var(--text-primary)',
              fontFamily: 'var(--font-sans)',
            },
            elements: {
              logoImage: { width: '160px', height: 'auto', filter: 'var(--brand-logo-filter)' },
            },
          }}
        >
          <ThemeProvider>
            <CartProvider>
              <ToastProvider>
                <ScrollToTop />
                <Navbar />
                <main id="main-content">{children}</main>
                <Footer />
              </ToastProvider>
            </CartProvider>
          </ThemeProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
