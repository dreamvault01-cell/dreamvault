import Link from 'next/link';
import { Mail, MapPin, Phone } from 'lucide-react';
import { getSupportConfig } from '@/lib/support-config';

// Inline SVGs for social brands
const InstagramIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="url(#ig-grad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <defs>
      <linearGradient id="ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#f09433" />
        <stop offset="25%" stopColor="#e6683c" />
        <stop offset="50%" stopColor="#dc2743" />
        <stop offset="75%" stopColor="#cc2366" />
        <stop offset="100%" stopColor="#bc1888" />
      </linearGradient>
    </defs>
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
  </svg>
);

const TwitterIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1DA1F2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path>
  </svg>
);

const FacebookIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1877F2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
  </svg>
);



const ChevronDown = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="footer-accordion-icon">
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);

export default function Footer() {
  const supportEmail = getSupportConfig().supportEmail || 'support@soliheleug.resend.app';
  return (
    <footer className="footer" id="footer">
      {/* ── Main Footer ── */}
      <div className="footer-main">
        <div className="container">
          <div className="footer-grid">
            {/* Brand Column */}
            <div className="footer-brand">
              <div className="navbar-logo">
                Dream<span className="logo-accent">Vault</span>
              </div>
              <p>
                Elevate your space with personalized artistry. Premium posters and art prints,
                meticulously crafted to reflect your unique style.
              </p>
              <div className="footer-contact">
                <a href={`mailto:${supportEmail}`}><Mail size={14} /> {supportEmail}</a>
                <a href="tel:+919876543210"><Phone size={14} /> +91 98765 43210</a>
                <span><MapPin size={14} /> Mumbai, India</span>
              </div>
            </div>

            {/* Shop Column */}
            <div className="footer-column">
              <input type="checkbox" id="footer-shop" className="footer-accordion-toggle" />
              <label htmlFor="footer-shop" className="footer-column-title">
                Shop <ChevronDown />
              </label>
              <div className="footer-column-content">
                <Link href="/collections">All Collections</Link>
                <Link href="/collections/abstract-art">Abstract Art</Link>
                <Link href="/collections/nature-landscapes">Nature &amp; Landscapes</Link>
                <Link href="/collections/movies-cinema">Movies &amp; Cinema</Link>
                <Link href="/collections/anime-manga">Anime &amp; Manga</Link>
                <Link href="/collections/wall-setup-packs">Wall Setup Packs</Link>
              </div>
            </div>

            {/* Help Column */}
            <div className="footer-column">
              <input type="checkbox" id="footer-help" className="footer-accordion-toggle" />
              <label htmlFor="footer-help" className="footer-column-title">
                Help <ChevronDown />
              </label>
              <div className="footer-column-content">
                <Link href="/about">About Us</Link>
                <Link href="/faq">FAQ</Link>
                <Link href="/shipping-delivery">Shipping &amp; Delivery</Link>
                <Link href="/returns-refunds">Returns &amp; Refunds</Link>
                <Link href="/track-order">Track Your Order</Link>
                <Link href="/contact">Contact Us</Link>
              </div>
            </div>

            {/* Policies Column */}
            <div className="footer-column">
              <input type="checkbox" id="footer-policies" className="footer-accordion-toggle" />
              <label htmlFor="footer-policies" className="footer-column-title">
                Policies <ChevronDown />
              </label>
              <div className="footer-column-content">
                <Link href="/privacy-policy">Privacy Policy</Link>
                <Link href="/terms-of-service">Terms of Service</Link>
                <Link href="/refund-policy">Refund Policy</Link>
                <Link href="/shipping-policy">Shipping Policy</Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom Bar ── */}
      <div className="footer-bottom-bar">
        <div className="container">
          <div className="footer-bottom">
            <div className="footer-social-minimal">
              <a href="#" aria-label="Instagram"><InstagramIcon /></a>
              <a href="#" aria-label="Twitter"><TwitterIcon /></a>
              <a href="#" aria-label="Facebook"><FacebookIcon /></a>
            </div>
            <p className="footer-copyright">© {new Date().getFullYear()} DreamVault. All rights reserved.</p>
            <div className="footer-payments">
              <span className="payment-badge payment-badge-text" style={{ color: '#142787' }}>VISA</span>
              <span className="payment-badge">
                <svg width="18" height="12" viewBox="0 0 18 12"><circle cx="6" cy="6" r="5.5" fill="#EB001B" opacity="0.9"/><circle cx="12" cy="6" r="5.5" fill="#F79E1B" opacity="0.9"/></svg>
              </span>
              <span className="payment-badge payment-badge-text">UPI</span>
              <span className="payment-badge payment-badge-text">RuPay</span>
              <span className="payment-badge payment-badge-text">Net Banking</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
