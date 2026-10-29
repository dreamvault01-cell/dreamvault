import PolicyLayout, { PolicySection } from '@/components/PolicyLayout';
import { getSupportConfig } from '@/lib/support-config';

export default function ShippingDeliveryPage() {
  const supportEmail = getSupportConfig().supportEmail || 'support@soliheleug.resend.app';
  return (
    <PolicyLayout
      tag="INFORMATION"
      title="Shipping &"
      titleAccent="Delivery"
      subtitle="A simple view of what happens after you place a DreamVault order."
      lastUpdated="October 1, 2026"
    >
      <PolicySection id="after-you-order" title="After You Order">
        <p>Once your order is accepted, it moves from preparation to shipment. A courier is selected when the parcel is ready to leave. Delivery timing depends on the selected print, destination, courier network, and local conditions, so the courier update is the most accurate estimate.</p>
      </PolicySection>
      <PolicySection id="how-to-track" title="How to Track an Order">
        <p>When an order ships, its courier and tracking number appear on your order record. Visit <a href="/track-order">Track Your Order</a> and enter the order reference plus the email used at checkout. If email delivery is active, the shipping update is also sent there.</p>
      </PolicySection>
      <PolicySection id="delivery-address" title="Delivery Address">
        <p>Please check your delivery address carefully before placing an order. If a correction is needed, contact us as soon as possible with your order reference. Changes may not be possible after the courier has received the parcel.</p>
      </PolicySection>
      <PolicySection id="packing" title="Packing Your Print">
        <p>We use a protective mailer or tube chosen for the selected format and size. Framed and unframed pieces may use different protective packaging.</p>
      </PolicySection>
      <PolicySection id="need-help" title="Need Help?">
        <p>For a delivery question, email <a href={`mailto:${supportEmail}`}>{supportEmail}</a> and include your order reference.</p>
      </PolicySection>
    </PolicyLayout>
  );
}
