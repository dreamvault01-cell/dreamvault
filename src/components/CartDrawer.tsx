'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/context/CartContext';
import { ShoppingCart, X } from 'lucide-react';

export default function CartDrawer() {
  const {
    items,
    removeFromCart,
    updateQuantity,
    totalItems,
    totalPrice,
    totalSavings,
    isCartOpen,
    setIsCartOpen,
  } = useCart();

  return (
    <>
      <div
        className={`cart-overlay ${isCartOpen ? 'open' : ''}`}
        onClick={() => setIsCartOpen(false)}
      />

      <div className={`cart-drawer ${isCartOpen ? 'open' : ''}`}>
        <div className="cart-header">
          <h2>Your Cart ({totalItems})</h2>
          <button className="cart-close" onClick={() => setIsCartOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <div className="cart-items">
          {items.length === 0 && (
            <div className="cart-empty">
              <div className="cart-empty-icon" style={{ display: 'flex', justifyContent: 'center' }}>
                <ShoppingCart size={48} opacity={0.5} />
              </div>
              <p>Your cart is empty</p>
              <p style={{ fontSize: '0.8rem', marginTop: '8px' }}>
                Start adding some stunning posters!
              </p>
            </div>
          )}

          {items.map((item) => (
            <div className="cart-item" key={`${item.id}-${item.size}`}>
              <div className="cart-item-image">
                <Image src={item.image} alt={item.name} width={80} height={80} />
              </div>

              <div className="cart-item-info">
                <div className="cart-item-name">{item.name}</div>
                <div className="cart-item-size">{item.size}</div>

                <div className="cart-item-bottom">
                  <div className="cart-item-qty">
                    <button
                      onClick={() =>
                        updateQuantity(item.id, item.size, item.quantity - 1)
                      }
                    >
                      −
                    </button>
                    <span>{item.quantity}</span>
                    <button
                      onClick={() =>
                        updateQuantity(item.id, item.size, item.quantity + 1)
                      }
                    >
                      +
                    </button>
                  </div>
                  <div className="cart-item-price">₹{item.price * item.quantity}</div>
                </div>

                <button
                  className="cart-item-remove"
                  onClick={() => removeFromCart(item.id, item.size)}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>

        {items.length > 0 && (
          <div className="cart-footer">
            {totalSavings > 0 && (
              <div className="cart-savings">
                <span>You save</span>
                <span>₹{totalSavings}</span>
              </div>
            )}

            <div className="cart-total">
              <span>Total</span>
              <span>₹{totalPrice}</span>
            </div>

            <div className="cart-free-shipping">
              ⚡ FREE Express Shipping + ₹50 OFF on prepaid
            </div>

            <Link
              href="/checkout"
              className="btn btn-primary btn-lg"
              style={{ width: '100%' }}
              onClick={() => setIsCartOpen(false)}
            >
              Checkout — ₹{totalPrice}
            </Link>
          </div>
        )}
      </div>
    </>
  );
}

