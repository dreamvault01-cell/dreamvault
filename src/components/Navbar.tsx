'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import SearchModal from './SearchModal';
import CartDrawer from './CartDrawer';
import ThemeToggle from './ThemeToggle';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { totalItems, setIsCartOpen } = useCart();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }, [mobileOpen]);

  return (
    <>
      <div className="announcement-bar">
        <span className="marquee">
          ✨ FREE Express Shipping on all orders &nbsp;•&nbsp; Premium 300 GSM Art Paper
          &nbsp;•&nbsp; ₹50 OFF on prepaid orders &nbsp;•&nbsp; 100% Satisfaction
          Guaranteed &nbsp;•&nbsp; ✨ FREE Express Shipping on all orders &nbsp;•&nbsp;
          Premium 300 GSM Art Paper &nbsp;•&nbsp; ₹50 OFF on prepaid orders &nbsp;•&nbsp;
          100% Satisfaction Guaranteed
        </span>
      </div>

      <nav className={`navbar ${scrolled ? 'scrolled' : ''}`} id="main-nav">
        <div className="container navbar-inner">
          <Link href="/" className="navbar-logo">
            Dream<span className="logo-accent">Vault</span>
          </Link>

          <div className={`navbar-nav ${mobileOpen ? 'mobile-open' : ''}`}>
            <Link href="/" onClick={() => setMobileOpen(false)}>
              Home
            </Link>
            <Link href="/collections" onClick={() => setMobileOpen(false)}>
              Collections
            </Link>
            <Link href="/collections/wall-setup-packs" onClick={() => setMobileOpen(false)}>
              Wall Setups
            </Link>
            <Link href="/custom" onClick={() => setMobileOpen(false)}>
              Custom Poster
            </Link>
            <Link href="/about" onClick={() => setMobileOpen(false)}>
              About
            </Link>
          </div>

          <div className="navbar-actions">
            <ThemeToggle />
            
            <button
              className="navbar-action-btn"
              onClick={() => setSearchOpen(true)}
              aria-label="Search"
              id="search-btn"
            >
              🔍
            </button>

            <button
              className="navbar-action-btn"
              onClick={() => setIsCartOpen(true)}
              aria-label="Cart"
              id="cart-btn"
            >
              🛒
              {totalItems > 0 && (
                <span className="navbar-cart-count">{totalItems}</span>
              )}
            </button>

            <button
              className="navbar-toggle"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
              id="menu-toggle"
            >
              {mobileOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>
      </nav>

      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
      <CartDrawer />
    </>
  );
}

