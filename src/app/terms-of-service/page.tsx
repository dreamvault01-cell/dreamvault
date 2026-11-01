import PolicyLayout, { PolicySection } from '@/components/PolicyLayout';
import { getSupportConfig } from '@/lib/support-config';

export default function TermsOfServicePage() {
  const supportEmail = getSupportConfig().supportEmail || 'support@soliheleug.resend.app';
  return (
    <PolicyLayout
      tag="LEGAL"
      title="Terms of"
      titleAccent="Service"
      subtitle="The straightforward terms that apply when you browse RareDaze or place an order."
      lastUpdated="October 1, 2026"
    >
      <PolicySection id="acceptance-of-terms" title="Using RareDaze">
        <p>By using RareDaze or placing an order, you agree to these terms and the Privacy Policy. If you do not agree, please do not use the checkout or create an account.</p>
      </PolicySection>
      <PolicySection id="products-and-pricing" title="Products and Pricing">
        <p>Product images, descriptions, configurations, and prices are presented as accurately as possible. The exact selected size, paper, and frame option, together with the final INR total shown at checkout, form the order details. We may correct an obvious listing or pricing error before an order is dispatched.</p>
      </PolicySection>
      <PolicySection id="orders" title="Orders and Payment">
        <p>An order is subject to product availability and payment confirmation where applicable. We may cancel an order where stock is unavailable, a listing contains a material error, payment cannot be confirmed, or fraud is suspected. If this happens, we will contact the email used at checkout and handle any applicable refund through the original payment method.</p>
      </PolicySection>
      <PolicySection id="delivery-and-returns" title="Delivery and Returns">
        <p>Shipping, delivery issues, returns, and refunds are described in the <a href="/shipping-policy">Shipping Policy</a> and <a href="/refund-policy">Refund Policy</a>. Those policies form part of these terms.</p>
      </PolicySection>
      <PolicySection id="intellectual-property" title="Website Content">
        <p>The RareDaze name, branding, site design, and other material we publish are protected by applicable intellectual-property laws. Do not copy, reproduce, or use them commercially without written permission. Artwork rights may be subject to the information shown on the relevant product listing.</p>
      </PolicySection>
      <PolicySection id="accounts" title="Accounts">
        <p>You are responsible for keeping your account access secure and for giving accurate information at checkout. Tell us promptly if you believe your account has been used without permission.</p>
      </PolicySection>
      <PolicySection id="liability" title="Liability">
        <p>To the extent permitted by applicable law, RareDaze is not liable for indirect or consequential loss arising from use of the site or products. Our liability for a valid claim relating to an order is limited to the amount paid for that order.</p>
      </PolicySection>
      <PolicySection id="governing-law" title="Applicable Law">
        <p>These terms are intended to operate under applicable laws in India. Questions about an order or these terms can be sent to <a href={`mailto:${supportEmail}`}>{supportEmail}</a>.</p>
      </PolicySection>
    </PolicyLayout>
  );
}
