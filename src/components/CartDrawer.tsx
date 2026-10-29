'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ShoppingCart, X } from 'lucide-react';
import { getCartItemDescription, getCartItemKey, useCart } from '@/context/CartContext';

export default function CartDrawer() {
  const { items, removeFromCart, updateQuantity, totalItems, totalPrice, totalSavings, isCartOpen, setIsCartOpen } = useCart();
  return <>
    <div className={`cart-overlay ${isCartOpen ? 'open' : ''}`} onClick={() => setIsCartOpen(false)} />
    <aside className={`cart-drawer ${isCartOpen ? 'open' : ''}`} aria-label="Shopping cart">
      <div className="cart-header"><h2>Your Cart ({totalItems})</h2><button className="cart-close" onClick={() => setIsCartOpen(false)} aria-label="Close cart"><X size={20} /></button></div>
      <div className="cart-items">{items.length === 0 ? <div className="cart-empty"><div className="cart-empty-icon" style={{ display: 'flex', justifyContent: 'center' }}><ShoppingCart size={48} opacity={.5} /></div><p>Your cart is empty</p><p style={{ fontSize: '.8rem', marginTop: 8 }}>Choose a print that belongs on your wall.</p></div> : items.map((item) => {
        const itemKey = getCartItemKey(item);
        return <div className="cart-item" key={itemKey}><div className="cart-item-image"><Image src={item.image} alt={item.name} width={80} height={100} /></div><div className="cart-item-info"><div className="cart-item-name">{item.name}</div><div className="cart-item-size">{getCartItemDescription(item)}</div><div className="cart-item-bottom"><div className="cart-item-qty"><button onClick={() => updateQuantity(itemKey, item.quantity - 1)} aria-label={`Decrease ${item.name} quantity`}>−</button><span>{item.quantity}</span><button onClick={() => updateQuantity(itemKey, item.quantity + 1)} aria-label={`Increase ${item.name} quantity`}>+</button></div><div className="cart-item-price">₹{item.price * item.quantity}</div></div><button className="cart-item-remove" onClick={() => removeFromCart(itemKey)}>Remove</button></div></div>;
      })}</div>
      {items.length > 0 && <div className="cart-footer">{totalSavings > 0 && <div className="cart-savings"><span>You save</span><span>₹{totalSavings}</span></div>}<div className="cart-total"><span>Total</span><span>₹{totalPrice}</span></div><div className="cart-free-shipping">Delivery is included in your checkout total</div><Link href="/checkout" className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={() => setIsCartOpen(false)}>Checkout · ₹{totalPrice}</Link></div>}
    </aside>
  </>;
}
