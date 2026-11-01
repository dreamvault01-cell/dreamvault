import PolicyLayout, { PolicySection } from '@/components/PolicyLayout';
import { getSupportConfig } from '@/lib/support-config';

export default function ShippingPolicyPage() {
  const supportEmail = getSupportConfig().supportEmail || 'support@soliheleug.resend.app';
  return (
    <PolicyLayout
      tag="POLICIES"
      title="Shipping"
      titleAccent="Policy"
      subtitle="How fulfilment, delivery updates, and shipping questions are handled for RareDaze orders."
      lastUpdated="October 1, 2026"
    >
      <PolicySection id="order-preparation" title="Order Preparation">
        <p>Orders are prepared after payment is confirmed or, for cash on delivery, after the order is accepted. Product availability and the delivery address are checked before an order is dispatched. We do not promise a universal dispatch time because it can vary by artwork, format, and delivery location.</p>
      </PolicySection>
      <PolicySection id="delivery-cost" title="Delivery Cost">
        <p>The final checkout total is shown before you place an order. If delivery is included, it is reflected in that total; if a delivery charge is introduced in the future, it will be shown before payment.</p>
      </PolicySection>
      <PolicySection id="tracking" title="Tracking and Delivery Updates">
        <p>When an order ships, RareDaze records the courier and tracking number on the order. You can view the latest available update in <a href="/track-order">Track Your Order</a> using the order reference and checkout email. When order email delivery is enabled, the same update is also sent to that email address.</p>
      </PolicySection>
      <PolicySection id="packaging" title="Packaging">
        <p>Prints are packed in a format-appropriate protective mailer or tube. The final packaging method may vary by the selected print size and frame option.</p>
      </PolicySection>
      <PolicySection id="delivery-area" title="Delivery Area">
        <p>Checkout currently supports delivery addresses in India. International checkout is not available at this time.</p>
      </PolicySection>
      <PolicySection id="delivery-problems" title="Delivery Problems">
        <p>If an order is damaged, missing, or appears to have a delivery issue, contact <a href={`mailto:${supportEmail}`}>{supportEmail}</a> with the order reference and clear photos where relevant. We will review the situation and confirm the appropriate next step.</p>
      </PolicySection>
    </PolicyLayout>
  );
}
