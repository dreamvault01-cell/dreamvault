'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronUp, Heart, LogOut, Menu, Search, Settings, ShoppingCart, X } from 'lucide-react';
import { SignInButton, SignUpButton, Show, UserButton, useClerk, useUser } from '@clerk/nextjs';
import { useCart } from '@/context/CartContext';
import CartDrawer from './CartDrawer';
import SearchModal from './SearchModal';
import BrandLogo from './BrandLogo';
import ThemePreference from './ThemePreference';
import { BRAND_NAME } from '@/lib/brand';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileAccountOpen, setMobileAccountOpen] = useState(false);
  const { totalItems, setIsCartOpen } = useCart();
  const { openUserProfile, signOut } = useClerk();
  const { user } = useUser();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen || searchOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen, searchOpen]);

  const closeMobile = () => {
    setMobileOpen(false);
    setMobileAccountOpen(false);
  };
  const accountName = user?.firstName || user?.username || 'Your account';
  const accountEmail = user?.primaryEmailAddress?.emailAddress || 'Profile, orders and sign out';
  const accountInitial = (user?.firstName?.[0] || user?.primaryEmailAddress?.emailAddress?.[0] || 'M').toUpperCase();
  const handleMobileSignOut = async () => {
    try {
      await signOut();
    } finally {
      closeMobile();
    }
  };
  return <>
    <div className="announcement-bar"><span className="marquee">Delivery included &nbsp;•&nbsp; Curated paper &amp; frame options &nbsp;•&nbsp; Secure payments &nbsp;•&nbsp; Made for your wall &nbsp;•&nbsp; Delivery included &nbsp;•&nbsp; Curated paper &amp; frame options &nbsp;•&nbsp; Secure payments &nbsp;•&nbsp; Made for your wall</span></div>
    <nav className={`navbar ${scrolled ? 'scrolled' : ''}`} id="main-nav"><div className="container navbar-inner">
      <Link href="/" className="navbar-logo" onClick={closeMobile} aria-label={`${BRAND_NAME} home`}><BrandLogo /></Link>
      <div className={`navbar-nav ${mobileOpen ? 'mobile-open' : ''}`} id="primary-navigation">
        <Show when="signed-in"><div className={`mobile-account-section ${mobileAccountOpen ? 'is-open' : ''}`}><button type="button" className="mobile-account-trigger" onClick={() => setMobileAccountOpen((open) => !open)} aria-expanded={mobileAccountOpen} aria-controls="mobile-account-menu"><span className="mobile-account-avatar" aria-hidden="true">{accountInitial}</span><span className="mobile-account-details"><strong>{accountName}</strong><span>{accountEmail}</span></span><span className="mobile-account-hint">{mobileAccountOpen ? 'Close' : 'Account'} {mobileAccountOpen ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}</span></button>{mobileAccountOpen && <div className="mobile-account-menu" id="mobile-account-menu"><button type="button" onClick={() => { setMobileAccountOpen(false); closeMobile(); openUserProfile(); }}><Settings size={17} aria-hidden="true" /> Manage account</button><button type="button" onClick={handleMobileSignOut}><LogOut size={17} aria-hidden="true" /> Sign out</button></div>}</div></Show>
        <Link href="/" onClick={closeMobile}>Home</Link><Link href="/collections" onClick={closeMobile}>Collections</Link><Link href="/collections/wall-setup-packs" onClick={closeMobile}>Wall Setups</Link><Link href="/about" onClick={closeMobile}>About</Link>
        <Show when="signed-in"><Link className="mobile-wishlist-link" href="/wishlist" onClick={closeMobile}>Wishlist</Link></Show>
        <Show when="signed-in"><Link href="/orders" onClick={closeMobile}>My Orders</Link></Show>
        <ThemePreference className="mobile-theme-preference" />
        <Show when="signed-out"><div className="mobile-auth-buttons"><SignInButton mode="modal"><button className="btn btn-secondary btn-lg" style={{ width: '100%', justifyContent: 'center' }}>Login</button></SignInButton><SignUpButton mode="modal"><button className="btn btn-primary btn-lg" style={{ width: '100%', justifyContent: 'center' }}>Sign Up</button></SignUpButton></div></Show>
      </div>
      <div className="navbar-actions">
        <button className="navbar-action-btn navbar-search-button" onClick={() => setSearchOpen(true)} aria-label="Search" id="search-btn"><Search size={20} /></button>
        <Show when="signed-out"><div className="desktop-auth"><SignInButton mode="modal"><button className="navbar-action-btn navbar-login-btn" aria-label="Sign in">Login</button></SignInButton><SignUpButton mode="modal"><button className="navbar-signup-btn">Sign Up</button></SignUpButton></div></Show>
        <Show when="signed-in"><Link href="/wishlist" className="navbar-action-btn navbar-wishlist-link" aria-label="Wishlist" title="Wishlist"><Heart size={19} /></Link></Show>
        <ThemePreference variant="icon" className="desktop-theme-preference" />
        <Show when="signed-in"><div className="desktop-user-button-wrapper" style={{ display: 'flex', alignItems: 'center' }}><UserButton appearance={{ elements: { avatarBox: { width: '36px', height: '36px', border: '1.5px solid #d4af37' } }, variables: { colorPrimary: '#d4af37' } }} /></div></Show>
        <button className="navbar-action-btn" onClick={() => setIsCartOpen(true)} aria-label="Cart" id="cart-btn"><ShoppingCart size={20} />{totalItems > 0 && <span className="navbar-cart-count">{totalItems}</span>}</button>
        <button className="navbar-toggle" onClick={() => setMobileOpen((open) => !open)} aria-label="Toggle menu" aria-expanded={mobileOpen} aria-controls="primary-navigation" id="menu-toggle">{mobileOpen ? <X size={24} /> : <Menu size={24} />}</button>
      </div>
    </div></nav>
    <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    <CartDrawer />
  </>;
}
