import { PackageCheck, Palette, ShieldCheck, Truck } from 'lucide-react';

export default function TrustBadges() {
  const badges = [
    { icon: Truck, title: 'Delivery included', detail: 'Shown clearly at checkout' },
    { icon: Palette, title: 'Choose your finish', detail: 'Classic Matte or Fine-Art' },
    { icon: PackageCheck, title: 'Made for your wall', detail: 'Poster, art print, or framed' },
    { icon: ShieldCheck, title: 'Secure payments', detail: 'Online payment or cash on delivery' },
  ];
  return <section className="features-bar" style={{ marginTop: 'auto', borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)' }}><div className="container"><div className="features-grid">{badges.map(({ icon: Icon, title, detail }) => <div className="feature-item" key={title}><div className="feature-icon"><Icon size={30} /></div><div className="feature-text"><strong>{title}</strong><span>{detail}</span></div></div>)}</div></div></section>;
}
