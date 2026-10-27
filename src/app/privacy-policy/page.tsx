import PolicyLayout, { PolicySection } from '@/components/PolicyLayout';
import { getSupportConfig } from '@/lib/support-config';

export default function PrivacyPolicyPage() {
  const supportEmail = getSupportConfig().supportEmail || 'support@soliheleug.resend.app';
  return (
    <PolicyLayout
      tag="LEGAL"
      title="Privacy"
      titleAccent="Policy"
      subtitle="Your privacy matters to us. This policy explains how we collect, use, and protect your personal information."
      lastUpdated="October 1, 2026"
    >
      <PolicySection id="information-we-collect" title="Information We Collect">
        <p>We collect personal information that you provide directly, including your name, email address, shipping address, phone number, and payment details when you place an order. We also automatically collect certain data such as your IP address, browser type, and browsing behavior on our site through cookies.</p>
      </PolicySection>
      <PolicySection id="how-we-use-your-information" title="How We Use Your Information">
        <p>Your information is used to process and fulfill your orders, communicate with you about your purchases, send you marketing communications (with your consent), improve our website and services, and comply with legal obligations.</p>
      </PolicySection>
      <PolicySection id="information-sharing" title="Information Sharing">
        <p>We do not sell your personal data. We share information only with trusted third-party service providers who assist in order fulfillment (shipping partners), payment processing (Razorpay), and website analytics. These partners are contractually obligated to protect your data.</p>
      </PolicySection>
      <PolicySection id="data-security" title="Data Security">
        <p>We implement industry-standard security measures including 256-bit SSL encryption for all transactions, secure servers, and regular security audits. While no method of transmission over the Internet is 100% secure, we strive to protect your personal information.</p>
      </PolicySection>
      <PolicySection id="cookies" title="Cookies">
        <p>Our website uses cookies to enhance your browsing experience, remember your preferences, and analyze site traffic. You can control cookie settings through your browser preferences at any time.</p>
      </PolicySection>
      <PolicySection id="your-rights" title="Your Rights">
        <p>You have the right to access, correct, or delete your personal data. You may also unsubscribe from our marketing emails at any time using the link in the footer of each email. To exercise these rights, contact us at {supportEmail}.</p>
      </PolicySection>
      <PolicySection id="contact-us" title="Contact Us">
        <p>If you have questions about this privacy policy, please contact us at <a href={`mailto:${supportEmail}`}>{supportEmail}</a> or call us at +91 98765 43210.</p>
      </PolicySection>
    </PolicyLayout>
  );
}
