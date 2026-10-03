import { Rocket, Palette, Gem, ShieldCheck } from 'lucide-react';

export default function TrustBadges() {
  return (
    <section className="features-bar" style={{ marginTop: 'auto', borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)' }}>
      <div className="container">
        <div className="features-grid">
          <div className="feature-item">
            <div className="feature-icon"><Rocket size={32} /></div>
            <div className="feature-text">
              <strong>Free Express Shipping</strong>
              <span>Delivered in 3-5 days</span>
            </div>
          </div>
          <div className="feature-item">
            <div className="feature-icon"><Palette size={32} /></div>
            <div className="feature-text">
              <strong>Premium 300 GSM</strong>
              <span>Museum-quality art paper</span>
            </div>
          </div>
          <div className="feature-item">
            <div className="feature-icon"><Gem size={32} /></div>
            <div className="feature-text">
              <strong>Archival Inks</strong>
              <span>Vibrant colors that last</span>
            </div>
          </div>
          <div className="feature-item">
            <div className="feature-icon"><ShieldCheck size={32} /></div>
            <div className="feature-text">
              <strong>Secure Payments</strong>
              <span>UPI, Cards & Net Banking</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
