import PolicyLayout from '@/components/PolicyLayout';

const sectionStyle: React.CSSProperties = { marginBottom: '2.5rem' };
const h2Style: React.CSSProperties = { fontSize: '1.15rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' };
const pStyle: React.CSSProperties = { color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.85, marginBottom: '0.75rem' };

export default function PrivacyPolicyPage() {
  return (
    <PolicyLayout
      tag="LEGAL"
      title="Privacy"
      titleAccent="Policy"
      subtitle="Your privacy matters to us. This policy explains how we collect, use, and protect your personal information."
      lastUpdated="October 1, 2026"
    >
      <div style={sectionStyle}>
        <h2 style={h2Style}>1. Information We Collect</h2>
        <p style={pStyle}>We collect personal information that you provide directly, including your name, email address, shipping address, phone number, and payment details when you place an order. We also automatically collect certain data such as your IP address, browser type, and browsing behavior on our site through cookies.</p>
      </div>
      <div style={sectionStyle}>
        <h2 style={h2Style}>2. How We Use Your Information</h2>
        <p style={pStyle}>Your information is used to process and fulfill your orders, communicate with you about your purchases, send you marketing communications (with your consent), improve our website and services, and comply with legal obligations.</p>
      </div>
      <div style={sectionStyle}>
        <h2 style={h2Style}>3. Information Sharing</h2>
        <p style={pStyle}>We do not sell your personal data. We share information only with trusted third-party service providers who assist in order fulfillment (shipping partners), payment processing (Razorpay), and website analytics. These partners are contractually obligated to protect your data.</p>
      </div>
      <div style={sectionStyle}>
        <h2 style={h2Style}>4. Data Security</h2>
        <p style={pStyle}>We implement industry-standard security measures including 256-bit SSL encryption for all transactions, secure servers, and regular security audits. While no method of transmission over the Internet is 100% secure, we strive to protect your personal information.</p>
      </div>
      <div style={sectionStyle}>
        <h2 style={h2Style}>5. Cookies</h2>
        <p style={pStyle}>Our website uses cookies to enhance your browsing experience, remember your preferences, and analyze site traffic. You can control cookie settings through your browser preferences at any time.</p>
      </div>
      <div style={sectionStyle}>
        <h2 style={h2Style}>6. Your Rights</h2>
        <p style={pStyle}>You have the right to access, correct, or delete your personal data. You may also unsubscribe from our marketing emails at any time using the link in the footer of each email. To exercise these rights, contact us at hello@dreamvault.in.</p>
      </div>
      <div style={sectionStyle}>
        <h2 style={h2Style}>7. Contact Us</h2>
        <p style={pStyle}>If you have questions about this privacy policy, please contact us at <a href="mailto:hello@dreamvault.in" style={{ color: 'var(--accent-gold)' }}>hello@dreamvault.in</a> or call us at +91 98765 43210.</p>
      </div>
    </PolicyLayout>
  );
}
