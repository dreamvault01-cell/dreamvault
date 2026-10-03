'use client';

import Link from 'next/link';
import { useCart } from '@/context/CartContext';

export default function CheckoutPage() {
  const { items, totalPrice, totalSavings } = useCart();

  if (items.length === 0) {
    return (
      <div
        className="container"
        style={{ paddingTop: '50px', textAlign: 'center', minHeight: '60vh' }}
      >
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🛒</div>
        <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Your Cart is Empty</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
          Add some stunning posters to get started!
        </p>
        <Link href="/collections" className="btn btn-primary btn-lg">
          Browse Collections
        </Link>
      </div>
    );
  }

  return (
    <div style={{ paddingTop: '10px', minHeight: '100vh' }}>
      <section className="section">
        <div className="container" style={{ maxWidth: '900px' }}>
          <h1
            className="section-title"
            style={{ marginBottom: 'var(--gap-2xl)' }}
          >
            <span className="accent">Checkout</span>
          </h1>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.2fr 0.8fr',
              gap: 'var(--gap-2xl)',
            }}
          >
            {/* Form */}
            <div>
              <h2
                style={{
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  marginBottom: 'var(--gap-lg)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Shipping Details
              </h2>

              <form onSubmit={(e) => e.preventDefault()}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--gap-md)' }}>
                  {[
                    { label: 'First Name', id: 'first-name', type: 'text', full: false },
                    { label: 'Last Name', id: 'last-name', type: 'text', full: false },
                    { label: 'Email', id: 'email', type: 'email', full: true },
                    { label: 'Phone', id: 'phone', type: 'tel', full: true },
                    { label: 'Address', id: 'address', type: 'text', full: true },
                    { label: 'City', id: 'city', type: 'text', full: false },
                    { label: 'PIN Code', id: 'pincode', type: 'text', full: false },
                    { label: 'State', id: 'state', type: 'text', full: true },
                  ].map((field) => (
                    <div
                      key={field.id}
                      style={{ gridColumn: field.full ? 'span 2' : undefined }}
                    >
                      <label
                        htmlFor={field.id}
                        style={{
                          display: 'block',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          color: 'var(--text-secondary)',
                          marginBottom: '6px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}
                      >
                        {field.label}
                      </label>
                      <input
                        type={field.type}
                        id={field.id}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          borderRadius: 'var(--radius-md)',
                          border: '1.5px solid var(--border-light)',
                          background: 'var(--bg-card)',
                          color: 'var(--text-primary)',
                          fontFamily: 'var(--font-sans)',
                          fontSize: '0.95rem',
                          outline: 'none',
                          transition: 'border-color var(--transition-fast)',
                        }}
                        onFocus={(e) =>
                          (e.target.style.borderColor = 'var(--accent-gold)')
                        }
                        onBlur={(e) =>
                          (e.target.style.borderColor = 'var(--border-light)')
                        }
                      />
                    </div>
                  ))}
                </div>

                <h2
                  style={{
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    margin: 'var(--gap-2xl) 0 var(--gap-lg)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Payment Method
                </h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-sm)' }}>
                  {['UPI (₹50 OFF)', 'Credit / Debit Card', 'Net Banking', 'Cash on Delivery'].map(
                    (method, i) => (
                      <label
                        key={method}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 'var(--gap-md)',
                          padding: 'var(--gap-md)',
                          background: i === 0 ? 'rgba(212, 175, 55, 0.05)' : 'var(--bg-card)',
                          border: `1.5px solid ${i === 0 ? 'var(--accent-gold)' : 'var(--border-subtle)'}`,
                          borderRadius: 'var(--radius-md)',
                          cursor: 'pointer',
                          transition: 'border-color var(--transition-fast)',
                        }}
                      >
                        <input
                          type="radio"
                          name="payment"
                          defaultChecked={i === 0}
                          style={{ accentColor: 'var(--accent-gold)' }}
                        />
                        <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{method}</span>
                        {i === 0 && (
                          <span
                            style={{
                              marginLeft: 'auto',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              color: '#22c55e',
                              background: 'rgba(34, 197, 94, 0.1)',
                              padding: '3px 10px',
                              borderRadius: 'var(--radius-full)',
                            }}
                          >
                            RECOMMENDED
                          </span>
                        )}
                      </label>
                    )
                  )}
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-lg"
                  style={{ width: '100%', marginTop: 'var(--gap-xl)' }}
                  id="place-order-btn"
                >
                  Place Order — ₹{totalPrice}
                </button>
              </form>
            </div>

            {/* Order Summary */}
            <div>
              <div
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-lg)',
                  padding: 'var(--gap-xl)',
                  position: 'sticky',
                  top: 'calc(70px + var(--gap-xl))',
                }}
              >
                <h3
                  style={{
                    fontSize: '1rem',
                    fontWeight: 700,
                    marginBottom: 'var(--gap-lg)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Order Summary
                </h3>

                {items.map((item) => (
                  <div
                    key={`${item.id}-${item.size}`}
                    style={{
                      display: 'flex',
                      gap: 'var(--gap-md)',
                      padding: 'var(--gap-sm) 0',
                      borderBottom: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div
                      style={{
                        width: '56px',
                        height: '70px',
                        borderRadius: 'var(--radius-sm)',
                        overflow: 'hidden',
                        flexShrink: 0,
                        background: 'var(--bg-tertiary)',
                      }}
                    >
                      <img
                        src={item.image}
                        alt={item.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          display: '-webkit-box',
                          WebkitLineClamp: 1,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {item.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {item.size} × {item.quantity}
                      </div>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', flexShrink: 0 }}>
                      ₹{item.price * item.quantity}
                    </div>
                  </div>
                ))}

                <div style={{ marginTop: 'var(--gap-lg)' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: '8px',
                      fontSize: '0.9rem',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    <span>Subtotal</span>
                    <span>₹{totalPrice}</span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: '8px',
                      fontSize: '0.9rem',
                      color: '#22c55e',
                    }}
                  >
                    <span>You Save</span>
                    <span>−₹{totalSavings}</span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: '8px',
                      fontSize: '0.9rem',
                      color: '#22c55e',
                    }}
                  >
                    <span>Shipping</span>
                    <span>FREE</span>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      paddingTop: 'var(--gap-md)',
                      borderTop: '1px solid var(--border-subtle)',
                      fontSize: '1.15rem',
                      fontWeight: 800,
                    }}
                  >
                    <span>Total</span>
                    <span>₹{totalPrice}</span>
                  </div>
                </div>

                <div
                  style={{
                    textAlign: 'center',
                    fontSize: '0.8rem',
                    color: 'var(--accent-gold)',
                    fontWeight: 600,
                    marginTop: 'var(--gap-md)',
                  }}
                >
                  ⚡ FREE Express Shipping
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

