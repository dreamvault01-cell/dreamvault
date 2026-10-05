import PolicyLayout from '@/components/PolicyLayout';

const sectionStyle: React.CSSProperties = { marginBottom: '2.5rem' };
const h2Style: React.CSSProperties = { fontSize: '1.15rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' };
const pStyle: React.CSSProperties = { color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.85, marginBottom: '0.75rem' };

export default function ShippingPolicyPage() {
  return (
    <PolicyLayout
      tag="POLICIES"
      title="Shipping"
      titleAccent="Policy"
      subtitle="We're committed to delivering your art safely and on time. Here's everything you need to know about our shipping process."
      lastUpdated="October 1, 2026"
    >
      <div style={sectionStyle}>
        <h2 style={h2Style}>1. Processing Time</h2>
        <p style={pStyle}>All orders are processed within 1–2 business days (excluding weekends and public holidays). You will receive a confirmation email with tracking details once your order has shipped.</p>
      </div>
      <div style={sectionStyle}>
        <h2 style={h2Style}>2. Shipping Rates</h2>
        <p style={pStyle}><strong>Free Standard Shipping</strong> on all orders above ₹499. For orders below ₹499, a flat shipping fee of ₹79 applies. Express shipping (2–3 business days) is available at checkout for ₹149.</p>
      </div>
      <div style={sectionStyle}>
        <h2 style={h2Style}>3. Delivery Timeframes</h2>
        <p style={pStyle}><strong>Standard Delivery:</strong> 5–7 business days across India.</p>
        <p style={pStyle}><strong>Express Delivery:</strong> 2–3 business days (available in select cities).</p>
        <p style={pStyle}>Delivery times may vary during festive seasons, sales, or due to unforeseen circumstances. We&apos;ll notify you of any delays via email.</p>
      </div>
      <div style={sectionStyle}>
        <h2 style={h2Style}>4. Packaging</h2>
        <p style={pStyle}>Each poster is carefully rolled in a protective tube or packed flat with rigid cardboard backing to prevent bending, creasing, or water damage during transit. We take extra care to ensure your art arrives in pristine condition.</p>
      </div>
      <div style={sectionStyle}>
        <h2 style={h2Style}>5. Shipping Partners</h2>
        <p style={pStyle}>We work with India&apos;s leading logistics partners including Delhivery, BlueDart, and India Post to ensure reliable and trackable deliveries across all pin codes.</p>
      </div>
      <div style={sectionStyle}>
        <h2 style={h2Style}>6. International Shipping</h2>
        <p style={pStyle}>Currently, we only ship within India. International shipping is coming soon — sign up for our newsletter to be notified when we expand globally.</p>
      </div>
      <div style={sectionStyle}>
        <h2 style={h2Style}>7. Damaged or Lost Shipments</h2>
        <p style={pStyle}>If your order arrives damaged or is lost in transit, please contact us within 48 hours at <a href="mailto:hello@dreamvault.in" style={{ color: 'var(--accent-gold)' }}>hello@dreamvault.in</a> with your order ID and photos. We&apos;ll arrange a free replacement or full refund.</p>
      </div>
    </PolicyLayout>
  );
}
