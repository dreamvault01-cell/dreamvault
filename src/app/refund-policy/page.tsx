import PolicyLayout, { PolicySection } from '@/components/PolicyLayout';
import { getSupportConfig } from '@/lib/support-config';

export default function RefundPolicyPage() {
  const supportEmail = getSupportConfig().supportEmail || 'support@soliheleug.resend.app';
  return <PolicyLayout tag="POLICIES" title="Refund" titleAccent="Policy" subtitle="A clear outline of how to request help if something is wrong with your order." lastUpdated="October 1, 2026">
    <PolicySection id="eligibility-for-refund" title="Eligibility for a Refund">
      <p>A refund may be considered where an item is damaged in transit, has a manufacturing defect, or is materially different from the order. Please raise the request within 7 days of delivery.</p>
    </PolicySection>
    <PolicySection id="how-to-request-a-refund" title="How to Request a Refund">
      <p>Email <a href={`mailto:${supportEmail}`}>{supportEmail}</a> with your order reference, a description of the issue, and clear photos. We will review the request and explain the available resolution.</p>
    </PolicySection>
    <PolicySection id="refund-process" title="Refund Process">
      <p>Where a refund is approved, it is returned through the original payment method. The time for it to appear can vary by bank, card network, UPI app, or payment provider. We will confirm when the payment refund has been completed.</p>
    </PolicySection>
    <PolicySection id="exchanges" title="Replacements">
      <p>If a replacement is the right resolution, we will confirm the availability and delivery details with you before processing it.</p>
    </PolicySection>
    <PolicySection id="contact" title="Contact">
      <p>For refund questions, contact <a href={`mailto:${supportEmail}`}>{supportEmail}</a>.</p>
    </PolicySection>
  </PolicyLayout>;
}
