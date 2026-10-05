'use client';

import { useState } from 'react';

const faqs = [
  {
    category: 'Orders & Shipping',
    questions: [
      {
        q: 'How long does delivery take?',
        a: 'We typically process orders within 1–2 business days. Standard delivery takes 5–7 business days across India. Express shipping (2–3 days) is available at checkout for an additional fee.',
      },
      {
        q: 'Do you ship internationally?',
        a: 'Currently, we only ship within India. We are working on expanding to international markets soon. Sign up for our newsletter to stay updated!',
      },
      {
        q: 'How can I track my order?',
        a: 'Once your order ships, you\'ll receive a tracking link via email and SMS. You can also track your order from the "Track Your Order" page using your order ID.',
      },
      {
        q: 'What are the shipping charges?',
        a: 'We offer free standard shipping on all orders above ₹499. For orders below ₹499, a flat shipping fee of ₹79 applies.',
      },
    ],
  },
  {
    category: 'Products & Quality',
    questions: [
      {
        q: 'What paper quality do you use?',
        a: 'We use premium 300 GSM art card stock with a rich matte finish. Our prints are vibrant, long-lasting, and designed to look stunning on any wall.',
      },
      {
        q: 'What sizes are available?',
        a: 'Our posters are available in A4 (8.3 × 11.7 in), A3 (11.7 × 16.5 in), and A2 (16.5 × 23.4 in). Select sizes are also available in custom dimensions.',
      },
      {
        q: 'Are frames included?',
        a: 'Posters are sold unframed to keep them affordable and to give you the flexibility to choose a frame that matches your decor. We may offer framing options in the future.',
      },
      {
        q: 'Can I request a custom poster?',
        a: 'Absolutely! Visit our Custom Poster page to submit your design idea. Our team will work with you to create a one-of-a-kind piece tailored to your vision.',
      },
    ],
  },
  {
    category: 'Returns & Refunds',
    questions: [
      {
        q: 'What is your return policy?',
        a: 'We accept returns within 7 days of delivery if the product is damaged, defective, or not as described. Custom orders are non-returnable.',
      },
      {
        q: 'How do I initiate a return?',
        a: 'Contact us at hello@dreamvault.in with your order ID and photos of the issue. We\'ll process your return within 24 hours.',
      },
      {
        q: 'How long do refunds take?',
        a: 'Refunds are processed within 5–7 business days after we receive and inspect the returned item. The amount will be credited to your original payment method.',
      },
    ],
  },
  {
    category: 'Payment & Security',
    questions: [
      {
        q: 'What payment methods do you accept?',
        a: 'We accept all major credit/debit cards (Visa, Mastercard, RuPay), UPI, net banking, and popular wallets through Razorpay — India\'s most trusted payment gateway.',
      },
      {
        q: 'Is my payment information secure?',
        a: 'Yes. All transactions are processed through Razorpay with 256-bit SSL encryption. We never store your card details on our servers.',
      },
      {
        q: 'Do you offer Cash on Delivery?',
        a: 'Currently, we do not offer COD. We support all digital payment methods to ensure a seamless and secure checkout experience.',
      },
    ],
  },
];

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<string | null>(null);

  const toggle = (id: string) => {
    setOpenIndex(openIndex === id ? null : id);
  };

  return (
    <div style={{ paddingTop: '10px' }}>
      {/* Hero */}
      <section
        style={{
          padding: 'clamp(3rem, 8vw, 6rem) 0',
          background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border-subtle)',
          textAlign: 'center',
        }}
      >
        <div className="container" style={{ maxWidth: '700px' }}>
          <div className="hero-tag" style={{ margin: '0 auto 1.5rem' }}>
            SUPPORT
          </div>
          <h1
            className="section-title"
            style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', marginBottom: '1rem' }}
          >
            Frequently Asked <span className="accent">Questions</span>
          </h1>
          <p
            style={{
              color: 'var(--text-secondary)',
              fontSize: 'clamp(1rem, 1.5vw, 1.15rem)',
              lineHeight: 1.8,
            }}
          >
            Everything you need to know about DreamVault. Can&apos;t find what you&apos;re looking for?
            Reach out to our team at hello@dreamvault.in.
          </p>
        </div>
      </section>

      {/* FAQ Sections */}
      <section className="section">
        <div className="container" style={{ maxWidth: '800px' }}>
          {faqs.map((section, sIdx) => (
            <div key={sIdx} style={{ marginBottom: '3rem' }}>
              <h2
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  color: 'var(--accent-gold)',
                  marginBottom: '1.5rem',
                  paddingBottom: '0.75rem',
                  borderBottom: '1px solid var(--border-subtle)',
                }}
              >
                {section.category}
              </h2>
              {section.questions.map((item, qIdx) => {
                const id = `${sIdx}-${qIdx}`;
                const isOpen = openIndex === id;
                return (
                  <div
                    key={qIdx}
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                    }}
                  >
                    <button
                      onClick={() => toggle(id)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '1.25rem 0',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                        color: 'var(--text-primary)',
                        fontSize: '0.95rem',
                        fontWeight: 500,
                        fontFamily: 'inherit',
                        transition: 'color 0.2s',
                      }}
                    >
                      {item.q}
                      <svg
                        width="16" height="16" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        style={{
                          flexShrink: 0,
                          marginLeft: '1rem',
                          transition: 'transform 0.3s ease',
                          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                          color: 'var(--text-muted)',
                        }}
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>
                    <div
                      style={{
                        maxHeight: isOpen ? '300px' : '0',
                        overflow: 'hidden',
                        transition: 'max-height 0.35s ease, opacity 0.3s ease',
                        opacity: isOpen ? 1 : 0,
                      }}
                    >
                      <p
                        style={{
                          color: 'var(--text-secondary)',
                          fontSize: '0.88rem',
                          lineHeight: 1.8,
                          paddingBottom: '1.25rem',
                        }}
                      >
                        {item.a}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
