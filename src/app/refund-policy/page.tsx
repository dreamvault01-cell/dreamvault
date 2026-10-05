import PolicyLayout from '@/components/PolicyLayout';

const sectionStyle: React.CSSProperties = { marginBottom: '2.5rem' };
const h2Style: React.CSSProperties = { fontSize: '1.15rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' };
const pStyle: React.CSSProperties = { color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.85, marginBottom: '0.75rem' };

export default function RefundPolicyPage() {
  return (
    <PolicyLayout
      tag="POLICIES"
      title="Refund"
      titleAccent="Policy"
      subtitle="We want you to be completely happy with your purchase. Here's how our refund process works."
      lastUpdated="October 1, 2026"
    >
      <div style={sectionStyle}>
        <h2 style={h2Style}>1. Eligibility for Refund</h2>
        <p style={pStyle}>You are eligible for a refund if the product received is damaged during transit, the product is materially different from what was ordered, or the product has a manufacturing defect. Refund requests must be raised within 7 days of delivery.</p>
      </div>
      <div style={sectionStyle}>
        <h2 style={h2Style}>2. Non-Refundable Items</h2>
        <p style={pStyle}>Custom-designed posters and personalized orders are non-refundable unless they arrive damaged or with defects. Sale items and bundled packs (Wall Setup Packs) are eligible for exchange only, not refund.</p>
      </div>
      <div style={sectionStyle}>
        <h2 style={h2Style}>3. How to Request a Refund</h2>
        <p style={pStyle}>Email us at <a href="mailto:hello@dreamvault.in" style={{ color: 'var(--accent-gold)' }}>hello@dreamvault.in</a> with your order ID, a description of the issue, and clear photos of the damaged/defective product. Our team will review your request within 24 hours.</p>
      </div>
      <div style={sectionStyle}>
        <h2 style={h2Style}>4. Refund Process</h2>
        <p style={pStyle}>Once approved, your refund will be processed within 5–7 business days. The amount will be credited back to your original payment method (credit/debit card, UPI, or net banking). You will receive a confirmation email once the refund is initiated.</p>
      </div>
      <div style={sectionStyle}>
        <h2 style={h2Style}>5. Exchanges</h2>
        <p style={pStyle}>If you&apos;d prefer an exchange instead of a refund, we&apos;ll ship a replacement at no extra cost once we receive the returned item. Exchange requests are processed within 3–5 business days.</p>
      </div>
      <div style={sectionStyle}>
        <h2 style={h2Style}>6. Contact</h2>
        <p style={pStyle}>For any refund-related queries, reach out to us at <a href="mailto:hello@dreamvault.in" style={{ color: 'var(--accent-gold)' }}>hello@dreamvault.in</a> or call +91 98765 43210 (Mon–Sat, 10am–7pm IST).</p>
      </div>
    </PolicyLayout>
  );
}
