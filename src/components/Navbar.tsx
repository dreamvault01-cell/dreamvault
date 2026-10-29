'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Menu, Package, Search, ShoppingCart, X } from 'lucide-react';
import { SignInButton, SignUpButton, Show, UserButton } from '@clerk/nextjs';
import { useCart } from '@/context/CartContext';
import CartDrawer from './CartDrawer';
import SearchModal from './SearchModal';
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
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const closeMobile = () => setMobileOpen(false);
  return <>
    <div className="announcement-bar"><span className="marquee">Delivery included &nbsp;•&nbsp; Curated paper &amp; frame options &nbsp;•&nbsp; Secure payments &nbsp;•&nbsp; Made for your wall &nbsp;•&nbsp; Delivery included &nbsp;•&nbsp; Curated paper &amp; frame options &nbsp;•&nbsp; Secure payments &nbsp;•&nbsp; Made for your wall</span></div>
    <nav className={`navbar ${scrolled ? 'scrolled' : ''}`} id="main-nav"><div className="container navbar-inner">
      <Link href="/" className="navbar-logo" onClick={closeMobile}>Dream<span className="logo-accent">Vault</span></Link>
      <div className={`navbar-nav ${mobileOpen ? 'mobile-open' : ''}`}>
        <Link href="/" onClick={closeMobile}>Home</Link><Link href="/collections" onClick={closeMobile}>Collections</Link><Link href="/collections/wall-setup-packs" onClick={closeMobile}>Wall Setups</Link><Link href="/about" onClick={closeMobile}>About</Link>
        <Show when="signed-in"><Link href="/orders" onClick={closeMobile}>My Orders</Link></Show>
        <Show when="signed-out"><div className="mobile-auth-buttons"><SignInButton mode="modal"><button className="btn btn-secondary btn-lg" style={{ width: '100%', justifyContent: 'center' }}>Login</button></SignInButton><SignUpButton mode="modal"><button className="btn btn-primary btn-lg" style={{ width: '100%', justifyContent: 'center' }}>Sign Up</button></SignUpButton></div></Show>
      </div>
      <div className="navbar-actions">
        <ThemeToggle />
        <button className="navbar-action-btn" onClick={() => setSearchOpen(true)} aria-label="Search" id="search-btn"><Search size={20} /></button>
        <Show when="signed-out"><div className="desktop-auth"><SignInButton mode="modal"><button className="navbar-action-btn navbar-login-btn" aria-label="Sign in">Login</button></SignInButton><SignUpButton mode="modal"><button className="navbar-signup-btn">Sign Up</button></SignUpButton></div></Show>
        <Show when="signed-in"><Link href="/orders" className="navbar-action-btn" aria-label="My orders" title="My orders"><Package size={19} /></Link><div className="user-button-wrapper" style={{ margin: '0 .25rem', display: 'flex', alignItems: 'center' }}><UserButton appearance={{ elements: { avatarBox: { width: '36px', height: '36px', border: '1.5px solid #d4af37' } }, variables: { colorPrimary: '#d4af37' } }} /></div></Show>
        <button className="navbar-action-btn" onClick={() => setIsCartOpen(true)} aria-label="Cart" id="cart-btn"><ShoppingCart size={20} />{totalItems > 0 && <span className="navbar-cart-count">{totalItems}</span>}</button>
        <button className="navbar-toggle" onClick={() => setMobileOpen((open) => !open)} aria-label="Toggle menu" id="menu-toggle">{mobileOpen ? <X size={24} /> : <Menu size={24} />}</button>
      </div>
    </div></nav>
    <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    <CartDrawer />
  </>;
}
