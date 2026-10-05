import PolicyLayout from '@/components/PolicyLayout';

const sectionStyle: React.CSSProperties = { marginBottom: '2.5rem' };
const h2Style: React.CSSProperties = { fontSize: '1.15rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' };
const pStyle: React.CSSProperties = { color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.85, marginBottom: '0.75rem' };

export default function TermsOfServicePage() {
  return (
    <PolicyLayout
      tag="LEGAL"
      title="Terms of"
      titleAccent="Service"
      subtitle="Please read these terms carefully before using our website or placing an order."
      lastUpdated="October 1, 2026"
    >
      <div style={sectionStyle}>
        <h2 style={h2Style}>1. Acceptance of Terms</h2>
        <p style={pStyle}>By accessing or using DreamVault&apos;s website, you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree with any part of these terms, you may not access the website or place orders.</p>
      </div>
      <div style={sectionStyle}>
        <h2 style={h2Style}>2. Products & Pricing</h2>
        <p style={pStyle}>All product descriptions, images, and prices are displayed as accurately as possible. We reserve the right to modify prices at any time without prior notice. Prices are listed in Indian Rupees (INR) and include applicable taxes unless stated otherwise.</p>
      </div>
      <div style={sectionStyle}>
        <h2 style={h2Style}>3. Orders</h2>
        <p style={pStyle}>Placing an order constitutes an offer to purchase. We reserve the right to refuse or cancel any order for reasons including product availability, errors in pricing or product information, or suspected fraudulent activity. You will be notified if your order is cancelled.</p>
      </div>
      <div style={sectionStyle}>
        <h2 style={h2Style}>4. Intellectual Property</h2>
        <p style={pStyle}>All content on this website — including designs, images, logos, and text — is the property of DreamVault and is protected by copyright laws. You may not reproduce, distribute, or create derivative works from our content without written permission.</p>
      </div>
      <div style={sectionStyle}>
        <h2 style={h2Style}>5. User Accounts</h2>
        <p style={pStyle}>You are responsible for maintaining the confidentiality of your account credentials. You agree to notify us immediately of any unauthorized use of your account. DreamVault is not liable for any loss arising from unauthorized access to your account.</p>
      </div>
      <div style={sectionStyle}>
        <h2 style={h2Style}>6. Limitation of Liability</h2>
        <p style={pStyle}>DreamVault shall not be liable for any indirect, incidental, or consequential damages arising from the use of our website or products. Our total liability shall not exceed the amount paid for the product in question.</p>
      </div>
      <div style={sectionStyle}>
        <h2 style={h2Style}>7. Governing Law</h2>
        <p style={pStyle}>These terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts in Mumbai, Maharashtra.</p>
      </div>
    </PolicyLayout>
  );
}
