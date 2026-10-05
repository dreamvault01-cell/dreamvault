import PolicyLayout from '@/components/PolicyLayout';

const sectionStyle: React.CSSProperties = { marginBottom: '2.5rem' };
const h2Style: React.CSSProperties = { fontSize: '1.15rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' };
const pStyle: React.CSSProperties = { color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.85, marginBottom: '0.75rem' };

export default function ShippingDeliveryPage() {
  return (
    <PolicyLayout
      tag="INFORMATION"
      title="Shipping &"
      titleAccent="Delivery"
      subtitle="Everything you need to know about how we get your art to your doorstep."
      lastUpdated="October 1, 2026"
    >
      <div style={sectionStyle}>
        <h2 style={h2Style}>Delivery Zones & Timeframes</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-subtle)' }}>
                {['Zone', 'Estimated Delivery', 'Standard Cost', 'Express Cost'].map((h) => (
                  <th key={h} style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ['Metro Cities', '3–5 days', 'Free (₹499+)', '₹149'],
                ['Tier 2 Cities', '5–7 days', 'Free (₹499+)', '₹149'],
                ['Rural Areas', '7–10 days', '₹79', '₹199'],
                ['North East', '7–12 days', '₹99', '₹249'],
              ].map(([zone, time, std, exp], i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '0.75rem', fontSize: '0.88rem', fontWeight: 500, color: 'var(--text-primary)' }}>{zone}</td>
                  <td style={{ padding: '0.75rem', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>{time}</td>
                  <td style={{ padding: '0.75rem', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>{std}</td>
                  <td style={{ padding: '0.75rem', fontSize: '0.88rem', color: 'var(--accent-gold)', fontWeight: 600 }}>{exp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div style={sectionStyle}>
        <h2 style={h2Style}>How We Pack Your Art</h2>
        <p style={pStyle}>Every poster is printed on premium 300 GSM art card stock, then carefully packed in a rigid cardboard mailer or protective tube to ensure it arrives without bends, creases, or damage. We also add a moisture-resistant inner sleeve for extra protection.</p>
      </div>
      <div style={sectionStyle}>
        <h2 style={h2Style}>Order Tracking</h2>
        <p style={pStyle}>Once your order ships, you&apos;ll receive an email and SMS with a live tracking link. You can also visit our <a href="/track-order" style={{ color: 'var(--accent-gold)' }}>Track Your Order</a> page and enter your Order ID to check real-time status.</p>
      </div>
      <div style={sectionStyle}>
        <h2 style={h2Style}>Need Help?</h2>
        <p style={pStyle}>If you have any questions about shipping or delivery, contact us at <a href="mailto:hello@dreamvault.in" style={{ color: 'var(--accent-gold)' }}>hello@dreamvault.in</a> or call +91 98765 43210.</p>
      </div>
    </PolicyLayout>
  );
}
