import Link from 'next/link';
import { Instagram, Twitter, Facebook, Youtube } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="footer" id="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="navbar-logo">
              Dream<span className="logo-accent">Vault</span>
            </div>
            <p>
              Elevate your space with personalized artistry. Premium posters and art prints,
              meticulously crafted to reflect your unique style.
            </p>
            <div className="footer-social">
              <a href="#" aria-label="Instagram"><Instagram size={18} /></a>
              <a href="#" aria-label="Twitter"><Twitter size={18} /></a>
              <a href="#" aria-label="Facebook"><Facebook size={18} /></a>
              <a href="#" aria-label="YouTube"><Youtube size={18} /></a>
            </div>
          </div>

          <div className="footer-column">
            <h4>Shop</h4>
            <Link href="/collections">All Collections</Link>
            <Link href="/collections/abstract-art">Abstract Art</Link>
            <Link href="/collections/nature-landscapes">Nature &amp; Landscapes</Link>
            <Link href="/collections/movies-cinema">Movies &amp; Cinema</Link>
            <Link href="/collections/anime-manga">Anime &amp; Manga</Link>
            <Link href="/collections/wall-setup-packs">Wall Setup Packs</Link>
          </div>

          <div className="footer-column">
            <h4>Help</h4>
            <Link href="/about">About Us</Link>
            <a href="#">FAQ</a>
            <a href="#">Shipping &amp; Delivery</a>
            <a href="#">Returns &amp; Refunds</a>
            <a href="#">Track Your Order</a>
            <a href="#">Contact Us</a>
          </div>

          <div className="footer-column">
            <h4>Policies</h4>
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
            <a href="#">Refund Policy</a>
            <a href="#">Shipping Policy</a>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} DreamVault. All rights reserved. Made with ♥ in India.</p>
          <div className="footer-payments">
            <span className="payment-badge">Visa</span>
            <span className="payment-badge">Mastercard</span>
            <span className="payment-badge">UPI</span>
            <span className="payment-badge">Net Banking</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
