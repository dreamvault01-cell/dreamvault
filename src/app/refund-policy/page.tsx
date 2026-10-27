import PolicyLayout, { PolicySection } from '@/components/PolicyLayout';
import { getSupportConfig } from '@/lib/support-config';

export default function RefundPolicyPage() {
  const supportEmail = getSupportConfig().supportEmail || 'support@soliheleug.resend.app';
  return (
    <PolicyLayout
      tag="POLICIES"
      title="Refund"
      titleAccent="Policy"
      subtitle="We want you to be completely happy with your purchase. Here's how our refund process works."
      lastUpdated="October 1, 2026"
    >
      <PolicySection id="eligibility-for-refund" title="Eligibility for Refund">
        <p>You are eligible for a refund if the product received is damaged during transit, the product is materially different from what was ordered, or the product has a manufacturing defect. Refund requests must be raised within 7 days of delivery.</p>
      </PolicySection>
      <PolicySection id="non-refundable-items" title="Non-Refundable Items">
        <p>Custom-designed posters and personalized orders are non-refundable unless they arrive damaged or with defects. Sale items and bundled packs (Wall Setup Packs) are eligible for exchange only, not refund.</p>
      </PolicySection>
      <PolicySection id="how-to-request-a-refund" title="How to Request a Refund">
        <p>Email us at <a href={`mailto:${supportEmail}`}>{supportEmail}</a> with your order ID, a description of the issue, and clear photos of the damaged/defective product. Our team will review your request within 24 hours.</p>
      </PolicySection>
      <PolicySection id="refund-process" title="Refund Process">
        <p>Once approved, your refund will be processed within 5–7 business days. The amount will be credited back to your original payment method (credit/debit card, UPI, or net banking). You will receive a confirmation email once the refund is initiated.</p>
      </PolicySection>
      <PolicySection id="exchanges" title="Exchanges">
        <p>If you&apos;d prefer an exchange instead of a refund, we&apos;ll ship a replacement at no extra cost once we receive the returned item. Exchange requests are processed within 3–5 business days.</p>
      </PolicySection>
      <PolicySection id="contact" title="Contact">
        <p>For any refund-related queries, reach out to us at <a href={`mailto:${supportEmail}`}>{supportEmail}</a> or call +91 98765 43210 (Mon–Sat, 10am–7pm IST).</p>
      </PolicySection>
    </PolicyLayout>
  );
}
