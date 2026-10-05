'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import SearchModal from './SearchModal';
import CartDrawer from './CartDrawer';
import ThemeToggle from './ThemeToggle';
import { Search, ShoppingCart, Menu, X } from 'lucide-react';
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
          ✨ FREE Express Shipping &nbsp;•&nbsp; 🎨 Premium 300 GSM Art Paper &nbsp;•&nbsp; 
          💎 Archival Inks &nbsp;•&nbsp; 🔒 Secure Payments &nbsp;•&nbsp; ⭐ 100% Satisfaction Guaranteed 
          &nbsp;•&nbsp; ✨ FREE Express Shipping &nbsp;•&nbsp; 🎨 Premium 300 GSM Art Paper 
          &nbsp;•&nbsp; 💎 Archival Inks &nbsp;•&nbsp; 🔒 Secure Payments &nbsp;•&nbsp; ⭐ 100% Satisfaction Guaranteed
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

            {/* Auth buttons inside mobile menu */}
            <Show when="signed-out">
              <div className="mobile-auth-buttons">
                <SignInButton mode="modal">
                  <button className="btn btn-secondary btn-lg" style={{ width: '100%', justifyContent: 'center' }}>
                    Login
                  </button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button className="btn btn-primary btn-lg" style={{ width: '100%', justifyContent: 'center' }}>
                    Sign Up
                  </button>
                </SignUpButton>
              </div>
            </Show>
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
              <div className="desktop-auth">
                <SignInButton mode="modal">
                  <button className="navbar-action-btn navbar-login-btn" aria-label="Sign In">
                    Login
                  </button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button className="navbar-signup-btn">
                    Sign Up
                  </button>
                </SignUpButton>
              </div>
            </Show>

            <Show when="signed-in">
              <div className="user-button-wrapper" style={{ margin: '0 0.25rem', display: 'flex', alignItems: 'center' }}>
                <UserButton 
                  appearance={{
                    elements: {
                      avatarBox: { width: '36px', height: '36px', border: '1.5px solid #d4af37' }
                    },
                    variables: {
                      colorPrimary: '#d4af37'
                    }
                  }}
                />
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
