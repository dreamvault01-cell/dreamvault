import Link from 'next/link';

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
              <a href="#" aria-label="Instagram">📷</a>
              <a href="#" aria-label="Twitter">🐦</a>
              <a href="#" aria-label="Facebook">📘</a>
              <a href="#" aria-label="Pinterest">📌</a>
            </div>
          </div>

          <div className="footer-column">
            <h4>Shop</h4>
            <Link href="/collections">All Collections</Link>
            <Link href="/collections/abstract-art">Abstract Art</Link>
            <Link href="/collections/nature-landscapes">Nature & Landscapes</Link>
            <Link href="/collections/movies-cinema">Movies & Cinema</Link>
            <Link href="/collections/anime-manga">Anime & Manga</Link>
            <Link href="/collections/wall-setup-packs">Wall Setup Packs</Link>
          </div>

          <div className="footer-column">
            <h4>Help</h4>
            <Link href="/about">About Us</Link>
            <a href="#">FAQ</a>
            <a href="#">Shipping & Delivery</a>
            <a href="#">Returns & Refunds</a>
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
          <p>© 2024 DreamVault. All rights reserved. Made with ♥ in India.</p>
          <div className="footer-payments">
            <span>💳 Visa</span>
            <span>💳 Mastercard</span>
            <span>📱 UPI</span>
            <span>🏦 Net Banking</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

