import Link from 'next/link';
import { Mail } from 'lucide-react';
import { getSupportConfig } from '@/lib/support-config';
import { BRAND_NAME } from '@/lib/brand';
import BrandLogo from './BrandLogo';

const ChevronDown = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="footer-accordion-icon"><polyline points="6 9 12 15 18 9" /></svg>;

export default function Footer() {
  const supportEmail = getSupportConfig().supportEmail || 'support@soliheleug.resend.app';
  return <footer className="footer" id="footer">
    <div className="footer-main"><div className="container"><div className="footer-grid">
      <div className="footer-brand">
        <Link href="/" className="navbar-logo" aria-label={`${BRAND_NAME} home`}><BrandLogo /></Link>
        <p>Curated posters, premium art prints, and framed pieces for the rooms you live in.</p>
        <div className="footer-contact"><a href={`mailto:${supportEmail}`}><Mail size={14} /> {supportEmail}</a></div>
      </div>

      <div className="footer-column">
        <input type="checkbox" id="footer-shop" className="footer-accordion-toggle" />
        <label htmlFor="footer-shop" className="footer-column-title">Shop <ChevronDown /></label>
        <div className="footer-column-content">
          <Link href="/collections">All collections</Link><Link href="/collections/abstract-art">Abstract art</Link><Link href="/collections/nature-landscapes">Nature and landscapes</Link><Link href="/collections/movies-cinema">Movies and cinema</Link><Link href="/collections/anime-manga">Anime and manga</Link><Link href="/collections/wall-setup-packs">Wall setup packs</Link>
        </div>
      </div>

      <div className="footer-column">
        <input type="checkbox" id="footer-help" className="footer-accordion-toggle" />
        <label htmlFor="footer-help" className="footer-column-title">Help <ChevronDown /></label>
        <div className="footer-column-content">
          <Link href="/about">About us</Link><Link href="/faq">FAQ</Link><Link href="/shipping-delivery">Shipping and delivery</Link><Link href="/returns-refunds">Returns and refunds</Link><Link href="/track-order">Track your order</Link><Link href="/contact">Contact us</Link>
        </div>
      </div>

      <div className="footer-column">
        <input type="checkbox" id="footer-policies" className="footer-accordion-toggle" />
        <label htmlFor="footer-policies" className="footer-column-title">Policies <ChevronDown /></label>
        <div className="footer-column-content">
          <Link href="/privacy-policy">Privacy policy</Link><Link href="/terms-of-service">Terms of service</Link><Link href="/refund-policy">Refund policy</Link><Link href="/shipping-policy">Shipping policy</Link>
        </div>
      </div>
    </div></div></div>
    <div className="footer-bottom-bar"><div className="container"><div className="footer-bottom">
      <p className="footer-copyright">Copyright {new Date().getFullYear()} {BRAND_NAME}. All rights reserved.</p>
      <div className="footer-payments" aria-label="Checkout payment methods"><span className="payment-badge payment-badge-text" style={{ color: '#142787' }}>VISA</span><span className="payment-badge"><svg width="18" height="12" viewBox="0 0 18 12" aria-hidden="true"><circle cx="6" cy="6" r="5.5" fill="#EB001B" opacity="0.9" /><circle cx="12" cy="6" r="5.5" fill="#F79E1B" opacity="0.9" /></svg></span><span className="payment-badge payment-badge-text">UPI</span><span className="payment-badge payment-badge-text">RuPay</span><span className="payment-badge payment-badge-text">Net Banking</span></div>
    </div></div></div>
  </footer>;
}
