import PolicyLayout from '@/components/PolicyLayout';

const sectionStyle: React.CSSProperties = { marginBottom: '2.5rem' };
const h2Style: React.CSSProperties = { fontSize: '1.15rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' };
const pStyle: React.CSSProperties = { color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.85, marginBottom: '0.75rem' };

export default function ReturnsRefundsPage() {
  return (
    <PolicyLayout
      tag="INFORMATION"
      title="Returns &"
      titleAccent="Refunds"
      subtitle="Not 100% satisfied? Here's how we make it right."
      lastUpdated="October 1, 2026"
    >
      <div style={sectionStyle}>
        <h2 style={h2Style}>Our Promise</h2>
        <p style={pStyle}>At DreamVault, we stand behind the quality of every product we sell. If your order arrives damaged, defective, or significantly different from what you ordered, we&apos;ll make it right — guaranteed.</p>
      </div>
      <div style={sectionStyle}>
        <h2 style={h2Style}>Return Window</h2>
        <p style={pStyle}>You have <strong>7 days</strong> from the date of delivery to initiate a return. After this window, we will not be able to process your return request.</p>
      </div>
      <div style={sectionStyle}>
        <h2 style={h2Style}>How to Return</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[
            { step: '1', title: 'Contact Us', desc: 'Email hello@dreamvault.in with your order ID, photos of the issue, and your preferred resolution (refund or exchange).' },
            { step: '2', title: 'Approval', desc: 'Our team reviews your request within 24 hours and sends you return instructions if approved.' },
            { step: '3', title: 'Ship It Back', desc: 'Pack the item securely and ship it using the prepaid label we provide. Return shipping is free for approved claims.' },
            { step: '4', title: 'Refund / Exchange', desc: 'Once we receive the item, your refund is processed in 5–7 business days, or a replacement is shipped immediately.' },
          ].map((item) => (
            <div key={item.step} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-gold)',
              }}>
                {item.step}
              </div>
              <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>{item.title}</h3>
                <p style={{ ...pStyle, marginBottom: 0 }}>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={sectionStyle}>
        <h2 style={h2Style}>Non-Returnable Items</h2>
        <p style={pStyle}>Custom/personalized poster orders cannot be returned unless they arrive with manufacturing defects or shipping damage.</p>
      </div>
    </PolicyLayout>
  );
}
