'use client';

import Link from 'next/link';
import { Mail, MapPin, Phone, Shield, Truck, RotateCcw } from 'lucide-react';

// Inline SVGs for social brands
const InstagramIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
  </svg>
);

const TwitterIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path>
  </svg>
);

const FacebookIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
  </svg>
);

const YoutubeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33 2.78 2.78 0 0 0 1.94 2c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.33 29 29 0 0 0-.46-5.33z"></path>
    <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon>
  </svg>
);

const ChevronDown = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="footer-accordion-icon">
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);

export default function Footer() {
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
              <div className="footer-social">
                <a href="#" aria-label="Instagram"><InstagramIcon /></a>
                <a href="#" aria-label="Twitter"><TwitterIcon /></a>
                <a href="#" aria-label="Facebook"><FacebookIcon /></a>
                <a href="#" aria-label="YouTube"><YoutubeIcon /></a>
              </div>
              <div className="footer-contact">
                <a href="mailto:hello@dreamvault.in"><Mail size={14} /> hello@dreamvault.in</a>
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
                <a href="#">FAQ</a>
                <a href="#">Shipping &amp; Delivery</a>
                <a href="#">Returns &amp; Refunds</a>
                <a href="#">Track Your Order</a>
                <a href="#">Contact Us</a>
              </div>
            </div>

            {/* Policies Column */}
            <div className="footer-column">
              <input type="checkbox" id="footer-policies" className="footer-accordion-toggle" />
              <label htmlFor="footer-policies" className="footer-column-title">
                Policies <ChevronDown />
              </label>
              <div className="footer-column-content">
                <a href="#">Privacy Policy</a>
                <a href="#">Terms of Service</a>
                <a href="#">Refund Policy</a>
                <a href="#">Shipping Policy</a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom Bar ── */}
      <div className="footer-bottom-bar">
        <div className="container">
          <div className="footer-bottom">
            <p>© {new Date().getFullYear()} DreamVault. All rights reserved. Made with ♥ in India.</p>
            <div className="footer-payments">
              <span className="payment-badge">
                <svg width="32" height="10" viewBox="0 0 32 10" fill="currentColor"><text x="0" y="9" fontSize="9" fontWeight="700" fontFamily="sans-serif">VISA</text></svg>
              </span>
              <span className="payment-badge">
                <svg width="18" height="12" viewBox="0 0 18 12"><circle cx="6" cy="6" r="5.5" fill="#EB001B" opacity="0.8"/><circle cx="12" cy="6" r="5.5" fill="#F79E1B" opacity="0.8"/></svg>
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
