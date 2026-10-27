import PolicyLayout, { PolicySection } from '@/components/PolicyLayout';

export default function TermsOfServicePage() {
  return (
    <PolicyLayout
      tag="LEGAL"
      title="Terms of"
      titleAccent="Service"
      subtitle="Please read these terms carefully before using our website or placing an order."
      lastUpdated="October 1, 2026"
    >
      <PolicySection id="acceptance-of-terms" title="Acceptance of Terms">
        <p>By accessing or using DreamVault&apos;s website, you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree with any part of these terms, you may not access the website or place orders.</p>
      </PolicySection>
      <PolicySection id="products-and-pricing" title="Products & Pricing">
        <p>All product descriptions, images, and prices are displayed as accurately as possible. We reserve the right to modify prices at any time without prior notice. Prices are listed in Indian Rupees (INR) and include applicable taxes unless stated otherwise.</p>
      </PolicySection>
      <PolicySection id="orders" title="Orders">
        <p>Placing an order constitutes an offer to purchase. We reserve the right to refuse or cancel any order for reasons including product availability, errors in pricing or product information, or suspected fraudulent activity. You will be notified if your order is cancelled.</p>
      </PolicySection>
      <PolicySection id="intellectual-property" title="Intellectual Property">
        <p>All content on this website — including designs, images, logos, and text — is the property of DreamVault and is protected by copyright laws. You may not reproduce, distribute, or create derivative works from our content without written permission.</p>
      </PolicySection>
      <PolicySection id="user-accounts" title="User Accounts">
        <p>You are responsible for maintaining the confidentiality of your account credentials. You agree to notify us immediately of any unauthorized use of your account. DreamVault is not liable for any loss arising from unauthorized access to your account.</p>
      </PolicySection>
      <PolicySection id="limitation-of-liability" title="Limitation of Liability">
        <p>DreamVault shall not be liable for any indirect, incidental, or consequential damages arising from the use of our website or products. Our total liability shall not exceed the amount paid for the product in question.</p>
      </PolicySection>
      <PolicySection id="governing-law" title="Governing Law">
        <p>These terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts in Mumbai, Maharashtra.</p>
      </PolicySection>
    </PolicyLayout>
  );
}
