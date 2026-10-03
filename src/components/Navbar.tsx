'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import SearchModal from './SearchModal';
import CartDrawer from './CartDrawer';
import ThemeToggle from './ThemeToggle';
import { Search, ShoppingCart, Menu, X, User } from 'lucide-react';
import { SignInButton, SignUpButton, Show, UserButton } from '@clerk/nextjs';

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
              <Search size={20} />
            </button>

            <Show when="signed-out">
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginLeft: '0.5rem' }}>
                <SignInButton mode="modal">
                  <button className="navbar-action-btn" aria-label="Sign In" style={{ fontSize: '14px', fontWeight: '500' }}>
                    Login
                  </button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button className="btn btn-primary" style={{ padding: '0.4rem 1rem', fontSize: '14px' }}>
                    Sign Up
                  </button>
                </SignUpButton>
              </div>
            </Show>

            <Show when="signed-in">
              <div style={{ display: 'flex', alignItems: 'center', marginLeft: '0.5rem' }}>
                <UserButton />
              </div>
            </Show>

            <button
              className="navbar-action-btn"
              onClick={() => setIsCartOpen(true)}
              aria-label="Cart"
              id="cart-btn"
            >
              <ShoppingCart size={20} />
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
              {mobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </nav>

      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
      <CartDrawer />
    </>
  );
}

