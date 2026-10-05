import type { Metadata } from 'next';
import './globals.css';
import { CartProvider } from '@/context/CartContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { ThemeProvider } from '@/components/ThemeProvider';
import ClerkThemeWrapper from '@/components/ClerkThemeProvider';
import ScrollToTop from '@/components/ScrollToTop';

export const metadata: Metadata = {
  title: 'DreamVault — Premium Art Prints & Posters',
  description:
    'Elevate your space with personalized artistry. Browse our collection of customized and designer posters, meticulously crafted to reflect your unique style. Premium 300 GSM prints starting from ₹149.',
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
    title: 'DreamVault — Premium Art Prints & Posters',
    description:
      'Elevate your space with personalized artistry. Premium 300 GSM art prints & posters.',
    type: 'website',
    siteName: 'DreamVault',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ThemeProvider>
          <ClerkThemeWrapper>
            <CartProvider>
              <ScrollToTop />
              <Navbar />
              <main id="main-content">{children}</main>
              <Footer />
            </CartProvider>
          </ClerkThemeWrapper>
        </ThemeProvider>
      </body>
    </html>
  );
}